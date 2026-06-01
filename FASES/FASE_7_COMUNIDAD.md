# Fase 7: Comunidad — Documentación

**Fecha:** Mayo 2026
**Estado:** ✅ Completada
**Objetivo:** Asociar contenido digital a comunidades educativas mediante scoring probabilístico basado en señales textuales.

---

## ¿Qué se construyó?

### 3 módulos

| Módulo | Archivo | Funcionalidad |
|---|---|---|
| Institution Matcher | `institution_matcher.py` | Registro de 5 instituciones + 25 señales educativas genéricas |
| Association Scorer | `association_scorer.py` | Scoring ponderado de asociación institucional |
| **CommunityPipeline** | `community_pipeline.py` | Orquestador que enriquece registros con datos comunitarios |

### Sistema de scoring

```
Score de asociación = Σ (señal × peso)

Señales (con pesos de COMMUNITY_SIGNAL_WEIGHTS):
├── institution_mention (0.35)  ← nombre explícito o acrónimo
├── hashtag_match      (0.20)  ← hashtag institucional
├── faculty_mention    (0.15)  ← facultad específica
├── campus_mention     (0.10)  ← sede o campus
└── language_match     (0.10)  ← señales educativas genéricas

Niveles de asociación:
├── high   (≥0.6)  ← mención explícita de institución
├── medium (≥0.3)  ← señales fuertes sin nombre exacto
├── low    (≥1 señal genérica) ← contexto educativo general
└── none           ← sin señales educativas
```

### Ejemplos de asociación

| Texto | Nivel | Institución |
|---|---|---|
| "estudio ingeniería en la Universidad Nacional" | high | Universidad Nacional |
| "otra semana en #UTEC sin dormir" | high | Universidad Tecnológica |
| "estoy cansado de estudiar" | low | — (genérico) |
| "qué día tan bonito para la playa" | none | — |

### IMPORTANTE (principio ético)

Todas las asociaciones son **PROBABILÍSTICAS**. El sistema NUNCA afirma con certeza que un usuario pertenece a una institución. Solo indica que el contenido presenta señales de asociación.

---

## Verificación

```bash
python -c "from src.irec.community import get_community_summary; s=get_community_summary('estudio ingenieria en la Universidad Nacional'); print(s['association_level'])"  # high
```

---

*Siguiente fase: Fase 8 — Temporal + Riesgo (ventanas, tendencias, IREC)*
