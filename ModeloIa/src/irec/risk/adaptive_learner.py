from __future__ import annotations

import json
import logging
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Optional

from src.irec.config import settings
from src.irec.utils.constants import (
    EMOTION_CATEGORIES,
    IREC_WEIGHTS,
    PROTECTIVE_INDICATORS,
    RISK_INDICATORS,
    SPANISH_STOPWORDS,
    TOPIC_TAXONOMY,
)

logger = logging.getLogger(__name__)

LEARNING_FILE = settings.data_dir / "analytics" / "temporal_series" / "learning_state.json"


class AdaptiveLearner:
    """Sistema de aprendizaje adaptativo que mejora con cada semana de datos.

    Sin necesidad de GPU ni entrenamiento supervisado, el sistema:
    1. Detecta palabras emergentes que aparecen en posts de alto riesgo
    2. Ajusta pesos IREC según qué indicadores correlacionan con alertas
    3. Recalibra la línea base de "normalidad" por comunidad
    4. Expande el léxico con nuevos términos del dominio

    Esto permite que la semana 24 tenga mejores predicciones que la semana 1.
    """

    def __init__(self):
        self.state = self._load_state()

    def learn_from_week(self, analyzed_records: list[dict]) -> dict:
        """Aprender de los datos procesados de esta semana.

        Args:
            analyzed_records: Registros ya procesados por NLP + comunidad.

        Returns:
            Dict con las mejoras aplicadas esta semana.
        """
        improvements = {}

        # 1. Extraer palabras frecuentes en posts de alto riesgo
        high_risk_words = self._extract_high_risk_vocabulary(analyzed_records)
        if high_risk_words:
            self._expand_risk_lexicon(high_risk_words)
            improvements["new_risk_words"] = list(high_risk_words)[:10]

        # 2. Ajustar pesos IREC según correlación con alertas
        weight_adjustments = self._calibrate_irec_weights(analyzed_records)
        if weight_adjustments:
            self.state["calibrated_weights"] = weight_adjustments
            improvements["weight_adjustments"] = weight_adjustments

        # 3. Actualizar línea base por comunidad
        baseline_updates = self._update_community_baselines(analyzed_records)
        if baseline_updates:
            improvements["baseline_updates"] = baseline_updates

        # 4. Detectar temas emergentes
        emerging_topics = self._detect_emerging_topics(analyzed_records)
        if emerging_topics:
            improvements["emerging_topics"] = emerging_topics

        # Guardar estado de aprendizaje
        self.state["last_updated"] = datetime.utcnow().isoformat()
        self.state["total_weeks_learned"] = self.state.get("total_weeks_learned", 0) + 1
        self.state["total_records_seen"] = (
            self.state.get("total_records_seen", 0) + len(analyzed_records)
        )
        self._save_state()

        logger.info(
            "Week %d learning complete: %d improvements",
            self.state["total_weeks_learned"],
            len(improvements),
        )
        return improvements

    def get_adapted_weights(self) -> dict:
        """Obtener pesos IREC adaptados (combinan originales + calibrados)."""
        base = dict(IREC_WEIGHTS)
        calibrated = self.state.get("calibrated_weights", {})
        for k, v in calibrated.items():
            if k in base:
                base[k] = round((base[k] + v) / 2, 3)  # 50% original, 50% aprendido
        return base

    def get_community_baseline(self, community_id: str) -> dict:
        """Obtener línea base aprendida para una comunidad específica."""
        baselines = self.state.get("community_baselines", {})
        return baselines.get(community_id, {
            "avg_risk": 0.3,
            "weeks_tracked": 0,
            "dominant_emotion": "neutro",
        })

    def get_learning_summary(self) -> dict:
        """Resumen del estado de aprendizaje para reportes."""
        return {
            "weeks_learned": self.state.get("total_weeks_learned", 0),
            "records_seen": self.state.get("total_records_seen", 0),
            "risk_words_learned": len(self.state.get("learned_risk_words", [])),
            "calibrated_weights": self.state.get("calibrated_weights", {}),
            "communities_tracked": len(self.state.get("community_baselines", {})),
            "last_updated": self.state.get("last_updated"),
        }

    # ------------------------------------------------------------------
    # Internal learning mechanisms
    # ------------------------------------------------------------------

    def _extract_high_risk_vocabulary(self, records: list[dict]) -> set[str]:
        """Encontrar palabras que aparecen consistentemente en posts de alto riesgo."""
        risk_words: Counter = Counter()
        normal_words: Counter = Counter()

        for rec in records:
            text = rec.get("anonymized_text") or rec.get("cleaned_text", "")
            if not text:
                continue

            words = [w for w in text.lower().split()
                     if len(w) > 3 and w not in SPANISH_STOPWORDS]

            if rec.get("overall_risk_score", 0) > 0.4:
                for w in words:
                    risk_words[w] += 1
            else:
                for w in words:
                    normal_words[w] += 1

        # Words that appear much more in high-risk than normal posts
        new_risk_words: set[str] = set()
        for word, count in risk_words.most_common(50):
            normal_count = normal_words.get(word, 1)
            ratio = count / normal_count
            if ratio > 2.0 and count >= 3:  # 2x more common in risk posts
                new_risk_words.add(word)

        return new_risk_words

    def _expand_risk_lexicon(self, new_words: set[str]) -> None:
        """Agregar nuevas palabras al léxico de indicadores de riesgo."""
        learned = set(self.state.get("learned_risk_words", []))

        truly_new = new_words - learned
        if truly_new:
            learned.update(truly_new)
            self.state["learned_risk_words"] = sorted(learned)
            logger.info("Learned %d new risk-associated words", len(truly_new))

    def _calibrate_irec_weights(self, records: list[dict]) -> dict:
        """Ajustar pesos IREC según qué indicadores realmente predicen riesgo alto.

        Si 'aislamiento_social' aparece en el 80% de posts de alto riesgo
        pero solo en el 10% de posts normales, su peso debería subir.
        """
        high_risk_records = [r for r in records if r.get("overall_risk_score", 0) > 0.4]
        if len(high_risk_records) < 5:
            return {}

        indicator_presence_risk: Counter = Counter()
        indicator_presence_normal: Counter = Counter()
        normal_records = [r for r in records if r.get("overall_risk_score", 0) <= 0.4]

        for rec in high_risk_records:
            for ind in rec.get("active_risks", []):
                indicator_presence_risk[ind] += 1

        for rec in normal_records:
            for ind in rec.get("active_risks", []):
                indicator_presence_normal[ind] += 1

        adjustments = {}
        for indicator in IREC_WEIGHTS:
            risk_count = indicator_presence_risk.get(indicator, 0)
            normal_count = indicator_presence_normal.get(indicator, 1)
            ratio = risk_count / max(normal_count, 1)

            if ratio > 1.5 and risk_count >= 3:
                # This indicator is strongly associated with high risk → increase weight
                current = IREC_WEIGHTS.get(indicator, 0.1)
                adjustments[indicator] = round(min(0.35, current * 1.3), 3)
            elif ratio < 0.5 and risk_count < 2:
                # This indicator rarely appears in high risk → decrease weight
                current = IREC_WEIGHTS.get(indicator, 0.1)
                adjustments[indicator] = round(max(0.05, current * 0.7), 3)

        return adjustments

    def _update_community_baselines(self, records: list[dict]) -> dict:
        """Actualizar línea base por comunidad basada en datos observados."""
        baselines = self.state.setdefault("community_baselines", {})
        updates = {}

        # Group by community
        communities: dict[str, list] = {}
        for rec in records:
            cid = rec.get("community_id", "unknown")
            if cid not in communities:
                communities[cid] = []
            communities[cid].append(rec)

        for cid, comm_records in communities.items():
            avg_risk = sum(r.get("overall_risk_score", 0) for r in comm_records) / len(comm_records)

            emotions = Counter()
            for r in comm_records:
                em = r.get("dominant_emotion", "neutro")
                emotions[em] += 1

            dominant = emotions.most_common(1)[0][0] if emotions else "neutro"

            if cid in baselines:
                # Exponential moving average: 70% old, 30% new
                old = baselines[cid]["avg_risk"]
                baselines[cid]["avg_risk"] = round(old * 0.7 + avg_risk * 0.3, 4)
                baselines[cid]["dominant_emotion"] = dominant
                baselines[cid]["weeks_tracked"] += 1
            else:
                baselines[cid] = {
                    "avg_risk": round(avg_risk, 4),
                    "dominant_emotion": dominant,
                    "weeks_tracked": 1,
                }

            updates[cid] = baselines[cid]

        return updates

    def _detect_emerging_topics(self, records: list[dict]) -> list[str]:
        """Detectar temas que están apareciendo más esta semana vs histórico."""
        current_topics: Counter = Counter()
        for rec in records:
            for topic in rec.get("topics", []):
                current_topics[topic] += 1

        historical = self.state.get("topic_history", {})
        emerging = []

        for topic, count in current_topics.most_common(10):
            hist_avg = historical.get(topic, {}).get("avg_per_week", 0)
            if hist_avg > 0 and count > hist_avg * 1.5:
                emerging.append(topic)

            # Update history
            if topic not in historical:
                historical[topic] = {"total": 0, "weeks": 0, "avg_per_week": 0}
            historical[topic]["total"] += count
            historical[topic]["weeks"] += 1
            historical[topic]["avg_per_week"] = round(
                historical[topic]["total"] / historical[topic]["weeks"], 1
            )

        self.state["topic_history"] = historical
        return emerging

    def _load_state(self) -> dict:
        if LEARNING_FILE.exists():
            with open(LEARNING_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}

    def _save_state(self) -> None:
        LEARNING_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(LEARNING_FILE, "w", encoding="utf-8") as f:
            json.dump(self.state, f, ensure_ascii=False, indent=2, default=str)
