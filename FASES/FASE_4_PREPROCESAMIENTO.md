# Fase 4: Preprocesamiento — Documentación

**Fecha:** Mayo 2026
**Estado:** ✅ Completada
**Objetivo:** Transformar datos normalizados (SocialDigitalRecord) en datos limpios, anonimizados y listos para NLP.

---

## ¿Qué se construyó?

### Arquitectura del pipeline

```
┌────────────────────────────────────────────────────────────────┐
│                   PreprocessingPipeline                        │
│                                                                │
│  process_records(records) → List[dict]                        │
│                                                                │
│  STEP 1: filter_spam()         ← spam_filter.py               │
│  └─> Heurísticas: keywords, URL density, emoji-only, caps     │
│  └─> Separa en [clean], [spam]                               │
│                                                                │
│  STEP 2: clean_text()          ← text_cleaner.py              │
│  └─> URLs → eliminadas                                       │
│  └─> @menciones → [USUARIO]                                  │
│  └─> HTML tags → eliminados                                  │
│  └─> Caracteres repetidos → normalizados (noooo → noo)       │
│  └─> Whitespace → colapsado                                  │
│                                                                │
│  STEP 3: normalize_emoji()     ← emoji_normalizer.py          │
│  └─> 😭 → emoji_llanto                                       │
│  └─> 💀 → emoji_muerte_metaforica                             │
│  └─> 50+ emojis mapeados a etiquetas semánticas              │
│  └─> PRESERVA la señal emocional de los emojis               │
│                                                                │
│  STEP 4: process_hashtags()    ← hashtag_processor.py         │
│  └─> #NoPuedoMas → "no puedo mas"                            │
│  └─> #SemanaDeParciales → "semana de parciales"              │
│  └─> CamelCase y PascalCase → split automático               │
│                                                                │
│  STEP 5: detect_language()     ← language_detector.py         │
│  └─> langdetect (preciso) + fallback heurístico              │
│  └─> Retorna (código ISO, confianza)                         │
│                                                                │
│  STEP 6: anonymize_text()      ← privacy/anonymizer.py        │
│  └─> detect_pii() encuentra: emails, teléfonos, docs, IPs   │
│  └─> Reemplaza: email → [CORREO], tel → [TELEFONO]          │
│  └─> Nombres propios → [PERSONA]                             │
│                                                                │
│  STEP 7: deduplicate_records() ← duplicate_detector.py        │
│  └─> SHA256 hash del texto → duplicados exactos              │
│  └─> TF-IDF cosine similarity → near-duplicates              │
│  └─> Keep-first strategy (conserva el más antiguo)           │
│                                                                │
│  STEP 8: normalize_timestamp() ← date_normalizer.py           │
│  └─> Añade: date, week_number, year_month, year_week         │
│  └─> Útil para el motor temporal (Fase 8)                    │
└────────────────────────────────────────────────────────────────┘
```

### 8 módulos construidos

| Módulo | Archivo | Líneas | Funcionalidad |
|---|---|---|---|
| Text Cleaner | `text_cleaner.py` | ~120 | URLs, menciones, HTML, chars repetidos, whitespace |
| Emoji Normalizer | `emoji_normalizer.py` | ~100 | 50+ emojis → etiquetas semánticas, conteo por categoría |
| Hashtag Processor | `hashtag_processor.py` | ~70 | CamelCase split, extracción, normalización |
| Language Detector | `language_detector.py` | ~80 | langdetect + fallback heurístico ES/EN/PT |
| Duplicate Detector | `duplicate_detector.py` | ~100 | SHA256 exactos + TF-IDF near-duplicates |
| Spam Filter | `spam_filter.py` | ~90 | Keywords, URL density, emoji-only, caps, repeticiones |
| Date Normalizer | `date_normalizer.py` | ~80 | ISO, Unix, flexible; añade week_number, year_week |
| PII + Anonymizer | `pii_detector.py` + `anonymizer.py` | ~150 | 6 categorías PII, enmascaramiento, hashing |

### Ejemplo: antes y después

**Entrada (SocialDigitalRecord crudo):**
```json
{
  "text_content": "NO PUEDO MÁS 😭😭💀 mira https://bit.ly/abc @troll_user #NoPuedoMas",
  "hashtags": ["NoPuedoMas"],
  "pseudo_user_id": "juan_perez_99",
  "timestamp": "2026-04-15T22:30:00Z"
}
```

**Salida (preprocesado):**
```json
{
  "text_content": "NO PUEDO MÁS 😭😭💀 mira https://bit.ly/abc @troll_user #NoPuedoMas",
  "cleaned_text": "no puedo más emoji_llanto emoji_llanto emoji_muerte_metaforica mira [usuario]",
  "emoji_normalized_text": "NO PUEDO MÁS emoji_llanto emoji_llanto emoji_muerte_metaforica mira @troll_user",
  "hashtags_processed": ["no puedo mas"],
  "anonymized_text": "no puedo más emoji_llanto emoji_llanto emoji_muerte_metaforica mira [USUARIO]",
  "language": "es",
  "language_confidence": 0.99,
  "pseudo_user_id": "pseudo_a1b2c3d4e5f6",
  "date_normalized": "2026-04-15",
  "week_number": 16,
  "year_month": "2026-04",
  "year_week": "2026-W16",
  "processing_status": "processed"
}
```

### Decisiones de diseño clave

| Decisión | Razón |
|---|---|
| **Emojis → etiquetas, NO eliminarlos** | Los emojis tienen carga emocional. `😭😭` en "no puedo más" es distinto de `😂😂`. Convertirlos a `emoji_llanto` preserva esa señal para el NLP |
| **@menciones → [USUARIO], NO eliminarlas** | Saber que hay una interacción social es relevante. Pero el nombre específico se anonimiza |
| **Dos versiones de texto**: `cleaned_text` + `anonymized_text` | `cleaned_text` limpia formato pero mantiene contexto. `anonymized_text` oculta PII (emails→[CORREO]) y es la versión segura para análisis |
| **langdetect + fallback heurístico** | langdetect es preciso (>95%) pero puede fallar con textos muy cortos. El fallback usa conteo de stopwords para ES/EN/PT |
| **SHA256 para duplicados exactos** | Rápido, determinista, sin falsos positivos. Suficiente para detectar copias literales |
| **Keep-first en deduplicación** | Conserva la primera ocurrencia (la más antigua), preservando el timestamp original para el análisis temporal |
| **Spam por heurísticas, no ML** | No necesitamos un clasificador complejo. Las señales de spam en redes sociales son obvias: keywords comerciales, exceso de URLs, solo emojis |

---

## Flujo de datos actualizado

```
FASE 2: generate     FASE 3: ingest        FASE 4: preprocess      FASE 5: NLP
───────────────      ─────────────          ─────────────────       ───────────
data/raw/            data/standardized/     data/processed/nlp/     (próximo)
  reddit_raw.json →    reddit_std.json  →    reddit_preproc.json →
  youtube_raw.json →   youtube_std.json →   youtube_preproc.json →
  instagram_raw.json → instagram_std.json → instagram_preproc.json →
  tiktok_raw.json →    tiktok_std.json  →   tiktok_preproc.json  →
  facebook_raw.json →  facebook_std.json →  facebook_preproc.json →
```

---

## Lo que esta fase NO hace

| No hace | Por qué | Quién lo hace |
|---|---|---|
| Clasificar emociones | Los datos ya están limpios pero no analizados | Fase 5 (NLP) |
| Generar embeddings | Requiere modelos de NLP cargados | Fase 5 |
| Asociar a comunidad | Solo limpia `community_hints`, no los analiza | Fase 7 |
| Guardar en BD | Los datos quedan como JSON en processed/ | Fase 9 (API + storage) |
| Stemming/lematización | Los Transformers no lo necesitan (usan subword tokens) | — |

---

## Cómo verificar

```bash
cd ModeloIa

# Test del pipeline completo
python -c "
from src.irec.preprocessing import PreprocessingPipeline
pipeline = PreprocessingPipeline()
result = pipeline.process_records([
    {'text_content': 'Hola @user mira https://spam.com COMPRA YA!!!', 'hashtags': ['CompraYa']},
    {'text_content': 'No puedo más con este semestre 😭 estoy agotado', 'hashtags': []},
])
print(f'Output: {len(result)} records')
print(pipeline.get_stats())
"
```

---

*Siguiente fase: Fase 5 — NLP Core (sentimiento, emociones, temas, embeddings)*
