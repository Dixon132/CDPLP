from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from src.irec.config import settings
from src.irec.temporal.time_window_builder import (
    aggregate_window_emotions,
    build_time_windows,
    group_by_community,
)
from src.irec.temporal.trend_detector import (
    calculate_baseline,
    compute_persistence,
    detect_anomaly,
    detect_trend,
)
from src.irec.risk.irec_calculator import calculate_irec, generate_irec_explanation

logger = logging.getLogger(__name__)


class RiskPipeline:
    """Calculates the IREC (Índice de Riesgo Emocional Comunitario).

    Full flow:
    1. Group records by community
    2. Build time windows (7, 14, 30 days)
    3. Aggregate emotions/risk per window
    4. Calculate baselines
    5. Detect trends and anomalies
    6. Calculate IREC score per community per window
    7. Generate explanations
    """

    def __init__(self, window_days: int = 7) -> None:
        self.window_days = window_days
        self.stats = {
            "total_communities": 0,
            "total_windows": 0,
            "alerts_triggered": 0,
        }

    def analyze(
        self,
        records: list[dict[str, Any]],
        community_key: str = "community_id",
    ) -> list[dict]:
        """Run full risk analysis pipeline.

        Args:
            records: NLP + community-analyzed records.
            community_key: Key to group by community.

        Returns:
            List of IREC results per community per window.
        """
        logger.info(
            "Starting risk analysis on %d records (window=%dd)",
            len(records), self.window_days,
        )

        # Group by community
        communities = group_by_community(records, community_key)
        self.stats["total_communities"] = len(communities)

        all_results: list[dict] = []

        for community_id, comm_records in communities.items():
            # Build time windows
            windows = build_time_windows(comm_records, self.window_days)
            self.stats["total_windows"] += len(windows)

            if not windows:
                continue

            # Aggregate each window
            for w in windows:
                w["aggregation"] = aggregate_window_emotions(w)

            # Calculate baseline
            baseline = calculate_baseline(windows)

            # Detect trends
            trend = detect_trend(windows)

            # Detect anomaly on latest window
            anomaly = detect_anomaly(windows) if len(windows) >= 2 else {"is_anomaly": False}

            # Compute persistence
            persistence = compute_persistence(windows)

            # Calculate IREC for latest window
            latest = windows[-1] if windows else {}
            latest_agg = latest.get("aggregation", {})
            family_scores = latest_agg.get("avg_families", {})

            trend_factor = 1.15 if trend.get("trend") == "increasing" else 1.0
            irec = calculate_irec(family_scores, persistence, trend_factor)
            explanation = generate_irec_explanation(irec)

            # Check for alerts
            if irec["irec_level"] in ("elevada", "critica"):
                self.stats["alerts_triggered"] += 1

            # Get community name
            community_name = community_id
            if comm_records:
                insts = comm_records[0].get("community_institutions", [])
                if insts:
                    community_name = insts[0].get("institution_name", community_id)

            result = {
                "community_id": community_id,
                "community_name": community_name,
                "time_window_start": latest.get("start"),
                "time_window_end": latest.get("end"),
                "window_record_count": latest.get("record_count", 0),
                **irec,
                "explanation": explanation,
                "trend": trend,
                "anomaly": anomaly,
                "persistence": persistence,
                "baseline": baseline,
                "window_aggregation": latest_agg,
                "created_at": datetime.utcnow().isoformat(),
            }

            all_results.append(result)

        logger.info(
            "Risk analysis complete: %d communities, %d windows, %d alerts",
            self.stats["total_communities"],
            self.stats["total_windows"],
            self.stats["alerts_triggered"],
        )
        return all_results

    def save_results(
        self,
        results: list[dict],
        output_path: Optional[Path] = None,
    ) -> Path:
        """Save IREC results to JSON."""
        if output_path is None:
            output_path = (
                settings.data_dir
                / "analytics"
                / "irec_scores"
                / f"irec_results_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
            )

        output_path.parent.mkdir(parents=True, exist_ok=True)

        output = {
            "metadata": {
                "generated_at": datetime.utcnow().isoformat(),
                "window_days": self.window_days,
                "statistics": self.stats,
            },
            "results": results,
        }

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2, default=str)

        logger.info("Saved %d IREC results to %s", len(results), output_path)
        return output_path

    def get_stats(self) -> dict[str, int]:
        return dict(self.stats)
