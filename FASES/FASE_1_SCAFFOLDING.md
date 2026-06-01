# Fase 1: Scaffolding — Documentación

**Fecha:** Mayo 2026
**Estado:** ✅ Completada
**Objetivo:** Establecer la estructura base del proyecto, configuración, schemas y conexiones a bases de datos.

---

## ¿Qué se construyó?

### 1. Estructura de directorios

Se creó la jerarquía completa de carpetas bajo `ModeloIa/` siguiendo la arquitectura por capas aprobada:

```
ModeloIa/
├── data/           ← 4 zonas (raw, standardized, processed, analytics)
├── src/irec/       ← Paquete Python principal (20 submódulos)
├── models/         ← Artefactos de ML (pretrained, fine_tuned, baselines)
├── prompts/        ← Plantillas para Ollama (synthetic_generation, labeling, reports)
├── pipelines/      ← Configs YAML de pipelines
├── scripts/        ← Scripts de ejecución
├── tests/          ← Unit, integration, validation
├── deployment/     ← Solo docker/
├── experiments/    ← Notebooks y experimentos
└── reports/        ← Reportes generados
```

**Decisión clave:** Se mantuvo el paquete `src/emociones_ciudad` (sistema anterior) sin modificar. El nuevo sistema vive en `src/irec/`, completamente independiente.

### 2. Sistema de configuración

**Archivo:** `src/irec/config/settings.py`

- Usa `pydantic-settings` para cargar desde `.env`
- Todas las variables tipadas (host, puertos, credenciales)
- Propiedades computadas: `postgres_url`, `data_dir`, `models_dir`
- Configuración centralizada, un solo punto de verdad

**Archivo:** `.env.example` — template con todas las variables documentadas.

### 3. Sistema de logging

**Archivo:** `src/irec/config/logging_config.py`

- Handler dual: consola + archivo (`logs/app.log`)
- Formato: timestamp | nivel | módulo:línea | mensaje
- Silencia loggers ruidosos de terceros (httpx, chromadb, urllib3)

### 4. Schemas de datos (modelos Pydantic)

**Archivo:** `src/irec/schemas/social_digital_record.py`

5 modelos principales:

| Schema | Propósito |
|---|---|
| `SocialDigitalRecord` | Representación unificada de cualquier contenido digital (post, comentario, caption) |
| `NLPAnalysisResult` | Resultado del pipeline NLP (emociones, temas, riesgo, embedding) |
| `CommunityAssociation` | Resultado de asociación a comunidad educativa |
| `IRECScore` | Índice de Riesgo Emocional Comunitario completo |
| `EngagementMetrics` | Métricas de interacción (likes, replies, shares) |

**Enums definidos:** `Platform`, `SourceType`, `MediaType`, `ProcessingStatus`

**Método clave:** `SocialDigitalRecord.to_enriched_text()` — Combina título, texto, descripción, hashtags, OCR y caption en un solo texto analizable.

### 5. Clientes de base de datos

**PostgreSQL** (`src/irec/storage/postgres_client.py`):
- SQLAlchemy async con asyncpg
- `Base` declarativa para modelos ORM
- `async_session_factory` con pool de conexiones
- Funciones `init_db()` y `close_db()` para ciclo de vida

**ChromaDB** (`src/irec/storage/chromadb_client.py`):
- Cliente persistente singleton
- `get_or_create_collection()` para namespaces de embeddings

### 6. Constantes del dominio

**Archivo:** `src/irec/utils/constants.py`

Define todo el conocimiento del dominio en un solo lugar:

- `EMOTION_CATEGORIES` (15 emociones)
- `EMOTION_FAMILIES` (4 familias de agregación)
- `RISK_INDICATORS` (7 indicadores con keywords)
- `PROTECTIVE_INDICATORS` (4 indicadores positivos)
- `IREC_WEIGHTS` (pesos calibrables)
- `IREC_LEVELS` (5 niveles categóricos)
- `TOPIC_TAXONOMY` (20 temas)
- `COMMUNITY_SIGNAL_WEIGHTS` (5 señales de asociación)
- `SPANISH_STOPWORDS` (~100 palabras)

### 7. API skeleton

**Archivo:** `src/irec/api/main.py`

- FastAPI app con título y descripción
- CORS configurado para desarrollo
- Endpoint `GET /health` funcional

---

## Decisiones técnicas tomadas

| Decisión | Justificación |
|---|---|
| `pydantic-settings` sobre `os.getenv` | Validación automática, tipado fuerte, .env integrado |
| SQLAlchemy async | Consistente con FastAPI async, mejor rendimiento en I/O |
| ChromaDB sobre FAISS | Persistencia nativa sin configuración adicional |
| Schemas Pydantic puros (no ORM acoplado) | Separación de capas, los schemas de dominio no dependen de la BD |
| Constantes en `utils/constants.py` | Fuente única de verdad para categorías, evita duplicación |
| Inglés para código, español para datos | Convención del proyecto: nombres técnicos en inglés, contenido en español |

---

## Lo que NO se hizo en esta fase

- No se implementaron modelos ORM de SQLAlchemy (se hará cuando se necesiten tablas concretas)
- No se configuró Alembic para migraciones (se agregará al crear las tablas)
- No se creó el entrypoint `main.py` definitivo (el viejo sigue apuntando a `emociones_ciudad`)

---

## Cómo verificar esta fase

```bash
cd ModeloIa
python -c "from src.irec.config import settings; print(settings.app_name)"
python -c "from src.irec.schemas import SocialDigitalRecord; print(SocialDigitalRecord.schema())"
```

---

*Siguiente fase: Fase 2 — Generación de datos sintéticos con Ollama*
