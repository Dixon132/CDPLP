# Fase 9: REST API — Documentación

**Fecha:** Mayo 2026
**Estado:** ✅ Completada
**Objetivo:** Exponer todo el sistema IREC mediante una API REST con FastAPI, lista para ser consumida por el dashboard institucional.

---

## Endpoints

### Health
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado general del servicio |
| GET | `/health/ready` | Disponibilidad de subsistemas (Ollama, OCR, embeddings) |

### Analytics (NLP en tiempo real)
| Método | Ruta | Parámetros | Descripción |
|---|---|---|---|
| GET | `/api/analytics/sentiment` | `text` | Análisis de sentimiento |
| GET | `/api/analytics/emotions` | `text` | Detección de emociones |
| GET | `/api/analytics/topics` | `text`, `top_n` | Clasificación temática |
| GET | `/api/analytics/risk` | `text` | Indicadores de riesgo |
| GET | `/api/analytics/full-analysis` | `text` | Análisis completo (sentimiento + emociones + temas + riesgo + comunidad) |

### IREC
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/irec/calculate` | Calcula IREC para todas las comunidades desde datos procesados |
| GET | `/api/irec/score` | Calcula IREC desde scores manuales (demo/testing) |
| GET | `/api/irec/levels` | Definiciones de niveles IREC |

### Comunidades
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/communities/analyze` | Analiza asociación comunitaria de un texto |
| GET | `/api/communities/institutions` | Lista instituciones registradas |
| GET | `/api/communities/signals` | Lista señales educativas genéricas |

### Reportes
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/reports/summary` | Reporte resumen de últimos N días |
| GET | `/api/reports/risk-distribution` | Distribución de niveles de riesgo |

---

## Iniciar servidor

```bash
cd ModeloIa
python main.py api
# → http://localhost:8000/docs (Swagger)
# → http://localhost:8000/redoc (ReDoc)
```

---

## Verificación

```bash
python -c "
from fastapi.testclient import TestClient
from src.irec.api.main import app
c = TestClient(app)
print('Health:', c.get('/health').json()['status'])
print('Sentiment:', c.get('/api/analytics/sentiment?text=estoy feliz').json()['label'])
print('Institutions:', c.get('/api/communities/institutions').json()['count'])
"
```

---

*Siguiente fase: Fase 10 — Tests + Validación*
