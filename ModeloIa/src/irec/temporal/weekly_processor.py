from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional

from src.irec.config import settings

logger = logging.getLogger(__name__)

# File that stores the accumulated history
HISTORY_FILE = settings.data_dir / "analytics" / "temporal_series" / "weekly_history.json"


def load_history() -> dict:
    """Load accumulated weekly history."""
    if HISTORY_FILE.exists():
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "started_at": None,
        "weeks": [],
        "months": [],
        "current_week": 0,
        "total_records_processed": 0,
    }


def save_history(history: dict) -> None:
    """Save accumulated history to disk."""
    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2, default=str)


def ingest_new_week(
    records: list[dict[str, Any]],
    week_label: Optional[str] = None,
) -> dict:
    """Process a new batch of weekly data and update history.

    This is the REAL operational flow:
    1. Receive new records (from scraping/APIs)
    2. Run full pipeline on JUST the new data
    3. Calculate IREC for this week
    4. Append to accumulated history
    5. Recalculate monthly aggregations
    6. Return weekly + monthly + all-time results

    Args:
        records: New records from this week (already in SocialDigitalRecord-like format).
        week_label: Label for this week (auto-generated if None).

    Returns:
        Dict with weekly_result, monthly_aggregation, and full history summary.
    """
    from src.irec.preprocessing import PreprocessingPipeline
    from src.irec.nlp import NLPPipeline
    from src.irec.vision import VisionPipeline
    from src.irec.community import CommunityPipeline
    from src.irec.risk import RiskPipeline

    history = load_history()

    # Auto-label week
    if week_label is None:
        week_num = history["current_week"] + 1
        week_label = f"{datetime.utcnow().year}-W{week_num:02d}"
    else:
        week_num = history["current_week"] + 1

    if history["started_at"] is None:
        history["started_at"] = datetime.utcnow().isoformat()

    logger.info("Processing week %d: %d new records", week_num, len(records))

    # Run full pipeline
    preproc = PreprocessingPipeline()
    clean = preproc.process_records(records)

    nlp = NLPPipeline()
    analyzed = nlp.analyze_batch(clean)

    vision = VisionPipeline()
    with_vision = vision.analyze_batch(analyzed)

    community = CommunityPipeline()
    with_community = community.analyze_batch(with_vision)

    # Ensure community info exists
    for rec in with_community:
        if not rec.get("community_institutions"):
            rec["community_institutions"] = [
                {"institution_id": "generic", "institution_name": "Comunidad Educativa"}
            ]
        if not rec.get("community_id"):
            rec["community_id"] = rec.get("association_level", "unknown")

    # Calculate IREC for this batch
    risk = RiskPipeline(window_days=7)
    irec_results = risk.analyze(with_community)

    # ADAPTIVE LEARNING: improve system with this week's data
    from src.irec.risk.adaptive_learner import AdaptiveLearner
    learner = AdaptiveLearner()
    learning_improvements = learner.learn_from_week(with_community)

    # Build weekly summary
    weekly_summary = _build_weekly_summary(
        week_num, week_label, len(records), len(clean),
        irec_results, preproc.get_stats(), nlp.get_stats(),
        community.get_stats(), risk.get_stats(),
    )
    weekly_summary["learning"] = {
        "improvements": learning_improvements,
        "weeks_learned": learner.get_learning_summary()["weeks_learned"],
        "records_seen": learner.get_learning_summary()["records_seen"],
    }

    # Append to history
    history["weeks"].append(weekly_summary)
    history["current_week"] = week_num
    history["total_records_processed"] += len(records)

    # Recalculate monthly aggregation (every 4 weeks)
    if len(history["weeks"]) % 4 == 0:
        month_num = len(history["weeks"]) // 4
        recent_4 = history["weeks"][-4:]
        monthly = _build_monthly_summary(month_num, recent_4)
        history["months"].append(monthly)
        logger.info("Month %d aggregated from weeks %d-%d",
                     month_num, week_num - 3, week_num)

    save_history(history)

    # Build response with all levels
    return {
        "week": weekly_summary,
        "monthly": history["months"][-1] if history["months"] else None,
        "all_time": {
            "total_weeks": len(history["weeks"]),
            "total_months": len(history["months"]),
            "total_records": history["total_records_processed"],
            "started_at": history["started_at"],
            "irec_trend": _compute_all_time_trend(history["weeks"]),
        },
        "learning": learner.get_learning_summary(),
    }


def get_weekly_history(limit: int = 52) -> dict:
    """Get the accumulated weekly history (for charts/dashboard)."""
    history = load_history()

    weeks = history.get("weeks", [])
    return {
        "total_weeks": len(weeks),
        "total_months": len(history.get("months", [])),
        "total_records": history.get("total_records_processed", 0),
        "started_at": history.get("started_at"),
        "weeks": weeks[-limit:],
        "months": history.get("months", [])[-limit // 4:],
        "chart_data": _format_for_chart(weeks),
    }


def _build_weekly_summary(
    week_num: int, label: str, total: int, clean: int,
    irec_results: list, preproc_stats: dict, nlp_stats: dict,
    community_stats: dict, risk_stats: dict,
) -> dict:
    return {
        "week": week_num,
        "label": label,
        "processed_at": datetime.utcnow().isoformat(),
        "records_raw": total,
        "records_clean": clean,
        "spam_removed": preproc_stats.get("spam_removed", 0),
        "high_association": community_stats.get("high_association", 0),
        "medium_association": community_stats.get("medium_association", 0),
        "irec": irec_results[0] if irec_results else {"irec_value": 0, "irec_level": "sin_tendencia"},
        "alerts": risk_stats.get("alerts_triggered", 0),
    }


def _build_monthly_summary(month_num: int, weeks: list[dict]) -> dict:
    irec_values = [w["irec"]["irec_value"] for w in weeks if w.get("irec")]
    avg_irec = sum(irec_values) / len(irec_values) if irec_values else 0
    total_alerts = sum(w.get("alerts", 0) for w in weeks)
    total_records = sum(w.get("records_raw", 0) for w in weeks)

    # Determine monthly IREC level
    from src.irec.utils.constants import IREC_LEVELS
    level = "sin_tendencia"
    for (lo, hi), label in IREC_LEVELS.items():
        if lo <= round(avg_irec) <= hi:
            level = label
            break

    return {
        "month": month_num,
        "year_month": f"{datetime.utcnow().year}-{month_num:02d}",
        "weeks_included": len(weeks),
        "avg_irec": round(avg_irec, 1),
        "irec_level": level,
        "total_alerts": total_alerts,
        "total_records": total_records,
        "week_labels": [w["label"] for w in weeks],
        "irec_values": [w["irec"]["irec_value"] for w in weeks if w.get("irec")],
    }


def _compute_all_time_trend(weeks: list[dict]) -> dict:
    """Compute overall trend from all weekly data."""
    if len(weeks) < 2:
        return {"direction": "insufficient_data", "confidence": 0.0}

    values = [w["irec"]["irec_value"] for w in weeks if w.get("irec")]
    if len(values) < 2:
        return {"direction": "stable", "confidence": 0.0}

    from src.irec.temporal.trend_detector import detect_trend
    # Build mock windows for trend detection
    mock_windows = [
        {"aggregation": {"avg_risk_score": v}}
        for v in values
    ]
    trend = detect_trend(mock_windows)
    return {
        "direction": trend["trend"],
        "confidence": trend["confidence"],
        "first_value": values[0],
        "last_value": values[-1],
    }


def _format_for_chart(weeks: list[dict]) -> dict:
    """Format weekly data for frontend charts."""
    return {
        "labels": [w["label"] for w in weeks],
        "irec_values": [w["irec"]["irec_value"] for w in weeks if w.get("irec")],
        "records": [w["records_clean"] for w in weeks],
        "alerts": [w.get("alerts", 0) for w in weeks],
    }
