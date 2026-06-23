# Algoritmos del Componente IA — Resumen

## Modelos de Deep Learning (Inferencia)

| Modelo | Tipo | Dimensiones | Uso | Archivo |
|---|---|---|---|---|
| **DistilRoBERTa** (`j-hartmann/emotion-english-distilroberta-base`) | Transformer (66M params) | 6 emociones (Ekman) | Detección de emociones: anger, sadness, fear, surprise, joy, disgust | `nlp_service.py` |
| **BGE-M3** (`BAAI/bge-m3`) | Embedding Transformer | 1024 dims | Embeddings semánticos multilingües para búsqueda por similitud coseno | `embedding_service.py` |
| **BGE-Large** (`BAAI/bge-large-en-v1.5`) | Embedding Transformer | 1024 dims | Embeddings secundario | `embedding_service.py` |
| **MiniLM** (`all-MiniLM-L6-v2`) | Embedding Transformer ligero | 384 dims | Embeddings fallback (bajo consumo) | `embedding_service.py` |

## Modelos de ML Clásico (Inferencia)

| Modelo | Librería | Uso | Archivo |
|---|---|---|---|
| **spaCy NER** (`es_core_news_sm`) | spaCy 3.7 | Reconocimiento de entidades nombradas en español (personas, lugares, organizaciones) | `nlp_service.py` |
| **NLTK Tokenizer** (`punkt`) | NLTK 3.8 | Tokenización de texto en palabras | `nlp_service.py` |

## Algoritmos de ML Clásico (Implementación Propia)

| Algoritmo | Tipo | Descripción | Archivo |
|---|---|---|---|
| **KMeans** | Clustering no supervisado | Agrupamiento temático por similitud. Inicialización determinística, distancia euclidiana, convergencia en máx. 50 iteraciones. K inferido como `ceil(sqrt(n/2))` | `clustering_service.py` |
| **Z-Score** | Detección de anomalías | Flag de puntos que desvían ≥3σ de la media por dimensión. Umbral configurable | `anomaly_service.py` |
| **OLS (Mínimos Cuadrados)** | Regresión lineal | Calibración de scores: `pendiente = Sxy/Sxx`, `intercepto = ȳ - pendiente·x̄`. Closed-form, sin iteraciones | `calibration_service.py` |
| **Score Ponderado** | Agregación normalizada | Normalización min-max por dimensión + media ponderada + calibrador lineal. Resultado clamp a [0,1] | `scoring_service.py` |

## Algoritmos Determinísticos (TypeScript — Fallback y Pipeline)

| Algoritmo | Descripción | Archivo |
|---|---|---|
| **NLP Estructural** | Análisis de features del discurso: intensidad de puntuación, elongación de caracteres, ratio mayúsculas, diversidad léxica, profundidad de hilos. Sin modelo ML | `servicioNLP.ts` |
| **Filtro Relevancia** | Clasificación señal/ruido por conteo de palabras informativas (Unicode ≥2 chars) | `filtroRelevancia.ts` |
| **Índice de Riesgo** | 8 dimensiones independientes en [0,100]: estrés académico, ansiedad colectiva, conflicto social, bullying, aislamiento, burnout, violencia verbal, desmotivación | `indiceRiesgo.ts` |
| **Motor Temporal** | Correlación cross-semana, detección de variaciones significativas por dimensión | `motorTemporal.ts` |
| **Motor Explicativo** | Generación QUÉ-POR QUÉ-CUÁNDO-CÓMO con evidencia cuantificable. Bloquea conclusiones sin evidencia | `motorExplicativo.ts` |
| **Detector de Patrones** | Asociación de patrones a zona geográfica (coordenadas + radio) | `detectorPatrones.ts` |
| **Anonimización SHA-256** | Pseudonimización irreversible con sal. Consistente (mismo input → mismo hash) | `servicioAnonimizacion.ts` |
| **Embeddings Heurísticos** | Acumulación char-code en 16D + normalización L2 (fallback sin GPU) | `capaMLBase.ts` |
| **Clustering Coseno** | Aglomerativo single-pass con umbral 0.9 (fallback sin sklearn) | `capaMLBase.ts` |
| **Tendencias Delta** | Comparación último vs primer valor por dimensión. Dirección: sube/baja/estable | `capaMLBase.ts` |

## Pipeline de Análisis (11 Etapas Ordenadas)

```
1. LIMPIEZA          → Eliminación de caracteres de control y espacios
2. NORMALIZACIÓN     → Unicode NFC, hashtags canónicos
3. ANONIMIZACIÓN     → SHA-256 + sal (antes de todo análisis)
4. FILTRO_RELEVANCIA → Señal vs ruido
5. NLP               → DistilRoBERTa + spaCy + NLTK
6. VISIÓN            → Análisis de descripciones de imagen
7. TEMPORAL          → Correlación cross-semana
8. PATRONES          → Asociación geográfica
9. ÍNDICE            → 8 dimensiones de riesgo + ML calibrado
10. EXPLICACIÓN      → Narrativas con evidencia
11. EMBEDDINGS       → BGE-M3 → pgvector (1024 dims)
```

## Clasificación Resumen

| Categoría | Cantidad | Ejemplos |
|---|---|---|
| **Deep Learning (Transformers)** | 4 modelos | DistilRoBERTa, BGE-M3, BGE-Large, MiniLM |
| **ML Clásico (librerías)** | 2 modelos | spaCy NER, NLTK Tokenizer |
| **ML Clásico (implementación propia)** | 4 algoritmos | KMeans, Z-Score, OLS, Score Ponderado |
| **Algoritmos determinísticos** | 10 algoritmos | NLP estructural, filtro, índice, temporal, patrones, etc. |
| **Total** | **20 componentes** | |

---

*Resumen de algoritmos — Junio 2026*
