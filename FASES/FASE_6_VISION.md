# Fase 6: Visión Computacional — Documentación

**Fecha:** Mayo 2026
**Estado:** ✅ Completada
**Objetivo:** Implementar el módulo de visión computacional para OCR, descripción de imágenes, clasificación visual y fusión multimodal, SIN reconocimiento facial ni identificación biométrica.

---

## ¿Qué se construyó?

### 5 módulos

| Módulo | Archivo | Funcionalidad |
|---|---|---|
| OCR Extractor | `ocr_extractor.py` | Extrae texto de imágenes (EasyOCR si disponible, fallback heurístico) |
| Image Captioner | `image_captioner.py` | Describe escenas automáticamente (BLIP-2 si disponible, fallback heurístico) |
| Visual Classifier | `visual_classifier.py` | Clasifica el contexto visual en 8 categorías (académico, campus, meme, irrelevante...) |
| Multimodal Fusion | `multimodal_fusion.py` | Fusiona texto + OCR + caption + hashtags en un solo texto enriquecido |
| **VisionPipeline** | `vision_pipeline.py` | Orquestador del flujo completo de visión |

### Pipeline de visión

```
┌──────────────────────────────────────────────────────────────┐
│                    VisionPipeline                            │
│                                                              │
│  analyze_record(record):                                     │
│                                                              │
│  STEP 1: get_multimodal_signals()                            │
│  └─> ¿Qué modalidades tiene este registro?                   │
│  └─> has_text, has_hashtags, has_ocr, has_caption...        │
│                                                              │
│  STEP 2: heuristic_ocr_hint()                                │
│  └─> ¿El texto menciona una imagen con texto?                │
│  └─> "miren esta imagen", "en la foto dice..."              │
│                                                              │
│  STEP 3: heuristic_scene_context()                           │
│  └─> ¿El texto describe una escena?                          │
│  └─> "biblioteca", "campus", "aula", "escritorio"...        │
│                                                              │
│  STEP 4: classify_scene()                                    │
│  └─> 8 categorías: academic_study, campus_life, meme,       │
│      emotional_text, night_study, schedule, food, irrelevant│
│                                                              │
│  STEP 5: is_educational_scene()                              │
│  └─> ¿Es una escena educativa? → flag booleano               │
│                                                              │
│  STEP 6: enrich_record_with_multimodal()                     │
│  └─> Fusiona todo en enriched_text                           │
│  └─> "texto [OCR: ...] [Imagen: ...] [Escena: ...] #tags"  │
└──────────────────────────────────────────────────────────────┘
```

### Ejemplo de clasificación de escenas

| Texto de entrada | Categoría | Confianza |
|---|---|---|
| "estudiando en la biblioteca con laptop y apuntes" | `academic_study` | 1.0 |
| "miren este meme de parciales jajaja" | `meme_academic` | 0.5 |
| "foto de mi perro en la playa" | `irrelevant` | 0.73 |
| "otra noche sin dormir, café y parciales" | `night_study` | 0.67 |

### Fusión multimodal

```
Entradas separadas:
  text_content:  "no puedo mas con este semestre"
  ocr_text:      "semana de parciales"
  image_caption: "person studying at desk with laptop at night"
  hashtags:      ["universidad", "agotamiento"]

Salida fusionada (enriched_text):
  "no puedo mas con este semestre [OCR: semana de parciales]
   [Imagen: person studying at desk with laptop at night]
   #universidad #agotamiento"
```

### Lo que NUNCA hace este módulo

- **NO** reconocimiento facial
- **NO** identificación biométrica
- **NO** comparación de rostros
- **NO** inferencia de edad, género o raza por imagen
- **NO** geolocalización por metadatos EXIF
- **NO** análisis de imágenes reales sin instalar las librerías correspondientes

---

## Verificación

```bash
cd ModeloIa

python -c "
from src.irec.vision import classify_scene, fuse_multimodal_text, VisionPipeline
# Clasificación
print(classify_scene('estudiando en la biblioteca'))  # academic_study
print(classify_scene('meme de parciales'))             # meme/schedule
print(classify_scene('foto de mi perro en la playa'))  # irrelevant

# Fusión
print(fuse_multimodal_text(
    text_content='no puedo mas',
    ocr_text='semana de parciales',
    hashtags=['universidad', 'agotamiento']
))

# Pipeline
p = VisionPipeline()
r = p.analyze_batch([{'text_content': 'estudiando en la biblioteca, captura de horario'}])
print(r[0]['scene_classification'], r[0]['is_educational_scene'])
"
```

---

*Siguiente fase: Fase 7 — Asociación probabilística a comunidad educativa*
