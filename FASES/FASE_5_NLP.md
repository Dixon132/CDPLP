# Fase 5: NLP Core — Documentación

**Fecha:** Mayo 2026
**Estado:** ✅ Completada
**Objetivo:** Implementar el motor de procesamiento de lenguaje natural con análisis de sentimiento, detección de emociones, clasificación temática, indicadores de riesgo y generación de embeddings semánticos.

---

## ¿Qué se construyó?

### Arquitectura del módulo NLP

```
┌─────────────────────────────────────────────────────────────────┐
│                      NLPPipeline                                │
│                                                                 │
│  analyze_batch(records) → List[dict]                            │
│                                                                 │
│  Para cada registro:                                            │
│                                                                 │
│  STEP 1: analyze_sentiment()     ← sentiment_analyzer.py       │
│  └─> Léxico español (~150 palabras positivas, ~120 negativas)  │
│  └─> Manejo de negaciones ("no estoy feliz" → negativo)       │
│  └─> Intensificadores ("muy", "muchísimo" → ×1.5)             │
│  └─> Retorna: label, score (-1 a 1), confidence               │
│                                                                 │
│  STEP 2: detect_emotions_detailed() ← emotion_detector.py      │
│  └─> 7 indicadores de riesgo + 4 protectores                   │
│  └─> Basado en RISK_INDICATORS y PROTECTIVE_INDICATORS         │
│  └─> Retorna: dominant_emotion, scores, family                │
│                                                                 │
│  STEP 3: classify_topic()         ← topic_classifier.py        │
│  └─> 19 categorías temáticas con keywords                     │
│  └─> Top-N topics con scores                                   │
│  └─> Retorna: [{topic, score}, ...]                            │
│                                                                 │
│  STEP 4: detect_risk_indicators() ← risk_indicator_detector.py │
│  └─> Combina emociones + pesos IREC                            │
│  └─> overall_risk_score (0-1)                                   │
│  └─> risk_level: sin_riesgo/bajo/medio/alto/critico            │
│  └─> family_scores agregados                                   │
│                                                                 │
│  STEP 5: generate_embeddings()    ← embeddings_generator.py    │
│  └─> Sentence-BERT (si está instalado)                         │
│  └─> paraphrase-multilingual-MiniLM-L12-v2                     │
│  └─> Fallback: None si no hay transformers                     │
│  └─> Vectores normalizados de 384 dimensiones                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5 módulos construidos

| Módulo | Archivo | Enfoque | Funcionalidad |
|---|---|---|---|
| Sentiment Analyzer | `sentiment_analyzer.py` | Léxico + reglas | ~270 palabras español, negaciones, intensificadores |
| Emotion Detector | `emotion_detector.py` | Keywords + scoring | 7 indicadores riesgo + 4 protectores, familias |
| Topic Classifier | `topic_classifier.py` | Keywords + taxonomy | 19 categorías temáticas con ~180 keywords |
| Risk Detector | `risk_indicator_detector.py` | Weighted scoring | Pesos IREC, nivel de riesgo, señales activas |
| Embeddings Generator | `embeddings_generator.py` | Sentence-BERT | Lazy loading, fallback graceful |
| **NLPPipeline** | `nlp_pipeline.py` | Orquestador | pipeline completo + batch processing |

### Resultado de una ejecución real

**Entrada (preprocesado):**
```
"Llevo semanas sin dormir por los parciales, estoy agotado, 
siento que no voy a poder con este semestre. Mis companeros 
no me hablan y me siento solo."
```

**Salida NLP:**
```
Sentiment:        negativo (-1.0)
Dominant emotion: estres_academico
Topics:           [insomnio_cansancio, estres_academico, examenes]
Risk level:       bajo (0.2714)
Active risks:     [estres_academico, agotamiento_emocional, aislamiento_social]
Protective:       []
```

### Tiers de modelos (jerarquía implementada)

```
TIER 1 (BASELINE) ✅ IMPLEMENTADO
├── Léxico español (~400 palabras) para sentimiento
├── Keywords + reglas para emociones y temas
├── Scoring manual para indicadores de riesgo
└── Sin dependencias pesadas (solo stdlib + regex)

TIER 2 (INTERMEDIO) ⬜ PENDIENTE (requiere instalar deps)
├── TF-IDF + SVM/Logistic Regression
├── Sentence-BERT embeddings + XGBoost
└── ChromaDB para búsqueda semántica

TIER 3 (AVANZADO) ⬜ PENDIENTE (requiere GPU recomendada)
├── BETO / XLM-RoBERTa fine-tuned
├── Zero-shot classification
└── LLM local (Ollama) para etiquetado asistido
```

### Decisiones de diseño

| Decisión | Razón |
|---|---|
| **Léxico en español, no librería externa** | Las librerías de sentimiento (TextBlob, VADER) están optimizadas para inglés. Un léxico español curado es más preciso para nuestro dominio |
| **Negaciones con ventana de 1 palabra** | "no estoy feliz" → la negación invierte "feliz". Simple pero efectivo para español |
| **Intensificadores ×1.5** | "muy triste" pesa más que "triste". Multiplicador fijo, calibrable |
| **Keywords del dominio educativo** | Las keywords en RISK_INDICATORS y TOPIC_KEYWORDS están específicamente diseñadas para lenguaje estudiantil universitario |
| **Sentence-BERT lazy loading** | El modelo de 118MB solo se carga si está instalado. Sin él, el pipeline funciona igual (solo sin embeddings). Cero dependencia forzosa |
| **`anonymized_text` como fuente primaria** | El NLP siempre prefiere el texto anonimizado. Si no existe, usa `cleaned_text`. Si no, `text_content`. Privacidad first |

---

## Pipeline integrado completo (Fases 1-5)

```bash
cd ModeloIa
$env:PYTHONPATH="."
.\.venv\Scripts\python.exe tests/integration/test_full_pipeline.py
```

**Salida esperada:**
```
1. INGEST: 1 SDR generated
2. PREPROCESS: 1 records (spam_removed=0)
3. NLP: 1 records analyzed
   Sentiment: negativo (-1.0)
   Dominant emotion: estres_academico
   Risk level: bajo (score=0.2714)
   Topics: ['insomnio_cansancio', 'estres_academico', 'examenes']
FULL PIPELINE INTEGRATION: OK
```

---

## Lo que NO hace esta fase

| No hace | Por qué | Quién lo hace |
|---|---|---|
| Agregar por comunidad | Esto requiere ventanas temporales y asociación comunitaria | Fases 7 + 8 |
| Calcular IREC final | El IREC es sobre datos AGREGADOS, no por registro individual | Fase 8 |
| Entrenar modelos supervisados | El Tier 2/3 requiere datasets etiquetados | Training module |
| Guardar en ChromaDB | Los embeddings se generan pero no se persisten aún | Fase 8 + storage |

---

## Cómo verificar

```bash
cd ModeloIa

# Test unitario de cada módulo
python -c "from src.irec.nlp import analyze_sentiment; print(analyze_sentiment('estoy muy feliz con mi carrera'))"
python -c "from src.irec.nlp import detect_emotions_detailed; print(detect_emotions_detailed('no puedo mas, estoy agotado'))"
python -c "from src.irec.nlp import classify_topic; print(classify_topic('tengo tres parciales esta semana y no he dormido'))"
python -c "from src.irec.nlp import detect_risk_indicators; print(detect_risk_indicators('me siento solo y sin motivacion para seguir'))"

# Pipeline completo
$env:PYTHONPATH="."
python tests/integration/test_full_pipeline.py
```

---

*Siguiente fase: Fase 6 — Visión Computacional (OCR, captioning, fusión multimodal)*
