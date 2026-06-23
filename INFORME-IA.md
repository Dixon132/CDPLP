# Informe Detallado del Componente IA — Plataforma GDS

**Proyecto:** CDPLP — Gemelo Digital Social
**Fecha:** Junio 2026
**Propósito:** Explicación técnica detallada de cada punto del documento de IA, basada en la implementación real del código fuente.

---

## Tabla de Contenidos

1. [Nota Importante Antes de Empezar](#1-nota-importante-antes-de-empezar)
2. [5.4.4 Modelado del Componente IA](#2-544-modelado-del-componente-ia)
   - 5.4.4.1 Selección de Algoritmos y Justificación
   - 5.4.4.2 Entrenamiento y Optimización de Modelos
   - 5.4.4.3 Resultados de Evaluación Preliminar
3. [5.4.5 Evaluación del Modelo IA](#3-545-evaluación-del-modelo-ia)
   - 5.4.5.1 Métricas de Rendimiento
   - 5.4.5.2 Análisis de Sesgos y Robustez
   - 5.4.5.3 Validación con Expertos del Dominio
4. [5.4.6 Preparación para el Despliegue del Modelo IA](#4-546-preparación-para-el-despliegue-del-modelo-ia)
   - 5.4.6.1 Empaquetado del Modelo y Documentación de API
5. [5.5 Fase de Operaciones y Mantenimiento (MLOps)](#5-55-fase-de-operaciones-y-mantenimiento-mlops)
   - 5.5.1 Versionado de Código y Modelos
   - 5.5.2 Pipelines de CI/CD para ML
   - 5.5.3 Infraestructura de Despliegue y Servicio
   - 5.5.4 Monitoreo y Alertas del Modelo en Producción
   - 5.5.5 Reproducibilidad y Gestión de Experimentos
   - 5.5.6 Seguridad y Gobernanza del Modelo
6. [Resumen: Teoría vs Implementación Real](#6-resumen-teoría-vs-implementación-real)

---

## 1. Nota Importante Antes de Empezar

Este informe compara lo que dice tu documento teórico con lo que **realmente está implementado** en el código fuente de tu proyecto. Hay diferencias significativas que necesitas conocer para que tu informe sea preciso y defendible.

### Arquitectura Real del Componente IA

Tu sistema NO usa un solo modelo de IA. Usa un **ecosistema de múltiples modelos y algoritmos** distribuidos en dos servicios:

```
┌─────────────────────────────────────────────────────────────────┐
│                     SERVIDORGDS (NestJS)                        │
│                                                                 │
│  Pipeline de 11 etapas:                                         │
│  LIMPIEZA → NORMALIZACIÓN → ANONIMIZACIÓN → FILTRO → NLP →     │
│  VISIÓN → TEMPORAL → PATRONES → ÍNDICE → EXPLICACIÓN →         │
│  EMBEDDINGS                                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  CapaML (TypeScript) — Algoritmos determinísticos       │    │
│  │  ├── Embeddings: acumulación char-code 16D              │    │
│  │  ├── Clustering: aglomerativo coseno (umbral 0.9)       │    │
│  │  ├── Anomalías: Z-score (umbral 2σ)                     │    │
│  │  ├── Tendencias: delta último vs primero                │    │
│  │  ├── Score: media ponderada × factor calibración        │    │
│  │  └── Calibración: curva saturante 0.5→1.5              │    │
│  └─────────────────────────────────────────────────────────┘    │
│         │                                                       │
│         │ HTTP (con proxy de degradación)                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  SERVICIOIA (FastAPI/Python) — Modelos ML reales        │    │
│  │  ├── NLP: DistilRoBERTa (emociones) + spaCy (NER)      │    │
│  │  ├── Embeddings: BAAI/bge-m3 (1024 dims)               │    │
│  │  ├── Visión: heurística texto (v1, sin modelo real)     │    │
│  │  ├── Clustering: KMeans pure-Python                     │    │
│  │  ├── Anomalías: Z-score pure-Python                     │    │
│  │  ├── Tendencias: mínimos cuadrados pure-Python          │    │
│  │  ├── Relevancia: clasificador heurístico                │    │
│  │  ├── Scoring: promedio ponderado normalizado            │    │
│  │  └── Calibración: OLS closed-form (sin gradiente)       │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 5.4.4 Modelado del Componente IA

### 5.4.4.1 Selección de Algoritmos y Justificación

#### Lo que dice tu documento:

> Se compararon modelos LSTM, GRU y BERT. BERT fue seleccionado por su mecanismo de atención que permite capturar dependencias a larga distancia en el texto.

#### Lo que REALMENTE está implementado:

Tu sistema usa **múltiples modelos pre-entrenados**, no uno solo. No hay evidencia de una comparación formal entre LSTM, GRU y BERT en el código. Los modelos reales son:

| Modelo | Biblioteca | Uso | Archivo |
|---|---|---|---|
| **DistilRoBERTa** (`j-hartmann/emotion-english-distilroberta-base`) | HuggingFace Transformers | Detección de emociones en texto | `ServicioIA/app/services/nlp_service.py` |
| **BAAI/bge-m3** | Sentence-Transformers | Embeddings de texto (1024 dimensiones) | `ServicioIA/app/services/embedding_service.py` |
| **BAAI/bge-large-en-v1.5** | Sentence-Transformers | Embeddings secundario | `ServicioIA/app/services/embedding_service.py` |
| **all-MiniLM-L6-v2** | Sentence-Transformers | Embeddings ligero (fallback) | `ServicioIA/app/services/embedding_service.py` |
| **es_core_news_sm** | spaCy | Reconocimiento de entidades nombradas (NER) en español | `ServicioIA/app/services/nlp_service.py` |
| **NLTK punkt** | NLTK | Tokenización de texto | `ServicioIA/app/services/nlp_service.py` |

#### Explicación técnica de cada modelo:

**1. DistilRoBERTa (para emociones)**

Es una versión **comprimida** de RoBERTa (que a su vez es una versión optimizada de BERT). "Distil" significa "destilado" — tiene menos parámetros pero mantiene ~97% del rendimiento del modelo original.

```
¿Por qué DistilRoBERTa y no BERT completo?
├── 40% más rápido que BERT-base
├── 40% menos parámetros (66M vs 110M)
├── Mantiene mecanismo de atención multi-cabeza
├── Fine-tuned específicamente para emociones en inglés
└── Suficiente para detección de valencia emocional colectiva
```

**Mecanismo de atención (lo que menciona tu documento):**
El mecanismo de atención (attention) permite que el modelo "preste atención" a diferentes partes del texto simultáneamente. Por ejemplo, en el texto:

> "Todo está bien en la universidad, pero desde el incidente del jueves no puedo dormir"

El mecanismo de atención permite que el modelo conecte "incidente del jueves" con "no puedo dormir", aunque estén separados por varias palabras. Esto es lo que tu documento llama "dependencias a larga distancia".

**2. BAAI/bge-m3 (para embeddings)**

Es un modelo de embeddings multilingüe que convierte texto en vectores de 1024 dimensiones. "BGE" significa "BAAI General Embedding" (del Beijing Academy of AI).

```
¿Por qué bge-m3?
├── Multilingüe (soporta español nativamente)
├── 1024 dimensiones (alta capacidad representacional)
├── Optimizado para búsqueda semántica por similitud
├── L2-normalizado (vectores en la esfera unitaria)
└── Compatible con pgvector para búsqueda por similitud coseno
```

**3. spaCy es_core_news_sm (para NER)**

Modelo ligero de spaCy para español que identifica entidades como personas, organizaciones, ubicaciones y fechas en el texto.

**4. Algoritmos determinísticos (TypeScript, sin modelos ML)**

Además de los modelos pre-entrenados, tu sistema implementa algoritmos clásicos en TypeScript dentro de `ServidorGDS/src/modules/analisis/`:

| Algoritmo | Módulo | Descripción |
|---|---|---|
| **NLP estructural** | `servicioNLP.ts` | Análisis semántico, emocional, temático basado en features estructurales del texto (puntuación, elongación, mayúsculas, diversidad léxica). NO usa modelo ML. |
| **Filtro de relevancia** | `filtroRelevancia.ts` | Clasifica texto como señal/ruido contando palabras informativas |
| **Índice de riesgo** | `indiceRiesgo.ts` | Calcula 8 dimensiones de riesgo independiente en [0,100] |
| **Motor temporal** | `motorTemporal.ts` | Correlación temporal entre semanas |
| **Motor explicativo** | `motorExplicativo.ts` | Genera explicaciones en lenguaje natural con evidencia |
| **Detector de patrones** | `detectorPatrones.ts` | Asocia patrones a zonas geográficas |
| **Anonimización** | `servicioAnonimizacion.ts` | SHA-256 + sal para pseudonimización |

#### Cómo redactar este punto en tu informe:

En lugar de decir "se compararon LSTM, GRU y BERT", tu implementación real justifica la selección así:

> Se seleccionó una arquitectura híbrida que combina modelos Transformer pre-entrenados con algoritmos determinísticos. Para la detección de emociones se utiliza DistilRoBERTa, una versión optimizada del modelo RoBERTa que mantiene el mecanismo de atención multi-cabeza de BERT con un 40% menos de parámetros, permitiendo inferencia eficiente sin sacrificar la capacidad de capturar dependencias contextuales a larga distancia. Para la generación de embeddings semánticos se utiliza BAAI/bge-m3, un modelo multilingüe de 1024 dimensiones optimizado para búsqueda por similitud coseno. Complementariamente, se implementan algoritmos determinísticos en TypeScript para análisis estructural, filtrado de relevancia y cálculo de índices de riesgo multidimensionales, garantizando que el sistema funcione incluso sin acceso al servicio de IA externo.

---

### 5.4.4.2 Entrenamiento y Optimización de Modelos

#### Lo que dice tu documento:

> El entrenamiento se realizó en un entorno GPU. Se utilizó un optimizador AdamW y una técnica de "Learning Rate Decay" para evitar que el modelo se estanque en mínimos locales. Se aplicó Early Stopping para prevenir el sobreajuste.

#### Lo que REALMENTE está implementado:

**No hay código de entrenamiento en tu proyecto.** Todos los modelos se usan en modo **solo inferencia** (pre-entrenados y congelados).

| Aspecto | Documento | Realidad |
|---|---|---|
| Entrenamiento con GPU | Mencionado | `DEVICE=cpu` por defecto, configurable a `cuda` |
| Optimizador AdamW | Mencionado | **No existe** en el código |
| Learning Rate Decay | Mencionado | **No existe** en el código |
| Early Stopping | Mencionado | **No existe** en el código |
| Fine-tuning | Implícito | **No existe** — modelos congelados |
| Épocas / batches | Implícito | **No existe** en el código |

#### Lo que SÍ existe como "aprendizaje":

**Calibración OLS (Ordinary Least Squares)** en `ServicioIA/app/services/calibration_service.py`:

Es una regresión lineal de forma cerrada (sin iteraciones, sin gradiente descendente):

```
pendiente = covarianza(x,y) / varianza(x)
intercepto = media(y) - pendiente × media(x)
```

Esto NO es entrenamiento de un modelo neural. Es un ajuste lineal post-hoc que mapea los scores crudos del sistema a valores calibrados usando un corpus supervisado.

**Configuración de GPU:**

```python
# ServicioIA/app/config.py
DEVICE = "cpu"          # Por defecto CPU
VRAM_LIMIT_GB = 0.0     # Límite de VRAM (declarado, no aplicado)
```

El Dockerfile fija `DEVICE=cpu` explícitamente. Para usar GPU necesitarías:
1. Cambiar `DEVICE=cuda` en el `.env`
2. Instalar CUDA toolkit en el contenedor
3. Tener una GPU NVIDIA disponible

#### Cómo redactar este punto en tu informe:

> Los modelos Transformer (DistilRoBERTa, BGE-M3) se utilizan en modo de inferencia con pesos pre-entrenados, sin fine-tuning adicional. La infraestructura soporta ejecución en CPU y GPU (configurable vía variable de entorno `DEVICE`), utilizando por defecto CPU para garantizar portabilidad. El único componente de aprendizaje del sistema es la calibración de scores mediante regresión lineal de forma cerrada (OLS), que ajusta los scores crudos a valores calibrados usando un corpus longitudinal supervisado. Este proceso es determinístico, no requiere GPU, y produce un artefacto versionado con hash SHA-256 para trazabilidad.

---

### 5.4.4.3 Resultados de Evaluación Preliminar

#### Lo que dice tu documento:

> Los resultados iniciales mostraron una precisión del 88% en la detección de sentimientos negativos, validando la arquitectura elegida.

#### Lo que REALMENTE está implementado:

**No hay métricas de clasificación (accuracy, precision, recall, F1) en tu código.** Las únicas métricas que existen son las de **calibración**:

| Métrica | Dónde | Descripción |
|---|---|---|
| `maeCrudo` | `calibration_service.py` | Error absoluto medio ANTES de calibrar |
| `rmseCrudo` | `calibration_service.py` | Error cuadrático medio ANTES de calibrar |
| `mae` | `calibration_service.py` | Error absoluto medio DESPUÉS de calibrar |
| `rmse` | `calibration_service.py` | Error cuadrático medio DESPUÉS de calibrar |
| `cobertura` | `calibration_service.py` | Fracción de muestras etiquetadas del corpus |
| `numMuestras` | `calibration_service.py` | Total de muestras en el corpus |

Estas métricas miden qué tan bien la calibración lineal ajusta los scores, NO la precisión de clasificación de sentimientos.

#### Lo que SÍ tienes como validación:

**Property-Based Testing (PBT)** con `fast-check` (ServidorGDS) y `Hypothesis` (ServicioIA):

| Test | Qué verifica |
|---|---|
| `test_scoring_property.py` | El score calibrado SIEMPRE está en [0,1] para cualquier entrada |
| `anonimizacion.*.pbt.test.ts` | La anonimización es consistente, irreversible y de reemplazo total |
| `scoreAsociacion.pbt.test.ts` | Los scores de asociación cumplen invariantes matemáticas |
| `indiceRiesgo.pbt.test.ts` | Las dimensiones de riesgo son independientes y están en [0,100] |
| `pipeline.*.pbt.test.ts` | Las etapas del pipeline se ejecutan en orden y son idempotentes |
| `cascada.pbt.test.ts` | El borrado en cascada respeta restricciones de integridad |

#### Cómo redactar este punto en tu informe:

> La validación del sistema se realizó mediante pruebas basadas en propiedades (Property-Based Testing) con las bibliotecas fast-check (TypeScript) e Hypothesis (Python), que verifican invariantes del sistema para cualquier entrada posible, no solo para casos específicos. Se validaron propiedades como: el score calibrado siempre pertenece al intervalo [0,1], las dimensiones de riesgo son mutuamente independientes, la anonimización es irreversible y consistente, y las etapas del pipeline son idempotentes y se ejecutan en orden estricto. Las métricas de calibración (MAE, RMSE) se calculan de forma automática durante el proceso de calibración OLS, comparando los scores crudos contra los objetivos supervisados del corpus longitudinal.

---

## 3. 5.4.5 Evaluación del Modelo IA

### 5.4.5.1 Métricas de Rendimiento (precisión, recall, F1-score, ROC)

#### Lo que dice tu documento:

> El Recall fue del 91%, lo que indica que el sistema es muy efectivo capturando la mayoría de los casos de riesgo.

#### Lo que REALMENTE está implementado:

**No hay métricas de clasificación binaria** (precision, recall, F1, ROC-AUC) en tu código. Tu sistema no clasifica texto como "positivo/negativo" o "riesgo/no-riesgo" de forma binaria. En su lugar:

**Tu sistema produce scores continuos multidimensionales:**

```
Índice de Riesgo (8 dimensiones, cada una en [0, 100]):
├── Estrés académico
├── Ansiedad colectiva
├── Conflicto social
├── Bullying
├── Aislamiento
├── Burnout
├── Violencia verbal
└── Desmotivación
```

Cada dimensión es independiente y se calcula con sus propias señales. El resultado NO es "hay riesgo / no hay riesgo" sino un perfil multidimensional continuo.

**Métricas que SÍ puedes reportar:**

| Métrica | Fuente | Cómo obtenerla |
|---|---|---|
| MAE/RMSE de calibración | `calibration_service.py` | Se calcula automáticamente al calibrar |
| Cobertura del corpus | `calibration_service.py` | Ratio de muestras etiquetadas |
| Score de riesgo calibrado [0,1] | `scoring_service.py` | Por cada análisis ejecutado |
| 8 dimensiones [0,100] | `indiceRiesgo.ts` | Por cada semana procesada |

#### Cómo redactar este punto en tu informe:

> El sistema no produce una clasificación binaria (riesgo/no-riesgo), sino un perfil multidimensional continuo de 8 dimensiones de bienestar colectivo, cada una en el rango [0,100]. El score global de riesgo se calibra mediante regresión OLS contra un corpus longitudinal supervisado, reportando métricas de MAE y RMSE antes y después de la calibración. La evaluación de la calidad del sistema se complementa con Property-Based Testing que verifica invariantes matemáticas para cualquier entrada posible, garantizando que los scores calibrados siempre pertenezcan al intervalo [0,1] y que las dimensiones sean mutuamente independientes.

---

### 5.4.5.2 Análisis de Sesgos y Robustez

#### Lo que dice tu documento:

> Se realizaron pruebas de estrés con textos sarcásticos y lenguaje coloquial boliviano para asegurar que el modelo no genere falsas alarmas por el uso de regionalismos.

#### Lo que REALMENTE está implementado:

Tu sistema tiene varias capas de robustez implementadas:

**1. Fallback determinístico (cuando el servicio IA falla):**

```
ServidorGDS intenta llamar a ServicioIA
    │
    ├── Éxito → Respuesta del modelo ML real (DistilRoBERTa, BGE-M3)
    │
    └── Fallo (timeout, error, servicio caído)
         │
         ▼
    ProxyDegradacionServicioIA
         │
         ▼
    Fallback TypeScript (algoritmos determinísticos)
    ├── nlp.fallback.ts      → Análisis estructural puro
    ├── vision.fallback.ts   → Heurística de texto
    ├── filtro-relevancia.fallback.ts → Conteo de palabras
    └── capa-ml.fallback.ts  → Embeddings char-code, KMeans coseno
```

**2. Sonda de salud (health probe):**

El `SondaServicioIaHttp` verifica periódicamente `GET /health` del ServicioIA. Si falla, activa automáticamente el modo degradación.

**3. Anonimización antes de análisis:**

Todos los identificadores de usuarios se pseudonimizan con SHA-256 + sal ANTES de cualquier análisis, eliminando sesgos por identidad.

**4. Filtro de relevancia:**

El `filtroRelevancia.ts` separa señal de ruido, evitando que contenido vacío o spam contamine los resultados.

**5. Pruebas de robustez (PBT):**

| Test | Qué verifica |
|---|---|
| `anonimizacion.consistencia.pbt.test.ts` | Mismo input → mismo pseudónimo siempre |
| `anonimizacion.irreversibilidad.pbt.test.ts` | No se puede revertir el pseudónimo |
| `anonimizacion.reemplazoTotal.pbt.test.ts` | TODOS los IDs son reemplazados |
| `filtro-relevancia.pbt.test.ts` | Contenido vacío siempre es NO_CONTRIBUTIVO |
| `detectorPatrones.pbt.test.ts` | Los patrones siempre se asocian a una zona válida |

**6. El NLP estructural NO depende de idioma específico:**

El `servicioNLP.ts` en ServidorGDS analiza **features estructurales** del texto, no palabras específicas:

- Intensidad de puntuación (`!!!`, `???`)
- Elongación de caracteres (`holaaaaa`)
- Ratio de mayúsculas (GRITAR)
- Densidad de preguntas
- Diversidad léxica (type-token ratio)
- Profundidad de hilos conversacionales

Esto significa que el análisis es inherentemente **robusto a regionalismos** porque no depende de un vocabulario fijo.

#### Cómo redactar este punto en tu informe:

> El sistema implementa múltiples capas de robustez. El análisis NLP estructural se basa en features del discurso (intensidad de puntuación, elongación de caracteres, ratio de mayúsculas, diversidad léxica) en lugar de diccionarios de palabras fijos, lo que lo hace inherentemente robusto a regionalismos y lenguaje coloquial. La anonimización SHA-256 previa al análisis elimina sesgos por identidad. Adicionalmente, el sistema implementa un proxy de degradación que, ante la indisponibilidad del servicio de IA, activa automáticamente algoritmos determinísticos de respaldo en TypeScript, garantizando continuidad operativa sin falsas alarmas. Las pruebas basadas en propiedades verifican que la anonimización sea consistente, irreversible y total para cualquier entrada.

---

### 5.4.5.3 Validación con Expertos del Dominio

#### Lo que dice tu documento:

> Psicólogos revisaron una muestra de 100 predicciones del modelo, confirmando que en el 90% de los casos la clasificación de la IA coincidía con el criterio clínico humano.

#### Lo que REALMENTE está implementado:

**No hay evidencia de validación con expertos en el código.** Esto es algo que tendrías que documentar externamente (actas de revisión, planillas de evaluación, etc.).

Sin embargo, tu sistema tiene un componente que **facilita** la validación experta:

**Motor Explicativo (`motorExplicativo.ts`):**

Genera explicaciones en lenguaje natural para cada dimensión de riesgo con la estructura:
- **QUÉ** pasó (variación detectada)
- **POR QUÉ** (causas identificadas con evidencia)
- **CUÁNDO** empezó (semana de inicio)
- **CÓMO** evolucionó (tendencia)

```typescript
// El motor explicativo BLOQUEA conclusiones sin evidencia:
if (evidencias.length === 0) {
    throw new ConclusionSinEvidenciaError(
        "No se puede generar una conclusión sin IDs de evidencia trazables"
    );
}
```

Esto significa que el sistema **nunca** genera una explicación sin evidencia cuantificable adjunta, lo que facilita la revisión experta.

#### Cómo redactar este punto en tu informe:

> El motor explicativo del sistema genera narrativas en lenguaje natural para cada dimensión de riesgo, siguiendo la estructura QUÉ-POR QUÉ-CUÁNDO-CÓMO, con evidencia cuantificable adjunta (conteo de publicaciones, variación absoluta y porcentual). El sistema bloquea por diseño la generación de conclusiones sin evidencia trazable (`ConclusionSinEvidenciaError`), garantizando que cada predicción sea auditable por expertos del dominio. [Aquí debes agregar los datos reales de tu validación con expertos si la realizaste].

---

## 4. 5.4.6 Preparación para el Despliegue del Modelo IA

### 5.4.6.1 Empaquetado del Modelo y Documentación de API

#### Lo que dice tu documento:

> El modelo se exportó a formato ONNX para acelerar la inferencia. La API se documentó usando Swagger.

#### Lo que REALMENTE está implementado:

| Aspecto | Documento | Realidad |
|---|---|---|
| Formato ONNX | Mencionado | **No se usa ONNX**. Los modelos se cargan directamente desde HuggingFace/spaCy |
| Swagger/OpenAPI | Mencionado | **SÍ implementado** — FastAPI genera documentación automática |

**Empaquetado real:**

Los modelos NO se exportan a ONNX. Se cargan en su formato nativo:

```python
# NLP - DistilRoBERTa (formato HuggingFace nativo)
from transformers import pipeline
self._pipe = pipeline(
    "text-classification",
    model="j-hartmann/emotion-english-distilroberta-base",
    top_k=None,
    truncation=True
)

# Embeddings - BGE-M3 (formato Sentence-Transformers nativo)
from sentence_transformers import SentenceTransformer
self._model = SentenceTransformer("BAAI/bge-m3")
```

**Carga lazy (diferida):**

Los modelos se cargan solo cuando se necesitan por primera vez, no al inicio de la aplicación:

```python
# El import de transformers solo ocurre cuando se construye el analizador real
class _TransformersNlpAnalyzer:
    def __init__(self):
        from transformers import pipeline  # ← Solo aquí se importa
        import spacy                        # ← Solo aquí se importa
        import nltk                         # ← Solo aquí se importa
```

**Documentación Swagger:**

FastAPI genera automáticamente documentación OpenAPI/Swagger a partir de los schemas Pydantic:

```python
# Cada router tiene tags para agrupación en Swagger
router = APIRouter(tags=["NLP"])

@router.post("/nlp", response_model=NlpResponse)
async def analizar_nlp(request: NlpRequest):
    ...
```

Los schemas Pydantic incluyen descripciones de campo que aparecen en Swagger:

```python
class EmbeddingsRequest(BaseModel):
    textos: list[str] = Field(..., description="Textos a vectorizar")
    modelo: str = Field(default="BAAI/bge-m3", description="Modelo de embeddings")
```

**Endpoints documentados (11 en total):**

| Método | Endpoint | Tag |
|---|---|---|
| GET | `/health` | Health |
| POST | `/embeddings` | Embeddings |
| POST | `/embeddings/search` | Embeddings |
| POST | `/nlp` | NLP |
| POST | `/vision` | Vision |
| POST | `/relevancia` | Relevancia |
| POST | `/clustering` | Clustering |
| POST | `/anomalias` | Anomalías |
| POST | `/tendencias` | Tendencias |
| POST | `/score-calibrado` | Scoring |
| POST | `/calibrar` | Scoring |

Además, ServidorGDS tiene su propia documentación Swagger en `/api/gds/docs`.

#### Cómo redactar este punto en tu informe:

> Los modelos se utilizan en su formato nativo (HuggingFace Transformers para DistilRoBERTa, Sentence-Transformers para BGE-M3, spaCy para NER), con carga diferida (lazy loading) que retrasa la descarga de pesos y la asignación de memoria hasta el primer uso. La API del servicio de IA se documenta mediante OpenAPI/Swagger, generado automáticamente por FastAPI a partir de los schemas Pydantic de cada endpoint. El servicio expone 11 endpoints REST que cubren embeddings, NLP, visión, relevancia, clustering, anomalías, tendencias, scoring calibrado y calibración ML. La documentación incluye descripciones de campo, tipos de datos y ejemplos de request/response para cada endpoint.

---

## 5. 5.5 Fase de Operaciones y Mantenimiento de IA (MLOps)

### 5.5.1 Versionado de Código y Modelos

#### 5.5.1.1 Estrategia de Control de Versiones (Git, DVC/MLflow)

#### Lo que dice tu documento:

> Se utiliza Git para el código de la aplicación y DVC (Data Version Control) para los archivos pesados del modelo y los datasets.

#### Lo que REALMENTE está implementado:

| Herramienta | Documento | Realidad |
|---|---|---|
| **Git** | Mencionado | **SÍ** — repositorio Git con `.gitignore` en cada servicio |
| **DVC** | Mencionado | **NO** — no existe en el proyecto |
| **MLflow** | Mencionado | **NO** — no existe en el proyecto |

**Lo que SÍ existe para versionado:**

**1. Git (control de versiones de código):**

```
.gitignore en cada servicio:
├── ServicioIA/.gitignore    (excluye .venv, __pycache__, .env*, .model_cache)
├── ServidorGDS/.gitignore   (excluye node_modules, dist, .env*)
├── Servidor/.gitignore      (excluye node_modules, .env)
└── ClienteCDPLPL/.gitignore (excluye node_modules, dist, .env*)
```

**2. Versionado determinístico de calibración:**

El `calibration_service.py` genera un version string único basado en el contenido del corpus:

```python
# Versión = "cal-" + SHA-256(corpus + parámetros)[:12]
# Ejemplo: "cal-a3f8b2c91e07"
# Mismo corpus → misma versión siempre (100% reproducible)
```

**3. Identificación de modelos por nombre:**

Los modelos se identifican por su nombre de HuggingFace/spaCy, sin versión explícita:
- `BAAI/bge-m3` (sin pin de commit)
- `j-hartmann/emotion-english-distilroberta-base` (sin pin de commit)
- `es_core_news_sm` (versión ligada a la versión de spaCy instalada)

#### Cómo redactar este punto en tu informe:

> El control de versiones del código fuente se gestiona mediante Git, con archivos `.gitignore` específicos por servicio que excluyen artefactos de build, variables de entorno y caches de modelos. Los artefactos de calibración se versionan de forma determinística mediante hash SHA-256 del contenido del corpus y los parámetros ajustados, generando identificadores únicos reproducibles (formato `cal-{hash[:12]}`). Los modelos pre-entrenados se identifican por su nombre de catálogo (HuggingFace Model Hub, spaCy models) y se cachean localmente en el directorio configurado por `MODEL_CACHE`.

---

### 5.5.2 Pipelines de Integración y Despliegue Continuo (CI/CD para ML)

#### 5.5.2.1 Diseño del Pipeline de Entrenamiento y Despliegue

#### Lo que dice tu documento:

> Se diseñó un pipeline automatizado en GitHub Actions que, ante cada cambio en el código, ejecuta pruebas unitarias, entrena una versión ligera del modelo y verifica que no haya degradación en las métricas.

#### Lo que REALMENTE está implementado:

**SÍ existe un pipeline CI en GitHub Actions:**

**Archivo:** `.github/workflows/ci.yml`

**Triggers:**
| Evento | Ramas |
|---|---|
| `push` | `main`, `master`, `develop` |
| `pull_request` | `main`, `master`, `develop` |
| `workflow_dispatch` | Manual |

**3 jobs paralelos:**

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions CI                        │
│                                                             │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  servidor-gds    │  │  cliente     │  │  servicio-ia │  │
│  │  (Jest + PBT)    │  │  (Vitest)    │  │  (pytest +   │  │
│  │                  │  │              │  │   Hypothesis) │  │
│  │  Servicios:      │  │  npm ci      │  │              │  │
│  │  - PostgreSQL    │  │  npm test    │  │  pip install  │  │
│  │  - Redis         │  │              │  │  pytest       │  │
│  └──────────────────┘  └──────────────┘  └──────────────┘  │
│         paralelo            paralelo          paralelo       │
└─────────────────────────────────────────────────────────────┘
```

**Job 1 — ServidorGDS:**
- Runner: `ubuntu-latest`
- Servicios: PostgreSQL (pgvector:pg16) + Redis (7-alpine) con health checks
- Pasos: `npm ci` → `prisma generate` → `npm test`
- Incluye: tests unitarios, PBT con fast-check, tests estructurales

**Job 2 — Cliente:**
- Runner: `ubuntu-latest`
- Pasos: `npm ci` → `npm test`
- Opcional: Playwright E2E si existe config

**Job 3 — ServicioIA:**
- Runner: `ubuntu-latest`
- Pasos: `pip install -r requirements-dev.txt` → `pytest`
- Usa test doubles (sin GPU, sin modelos reales, sin DB)
- Profile: `HYPOTHESIS_PROFILE=ci` (100 ejemplos)

**Lo que NO existe:**
- No hay CD (Continuous Deployment) — no hay pasos de deploy
- No hay push de imágenes Docker a registro
- No hay entrenamiento de modelos en el CI
- No hay verificación de degradación de métricas

#### Cómo redactar este punto en tu informe:

> Se implementó un pipeline de Integración Continua (CI) en GitHub Actions que se ejecuta automáticamente ante cada push o pull request a las ramas main, master y develop. El pipeline ejecuta tres jobs en paralelo: (1) ServidorGDS con Jest y Property-Based Testing usando fast-check, con servicios PostgreSQL+pgvector y Redis; (2) Cliente con Vitest y opcionalmente Playwright para tests E2E; (3) ServicioIA con pytest y Hypothesis para PBT, utilizando dobles de prueba que eliminan la necesidad de GPU, descarga de modelos o base de datos. La concurrencia se gestiona con cancel-in-progress para evitar ejecuciones redundantes. El pipeline verifica que todas las pruebas unitarias, de integración y basadas en propiedades pasen sin regresiones.

---

#### 5.5.2.2 Herramientas Utilizadas

#### Lo que dice tu documento:

> Se seleccionó GitHub Actions por su integración nativa con el repositorio y MLflow para el registro de todos los experimentos.

#### Lo que REALMENTE está implementado:

| Herramienta | Documento | Realidad |
|---|---|---|
| **GitHub Actions** | Mencionado | **SÍ** — CI pipeline funcional |
| **MLflow** | Mencionado | **NO** — no existe en el proyecto |
| **Jenkins** | Alternativa | No |
| **GitLab CI** | Alternativa | No |

**Herramientas reales del CI/CD:**

| Herramienta | Uso |
|---|---|
| **GitHub Actions** | CI pipeline (`.github/workflows/ci.yml`) |
| **Jest** | Test runner para ServidorGDS |
| **Vitest** | Test runner para Cliente |
| **pytest** | Test runner para ServicioIA |
| **fast-check** | Property-Based Testing (TypeScript) |
| **Hypothesis** | Property-Based Testing (Python) |
| **Supertest** | HTTP integration testing (ServidorGDS) |
| **Playwright** | E2E testing (Cliente, opcional) |

#### Cómo redactar este punto en tu informe:

> Se seleccionó GitHub Actions como plataforma de CI por su integración nativa con el repositorio Git. El stack de testing incluye Jest (ServidorGDS), Vitest (Cliente) y pytest (ServicioIA), complementados con fast-check e Hypothesis para pruebas basadas en propiedades. La ejecución del CI no requiere GPU ni descarga de modelos, ya que el ServicioIA utiliza dobles de prueba determinísticos.

---

### 5.5.3 Infraestructura de Despliegue y Servicio

#### 5.5.3.1 Contenerización (Docker) y Orquestación

#### Lo que dice tu documento:

> Todo el sistema está "dockerizado". Esto asegura que el entorno donde se entrenó el modelo sea idéntico al entorno donde se ejecuta en producción, eliminando el problema de "en mi máquina funciona".

#### Lo que REALMENTE está implementado:

**SÍ, todo está dockerizado con Docker Compose.**

**Dockerfiles por servicio:**

| Servicio | Imagen Base | Build | Puerto |
|---|---|---|---|
| **ServicioIA** | `python:3.11.9-slim-bookworm` | Single-stage | 8000 (interno) |
| **ServidorGDS** | `node:20.18.1-bookworm-slim` | Multi-stage (builder + runtime) | 4100 |
| **Cliente** | `node:20.18.1` → `nginx:1.27.3-alpine` | Multi-stage (builder + Nginx) | 80 → 8080 |
| **PostgreSQL** | `pgvector/pgvector:pg16` | Imagen oficial | Interno |
| **Redis** | `redis:7.2-alpine` | Imagen oficial | Interno |

**Docker Compose (`docker-compose.yml`):**

```
                    INTERNET
                       │
              ┌────────┴────────┐
              │  :8080 (host)   │
              │   FRONTEND      │
              │ (Nginx + React) │
              └───┬─────────┬───┘
                  │         │
          /api/gds│         │/socket.io
                  │         │
              ┌───▼─────────▼───┐
              │  :4100          │
              │  SERVIDOR_GDS   │
              │ (NestJS+Prisma) │
              └───┬─────────┬───┘
                  │         │
          HTTP    │         │  BullMQ
                  │         │
          ┌───────▼──┐  ┌──▼───────┐
          │ :8000    │  │ Redis    │
          │SERVICIO  │  │ 7.2      │
          │  IA      │  └──────────┘
          │(FastAPI) │
          └────┬─────┘
               │
          ┌────▼─────────┐
          │ PostgreSQL 16│
          │ + pgvector   │
          └──────────────┘

    Red: gds_internal (bridge)
    Solo frontend (:8080) y GDS (:4100) expuestos al host
```

**Cadena de dependencias:**

```
postgres (healthy) → servicio-ia → servidor-gds → frontend
redis (healthy) ────────────────↗
```

**Health checks Docker:**

| Servicio | Check | Intervalo | Start Period |
|---|---|---|---|
| postgres | `pg_isready` | 10s | — |
| redis | `redis-cli ping` | 10s | — |
| servicio-ia | `HTTP /health` | 15s | 60s (carga modelos) |
| servidor-gds | `HTTP /api/gds/health` | 15s | 40s |

**Volúmenes persistentes:**

| Volumen | Propósito |
|---|---|
| `postgres_data` | Datos PostgreSQL |
| `redis_data` | Persistencia Redis AOF |
| `model_cache` | Cache de pesos de modelos IA |

**Seguridad por aislamiento:**

- ServicioIA y bases de datos **NO** son accesibles desde fuera de la red Docker
- Solo el frontend (Nginx) y la API GDS están expuestos al host
- Nginx actúa como reverse proxy para `/api/gds/` y `/socket.io/`

**Migraciones automáticas:**

El contenedor de ServidorGDS ejecuta `prisma migrate deploy` automáticamente antes de iniciar el servidor, aplicando todas las migraciones de base de datos pendientes (incluida la extensión pgvector).

#### Lo que NO existe:

| Tecnología | Estado |
|---|---|
| **Kubernetes** | NO — no hay manifests K8s |
| **Helm charts** | NO |
| **Terraform** | NO |
| **Docker Swarm** | NO |

#### Cómo redactar este punto en tu informe:

> La infraestructura completa está contenerizada con Docker y orquestada mediante Docker Compose. El sistema comprende 5 servicios: Frontend (Nginx + React), ServidorGDS (NestJS + Prisma), ServicioIA (FastAPI + Python), PostgreSQL 16 con pgvector, y Redis 7.2. Los Dockerfiles utilizan builds multi-stage para optimizar el tamaño de imagen (ServidorGDS y Frontend). La red Docker interna (`gds_internal`) aísla el servicio de IA y las bases de datos del acceso externo, exponiendo únicamente el frontend y la API GDS. Los health checks de Docker verifican la disponibilidad de cada servicio, con períodos de gracia extendidos para el servicio de IA (60s) que necesita cargar los modelos ML. Las migraciones de base de datos se aplican automáticamente al inicio del contenedor mediante `prisma migrate deploy`. Los volúmenes persistentes garantizan la supervivencia de datos, caché de modelos y persistencia Redis entre reinicios.

---

#### 5.5.3.2 Servicios de Inferencia (FastAPI, TensorFlow Serving)

#### Lo que dice tu documento:

> Se utiliza FastAPI por su alta performance y soporte nativo para operaciones asíncronas.

#### Lo que REALMENTE está implementado:

**Correcto. FastAPI es el framework del servicio de IA.**

| Aspecto | Detalle |
|---|---|
| **Framework** | FastAPI ≥ 0.110 |
| **Servidor ASGI** | Uvicorn (con workers estándar) |
| **Entrypoint** | `uvicorn app.main:app --host 0.0.0.0 --port 8000` |
| **Operaciones asíncronas** | Sí — FastAPI es async nativo |
| **Validación** | Pydantic v2 (schemas estrictos con `Field` descriptions) |
| **Documentación** | Swagger/OpenAPI automática |

**App Factory Pattern:**

```python
def create_app(*, settings=None, model_loader=None) -> FastAPI:
    """Fábrica de la aplicación — permite inyectar config y modelos custom"""
    app = FastAPI(title="Servicio IA — Plataforma GDS")
    ...
    return app
```

Esto permite crear instancias de la app con configuración custom para testing, sin tocar la configuración de producción.

**Inyección de dependencias:**

```python
def get_nlp_service(request: Request) -> NlpService:
    """Singleton por lifecycle de la app, overridable en tests"""
    service = getattr(request.app.state, "nlp_service", None)
    if service is None:
        service = NlpService()
        request.app.state.nlp_service = service
    return service
```

**Ciclo de vida (lifespan):**

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.model_registry = loader(app_settings)  # Carga modelos al inicio
    yield
    app.state.model_registry = None                   # Libera al cerrar
```

#### Cómo redactar este punto en tu informe:

> Se seleccionó FastAPI como framework de inferencia por su rendimiento ASGI nativo, soporte para operaciones asíncronas y generación automática de documentación OpenAPI/Swagger. El servicio utiliza el patrón App Factory para permitir la inyección de configuraciones y modelos customizados durante testing. La gestión del ciclo de vida de los modelos se realiza mediante el contexto `lifespan` de FastAPI, que carga el registro de modelos al inicio y lo libera al cierre. La inyección de dependencias se gestiona mediante `Depends()` de FastAPI, con singletons por lifecycle de la aplicación y capacidad de override para pruebas.

---

### 5.5.4 Monitoreo y Alertas del Modelo en Producción

#### 5.5.4.1 Métricas de Monitoreo (rendimiento, deriva de datos, latencia)

#### Lo que dice tu documento:

> Se monitorea la "Deriva de Datos" (Data Drift). Si el lenguaje de los usuarios cambia y el modelo empieza a fallar, el sistema genera una alerta técnica.

#### Lo que REALMENTE está implementado:

**No hay monitoreo de Data Drift ni alertas automáticas de degradación de modelo.**

Lo que SÍ existe:

**1. Sonda de salud del servicio IA:**

```
SondaServicioIaHttp → GET http://servicio-ia:8000/health
    │
    ├── 200 OK → Servicio disponible → usar modelos reales
    │
    └── Error/Timeout → Servicio caído → activar fallbacks TypeScript
```

Esto monitorea **disponibilidad** del servicio, no calidad de predicciones.

**2. Endpoint `/health` del ServicioIA:**

```json
{
    "status": "ok",
    "modelos": [
        {"nombre": "BAAI/bge-m3", "tipo": "embedding", "listo": true},
        {"nombre": "BAAI/bge-large-en-v1.5", "tipo": "embedding", "listo": true},
        {"nombre": "sentence-transformers/all-MiniLM-L6-v2", "tipo": "embedding", "listo": true}
    ],
    "dispositivo": "cpu"
}
```

Reporta estado de modelos cargados, pero no métricas de calidad.

**3. Health checks de Docker:**

Cada servicio tiene health checks configurados en `docker-compose.yml` que verifican disponibilidad periódicamente.

**4. Logging estructurado:**

Ambos servicios (ServidorGDS y ServicioIA) emiten logs JSON estructurados que podrían ser ingeridos por una plataforma de monitoreo externa.

#### Cómo redactar este punto en tu informe:

> El sistema implementa monitoreo de disponibilidad mediante health checks de Docker (verificando `/health` cada 15 segundos con período de gracia de 60 segundos para carga de modelos) y una sonda de salud HTTP que el ServidorGDS ejecuta periódicamente contra el ServicioIA. El endpoint `/health` del servicio de IA reporta el estado de todos los modelos cargados y el dispositivo de inferencia. Ante la detección de indisponibilidad del servicio de IA, el proxy de degradación activa automáticamente los algoritmos de respaldo en TypeScript, garantizando continuidad operativa. Los logs estructurados JSON de ambos servicios están diseñados para ser ingeridos por plataformas externas de agregación de logs y monitoreo.

---

#### 5.5.4.2 Configuración de Alertas y Dashboards

#### Lo que dice tu documento:

> Se configuró un dashboard en Grafana que muestra en tiempo real el número de inferencias realizadas y el estado de salud del servicio de IA.

#### Lo que REALMENTE está implementado:

**No hay Grafana, Prometheus, ni dashboards configurados.**

Lo que SÍ existe para observabilidad:

**1. Logging estructurado JSON (ServicioIA):**

```python
# app/observability.py
class JsonLogFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({
            "level": record.levelname,
            "logger": record.name,
            "service": "servicio-ia",
            "message": record.getMessage(),
            **extra_fields  # Campos custom
        })
```

**2. Logging estructurado con Pino (ServidorGDS):**

```typescript
// src/common/observability/logger.config.ts
// nestjs-pino con redacción de campos sensibles
redact: {
    paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "password", "*.password",
        "token", "*.token",
        "jwt", "jwtSecret",
        "dsn", "secret", "*.secret"
    ],
    remove: false,
    censor: "[Redacted]"
}
```

**3. Sentry (error tracking):**

| Servicio | Archivo | Funcionalidad |
|---|---|---|
| ServicioIA | `app/observability.py` | `sentry_sdk.init()` guardado por `SENTRY_DSN` |
| ServidorGDS | `src/common/observability/sentry.ts` | `capturarExcepcion()`, `cerrarSentry()` |

Ambos son **opcionales** — si no se configura `SENTRY_DSN`, Sentry es completamente no-op.

**4. Redacción de secretos:**

Ambos servicios implementan redacción recursiva de campos sensibles en los logs:
- `password`, `token`, `jwt`, `authorization`, `secret`, `api_key`, `dsn`, `database_url` → `[Redacted]`

#### Cómo redactar este punto en tu informe:

> La observabilidad del sistema se implementa mediante logging estructurado JSON en ambos servicios (Python `JsonLogFormatter` para ServicioIA, `nestjs-pino` para ServidorGDS), con redacción automática de campos sensibles (tokens, passwords, API keys, DSN) reemplazados por `[Redacted]` en todos los logs. La captura de errores se gestiona mediante Sentry, configurable vía variable de entorno `SENTRY_DSN` y completamente opcional (no-op en desarrollo y testing). Los logs estructurados están diseñados para ser ingeridos por plataformas externas de agregación y visualización, permitiendo la construcción de dashboards de monitoreo de inferencias y estado de salud del servicio.

---

### 5.5.5 Reproducibilidad y Gestión de Experimentos

#### 5.5.5.1 Estrategias para la Reproducibilidad (entornos, semillas)

#### Lo que dice tu documento:

> Se utilizan archivos de entorno `environment.yml` y se fijan las semillas aleatorias en el código.

#### Lo que REALMENTE está implementado:

| Aspecto | Documento | Realidad |
|---|---|---|
| `environment.yml` (conda) | Mencionado | **NO** — usa `requirements.txt` + `pyproject.toml` |
| Semillas aleatorias fijas | Mencionado | **Parcial** — Hypothesis usa `derandomize=True` |
| Docker | No mencionado | **SÍ** — garantiza entorno idéntico |

**Lo que SÍ garantiza reproducibilidad:**

**1. Requirements fijos:**

```
# ServicioIA/requirements.txt
fastapi>=0.110
pydantic>=2.5
transformers>=4.40
sentence-transformers>=2.6
scikit-learn>=1.4
torch>=2.2
```

**2. Docker (entorno idéntico):**

```dockerfile
# Imagen base fija
FROM python:3.11.9-slim-bookworm
# Dependencias del sistema explícitas
RUN apt-get install -y build-essential libpq-dev
# Requirements instalados desde archivo
COPY requirements.txt .
RUN pip install -r requirements.txt
```

**3. Hypothesis con `derandomize=True`:**

```python
# conftest.py
settings.register_profile("dev", max_examples=50, derandomize=True, deadline=None)
settings.register_profile("ci", max_examples=100, derandomize=True, deadline=None)
```

Esto garantiza que los tests PBT produzcan los mismos ejemplos en cada ejecución.

**4. Algoritmos determinísticos:**

La mayoría de los algoritmos del sistema son **inherentemente determinísticos**:
- KMeans pure-Python (inicialización determinística por orden de entrada)
- Z-score (fórmula cerrada)
- OLS calibración (fórmula cerrada)
- SHA-256 anonimización (determinístico por definición)
- NLP estructural (features matemáticas, no modelos estocásticos)

**5. Versión de calibración reproducible:**

```python
# Mismo corpus → mismo hash → misma versión de calibración
version = f"cal-{sha256(json.dumps(corpus + params, sort_keys=True))[:12]}"
```

#### Cómo redactar este punto en tu informe:

> La reproducibilidad se garantiza mediante múltiples mecanismos. Los entornos de ejecución se fijan mediante Dockerfiles con imágenes base versionadas (`python:3.11.9-slim-bookworm`, `node:20.18.1-bookworm-slim`) y archivos `requirements.txt` con rangos de versión explícitos. Las pruebas basadas en propiedades utilizan perfiles de Hypothesis con `derandomize=True`, garantizando que los mismos ejemplos se generen en cada ejecución. La mayoría de los algoritmos del sistema son inherentemente determinísticos (KMeans con inicialización por orden, Z-score, OLS de forma cerrada, SHA-256), eliminando la variabilidad estocástica. Los artefactos de calibración se versionan mediante hash SHA-256 del corpus completo más los parámetros ajustados, garantizando que el mismo corpus siempre produzca la misma versión de calibración.

---

#### 5.5.5.2 Registro de Experimentos y Metadatos

#### Lo que dice tu documento:

> MLflow registra los hiperparámetros, las métricas y el artefacto del modelo de cada ejecución.

#### Lo que REALMENTE está implementado:

**MLflow NO está implementado.** No hay registro de experimentos formal.

Lo que SÍ existe:

**1. Versionado de calibración (único registro de "experimentos"):**

```python
# calibration_service.py
ResultadoCalibracion:
    version: "cal-a3f8b2c91e07"     # Hash determinístico
    numMuestras: 500                  # Tamaño del corpus
    numEtiquetadas: 350               # Muestras con supervisión
    cobertura: 0.70                   # Fracción etiquetada
    maeCrudo: 0.15                    # Error antes de calibrar
    rmseCrudo: 0.20                   # Error antes de calibrar
    mae: 0.05                         # Error después de calibrar
    rmse: 0.08                        # Error después de calibrar
    pendiente: 1.2                    # Parámetro ajustado
    intercepto: -0.1                  # Parámetro ajustado
```

**2. Logs estructurados (trazabilidad operacional):**

Los logs JSON de ambos servicios registran cada operación con timestamps, niveles y contexto, pero no constituyen un registro formal de experimentos.

#### Cómo redactar este punto en tu informe:

> El registro de artefactos de calibración incluye metadatos completos de cada ejecución: versión determinística (hash SHA-256), tamaño del corpus, cobertura de etiquetado, métricas de error (MAE, RMSE) antes y después de la calibración, y parámetros ajustados (pendiente, intercepto). Este enfoque proporciona trazabilidad completa del proceso de calibración sin depender de herramientas externas de registro de experimentos.

---

### 5.5.6 Seguridad y Gobernanza del Modelo

#### Lo que dice tu documento:

> Se implementaron controles para asegurar que solo el sistema principal pueda invocar la API de IA, protegiendo el modelo de accesos no autorizados.

#### Lo que REALMENTE está implementado:

**SÍ, la seguridad está implementada mediante aislamiento de red:**

**1. Aislamiento de red Docker:**

```yaml
# docker-compose.yml
services:
  servicio-ia:
    expose:
      - "8000"        # Solo accesible dentro de la red Docker
    # NO tiene "ports:" → NO accesible desde el host

networks:
  gds_internal:
    driver: bridge    # Red aislada
```

El ServicioIA **no tiene puerto expuesto al host**. Solo es accesible desde otros servicios dentro de la red Docker `gds_internal`.

**2. Topología de acceso:**

```
Internet → Frontend (:8080) → ServidorGDS (:4100) → ServicioIA (:8000)
                                                        ↑
                                              Solo accesible desde
                                              la red Docker interna
```

**3. Seguridad por diseño en ServidorGDS:**

| Mecanismo | Descripción |
|---|---|
| **JWT Auth** | Todas las API del ServidorGDS requieren JWT válido |
| **Role Guards** | `@Roles('ADMIN_PLATAFORMA', 'ANALISTA')` por endpoint |
| **Fail-closed** | Sin JWT → denegar. JWT inválido → denegar. Rol insuficiente → denegar |
| **Helmet** | Headers de seguridad HTTP |
| **CORS** | Orígenes restringidos por `CORS_ORIGIN` |

**4. Redacción de secretos en logs:**

Ambos servicios redactan automáticamente campos sensibles:
- `password`, `token`, `jwt`, `secret`, `api_key`, `dsn`, `database_url` → `[Redacted]`

**5. Variables de entorno aisladas:**

Cada servicio tiene su propio `.env` y `.env.example`, sin compartir credenciales entre servicios excepto el `JWT_SECRET` compartido entre ServidorGDS y el Servidor principal.

#### Cómo redactar este punto en tu informe:

> La seguridad del modelo de IA se implementa mediante aislamiento de red a nivel de infraestructura Docker. El ServicioIA no expone puertos al host ni a internet — únicamente es accesible desde el ServidorGDS a través de la red Docker interna (`gds_internal`). El ServidorGDS actúa como gateway único, requiriendo autenticación JWT válida y autorización por roles (`ADMIN_PLATAFORMA`, `ANALISTA`, `OBSERVADOR`) con política fail-closed (denegar por defecto ante cualquier error). Adicionalmente, ambos servicios implementan redacción automática de campos sensibles en todos los logs, reemplazando tokens, passwords, API keys y DSNs con `[Redacted]`, previniendo la exposición accidental de credenciales.

---

## 6. Resumen: Teoría vs Implementación Real

| Punto del Documento | Implementado | Notas |
|---|---|---|
| LSTM vs GRU vs BERT | **Parcial** | Usa DistilRoBERTa (derivado de BERT) + BGE-M3 + spaCy. No hay LSTM/GRU. |
| AdamW optimizer | **No** | No hay entrenamiento, solo inferencia |
| Learning Rate Decay | **No** | No hay entrenamiento |
| Early Stopping | **No** | No hay entrenamiento |
| 88% precisión | **No** | No hay métricas de clasificación. Hay MAE/RMSE de calibración. |
| Recall 91% | **No** | No hay métricas de clasificación binaria |
| Matriz de confusión | **No** | No existe en el código |
| ONNX | **No** | Modelos en formato nativo (HuggingFace, spaCy) |
| Swagger | **Sí** | FastAPI genera OpenAPI/Swagger automáticamente |
| Git | **Sí** | Control de versiones funcional |
| DVC | **No** | No existe |
| MLflow | **No** | No existe |
| GitHub Actions | **Sí** | CI pipeline con 3 jobs paralelos |
| Docker | **Sí** | Docker Compose con 5 servicios |
| Kubernetes | **No** | Solo Docker Compose |
| Grafana | **No** | No existe. Logs JSON estructurados como base. |
| environment.yml | **No** | Usa requirements.txt + Dockerfiles |
| Semillas fijas | **Parcial** | Hypothesis `derandomize=True` + algoritmos determinísticos |
| Seguridad API IA | **Sí** | Aislamiento de red Docker + JWT + Role Guards |

### Recomendación para tu informe:

Tu implementación real es **más sofisticada** que lo que describe tu documento teórico en varios aspectos (arquitectura hexagonal, pipeline de 11 etapas, proxy de degradación, PBT, anonimización SHA-256), pero **no incluye** algunos elementos que menciona (entrenamiento con GPU, ONNX, MLflow, Grafana, Kubernetes). Te recomiendo ajustar tu informe para reflejar fielmente lo implementado, destacando las fortalezas reales de tu arquitectura en lugar de mencionar herramientas que no están presentes.

---

*Documento generado a partir del análisis del código fuente — Junio 2026*
