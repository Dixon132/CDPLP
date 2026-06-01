# Fase 3: Ingesta — Documentación

**Fecha:** Mayo 2026
**Estado:** ✅ Completada
**Objetivo:** Transformar datos crudos de cada plataforma (Reddit, YouTube, Instagram, TikTok, Facebook) al schema unificado `SocialDigitalRecord`.

---

## ¿Qué se construyó?

### 1. Loader base abstracto (`base_loader.py`)

**`BasePlatformLoader`** — Clase abstracta que define el contrato de todo loader:

```
┌─────────────────────────────────────────────────┐
│           BasePlatformLoader (ABC)               │
│                                                  │
│  platform: Platform    ← identificador           │
│                                                  │
│  load_file(path)       ← entry point público     │
│    └─> Lee JSON crudo                            │
│    └─> Itera sobre records                       │
│    └─> parse_item(item) por cada uno (abstract)  │
│    └─> _build_enriched_fields()                  │
│    └─> Retorna List[SocialDigitalRecord]         │
│                                                  │
│  parse_item(item)      ← ABSTRACTO (cada loader  │
│                            lo implementa)         │
│                                                  │
│  save_standardized()   ← Guarda en standardized/ │
└─────────────────────────────────────────────────┘
```

**Helpers compartidos:**

| Función | Propósito |
|---|---|
| `_hash_user_id(author)` | SHA256 del nombre de autor → `pseudo_xxxx` |
| `_safe_parse_timestamp(ts)` | Soporta Unix int, ISO string, 5 formatos |
| `_extract_hashtags(text)` | Extrae `#tags` de texto con regex |
| `_detect_language(text)` | Heurística rápida: conteo de palabras ES vs EN |
| `_build_enriched_fields(record)` | Extrae hashtags del texto si el campo está vacío |

### 2. Loaders específicos (5 plataformas)

Cada loader sabe interpretar el formato crudo EXACTO que genera la Fase 2:

```
┌──────────────────────────────────────────────────────────────┐
│                   REDDIT LOADER                               │
│                                                               │
│  Raw: { kind: "t3", data: { title, selftext, replies: [...] }}│
│                                                               │
│  parse_item():                                                │
│    ├─ kind=t3 → _build_post_record()                         │
│    │   └─> title + selftext → text_content                   │
│    │   └─> author → pseudo_user_id (hash)                    │
│    │   └─> deleted/removed → DISCARDED status                │
│    │                                                          │
│    └─ replies → _parse_comment_tree() (RECURSIVO)            │
│        └─> Cada comentario genera su propio SDR              │
│        └─> parent_id enlaza con post padre                   │
│        └─> Anidamiento ilimitado (depth tracking)             │
│                                                               │
│  Output: 1 post → N comments → M replies                     │
│           (todos SocialDigitalRecord independientes)          │
└──────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────┐
│                 YOUTUBE LOADER                                │
│                                                               │
│  Raw: { snippet: {title, description}, comments: [...] }      │
│                                                               │
│  parse_item():                                                │
│    ├─ Video → SocialDigitalRecord (source_type=DESCRIPTION)  │
│    │   └─> title + description → text_content                │
│    │   └─> channelTitle → pseudo_user_id                     │
│    │   └─> viewCount → engagement.score                      │
│    │                                                          │
│    └─ comments → _parse_comment_with_replies()               │
│        └─> Cada comentario → source_type=COMMENT             │
│        └─> replies anidados → source_type=REPLY              │
│        └─> thread_id = video_id (agrupación)                 │
└──────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────┐
│                INSTAGRAM LOADER                               │
│                                                               │
│  Raw: { caption, hashtags, ocr_text, image_description }      │
│                                                               │
│  parse_item():                                                │
│    ├─ accessible=false → SKIP (cuenta privada)               │
│    ├─ is_ad=true → DISCARDED (contenido comercial)            │
│    │                                                          │
│    ├─ Construye enriched text:                                │
│    │   caption + hashtags + ocr_text + image_description     │
│    │   → text_content unificado                              │
│    │                                                          │
│    ├─ community_hints ← educational_context + location       │
│    │                                                          │
│    └─ comments → source_type=COMMENT                         │
│        └─> parent_content_id = post.record_id                │
└──────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────┐
│                 TIKTOK LOADER                                 │
│                                                               │
│  Raw: { caption, ocr_text, scene_description, comments }      │
│                                                               │
│  parse_item():                                                │
│    ├─ Enriched text: caption + hashtags + ocr + scene_desc   │
│    ├─ shares → engagement.shares                             │
│    ├─ play_count → raw_metadata                              │
│    ├─ hashtag_challenge → community_hints                    │
│    │                                                          │
│    └─ comments → source_type=COMMENT                         │
│        └─> Muchos comentarios son solo emojis (1-3 chars)    │
└──────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────┐
│                FACEBOOK LOADER                                │
│                                                               │
│  Raw: { post_text, reactions: {like,love,sad,...}, comments } │
│                                                               │
│  parse_item():                                                │
│    ├─ reactions → engagement:                                │
│    │   likes = like + love (suma tipos)                      │
│    │   shares = shares_count                                 │
│    │   raw_metadata guarda TODAS las reacciones              │
│    │                                                          │
│    ├─ anonymous → pseudo_user_id = hash(source_name)         │
│    ├─ institutional page → PROCESSED (no descartado)         │
│    │                                                          │
│    ├─ comments → source_type=COMMENT                         │
│    └─ replies → source_type=REPLY (anidados)                │
└──────────────────────────────────────────────────────────────┘
```

### 3. Orquestador (`orchestrator.py`)

```
┌──────────────────────────────────────────────────────────┐
│                  ORCHESTRATOR                             │
│                                                           │
│  LOADER_REGISTRY = {                                      │
│    "reddit": RedditLoader,                                │
│    "youtube": YouTubeLoader,                              │
│    "instagram": InstagramLoader,                          │
│    "tiktok": TikTokLoader,                                │
│    "facebook": FacebookLoader,                            │
│  }                                                        │
│                                                           │
│  get_loader(name) → BasePlatformLoader  (factory)         │
│                                                           │
│  ingest_platform(name):                                   │
│    1. Auto-detecta raw JSON (data/raw/synthetic_<p>/...) │
│    2. Crea loader específico                              │
│    3. load_file() → parse_item() × N                     │
│    4. save_standardized() → JSON en standardized/         │
│    5. Retorna List[SocialDigitalRecord]                  │
│                                                           │
│  ingest_all():                                            │
│    Itera sobre 5 plataformas                              │
│    Skipea si no hay datos crudos                          │
│    Retorna {platform: [records]}                          │
│                                                           │
│  generate_ingestion_report():                             │
│    Estadísticas por plataforma:                           │
│    - Record count                                         │
│    - Status distribution (pending/processed/discarded)    │
│    - Languages (es/en)                                    │
│    - Source types (post/comment/reply/...)                │
│    Guarda en standardized/ingestion_report.json           │
└──────────────────────────────────────────────────────────┘
```

---

## Flujo completo de datos

```
FASE 2 (Generación)              FASE 3 (Ingesta)              FASE 4 (Preprocesamiento)
────────────────────              ──────────────                ──────────────────────
                                  
data/raw/                         data/standardized/            data/processed/
├── synthetic_reddit/             ├── reddit_standardized.json  ├── nlp/
│   └── reddit_raw.json    ───→   ├── youtube_standardized.json ├── vision/
├── synthetic_youtube/            ├── instagram_standardized.   ├── embeddings/
│   └── youtube_raw.json   ───→   ├── tiktok_standardized.json  └── ...
├── synthetic_instagram/          ├── facebook_standardized.json
│   └── instagram_raw.json ───→   └── ingestion_report.json
├── synthetic_tiktok/
│   └── tiktok_raw.json    ───→
└── synthetic_facebook/
    └── facebook_raw.json  ───→

      PLATFORM-SPECIFIC              UNIFIED SCHEMA
      (JSON heterogéneo)         (SocialDigitalRecord)
```

---

## Ejemplo: Transformación Reddit → SocialDigitalRecord

**Entrada (raw):**
```json
{
  "kind": "t3",
  "data": {
    "subreddit": "desahogo",
    "title": "No puedo más con este semestre",
    "selftext": "Llevo tres semanas sin dormir...",
    "author": "thrw_student_8472",
    "created_utc": 1716500000,
    "score": 23,
    "num_comments": 2,
    "replies": [
      {
        "kind": "t1",
        "data": {
          "author": "support_user",
          "body": "Ánimo, todos hemos pasado por eso",
          "score": 15
        }
      }
    ]
  }
}
```

**Salida (standardized — 2 registros):**
```json
[
  {
    "record_id": "uuid-1",
    "platform": "reddit",
    "source_type": "post",
    "pseudo_user_id": "pseudo_a1b2c3d4e5f6",
    "text_content": "No puedo más con este semestre\nLlevo tres semanas sin dormir...",
    "title": "No puedo más con este semestre",
    "language": "es",
    "engagement_metrics": {"likes": 23, "replies": 2, "score": 23},
    "community_hints": ["desahogo"],
    "processing_status": "pending"
  },
  {
    "record_id": "uuid-2",
    "platform": "reddit",
    "source_type": "comment",
    "pseudo_user_id": "pseudo_f6e5d4c3b2a1",
    "parent_content_id": "uuid-1",
    "thread_id": "uuid-1",
    "text_content": "Ánimo, todos hemos pasado por eso",
    "language": "es",
    "engagement_metrics": {"likes": 15, "score": 15},
    "raw_metadata": {"depth": 0},
    "processing_status": "pending"
  }
]
```

---

## Manejo de la "laguna de datos"

Cada loader maneja datos incompletos de manera explícita:

| Situación | Comportamiento |
|---|---|
| **Post sin título** | `title=None`, usa solo el body |
| **Autor [deleted]** | Genera `pseudo_deleted_X` como user_id |
| **Body [removed]** | `text_content=""`, status=DISCARDED |
| **Post sin comentarios** | Solo genera el registro del post |
| **Cuenta privada (Instagram)** | `accessible=false` → SKIP |
| **Ad/Spam** | `is_ad=true` → status=DISCARDED |
| **Timestamp inválido** | `_safe_parse_timestamp` → `datetime.utcnow()` |
| **Texto solo emojis** | Se preserva (el NLP de Fase 5 lo procesa) |
| **Sin contexto educativo** | `community_hints=[]` (la Fase 7 intentará inferir) |
| **Sin hashtags** | `hashtags=[]` (el sistema no los inventa) |

**Regla de oro:** El loader NUNCA inventa datos. Si un campo no existe en el raw, se pone `None` o `[]`. La incertidumbre se preserva.

---

## Lo que esta fase NO hace

| No hace | Por qué | Quién lo hace |
|---|---|---|
| Guardar en PostgreSQL | Primero estandarizamos a JSON, luego persistimos | Fase 9 (API + storage) |
| Limpiar texto (emojis, URLs) | Los datos deben llegar con ruido a preprocessing | Fase 4 |
| Detectar idioma preciso | Solo heurística rápida; detección real en preprocessing | Fase 4 |
| Clasificar emociones | El NLP requiere datos limpios | Fase 5 |
| Asociar a comunidad | Solo guarda `community_hints` del raw | Fase 7 |

---

## Cómo verificar esta fase

```bash
cd ModeloIa

# 1. Primero genera datos sintéticos (si no lo has hecho)
python main.py generate --platform reddit --count 5

# 2. Ingiere una plataforma
python -c "from src.irec.ingestion import ingest_platform; recs = ingest_platform('reddit'); print(f'Ingested {len(recs)} records')"

# 3. Ingiere todo
python -c "from src.irec.ingestion import ingest_all, generate_ingestion_report; results = ingest_all(); generate_ingestion_report(results)"

# 4. Ver el reporte
cat data/standardized/ingestion_report.json
```

---

*Siguiente fase: Fase 4 — Preprocesamiento (limpieza, normalización, anonimización)*
