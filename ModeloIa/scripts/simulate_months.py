from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.irec.config import setup_logging, settings
from src.irec.synthetic_generation import SyntheticDataGenerator
from src.irec.ingestion import ingest_all
from src.irec.preprocessing import PreprocessingPipeline
from src.irec.nlp import NLPPipeline
from src.irec.vision import VisionPipeline
from src.irec.community import CommunityPipeline
from src.irec.risk import RiskPipeline, OllamaReportGenerator

setup_logging()


def simulate_months(num_months: int = 6, posts_per_day: int = 15):
    """Simulate N months of social media activity and produce progressive IREC reports.

    For each month:
    1. Generate synthetic data for that month
    2. Run full pipeline
    3. Calculate IREC
    4. Generate report
    5. Save progressive results
    """
    print(f"\n{'='*60}")
    print(f"  IREC SIMULATION: {num_months} MONTHS")
    print(f"{'='*60}\n")

    all_monthly_results = []
    today = datetime(2026, 1, 1)

    gen = SyntheticDataGenerator()
    preproc = PreprocessingPipeline()
    nlp = NLPPipeline()
    vision = VisionPipeline()
    community = CommunityPipeline()

    for month in range(1, num_months + 1):
        print(f"\n--- MES {month}/{num_months} ---")

        # Generate data for this month
        total_posts = posts_per_day * 30
        print(f"  1. Generando ~{total_posts} posts para {5} plataformas...")

        all_records = []
        for platform in ["reddit", "instagram", "tiktok", "facebook", "youtube"]:
            count = max(3, total_posts // 5)
            try:
                records = gen.generate_for_platform(platform, count=count)
                all_records.extend(records)
            except Exception as e:
                print(f"     {platform}: SKIPPED ({e})")

        if not all_records:
            print("  No data generated, skipping month")
            continue

        # Ingest: simulate by wrapping raw records into SDR-like dicts
        # (in production, this would call ingest_all())
        processed_for_pipeline = []
        for item in all_records:
            record = item.get("data", item)
            text = (
                record.get("selftext") or record.get("body") or
                record.get("caption") or record.get("text") or
                record.get("post_text") or record.get("text_content", "")
            )
            if not text:
                continue

            # Assign random day within this month
            day_offset = hash(text) % 30
            ts = today + timedelta(days=day_offset)

            processed_for_pipeline.append({
                "text_content": str(text)[:500],
                "timestamp": ts.isoformat(),
                "pseudo_user_id": f"sim_{hash(text) % 10000:04d}",
                "hashtags": record.get("hashtags", []),
            })

        print(f"  2. Pipeline: {len(processed_for_pipeline)} records")

        # Preprocess
        clean = preproc.process_records(processed_for_pipeline)
        print(f"  3. Preprocesados: {len(clean)} clean")

        # NLP
        analyzed = nlp.analyze_batch(clean)
        print(f"  4. NLP: {len(analyzed)} analyzed")

        # Vision
        with_vision = vision.analyze_batch(analyzed)

        # Community
        with_community = community.analyze_batch(with_vision)

        # Add dummy community institution for aggregation
        for rec in with_community:
            if not rec.get("community_institutions"):
                rec["community_institutions"] = [
                    {"institution_id": "inst_001", "institution_name": "Universidad Nacional"}
                ]

        # IREC
        risk = RiskPipeline(window_days=7)
        irec_results = risk.analyze(with_community)
        print(f"  5. IREC: {len(irec_results)} windows, {risk.stats['alerts_triggered']} alerts")

        # Save monthly result
        month_summary = {
            "month": month,
            "year_month": today.strftime("%Y-%m"),
            "total_posts": len(processed_for_pipeline),
            "clean_posts": len(clean),
            "irec_windows": len(irec_results),
            "alerts": risk.stats["alerts_triggered"],
            "irec_results": irec_results,
        }
        all_monthly_results.append(month_summary)

        # Print monthly summary
        if irec_results:
            latest = irec_results[-1]
            print(f"\n  📊 IREC Mes {month}: {latest['irec_value']:.1f}/100 ({latest['irec_level']})")
            print(f"     Tendencia: {latest['trend']['trend']}")
            print(f"     Alertas: {risk.stats['alerts_triggered']}")

        today += timedelta(days=30)

    # Save all results
    output_path = settings.data_dir / "analytics" / "irec_scores" / "simulation_6months.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({
            "simulation": {
                "months": num_months,
                "posts_per_day": posts_per_day,
                "generated_at": datetime.utcnow().isoformat(),
            },
            "monthly_results": all_monthly_results,
        }, f, ensure_ascii=False, indent=2, default=str)

    # Print evolution table
    print(f"\n{'='*60}")
    print(f"  EVOLUCIÓN IREC - {num_months} MESES")
    print(f"{'='*60}")
    print(f"{'Mes':<6} {'Publicaciones':<16} {'IREC':<10} {'Nivel':<16} {'Alertas':<8}")
    print("-" * 56)
    for m in all_monthly_results:
        if m["irec_results"]:
            latest = m["irec_results"][-1]
            print(f"{m['month']:<6} {m['total_posts']:<16} {latest['irec_value']:<10.1f} {latest['irec_level']:<16} {m['alerts']:<8}")

    print(f"\n✅ Simulación completa. Resultados guardados en: {output_path}")
    print(f"   Ejecuta la API y consulta /api/reports/evolution para ver los datos.\n")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Simulate N months of IREC analysis")
    parser.add_argument("--months", type=int, default=6, help="Number of months to simulate")
    parser.add_argument("--posts-per-day", type=int, default=15, help="Posts per day per platform")
    args = parser.parse_args()

    simulate_months(args.months, args.posts_per_day)
