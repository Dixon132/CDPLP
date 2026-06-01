# Fase 8: Temporal + Riesgo (IREC) — Documentación

**Fecha:** Mayo 2026
**Estado:** ✅ Completada
**Objetivo:** Implementar el motor temporal y el Índice de Riesgo Emocional Comunitario (IREC), el corazón analítico del sistema.

---

## ¿Qué se construyó?

### 6 módulos

| Módulo | Archivo | Funcionalidad |
|---|---|---|
| Time Window Builder | `temporal/time_window_builder.py` | Agrupa registros en ventanas temporales + agrega métricas |
| Trend Detector | `temporal/trend_detector.py` | Detecta tendencias (regresión lineal), anomalías (Z-score), persistencia |
| IREC Calculator | `risk/irec_calculator.py` | Calcula el IREC con pesos, bonos, penalizaciones + explicación |
| **RiskPipeline** | `risk/risk_pipeline.py` | Orquestador: comunidades → ventanas → tendencias → IREC |

### Flujo completo del motor de riesgo

```
┌─────────────────────────────────────────────────────────────────┐
│                      RiskPipeline                               │
│                                                                 │
│  analyze(records):                                              │
│                                                                 │
│  STEP 1: group_by_community(records)                            │
│  └─> Agrupa por institution_id (o association_level)           │
│                                                                 │
│  STEP 2: build_time_windows(records, 7d)                       │
│  └─> Ventanas no solapadas de 7, 14 o 30 días                  │
│  └─> Cada ventana: {start, end, records}                       │
│                                                                 │
│  STEP 3: aggregate_window_emotions(window)                     │
│  └─> Promedios: sentiment, risk_score, emotions, families      │
│  └─> Distribución: risk_levels, topics                         │
│  └─> Emoción dominante (moda)                                  │
│                                                                 │
│  STEP 4: calculate_baseline(windows)                            │
│  └─> Media y desviación estándar históricas                     │
│                                                                 │
│  STEP 5: detect_trend(windows)                                  │
│  └─> Regresión lineal simple sobre últimas N ventanas          │
│  └─> Dirección: increasing / decreasing / stable                │
│  └─> Confianza: R²                                             │
│                                                                 │
│  STEP 6: detect_anomaly(windows)                                │
│  └─> Z-score de la última ventana vs histórico                 │
│  └─> is_anomaly si |z| > 2.0                                   │
│                                                                 │
│  STEP 7: compute_persistence(windows)                           │
│  └─> % de ventanas por encima de la media                      │
│                                                                 │
│  STEP 8: calculate_irec(families, persistence, trend)          │
│  └─> IREC = Σ(familia × peso) × trend_factor                   │
│             + persistence_bonus - protective_penalty            │
│  └─> Escala: 0-100                                             │
│  └─> Niveles: sin_tendencia, leve, moderada, elevada, critica  │
│                                                                 │
│  STEP 9: generate_irec_explanation(irec)                        │
│  └─> Texto en español explicando el resultado                   │
└─────────────────────────────────────────────────────────────────┘
```

### Fórmula IREC

```
IREC = base_irec × trend_factor + persistence_bonus − protective_penalty

Donde:
  base_irec = Σ(family_score × weight) × 100
  trend_factor = 1.15 si tendencia creciente, 1.0 si no
  persistence_bonus = persistence_score × 10  (máx +10)
  protective_penalty = protective_score × 15  (máx −15)
```

### Resultado de prueba

```
Community: Universidad Nacional
Window: 2026-04-29 to 2026-05-06
IREC: 61.0 → elevada
  Base: 48.5 | Persistence: +6.0 | Protective: -0.8
Trend: increasing (+196%)
Alerts: 1 triggered
Explanation: "Se observa una tendencia elevada de riesgo emocional.
Se recomienda activar medidas preventivas institucionales."
```

---

## Verificación

```bash
cd ModeloIa
$env:PYTHONPATH="."
python tests/integration/test_irec_pipeline.py
```

---

*Siguiente fase: Fase 9 — REST API (FastAPI endpoints)*
