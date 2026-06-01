# Documento de Defensa: Sistema IREC

> Documento teórico-metodológico para defensa académica del proyecto CDPLP.

---

## 1. TÍTULO DEL PROYECTO

**"Sistema web inteligente para la detección de tendencias digitales de riesgo emocional en comunidades educativas mediante inteligencia artificial para apoyo preventivo institucional"**

**Acrónimo:** IREC — Índice de Riesgo Emocional Comunitario

---

## 2. PLANTEAMIENTO DEL PROBLEMA

### 2.1 Problema identificado

Las instituciones educativas superiores carecen de herramientas sistemáticas, éticas y no invasivas para detectar tendencias colectivas de malestar emocional expresadas en espacios digitales públicos por sus comunidades estudiantiles. Los mecanismos actuales (encuestas, reportes individuales, observación directa) son:

- **Reactivos**: detectan problemas cuando ya están instalados.
- **Limitados en alcance**: no capturan la expresión espontánea en redes sociales.
- **Estigmatizantes**: pueden exponer a estudiantes individuales.
- **Desactualizados**: no aprovechan la riqueza de datos digitales públicos.

### 2.2 Brecha identificada

Existe una brecha entre:
- La **disponibilidad masiva de expresiones emocionales digitales** en plataformas públicas (Reddit, YouTube, Instagram, TikTok, Facebook).
- La **capacidad institucional para interpretarlas de forma agregada, ética y preventiva**.

### 2.3 Pregunta de investigación

> ¿Cómo puede un sistema híbrido de inteligencia artificial multimodal detectar tendencias digitales agregadas de riesgo emocional en comunidades educativas, sin realizar diagnóstico clínico individual ni identificación biométrica, para servir como herramienta de apoyo preventivo institucional?

---

## 3. OBJETIVOS

### 3.1 Objetivo general

Desarrollar un sistema web inteligente basado en inteligencia artificial híbrida y multimodal que detecte tendencias digitales agregadas de riesgo emocional en comunidades educativas, mediante el análisis automático de contenido público textual y visual, para generar un Índice de Riesgo Emocional Comunitario (IREC) como herramienta de apoyo preventivo institucional.

### 3.2 Objetivos específicos

1. **Diseñar una arquitectura de IA por capas** que integre procesamiento de lenguaje natural, visión computacional, embeddings semánticos, minería de datos sociales y análisis temporal.

2. **Implementar modelos de Deep Learning** para detección de emociones, clasificación temática, análisis de sentimiento, OCR y descripción automática de imágenes.

3. **Desarrollar un motor de indicadores de riesgo emocional** basado en señales lingüísticas agregadas (estrés académico, agotamiento, aislamiento, desmotivación, acoso).

4. **Construir un Índice de Riesgo Emocional Comunitario (IREC)** que sintetice múltiples variables en un puntaje interpretable por ventana temporal y comunidad.

5. **Generar datasets sintéticos realistas** mediante modelos de lenguaje locales (Ollama) para simular plataformas con restricciones de acceso.

6. **Validar el sistema** con métricas cuantitativas de desempeño y procesos de validación humana en condiciones controladas.

7. **Exponer los resultados mediante una API REST** que alimente dashboards institucionales de analítica preventiva.

---

## 4. JUSTIFICACIÓN

### 4.1 Relevancia social

El bienestar emocional estudiantil es un desafío creciente. La OMS reporta que el suicidio es la cuarta causa de muerte entre jóvenes de 15-29 años. Las instituciones necesitan herramientas preventivas que complementen —no sustituyan— los servicios de orientación psicológica.

### 4.2 Relevancia tecnológica

El proyecto integra múltiples ramas de la inteligencia artificial en una arquitectura unificada: Transformers para NLP, modelos de visión computacional, embeddings semánticos, ML clásico para clasificación, análisis de series temporales y modelos de scoring.

### 4.3 Relevancia metodológica

Propone un enfoque de **detección agregada comunitaria**, no de diagnóstico individual, estableciendo un nuevo paradigma ético para el análisis de datos sociales en contextos educativos.

### 4.4 Originalidad

- Unidad de análisis: **comunidad educativa + ventana temporal**, no individuo.
- Arquitectura **híbrida y multimodal** (texto + imagen + temporal).
- Uso de **LLM local** para generación de datos sintéticos éticos.
- Integración de indicadores **protectores** (no solo de riesgo).

---

## 5. COMPONENTES DEL SISTEMA

### 5.1 Capa de Gobierno y Alcance

Define los límites éticos y metodológicos:
- El sistema **NO** diagnostica personas.
- **NO** identifica estudiantes.
- **NO** usa reconocimiento facial ni biometría.
- **NO** toma decisiones automáticas sobre individuos.
- **Analiza tendencias agregadas**, no casos personales.

### 5.2 Capa de Fuentes Digitales

| Fuente | Tipo de acceso | Propósito |
|---|---|---|
| Reddit | Dataset sintético (inicio), API real (futuro) | Texto largo, discusiones profundas |
| YouTube | Dataset sintético (inicio), API real (futuro) | Comentarios públicos, reacciones colectivas |
| Instagram | Dataset sintético | Captions, hashtags, imágenes |
| TikTok | Dataset sintético | Captions, comentarios, texto en video |
| Facebook | Dataset sintético | Posts grupales, confesiones |
| Datasets públicos | Descarga directa | Entrenamiento y validación de modelos |

### 5.3 Capa de Ingesta y Almacenamiento

- **Raw Zone**: datos brutos tal como llegan.
- **Standardized Zone**: transformados a `SocialDigitalRecord` (schema unificado).
- **Processed Zone**: resultados de IA (emociones, temas, embeddings).
- **Analytics Zone**: datos agregados por comunidad y ventana temporal.

### 5.4 Capa NLP (Deep Learning)

| Tarea | Modelos |
|---|---|
| Análisis de sentimiento | BETO / XLM-RoBERTa |
| Detección de emociones | Transformer fine-tuned (6 emociones base) |
| Clasificación temática | BETO + clasificador supervisado |
| Indicadores de riesgo | Sistema híbrido: embeddings + ML + reglas |
| Embeddings semánticos | Sentence-BERT multilingüe |
| Etiquetado asistido | Ollama (LLM local) |

### 5.5 Capa de Visión Computacional

| Tarea | Modelos |
|---|---|
| OCR | EasyOCR / PaddleOCR |
| Descripción de imágenes | BLIP-2 / modelo de captioning |
| Clasificación visual | CLIP / ViT (escenas, NO rostros) |
| Fusión multimodal | Texto + OCR + descripción visual |

**Restricción explícita:** No se realiza reconocimiento facial, identificación biométrica ni inferencia individual por imagen.

### 5.6 Capa de Asociación Comunitaria

Asigna cada contenido digital a una comunidad educativa probable mediante:
- Menciones explícitas de institución
- Hashtags institucionales
- Nombres de facultades y carreras
- Coincidencia con calendario académico
- Lenguaje y contexto local

**Resultado:** `association_score` (probabilístico, no determinista).

### 5.7 Capa Temporal

- Ventanas: 7, 14 y 30 días.
- Cálculo de línea base histórica.
- Detección de tendencias (media móvil, pendiente de crecimiento).
- Detección de anomalías (Z-score, Isolation Forest).
- Evaluación de persistencia (semanas consecutivas de aumento).

### 5.8 Motor IREC

**Fórmula conceptual:**

```
IREC = w1·Estrés + w2·Burnout + w3·Ansiedad + w4·Desesperanza
       + w5·Aislamiento + w6·Desmotivación + w7·Conflicto
       + w8·Persistencia − w9·SeñalesProtectoras
```

**Niveles de IREC:**

| Rango | Nivel | Acción recomendada |
|---|---|---|
| 0-20 | Sin tendencia significativa | Monitoreo normal |
| 21-40 | Tendencia leve | Observación |
| 41-60 | Tendencia moderada | Revisión institucional |
| 61-80 | Tendencia elevada | Intervención preventiva |
| 81-100 | Tendencia crítica agregada | Activación de protocolos |

### 5.9 API REST

- **Framework:** FastAPI
- **Endpoints principales:** `/metrics`, `/irec`, `/trends`, `/alerts`, `/communities`, `/reports`
- **Formato:** JSON
- **Autenticación:** Basada en tokens institucionales
- **No expone:** datos individuales, identificadores de usuarios, contenido textual crudo de riesgo

---

## 6. INDICADORES DE RIESGO EMOCIONAL

### 6.1 Indicadores de riesgo (aumentan IREC)

| Indicador | Señales lingüísticas características |
|---|---|
| Estrés académico | "parciales", "no duermo", "sobrecarga", "no llego" |
| Agotamiento emocional | "no doy más", "quemado", "burnout", "sin energía" |
| Ansiedad | "miedo", "preocupado", "no puedo dejar de pensar", "pánico" |
| Tristeza/desesperanza | "sin sentido", "vacío", "no importa", "para qué" |
| Aislamiento social | "solo", "nadie me habla", "no encajo", "invisible" |
| Acoso/conflicto | "burla", "humillan", "hostigan", "acoso", "bullying" |
| Desmotivación académica | "dejar la carrera", "abandonar", "sin motivación" |

### 6.2 Indicadores protectores (reducen IREC)

| Indicador | Señales lingüísticas características |
|---|---|
| Apoyo social | "me ayudaron", "compañeros", "estamos juntos" |
| Pertenencia | "orgulloso de mi universidad", "mi facultad" |
| Búsqueda de ayuda | "fui a orientación", "terapia", "consejería" |
| Esperanza | "va a mejorar", "saldré adelante", "todo pasa" |

---

## 7. METODOLOGÍA (CRISP-DM adaptado)

### 7.1 Comprensión del dominio
- Revisión sistemática de literatura sobre detección de emociones en texto, análisis de riesgo en redes sociales, y sistemas de alerta temprana en educación.
- Definición del marco ético y legal: el sistema no diagnostica, no identifica, no vigila.

### 7.2 Comprensión de datos
- Identificación de fuentes digitales públicas.
- Definición de formatos, volúmenes y limitaciones de acceso.
- Diseño del schema unificado `SocialDigitalRecord`.

### 7.3 Preparación de datos
- Limpieza de texto (emojis, URLs, menciones, hashtags).
- Normalización estructural por plataforma.
- Anonimización de usuarios.
- Generación de datos sintéticos para plataformas restringidas.
- Construcción de corpus etiquetado con apoyo de LLM local.

### 7.4 Modelado
- **Fase 1 (baseline):** TF-IDF + SVM/Logistic Regression.
- **Fase 2 (intermedio):** Sentence-BERT embeddings + XGBoost.
- **Fase 3 (avanzado):** BETO/XLM-RoBERTa fine-tuned.
- **Fase 4 (scoring):** IREC con pesos calibrados.

### 7.5 Evaluación
- Métricas: precisión, recall, F1-score, matriz de confusión.
- Validación humana de una muestra representativa.
- Análisis de sesgo por plataforma, idioma y categoría.
- Pruebas de consistencia temporal del IREC.

### 7.6 Despliegue
- API REST con FastAPI.
- Contenedores Docker.
- Pipeline de actualización programada.

---

## 8. ARQUITECTURA TECNOLÓGICA

```
┌──────────────────────────────────────────────────┐
│                  FUENTES DE DATOS                  │
│  Reddit │ YouTube │ Instagram* │ TikTok* │ FB*    │
│              (* sintéticos al inicio)              │
└──────────────────┬───────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────┐
│              CAPA DE INGESTA                       │
│  Conectores → Raw Zone → Standardized Zone        │
└──────────────────┬───────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────┐
│         PREPROCESAMIENTO + ANONIMIZACIÓN          │
│  Limpieza → Normalización → PII Detection          │
└──────────────────┬───────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────┐
│           PROCESAMIENTO MULTIMODAL                 │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │   NLP    │  │  Visión  │  │   Embeddings   │  │
│  │Emociones │  │   OCR    │  │   Vector DB    │  │
│  │Temas     │  │Captioning│  │   (ChromaDB)   │  │
│  │Riesgo    │  │Fusión    │  │                │  │
│  └──────────┘  └──────────┘  └────────────────┘  │
└──────────────────┬───────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────┐
│         ASOCIACIÓN COMUNITARIA                     │
│  Institution Matching → Probabilistic Scoring      │
└──────────────────┬───────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────┐
│            MOTOR TEMPORAL                         │
│  Ventanas → Línea Base → Tendencias → Anomalías   │
└──────────────────┬───────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────┐
│                MOTOR IREC                         │
│  Scoring → Clasificación → Explicación             │
└──────────────────┬───────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────┐
│               FASTAPI REST API                    │
│  /metrics │ /irec │ /trends │ /alerts │ /reports  │
└──────────────────┬───────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────┐
│            DASHBOARD INSTITUCIONAL                │
│     (consumido por frontend externo ya existente) │
└──────────────────────────────────────────────────┘
```

**Stack tecnológico:**
- **Backend:** Python 3.10+, FastAPI
- **Base de datos:** PostgreSQL + ChromaDB (vectorial)
- **ML/DL:** scikit-learn, XGBoost, PyTorch, Hugging Face Transformers
- **Visión:** EasyOCR, BLIP-2
- **LLM Local:** Ollama + Mistral/Llama
- **Despliegue:** Docker, Uvicorn

---

## 9. PARÁMETROS Y MÉTRICAS DEL SISTEMA

### 9.1 Parámetros de entrada
- `community_id`: identificador de comunidad educativa
- `time_window`: ventana temporal (7, 14, 30 días)
- `platforms`: fuentes a incluir
- `min_confidence`: umbral mínimo de confianza para incluir un registro

### 9.2 Parámetros internos
- Pesos del IREC (configurables y calibrables)
- Umbrales de alerta por indicador
- Umbrales de asociación comunitaria
- Tamaño de ventana para media móvil
- Z-score threshold para anomalías

### 9.3 Métricas de salida
- `irec_value`: valor del índice (0-100)
- `irec_level`: nivel categórico
- `trend_direction`: dirección de la tendencia
- `dominant_indicator`: indicador predominante
- `growth_rate`: tasa de crecimiento semanal
- `anomaly_flag`: indicador de anomalía detectada

### 9.4 Métricas de desempeño del sistema
- **Clasificación:** accuracy, precision, recall, F1-score
- **Agrupamiento:** silhouette score, Davies-Bouldin index
- **Tendencias:** error cuadrático medio vs línea base
- **IREC:** correlación con validación humana

---

## 10. LIMITACIONES DECLARADAS

1. **No es una herramienta clínica:** No diagnostica, no reemplaza profesionales de salud mental.
2. **No identifica individuos:** No realiza trazabilidad de usuarios reales.
3. **Dependencia de datos públicos:** Solo analiza contenido accesible públicamente.
4. **Sesgo de plataforma:** Los datos pueden no representar a toda la comunidad educativa.
5. **Idioma:** Entrenado principalmente para español, con soporte multilingüe limitado.
6. **Datos sintéticos:** Para plataformas restringidas, los resultados se basan en simulaciones y no reflejan necesariamente la realidad de esas plataformas.
7. **Ventana temporal:** El sistema requiere múltiples semanas de datos para establecer líneas base confiables.
8. **Asociación probabilística:** La vinculación de contenido a una comunidad educativa específica es probabilística, no determinista.

---

## 11. CONSIDERACIONES ÉTICAS

1. **Privacidad por diseño:** Anonimización desde la capa de ingesta.
2. **No vigilancia individual:** Prohibición explícita de identificación de personas.
3. **No sesgo disciplinario:** El sistema no genera insumos para sanciones.
4. **Transparencia:** Explicabilidad de cada componente del pipeline.
5. **Consentimiento implícito:** Solo se analizan datos públicos.
6. **Validación humana:** Todo resultado agregado requiere interpretación institucional, no acción automática.
7. **Auditabilidad:** Registro completo de trazabilidad de datos y decisiones del modelo.

---

## 12. RESULTADOS ESPERADOS

1. **Sistema funcional** de detección de tendencias de riesgo emocional comunitario.
2. **API REST documentada** para integración con dashboards institucionales.
3. **Modelos de IA entrenados y validados** para NLP, visión y scoring en español.
4. **Datasets sintéticos curados** para investigación en análisis de riesgo emocional educativo.
5. **IREC validado** como indicador compuesto de malestar digital comunitario.
6. **Framework ético replicable** para sistemas de analítica social en educación.
7. **Documentación técnica completa** para mantenimiento, extensión y auditoría del sistema.

---

*Documento preparado para defensa académica del proyecto CDPLP - IREC.*
*Actualizado: Mayo 2026*
