"""Test Fase 8: IREC Risk Pipeline."""
from datetime import datetime, timedelta
from src.irec.risk import RiskPipeline

# Simulate 30 records over 30 days with increasing risk
base = datetime(2026, 4, 1)
records = []
for i in range(30):
    risk = 0.2 + (i * 0.02)
    records.append({
        "text_content": f"post {i}",
        "timestamp": (base + timedelta(days=i)).isoformat(),
        "overall_risk_score": min(0.9, risk),
        "sentiment_score": min(0.9, -0.1 - (i * 0.02)),
        "dominant_emotion": "estres_academico" if i % 3 == 0 else "agotamiento_emocional",
        "emotion_scores": {
            "estres_academico": min(0.8, 0.1 + i * 0.02),
            "agotamiento_emocional": min(0.7, 0.05 + i * 0.02),
        },
        "family_scores": {
            "presion_academica": min(0.8, 0.1 + i * 0.025),
            "malestar_interno": min(0.5, 0.05 + i * 0.01),
            "protectoras": max(0.05, 0.3 - i * 0.01),
        },
        "risk_level": "bajo" if i < 10 else ("medio" if i < 20 else "alto"),
        "community_institutions": [
            {"institution_id": "inst_001", "institution_name": "Universidad Nacional"}
        ],
        "association_level": "high",
    })

pipeline = RiskPipeline(window_days=7)
results = pipeline.analyze(records)

print(f"Communities: {pipeline.stats['total_communities']}")
print(f"Windows: {pipeline.stats['total_windows']}")
print(f"Alerts: {pipeline.stats['alerts_triggered']}")
print()

if results:
    r = results[-1]
    print(f"Community: {r['community_name']}")
    print(f"Window: {r['time_window_start']} to {r['time_window_end']}")
    print(f"Records in window: {r['window_record_count']}")
    print(f"IREC: {r['irec_value']:.1f} ({r['irec_level']})")
    print(f"  Base: {r['base_irec']:.1f} | Persistence: +{r['persistence_bonus']:.1f} | Protective: -{r['protective_penalty']:.1f}")
    print(f"Trend: {r['trend']['trend']} (growth: {r['trend']['growth_rate']:.2%})")
    print(f"Anomaly: {r['anomaly']['is_anomaly']}")
    print(f"Explanation: {r['explanation'][:120]}...")

print("\nFASE 8: OK")
