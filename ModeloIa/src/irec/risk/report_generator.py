from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from src.irec.config import settings

logger = logging.getLogger(__name__)


class OllamaReportGenerator:
    """Generates intelligent, context-aware institutional reports using Ollama.

    Unlike the basic string-based explanations in irec_calculator.py,
    this uses the LLM to produce detailed, specific, and actionable
    analysis summaries based on the actual aggregated data.
    """

    def __init__(self) -> None:
        try:
            import ollama
            self._ollama = ollama
        except ImportError:
            raise ImportError("ollama package not installed")

        self._client = self._ollama.Client(host=settings.ollama_base_url)
        self._model = settings.ollama_model
        self._prompts_dir = settings.prompts_dir
        logger.info("OllamaReportGenerator initialized | model=%s", self._model)

    def generate_report(self, irec_result: dict) -> str:
        """Generate an intelligent institutional report from IREC data.

        Args:
            irec_result: Full IREC result dict from RiskPipeline.analyze().

        Returns:
            Detailed report text in Spanish.
        """
        prompt = self._build_prompt(irec_result)

        try:
            response = self._client.generate(
                model=self._model,
                prompt=prompt,
                options={"temperature": 0.3, "num_predict": 1024},
            )
            return response.get("response", "")
        except Exception as e:
            logger.error("Ollama report generation failed: %s", e)
            return self._fallback_report(irec_result)

    def generate_batch_reports(
        self, irec_results: list[dict]
    ) -> list[dict]:
        """Generate reports for multiple communities/periods.

        Args:
            irec_results: List of IREC result dicts.

        Returns:
            List of dicts with original result + generated report.
        """
        reports = []
        for result in irec_results:
            try:
                report = self.generate_report(result)
                reports.append({**result, "llm_report": report})
            except Exception as e:
                logger.error("Failed report for %s: %s",
                             result.get("community_name"), e)
                reports.append({**result, "llm_report": self._fallback_report(result)})

        return reports

    def save_report(
        self, report_text: str, community_name: str, output_path: Optional[Path] = None
    ) -> Path:
        """Save a generated report to a markdown file."""
        if output_path is None:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            safe_name = community_name.lower().replace(" ", "_")[:50]
            output_path = (
                settings.data_dir / "analytics" / "irec_scores" /
                f"report_{safe_name}_{timestamp}.md"
            )

        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(f"# Informe IREC - {community_name}\n\n")
            f.write(f"*Generado: {datetime.utcnow().isoformat()}*\n\n")
            f.write("---\n\n")
            f.write(report_text)
            f.write("\n\n---\n\n")
            f.write("*Informe generado automáticamente por el sistema IREC. ")
            f.write("No contiene información clínica ni identificación de personas.*\n")

        logger.info("Report saved to %s", output_path)
        return output_path

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _build_prompt(self, data: dict) -> str:
        """Build a detailed prompt from IREC result data."""
        prompt_path = self._prompts_dir / "reports" / "executive_summary_prompt.txt"
        template = prompt_path.read_text(encoding="utf-8")

        # Format indicator breakdown
        breakdown = data.get("breakdown", {})
        indicators_text = "\n".join(
            f"  - {k.replace('_', ' ')}: {v:.1f}%"
            for k, v in sorted(breakdown.items(), key=lambda x: x[1], reverse=True)
        ) if breakdown else "  - Sin datos de indicadores"

        # Format topics
        topics = data.get("window_aggregation", {}).get("top_topics", [])
        topics_text = "\n".join(
            f"  - {t.get('topic', t)}: {t.get('count', '?')} menciones"
            for t in (topics if isinstance(topics, list) else [])
        ) if topics else "  - Sin datos de temas"

        # Format protective signals (inverse of protective_penalty)
        protective_score = data.get("protective_score", 0)
        protective_text = (
            f"Señales protectoras detectadas (puntuación: {protective_score:.2f})"
            if protective_score > 0.1
            else "Señales protectoras bajas o ausentes"
        )

        # Trend
        trend = data.get("trend", {})
        trend_direction = trend.get("trend", "stable")
        growth_rate = trend.get("growth_rate", 0) * 100

        return template.format(
            community_name=data.get("community_name", "Desconocida"),
            period_start=data.get("time_window_start", "?"),
            period_end=data.get("time_window_end", "?"),
            irec_value=data.get("irec_value", 0),
            irec_level=data.get("irec_level", "sin_tendencia"),
            total_records=data.get("window_record_count", 0),
            relevant_records=data.get("window_record_count", 0),
            trend_direction=trend_direction,
            growth_rate=f"{growth_rate:.1f}",
            persistence=data.get("persistence", 0) * 100,
            is_anomaly=data.get("anomaly", {}).get("is_anomaly", False),
            risk_indicators=indicators_text,
            dominant_topics=topics_text,
            protective_signals=protective_text,
            platform_distribution="Datos sintéticos (Reddit, YouTube, Instagram, TikTok, Facebook)",
        )

    def _fallback_report(self, data: dict) -> str:
        """Generate a basic fallback report without LLM."""
        irec = data.get("irec_value", 0)
        level = data.get("irec_level", "sin_tendencia")
        trend = data.get("trend", {}).get("trend", "stable")

        return (
            f"## Informe IREC - {data.get('community_name', 'Comunidad')}\n\n"
            f"**IREC:** {irec:.1f}/100 ({level})\n"
            f"**Tendencia:** {trend}\n"
            f"**Período:** {data.get('time_window_start', '?')} a {data.get('time_window_end', '?')}\n\n"
            f"*Informe básico generado sin LLM.*\n"
        )
