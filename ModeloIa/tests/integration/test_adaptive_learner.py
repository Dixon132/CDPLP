"""Test adaptive learner across 4 weeks."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.irec.risk.adaptive_learner import AdaptiveLearner

learner = AdaptiveLearner()

for week in range(1, 5):
    records = [
        {
            "cleaned_text": f"no puedo mas con los parciales en la universidad, estoy agotado semana {week}",
            "overall_risk_score": 0.7,
            "dominant_emotion": "estres_academico",
            "active_risks": ["estres_academico", "agotamiento_emocional"],
            "topics": ["estres_academico"],
            "community_id": "universidad_nacional",
        },
        {
            "cleaned_text": f"me siento solo, nadie me habla en clases semana {week}",
            "overall_risk_score": 0.6,
            "dominant_emotion": "aislamiento_social",
            "active_risks": ["aislamiento_social"],
            "topics": ["soledad_aislamiento"],
            "community_id": "universidad_nacional",
        },
        {
            "cleaned_text": f"hoy me fue bien en el examen, estoy feliz semana {week}",
            "overall_risk_score": 0.1,
            "dominant_emotion": "neutro",
            "active_risks": [],
            "topics": ["examenes"],
            "community_id": "universidad_nacional",
        },
    ]
    imp = learner.learn_from_week(records)
    print(f"Week {week}: improvements={list(imp.keys())}")

print()
summary = learner.get_learning_summary()
print(f"Learning summary:")
print(f"  Weeks learned: {summary['weeks_learned']}")
print(f"  Records seen: {summary['records_seen']}")
print(f"  Risk words learned: {summary['risk_words_learned']}")
print(f"  Communities tracked: {summary['communities_tracked']}")

baseline = learner.get_community_baseline("universidad_nacional")
print(f"  Community baseline avg_risk: {baseline['avg_risk']}")

adapted_weights = learner.get_adapted_weights()
print(f"  Adapted weights: {dict(list(adapted_weights.items())[:3])}...")

print("\nADAPTIVE LEARNER: OK")
