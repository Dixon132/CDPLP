# Fase 2: Datos Sintéticos — Documentación

**Fecha:** Mayo 2026
**Estado:** ✅ Completada (código listo, ejecutar cuando se requiera)
**Objetivo:** Construir un generador de datasets sintéticos realistas usando Ollama que simule exactamente cómo se verían los datos recolectados de APIs/scraping reales, con toda su imperfección.

---

## ¿Qué se construyó?

### 1. Plantillas de prompts por plataforma (5 archivos)

Cada prompt está diseñado para que Ollama genere datos que simulan una **extracción real**, no datos perfectos:

| Plataforma | Archivo | Características del realismo |
|---|---|---|
| Reddit | `prompts/synthetic_generation/reddit_prompt.txt` | Posts con/sin comentarios, autores [deleted], score=0, spam |
| YouTube | `prompts/synthetic_generation/youtube_prompt.txt` | 30% videos sin comentarios, spam, texto corto, idiomas mezclados |
| Instagram | `prompts/synthetic_generation/instagram_prompt.txt` | 25% sin caption, 40% sin comentarios, ads, sin OCR, sin ubicación |
| TikTok | `prompts/synthetic_generation/tiktok_prompt.txt` | 35% sin comentarios, 60% sin OCR, 40% irrelevante, solo emojis |
| Facebook | `prompts/synthetic_generation/facebook_prompt.txt` | Grupos/páginas públicas, anónimos, reacciones variadas |

### 2. Generador principal (`src/irec/synthetic_generation/generator.py`)

**Clase `SyntheticDataGenerator`:**

```
Inicialización:
  -> Conecta con Ollama (host configurable)
  -> Carga el modelo (mistral por defecto)
  -> Configura temperatura y max_tokens

generate_for_platform(platform, count, output_path):
  1. Carga el prompt template de la plataforma
  2. Reemplaza {count} en el template
  3. Llama a Ollama con el prompt
  4. Parsea la respuesta JSON (con 3 niveles de fallback)
  5. Inyecta ruido realista post-generación
  6. Calcula métricas de calidad
  7. Guarda con reporte de calidad

generate_all():
  -> Itera sobre las 5 plataformas
  -> Retorna diccionario {plataforma: [records]}
```

**Fallbacks de parseo JSON:**
1. `json.loads()` directo
2. Regex `\[.*\]` para extraer array
3. Regex `\{[^{}]*\}` para extraer objetos individuales

### 3. Inyección de ruido realista (`_inject_realistic_noise`)

Después de que Ollama genera los datos, el sistema añade artefactos de recolección:

- **Campos nulos aleatorios**: según porcentajes configurados por plataforma (ej: 40% de posts de Instagram sin caption)
- **Glitches de encoding**: 1% de probabilidad de caracteres no-breaking space o smart quotes
- **Datos incompletos**: algunos registros sin `educational_context`, sin `location`, sin `ocr_text`

### 4. Reporte de calidad (`_compute_quality_metrics`)

Cada archivo generado incluye un `quality_report` que documenta la "laguna de datos":

```json
{
  "quality_report": {
    "total_records": 100,
    "pct_no_caption": 23.0,
    "pct_no_comments": 42.0,
    "pct_no_hashtags": 18.0,
    "pct_no_location": 58.0,
    "pct_no_ocr": 47.0,
    "pct_no_edu_context": 35.0,
    "pct_ads": 14.0
  }
}
```

Este reporte es **evidencia para la tesis** de que el sistema recibe datos imperfectos.

### 5. Configuración por plataforma (`PLATFORM_CONFIGS`)

Cada plataforma tiene su `expected_empty_pct` que define qué tan incompletos son sus datos:

```python
"instagram": {
    "count": 100,
    "expected_empty_pct": {
        "no_caption": 0.25,      # 25% de posts sin caption
        "no_comments": 0.40,     # 40% sin comentarios
        "no_hashtags": 0.20,     # 20% sin hashtags
        "is_ad": 0.15,           # 15% son publicidad
        "no_ocr": 0.50,          # 50% sin texto en imagen
        "no_education_context": 0.40,  # 40% sin contexto educativo
    },
},
```

### 6. Script de ejecución (`scripts/generate_synthetic_data.py`)

```bash
# Generar todo
python scripts/generate_synthetic_data.py --all

# Generar solo Reddit, 50 registros
python scripts/generate_synthetic_data.py --platform reddit --count 50

# Con salida personalizada
python scripts/generate_synthetic_data.py --platform instagram --output ./data/custom/ig_test.json
```

---

## Explicación a profundidad

### El problema que resuelve esta fase

Necesitamos datos para alimentar el pipeline. Pero las APIs reales (Reddit, YouTube) no están disponibles aún, y plataformas como Instagram/Facebook/TikTok tienen restricciones severas de acceso. **No podemos fingir que tenemos datos reales.** Entonces la solución metodológica es: simular la recolección de datos exactamente como se verían en producción.

### Arquitectura completa de la Fase 2

```
┌─────────────────────────────────────────────────────────────────┐
│                    USUARIO / SCRIPT                              │
│  python main.py generate --all                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              SyntheticDataGenerator.__init__()                   │
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────────┐               │
│  │ ollama.Client()  │    │ settings (config)     │               │
│  │ host:11434       │    │ model: mistral        │               │
│  │                  │    │ temperature: 0.7      │               │
│  │                  │    │ max_tokens: 2048      │               │
│  └──────────────────┘    └──────────────────────┘               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              generate_for_platform("reddit", count=100)          │
│                                                                  │
│  STEP 1: load_prompt_template("reddit", prompts_dir)             │
│          └─> Lee prompts/synthetic_generation/reddit_prompt.txt  │
│                                                                  │
│  STEP 2: build_prompt(template, 100)                             │
│          └─> Reemplaza {count} → 100 en el template              │
│                                                                  │
│  STEP 3: ollama.generate(prompt, temperature=0.7, ...)           │
│          └─> LLM genera array JSON con posts + comentarios       │
│                                                                  │
│  STEP 4: _parse_json_response(raw_text)                          │
│          └─> Intenta json.loads() directo                        │
│          └─> Fallback: regex \[.*\] para extraer array           │
│          └─> Fallback: regex \{...\} para objetos individuales   │
│                                                                  │
│  STEP 5: _inject_realistic_noise(records, "reddit")              │
│          └─> Añade imperfecciones: campos null, encoding bugs    │
│                                                                  │
│  STEP 6: _save_with_quality_report(records, path, "reddit")      │
│          └─> Guarda JSON + metadata + quality_report             │
│          └─> data/raw/synthetic_reddit/reddit_raw.json           │
└─────────────────────────────────────────────────────────────────┘
```

### Estructura real de los datos generados (ejemplo Reddit)

```json
{
  "metadata": {
    "generated_at": "2026-05-30T...",
    "generator_model": "mistral",
    "platform": "reddit",
    "record_count": 100,
    "simulation_mode": "realistic_data_collection"
  },
  "quality_report": {
    "total_records": 100,
    "pct_no_comments": 34.0
  },
  "records": [
    {
      "kind": "t3",
      "data": {
        "subreddit": "desahogo",
        "title": "No puedo más con este semestre",
        "selftext": "Llevo tres semanas sin dormir bien...",
        "author": "thrw_student_8472",
        "created_utc": 1716500000,
        "score": 23,
        "num_comments": 5,
        "link_flair_text": "Desahogo",
        "replies": [
          {
            "kind": "t1",
            "data": {
              "author": "[deleted]",
              "body": "[deleted]",
              "score": 0,
              "parent_id": "t3_xxx",
              "replies": []
            }
          }
        ]
      }
    }
  ]
}
```

### Por qué cada decisión de diseño

| Decisión | Razón |
|---|---|
| **5 prompts separados** (no uno genérico) | Cada plataforma tiene estructura radicalmente diferente: Reddit tiene `kind: t3/t1`, YouTube tiene `commentThreads`, Instagram tiene `caption+hashtags`. Un solo prompt no capturaría esas diferencias y los datos serían irreales |
| **Ruido post-generación** (`_inject_realistic_noise`) | Ollama tiende a generar datos "demasiado perfectos" (todos los campos llenos, todo coherente). El ruido simula lo que realmente obtienes de un scraper: campos null, glitches de encoding, datos incompletos. Sin esto, el pipeline nunca se probaría con datos realistas |
| **3 niveles de fallback JSON** | Los LLM frecuentemente devuelven texto con explicaciones antes/después del JSON ("Aquí tienes los datos:" ...). Los fallbacks aseguran extraer los datos incluso cuando la respuesta no es JSON puro |
| **`quality_report` incrustado en cada archivo** | Sirve como evidencia cuantitativa para la tesis: demuestra que el sistema recibe datos imperfectos (ej: 40% sin comentarios, 25% sin caption) y aun así el pipeline los procesa |
| **Raw Zone pura** (no se normaliza aquí) | Separación estricta de responsabilidades: la generación solo produce datos crudos. La ingesta (Fase 3) los transforma a `SocialDigitalRecord`. Esto permite probar cada capa de forma aislada |
| **`PLATFORM_CONFIGS` con porcentajes por plataforma** | Cada plataforma tiene diferentes niveles esperados de incompletitud. Instagram: 40% sin comentarios, 25% sin caption. TikTok: 60% sin OCR, 35% sin comentarios. Esto viene del conocimiento de cómo funcionan realmente estas APIs |
| **Timestamps variados (últimas 4 semanas)** | Necesario para que el motor temporal (Fase 8) tenga datos con distribución realista para detectar tendencias |

### Cadena de responsabilidades entre fases

```
Fase 2 (Synthetic Gen)     Fase 3 (Ingesta)        Fase 4 (Preproc)      Fase 5 (NLP)
─────────────────────      ────────────────         ────────────────      ────────────
Genera JSON crudo    →    Lee crudo              →  Limpia texto       →  Clasifica
con ruido e            →    Mapea a               →  Normaliza          →  emociones
imperfecciones           →    SocialDigitalRecord    →  Anonimiza          →  temas
                          →                          →                      →  riesgo
                    data/raw/               data/standardized/    data/processed/
```

**Lo que esta fase NO hace (y por qué):**

| No hace | Por qué | Quién lo hace |
|---|---|---|
| Normalizar a SocialDigitalRecord | Los datos deben entrar crudos a la Raw Zone | Fase 3 (Ingesta) |
| Limpiar texto (emojis, URLs, spam) | El preprocesamiento es una capa separada | Fase 4 (Preprocesamiento) |
| Clasificar emociones o temas | El NLP requiere datos ya limpios y normalizados | Fase 5 (NLP) |
| Guardar en base de datos | Primero se estandariza, luego se persiste | Fase 3 + storage |

---

## Flujo de generación

```
1. Usuario ejecuta script
        ↓
2. SyntheticDataGenerator se inicializa
   - Conecta con Ollama (localhost:11434)
   - Usa modelo: mistral
        ↓
3. Por cada plataforma:
   a. Carga prompt template .txt
   b. Inyecta {count} en el prompt
   c. Envía prompt a Ollama
   d. Recibe respuesta (texto con array JSON)
   e. Parsea JSON con fallbacks
   f. Inyecta ruido realista
   g. Calcula métricas de calidad
   h. Guarda en data/raw/synthetic_<platform>/
        ↓
4. Salida: archivos JSON con estructura:
   {
     "metadata": { ... },
     "quality_report": { ... },
     "records": [ ... ]
   }
```

---

## Lo que esta fase NO hace

- **NO normaliza** los datos a `SocialDigitalRecord` — eso es Fase 3 (Ingesta)
- **NO limpia** el texto — eso es Fase 4 (Preprocesamiento)
- **NO clasifica** emociones — eso es Fase 5 (NLP)
- Los datos se guardan en **Raw Zone** exactamente como "llegarían"

---

## Cómo verificar esta fase

```bash
cd ModeloIa

# Probar generación de 5 posts de Reddit
python scripts/generate_synthetic_data.py --platform reddit --count 5

# Verificar el archivo generado
cat data/raw/synthetic_reddit/reddit_raw.json | python -m json.tool | head -50
```

---

## Por qué datos sintéticos y no reales

La decisión de usar datos sintéticos al inicio se justifica así en la tesis:

> Para plataformas con restricciones de acceso (Instagram, Facebook, TikTok) y durante la fase de desarrollo y validación de la arquitectura, se emplean datasets sintéticos generados mediante modelos de lenguaje locales (Ollama + Mistral). Estos datasets **no sustituyen la evidencia empírica real**, sino que permiten:
> 1. Evaluar la arquitectura del pipeline completo.
> 2. Probar los procesos de normalización con datos heterogéneos.
> 3. Validar los módulos de análisis multimodal.
> 4. Simular escenarios de tendencias emocionales comunitarias.
> 5. Demostrar el funcionamiento del sistema sin violar políticas de plataformas.

---

*Siguiente fase: Fase 3 — Ingesta (loaders que transforman datos crudos a SocialDigitalRecord)*
