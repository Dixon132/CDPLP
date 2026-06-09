# Requirements Document

## Introduction

Esta especificación describe la **Plataforma de Análisis de Tendencias Digitales de Riesgo Emocional en Comunidades Educativas mediante Inteligencia Artificial** (en adelante **Plataforma_GDS**, conceptualmente un *Gemelo Digital Social de Comunidades Educativas*).

El propósito de la Plataforma_GDS es **GENERAR** comunidades educativas digitales sintéticas mediante IA, hacerlas **EVOLUCIONAR** a lo largo de aproximadamente **24 `Semana_Simulada` (~6 meses)** y **APRENDER** del historial longitudinal acumulado para **detectar y explicar tendencias colectivas de riesgo emocional** en comunidades educativas. Es decir: el sistema crea ecosistemas digitales sintéticos que viven y cambian semana a semana, acumula una memoria longitudinal del comportamiento de cada `Comunidad_Digital` y, a partir de ese historial creciente, descubre, mide y explica las tendencias emocionales colectivas.

La plataforma **NO** diagnostica personas, **NO** identifica estudiantes específicos y **NO** determina enfermedades. Su salida es siempre **colectiva, probabilística y explicativa**: la IA debe explicar qué ocurre, por qué, cuándo empezó, cómo evolucionó y con qué evidencias se respalda (análisis longitudinal y explicativo, no solo clasificación). Nunca produce diagnóstico individual.

La plataforma se construye sobre una **arquitectura de dos capas desacopladas**:

1. **Capa de Adquisición de Datos** (`Capa_Adquisicion`): hoy es un **módulo de simulación** que genera ecosistemas digitales sintéticos mediante modelos de lenguaje (LLM) a través de un **proveedor de datos intercambiable** definido por la interfaz `IDataProvider`. La implementación por defecto es **GeminiProvider** (Google Gemini API, proveedor de generación en la nube por defecto); **OllamaProvider** (local) queda con su **arquitectura preparada** como alternativa configurable. La interfaz `IDataProvider` contempla además otras implementaciones (`MetaProvider`, `TwitterProvider`, `ScrapingProvider`, `HistoricalProvider`) que podrán reemplazar la simulación por APIs reales, scraping o streaming **sin modificar el resto del sistema**. Todas las implementaciones devuelven la misma estructura estándar: un **JSON normalizado** (`Contrato_Normalizado`).
2. **Capa de Análisis** (`Capa_Analisis`): nunca conoce si los datos provienen de una fuente simulada o real; procesa ambos de forma idéntica. Ejecuta un pipeline de Limpieza → Normalización → Anonimización → NLP → Visión computacional → Análisis temporal → Detección de patrones/tendencias → Índice de riesgo multidimensional → Reportes explicativos.

La plataforma es una **sección independiente** accesible desde el dashboard del Colegio de Profesionales existente, pero con **su propio layout** (estética enterprise tipo AWS/Azure) y **sin relación** con el módulo "IREC" previo, que será ignorado/eliminado.

El **stack tecnológico confirmado** de la Plataforma_GDS es el siguiente:

- **Frontend** (carpeta `ClienteCDPLPL/`): React + TypeScript + Vite + TailwindCSS + Shadcn/UI + TanStack Query + React Router + Zustand + Recharts + Framer Motion + Leaflet + React Hook Form + Zod + Axios.
- **Backend de orquestación y API** (servicio independiente en carpeta de primer nivel, por ejemplo `ServidorGDS/`): NestJS + TypeScript + Node.js + Prisma ORM + Swagger/OpenAPI + BullMQ + Redis + JWT + Passport + class-validator + class-transformer, con una arquitectura **Monolito Modular + Clean Architecture + DDD parcial + Event-Driven interno**.
- **Servicio de IA** (servicio independiente en Python en carpeta de primer nivel, por ejemplo `ServicioIA/`): Python con Transformers, Sentence Transformers, spaCy, NLTK, scikit-learn, PyTorch, NumPy y Pandas, expuesto por **HTTP (FastAPI)** y consumido por el backend NestJS.
- **Persistencia**: PostgreSQL + Redis + **pgvector** (base de datos vectorial sobre PostgreSQL). La plataforma usa **su propia base de datos dedicada**, separada de la del colegio.

El **backend de la Plataforma_GDS se despliega como un servicio NestJS independiente y autónomo** ubicado en **su propia carpeta a nivel de la raíz del repositorio** (por ejemplo, `ServidorGDS/`), separado del `Servidor` del colegio, con su propio `package.json`, su propia configuración NestJS + TypeScript + Prisma, su propio puerto, sus propios endpoints documentados con Swagger/OpenAPI, su pipeline y su estructura modular de carpetas. Este backend usa además **su propia base de datos PostgreSQL dedicada e independiente con la extensión pgvector** (con su propio `DATABASE_URL` y su propio esquema Prisma) y una instancia de **Redis** propia, completamente desacoplado del `Servidor` del colegio y de la base de datos del colegio, a la que **no accede ni modifica**. El frontend permanece dentro de `ClienteCDPLPL`.

**Arquitectura de despliegue: tres componentes.** El sistema actual se compone de **tres entregables (deployables) reales y simultáneos**: (1) el **frontend React** (`ClienteCDPLPL/`); (2) el **backend de orquestación y API NestJS** (`ServidorGDS/`), responsable del ciclo, el `Pipeline_Analisis`, la cola de trabajos (BullMQ sobre Redis), la persistencia en su base de datos PostgreSQL+pgvector dedicada y la API pública documentada con Swagger; y (3) un **servicio de Inteligencia Artificial real en Python** (`ServicioIA/`, FastAPI), denominado `Servicio_IA`, que implementa la **IA/ML pesada del análisis**: embeddings (Sentence Transformers), NLP (semántico, emocional, temático, causas y eventos), visión computacional, agrupamiento temático, detección de anomalías y tendencias, y scoring calibrado del `Indice_Riesgo`, usando librerías de Python (Transformers, Sentence Transformers, spaCy/NLTK, scikit-learn, PyTorch, NumPy, Pandas). El `Servicio_IA` es **parte del sistema actual, no una opción futura ni un microservicio a futuro**: constituye el núcleo analítico (la contribución de investigación) y se ejecuta como un proceso desplegado junto a los otros dos componentes. El `ServidorGDS` **consume** el `Servicio_IA` sobre **HTTP** a través de las interfaces estables ya definidas (`Servicio_NLP`, `Servicio_Vision`, `Capa_ML`, `Filtro_Relevancia`). Las implementaciones TypeScript base/heurísticas de esas interfaces se conservan **únicamente como fallback determinista** para pruebas y para degradación segura cuando el `Servicio_IA` no esté disponible, no como el cerebro analítico principal. La **generación de ecosistemas sintéticos** continúa realizándose a través de la interfaz `IDataProvider` (GeminiProvider en la nube por defecto, OllamaProvider local como alternativa preparada) y entrega siempre un `Contrato_Normalizado`.

La metodología de trabajo adoptada es **Design Thinking → ICONIX → CRISP-DM → MLOps**.

**Principio transversal de calidad (exigencia del usuario):** cada parte que se construya debe ser **funcional y validada con evidencia técnica real** (pruebas ejecutables), no promesas. Los criterios de aceptación de este documento están redactados para ser **verificables**.

### Decisiones de diseño confirmadas

- **D1 — Proveedor de datos intercambiable (`IDataProvider`):** interfaz común `IDataProvider` con implementaciones `GeminiProvider`, `OllamaProvider`, `MetaProvider`, `TwitterProvider`, `ScrapingProvider` e `HistoricalProvider`; todas devuelven la misma estructura estándar (`Contrato_Normalizado`). **Google Gemini API (GeminiProvider) es el proveedor de generación por defecto en la nube**; **Ollama (OllamaProvider) es la alternativa local con arquitectura preparada**.
- **D2 — Persistencia:** **PostgreSQL + Redis + pgvector**. La plataforma usa una **base de datos PostgreSQL dedicada e independiente con la extensión pgvector** (base de datos vectorial sobre PostgreSQL), con su propio esquema Prisma, más una instancia de **Redis** propia para cola y caché; cero tablas compartidas y cero modificación de la base de datos del colegio. El servicio backend autónomo reside en **su propia carpeta a nivel de la raíz del repositorio** (por ejemplo, `ServidorGDS/`), separado del `Servidor` del colegio.
- **D3 — Anonimización:** hashing SHA-256 con salt de identificadores sintéticos; cero PII real.
- **D4 — IA/ML real en Python (`Servicio_IA`):** el análisis NLP (Sentiment Analysis, Emotion Detection, Topic Modeling, Text Classification, Semantic Similarity, Entity Extraction, Context Analysis, Clustering, Embeddings Search), la visión computacional y el ML/Deep Learning (clustering, trend detection, community scoring, risk scoring, similarity search) los implementa el **`Servicio_IA` real en Python** (Transformers, Sentence Transformers, spaCy, NLTK, scikit-learn, PyTorch, NumPy, Pandas), expuesto por **FastAPI** y consumido por el `ServidorGDS` (NestJS) a través de las interfaces estables (`Servicio_NLP`, `Servicio_Vision`, `Capa_ML`, `Filtro_Relevancia`) **sobre HTTP**. El `Servicio_IA` es la implementación primaria (el cerebro analítico). Las implementaciones TypeScript son únicamente el **fallback determinista** para pruebas y para degradación segura cuando el `Servicio_IA` no esté disponible, no el motor principal.
- **D5 — Autenticación:** backend NestJS con **JWT + Passport** y roles propios de la plataforma (`ADMIN_PLATAFORMA`, `ANALISTA`, `OBSERVADOR`), validación con **class-validator** y **class-transformer**.
- **D6 — Idioma del contenido simulado:** español de Bolivia / región andina (modismos y jerga estudiantil local).
- **D7 — Servicio de IA en Python (componente actual, no futuro):** el `Servicio_IA` (`ServicioIA/`, FastAPI) es un **componente real y desplegado del sistema actual** que ejecuta toda la IA/ML pesada (embeddings, NLP, visión, agrupamiento, detección de anomalías/tendencias y scoring calibrado). El límite de integración es **HTTP**: el `ServidorGDS` actúa como orquestador y consume el `Servicio_IA` a través de las interfaces estables, sin acoplarse a la implementación interna en Python. IF el `Servicio_IA` no está disponible, THEN el `ServidorGDS` degrada de forma segura al fallback determinista en TypeScript sin bloquear el ciclo y registra el incidente. La calibración con el `Corpus_Longitudinal` se ejecuta dentro del propio `Servicio_IA`.
- **D8 — Frontend (`ClienteCDPLPL/`):** React + TypeScript + Vite + TailwindCSS + Shadcn/UI + TanStack Query + React Router + Zustand + Recharts + Framer Motion + Leaflet + React Hook Form + Zod + Axios.
- **D9 — Backend de orquestación (`ServidorGDS/`):** NestJS + TypeScript + Node.js + Prisma ORM + Swagger/OpenAPI + BullMQ + Redis + JWT + Passport + class-validator + class-transformer, con arquitectura **Monolito Modular + Clean Architecture + DDD parcial + Event-Driven interno** y módulos: Dashboard, Institutions, Analysis, Communities, Simulation, Timeline, Scheduler, AI Engine, NLP Engine, Vision Engine, Reports, Audit, Users y Authentication.
- **D10 — Embeddings y memoria semántica:** modelos de embeddings **BAAI/bge-m3**, **BAAI/bge-large-en-v1.5** y **all-MiniLM-L6-v2** (Sentence Transformers), con vectores almacenados en **pgvector** como `Memoria_Semantica` y recuperación por **similitud vectorial** (Embeddings Search).
- **D11 — Visión computacional:** v1 procesa `image_description` (texto simulado por Gemini) con un **pipeline visual completo (`Vision_Engine`)** que existe desde v1; la **arquitectura queda preparada para imágenes reales a futuro** (LLaVA, Qwen2-VL, Florence-2, BLIP-2, EasyOCR) que transforman imágenes en explicaciones de texto.
- **D12 — Cola y planificación:** **BullMQ + Redis + Cron + node-schedule** para la cola de trabajos y el disparo de los ciclos semanales, con bloqueo de concurrencia, idempotencia, reintentos y aislamiento de fallos por institución.
- **D13 — Reportes:** **PDFKit + Puppeteer + Handlebars + ExcelJS** para reportes semanales, mensuales, trimestrales, semestrales y final.
- **D14 — Geolocalización:** **Leaflet + OpenStreetMap + Turf.js + Geolib** para radios de análisis, comunidades y mapas.
- **D15 — Observabilidad, testing y DevOps:** observabilidad con **Winston + Pino + Sentry**; testing con **Jest + Supertest + Vitest + Playwright**; DevOps con **Docker + Docker Compose + GitHub Actions + Nginx**, contenerizando los tres servicios junto a PostgreSQL/pgvector y Redis.
- **D16 — Metodología:** **Design Thinking → ICONIX → CRISP-DM → MLOps**.

## Glossary

- **Plataforma_GDS**: sistema completo de gemelo digital social descrito en este documento.
- **Capa_Adquisicion**: capa responsable de producir datos (hoy simulados) y entregarlos como `Contrato_Normalizado`.
- **Modulo_Simulacion**: implementación actual de la `Capa_Adquisicion` que genera ecosistemas digitales sintéticos mediante LLM.
- **Proveedor_Generacion**: implementación concreta de la interfaz `IDataProvider` que invoca un LLM o fuente de datos (Gemini, Ollama u otros) detrás de una interfaz común para producir contenido y entregarlo como `Contrato_Normalizado`.
- **IDataProvider**: interfaz común de proveedores de datos con implementaciones intercambiables (`GeminiProvider`, `OllamaProvider`, `MetaProvider`, `TwitterProvider`, `ScrapingProvider`, `HistoricalProvider`); todas devuelven la misma estructura estándar (`Contrato_Normalizado`). `GeminiProvider` es el proveedor por defecto en la nube y `OllamaProvider` la alternativa local con arquitectura preparada.
- **Capa_Analisis**: capa que procesa el `Contrato_Normalizado` mediante el `Pipeline_Analisis`, sin conocer el origen de los datos.
- **Contrato_Normalizado**: estructura JSON estándar de intercambio entre capas, con la forma `{ post, comments[], image_description, hashtags[], metadata }`.
- **Validador_Contrato**: componente que valida y serializa/deserializa el `Contrato_Normalizado` contra un esquema.
- **Pipeline_Analisis**: secuencia ordenada de etapas de análisis (limpieza, normalización, anonimización, NLP, visión, temporal, patrones, índice, explicación).
- **Servicio_Anonimizacion**: componente que reemplaza identificadores sintéticos por seudónimos hash irreversibles.
- **Servicio_NLP**: componente que realiza análisis semántico, emocional, temático, de causas, eventos, detonantes, agrupamiento y conversacional sobre texto.
- **Servicio_Vision**: componente que procesa descripciones visuales (hoy mock) y devuelve `{ scene, objects[], emotion_context }`.
- **Servicio_IA**: servicio real en Python (`ServicioIA/`, FastAPI) que implementa la IA/ML pesada del análisis (embeddings, NLP, visión computacional, agrupamiento temático, detección de anomalías y tendencias, y scoring calibrado del `Indice_Riesgo`) usando librerías de Python (Transformers, Sentence Transformers, spaCy/NLTK, scikit-learn, PyTorch, NumPy, Pandas). Es la implementación primaria de las interfaces `Servicio_NLP`, `Servicio_Vision`, `Capa_ML` y `Filtro_Relevancia`, consumida por el `ServidorGDS` sobre HTTP; las implementaciones TypeScript de esas interfaces actúan como fallback determinista para pruebas y degradación segura.
- **Motor_Temporal**: componente que correlaciona resultados a lo largo de semanas y meses para detectar evolución.
- **Detector_Patrones**: componente que identifica patrones y tendencias recurrentes en el tiempo.
- **Indice_Riesgo**: índice de riesgo comunitario **multidimensional** (estrés académico, ansiedad, conflicto social, bullying, aislamiento, agotamiento, violencia verbal y otras dimensiones configurables).
- **Motor_Explicativo**: componente que genera explicaciones en lenguaje natural respaldadas por evidencia cuantitativa.
- **Gestor_Instituciones**: módulo CRUD de instituciones educativas.
- **Institucion**: entidad educativa (universidad, colegio, instituto, escuela) con nombre, categoría, ubicación geográfica, radio de influencia, logo y descripción.
- **Gestor_Analisis**: módulo de creación y administración de análisis.
- **Analisis**: estudio longitudinal que agrupa una o más `Institucion`, un `Escenario` y una configuración temporal de hasta 24 semanas.
- **Escenario**: contexto global de la simulación (predefinido o personalizado en texto libre) que permanece vigente durante todo el `Analisis`.
- **Comunidad_Digital**: conjunto de `Usuario_Sintetico` y contenido asociado a una `Institucion` dentro de un `Analisis`.
- **Usuario_Sintetico**: identidad sintética persistente con perfil conductual, frecuencia, estilo de escritura, intereses, participación, patrones de interacción e historial.
- **Score_Asociacion**: probabilidad estimada (0–1) de vínculo digital entre un `Usuario_Sintetico` y una `Comunidad_Digital`.
- **Controlador_Ciclo**: componente que ejecuta el ciclo semanal (generación → análisis → aprendizaje → almacenamiento) de forma ordenada y acumulativa.
- **Programador_Temporal**: componente que dispara los ciclos semanales según el modelo de tiempo (tiempo real simulado).
- **Herramienta_Aceleracion**: utilidad administrativa para avanzar la simulación (una semana, un mes o hasta el final) ejecutando todos los ciclos pendientes.
- **Semana_Simulada**: unidad temporal del `Analisis` (1 a 24), por `Institucion`.
- **Generador_Reportes**: componente que produce reportes semanales, mensuales, trimestrales, semestrales y el informe final.
- **Servicio_Autenticacion**: componente que autentica y autoriza el acceso a la Plataforma_GDS mediante JWT y roles propios, bajo un principio de denegación por defecto (fail-closed).
- **Frontend_GDS**: interfaz de usuario de la plataforma, con layout propio independiente del dashboard del colegio.
- **PII**: información personal identificable (Personally Identifiable Information).
- **Motor_Memoria_Contextual**: componente que mantiene y consolida la memoria del `Analisis` en niveles jerárquicos (semanal, mensual, trimestral y global) y construye el contexto longitudinal que se envía al `Proveedor_Generacion`.
- **Memoria_Semanal**: resumen estructurado de lo ocurrido en una `Semana_Simulada` para una `Comunidad_Digital`.
- **Memoria_Mensual**: consolidación acumulativa de las `Memoria_Semanal` de un mes para una `Comunidad_Digital`.
- **Memoria_Trimestral**: consolidación acumulativa de las `Memoria_Mensual` de un trimestre para una `Comunidad_Digital`.
- **Memoria_Global**: consolidación acumulativa de las `Memoria_Trimestral` que resume el `Analisis` completo.
- **Memoria_Jerarquica**: conjunto de los cuatro niveles de memoria (`Memoria_Semanal`, `Memoria_Mensual`, `Memoria_Trimestral`, `Memoria_Global`) gestionados por el `Motor_Memoria_Contextual`.
- **Motor_Escenarios**: componente que permite definir, guardar y reutilizar `Escenario` (predefinidos y personalizados) entre distintos `Analisis` a través de la `Biblioteca_Escenarios`.
- **Biblioteca_Escenarios**: repositorio persistente de `Escenario` reutilizables, cada uno con nombre, descripción, contexto, parámetros y versión.
- **Escenario_Reutilizable**: definición de `Escenario` almacenada en la `Biblioteca_Escenarios` que puede seleccionarse al crear un `Analisis`.
- **Sistema_Evidencias**: subsistema de Evidencias Trazables desacoplado del motor de análisis que almacena, sirve y permite auditar las evidencias que respaldan toda conclusión, indicador, dimensión, patrón y explicación, a través de una interfaz estable.
- **Evidencia**: dato concreto (publicación, comentario, conteo o variación) identificado de forma trazable que respalda una conclusión.
- **Capa_ML**: capa de Machine Learning clásico/representacional sobre la `Capa_Analisis` que provee embeddings, agrupamiento temático, detección de anomalías, detección de tendencias y scoring calibrado del `Indice_Riesgo`, expuesta tras interfaces estables.
- **Embeddings**: representaciones vectoriales numéricas de texto producidas por la `Capa_ML` (Sentence Transformers, modelos `BAAI/bge-m3`, `BAAI/bge-large-en-v1.5` y `all-MiniLM-L6-v2`) para comparar y agrupar contenido semánticamente; se almacenan en `pgvector`.
- **Modelos_Embedding**: conjunto de modelos de embeddings usados por el `Servicio_IA` (`BAAI/bge-m3`, `BAAI/bge-large-en-v1.5`, `all-MiniLM-L6-v2`).
- **pgvector**: extensión de PostgreSQL que habilita el almacenamiento y la búsqueda por similitud de vectores de `Embeddings`, soporte de la `Memoria_Semantica`.
- **Memoria_Semantica**: corpus acumulado de `Embeddings` de todo el contenido generado y analizado, almacenado en `pgvector`, que crece con cada `Semana_Simulada` y se recupera por similitud vectorial (Embeddings Search) para dar contexto a la generación y al análisis de semanas posteriores.
- **Embeddings_Search**: recuperación de contexto por similitud vectorial sobre la `Memoria_Semantica` almacenada en `pgvector`.
- **Vision_Engine**: motor de visión computacional del `Servicio_IA` que existe desde v1 procesando `image_description` (texto) con un contrato estable y queda preparado para procesar imágenes reales a futuro (LLaVA, Qwen2-VL, Florence-2, BLIP-2, EasyOCR) transformándolas en explicaciones de texto; es la implementación primaria del `Servicio_Vision`.
- **ServidorGDS**: backend de orquestación y API de la Plataforma_GDS, servicio NestJS independiente y autónomo, con arquitectura Monolito Modular + Clean Architecture + DDD parcial + Event-Driven interno, documentado con Swagger/OpenAPI.
- **Cola_Trabajos**: cola de trabajos basada en **BullMQ sobre Redis** (complementada con Cron y node-schedule) que el `Programador_Temporal` y el `Controlador_Ciclo` usan para encolar y procesar los ciclos semanales con bloqueo de concurrencia, idempotencia, reintentos y aislamiento de fallos por institución.
- **Servicio_Observabilidad**: subsistema de observabilidad de la Plataforma_GDS basado en Winston, Pino y Sentry para logging estructurado y captura de errores.
- **Agrupamiento_Tematico**: técnica de clustering que agrupa contenido o usuarios por similitud semántica de sus `Embeddings`.
- **Deteccion_Anomalias**: técnica de la `Capa_ML` que identifica desviaciones estadísticas atípicas respecto al patrón longitudinal acumulado.
- **Corpus_Longitudinal**: conjunto acumulado de datos y resultados de todas las `Semana_Simulada` de los `Analisis`, usado para calibrar la `Capa_ML`.
- **Modo_Ejecucion**: modo de avance de la simulación de un `Analisis`, seleccionado desde el `Frontend_GDS`, con tres valores posibles: `Automatico` (procesa de corrido todas las `Semana_Simulada` pendientes reutilizando la `Herramienta_Aceleracion`), `Manual` (el usuario dispara cada `Semana_Simulada` bajo demanda) y `Tiempo_Real` (procesa una `Semana_Simulada`, inicia un contador y, al vencer un intervalo configurable, procesa automáticamente la siguiente, reutilizando el `Programador_Temporal`).
- **Zona_Geografica**: área geográfica de una `Comunidad_Digital` definida combinando las coordenadas almacenadas de su `Institucion` con el radio de análisis recibido del `Frontend_GDS`; ancla el contenido simulado y el aprendizaje de patrones de esa `Comunidad_Digital`.
- **Filtro_Relevancia**: componente del `Pipeline_Analisis`, expuesto tras una interfaz estable, que clasifica cada publicación y comentario como `Contenido_Contributivo` o `Contenido_No_Contributivo` para separar la señal del ruido.
- **Contenido_Contributivo**: publicación o comentario que el `Filtro_Relevancia` clasifica como aportante de señal y que se incluye en el cálculo del `Indice_Riesgo` y de los indicadores.
- **Contenido_No_Contributivo**: publicación o comentario que el `Filtro_Relevancia` clasifica como ruido; se conserva de forma persistente marcado como tal para trazabilidad y evidencia, pero se excluye del cálculo del `Indice_Riesgo` y de los indicadores.

## Requirements

### Requirement 1: Acceso e independencia de la sección (layout propio)

**User Story:** Como administrador de la plataforma, quiero acceder a la Plataforma_GDS como una sección independiente con su propio layout desde el dashboard del colegio, para trabajar sin la interfaz del sistema de gestión del colegio y sin el módulo IREC anterior.

#### Acceptance Criteria

1. WHEN un usuario autenticado selecciona el acceso a la Plataforma_GDS desde el dashboard del colegio, THE Frontend_GDS SHALL renderizar la plataforma usando un layout propio distinto del `DashboardLayout` del colegio.
2. THE Frontend_GDS SHALL exponer sus rutas bajo un prefijo de ruta dedicado e independiente de las rutas del dashboard del colegio.
3. THE Plataforma_GDS SHALL operar sin ninguna dependencia de código del módulo IREC anterior.
4. WHERE el módulo IREC anterior exista en el frontend, THE Frontend_GDS SHALL excluir el módulo IREC de las rutas y navegación de la Plataforma_GDS.
5. IF un usuario no autenticado solicita una ruta de la Plataforma_GDS, THEN THE Frontend_GDS SHALL redirigir al flujo de autenticación.

### Requirement 2: Arquitectura de dos capas desacopladas

**User Story:** Como arquitecto del sistema, quiero que la capa de adquisición y la capa de análisis estén totalmente desacopladas, para poder reemplazar la fuente de datos en el futuro sin modificar el motor analítico.

#### Acceptance Criteria

1. THE Capa_Adquisicion SHALL entregar sus datos exclusivamente como un `Contrato_Normalizado` válido.
2. THE Capa_Analisis SHALL consumir únicamente instancias de `Contrato_Normalizado` y SHALL operar sin recibir información sobre el origen de los datos.
3. WHERE la implementación de la `Capa_Adquisicion` cambie de simulada a real, THE Capa_Analisis SHALL procesar los datos sin requerir cambios en su código.
4. THE Capa_Adquisicion y THE Capa_Analisis SHALL comunicarse únicamente a través de la interfaz del `Contrato_Normalizado`, sin compartir estado interno.
5. IF la `Capa_Adquisicion` produce datos que no cumplen el esquema del `Contrato_Normalizado`, THEN THE Validador_Contrato SHALL rechazar los datos y registrar un error descriptivo antes de que lleguen a la `Capa_Analisis`.
6. THE Validador_Contrato SHALL validar automáticamente todos los datos producidos por la `Capa_Adquisicion` antes de su entrega a la `Capa_Analisis`.

### Requirement 3: Contrato Normalizado (validación y round-trip)

**User Story:** Como desarrollador del pipeline, quiero un contrato JSON normalizado validado y serializable de forma reversible, para garantizar la integridad de los datos intercambiados entre capas.

#### Acceptance Criteria

1. THE Validador_Contrato SHALL definir un esquema explícito del `Contrato_Normalizado` con los campos `post`, `comments` (lista), `image_description`, `hashtags` (lista) y `metadata`.
2. WHEN se recibe un `Contrato_Normalizado` candidato, THE Validador_Contrato SHALL validar su conformidad con el esquema y SHALL aceptar solo instancias conformes.
3. IF un `Contrato_Normalizado` candidato omite un campo requerido o usa un tipo de dato incorrecto, THEN THE Validador_Contrato SHALL rechazarlo y SHALL devolver un mensaje que identifique el campo no conforme.
4. FOR ALL instancias válidas de `Contrato_Normalizado`, deserializar y luego serializar SHALL producir una instancia equivalente a la original (propiedad de ida y vuelta).
5. THE Validador_Contrato SHALL versionar el esquema del `Contrato_Normalizado` mediante un campo de versión en `metadata`.

### Requirement 4: Proveedor de datos intercambiable (`IDataProvider`: Gemini / Ollama y otros)

**User Story:** Como administrador de la plataforma, quiero seleccionar el proveedor de datos que alimenta el módulo de simulación a través de la interfaz `IDataProvider`, para usar Google Gemini API en la nube por defecto y Ollama local (u otros proveedores) como alternativa configurable sin reescribir el sistema.

#### Acceptance Criteria

1. THE Modulo_Simulacion SHALL invocar al proveedor de datos exclusivamente a través de la interfaz común `IDataProvider`.
2. THE IDataProvider SHALL ofrecer al menos las implementaciones `GeminiProvider` y `OllamaProvider`, y SHALL contemplar las implementaciones `MetaProvider`, `TwitterProvider`, `ScrapingProvider` e `HistoricalProvider`.
3. WHERE no se especifique un proveedor en la configuración, THE Modulo_Simulacion SHALL usar `GeminiProvider` (Google Gemini API) como proveedor por defecto en la nube.
4. WHEN un administrador cambia el proveedor configurado, THE Modulo_Simulacion SHALL usar el nuevo proveedor en la siguiente generación sin requerir cambios de código.
5. IF el proveedor seleccionado no responde o devuelve un error, THEN THE Modulo_Simulacion SHALL registrar el error, marcar la generación afectada como fallida y permitir su reintento sin corromper el historial acumulado.
6. THE IDataProvider SHALL exponer la salida del proveedor ya transformada a `Contrato_Normalizado` válido, con la misma estructura estándar independientemente de la implementación concreta.
7. THE Modulo_Simulacion SHALL registrar todos los fallos de generación independientemente de su causa, incluyendo no respuesta del proveedor, error del proveedor, fallo de validación y error de procesamiento interno.
8. IF un proveedor devuelve datos malformados que no pueden normalizarse, THEN THE Modulo_Simulacion SHALL intentar una normalización de respaldo o un reintento antes de marcar la generación como fallida.

### Requirement 5: Estrategia de contexto longitudinal acumulado

**User Story:** Como analista, quiero que la generación de cada semana use el contexto histórico acumulado de forma eficiente, para mantener coherencia evolutiva sin exceder la ventana de contexto del modelo.

#### Acceptance Criteria

1. WHEN el `Modulo_Simulacion` genera la `Semana_Simulada` N (con N mayor que 1), THE Modulo_Simulacion SHALL incluir en el contexto el `Escenario`, el resumen del historial previo, los resultados de análisis anteriores y los patrones detectados acumulados.
2. WHERE el historial acumulado supere el umbral de tokens configurado para el `Proveedor_Generacion` activo, THE Modulo_Simulacion SHALL aplicar resumen/compactación del historial antes de la invocación.
3. THE Modulo_Simulacion SHALL preservar el `Escenario` original en el contexto de todas las `Semana_Simulada`, desde la semana 1 hasta la última.
4. IF la compactación del historial elimina información, THEN THE Modulo_Simulacion SHALL conservar de forma persistente el historial completo original en la base de datos, independientemente del contexto enviado al LLM.

### Requirement 6: Generación de ecosistemas digitales sintéticos realistas

**User Story:** Como investigador, quiero que el módulo de simulación genere comportamiento humano complejo y realista, para validar el motor analítico con datos no triviales.

#### Acceptance Criteria

1. WHEN el `Modulo_Simulacion` genera contenido para una `Comunidad_Digital`, THE Modulo_Simulacion SHALL producir publicaciones, comentarios y conversaciones atribuidos a `Usuario_Sintetico` persistentes.
2. THE Modulo_Simulacion SHALL generar contenido que incluya lenguaje cotidiano, sarcasmo, ironía, contenido positivo, negativo y neutral, contradicciones, conflictos y ruido.
3. THE Modulo_Simulacion SHALL generar el contenido en español de la región andina configurada (Bolivia/regional).
4. THE Modulo_Simulacion SHALL evitar que el contenido simplista o monotemático sea la única salida, y SHALL aceptar contenido simplista cuando vaya acompañado de dimensiones emocionales adicionales como sarcasmo, ironía o sentimiento.
5. WHEN se solicita una generación, THE Modulo_Simulacion SHALL producir contenido coherente con el `Escenario` activo del `Analisis`.

### Requirement 7: Gestión de instituciones (CRUD con geolocalización)

**User Story:** Como administrador de la plataforma, quiero administrar instituciones educativas con su ubicación geográfica, para usarlas como base de las comunidades digitales de un análisis.

#### Acceptance Criteria

1. WHEN un administrador envía un alta de institución con nombre, categoría, ubicación geográfica, radio de influencia y descripción, THE Gestor_Instituciones SHALL crear y persistir la `Institucion`.
2. THE Gestor_Instituciones SHALL permitir asignar una categoría dentro del conjunto {universidad, colegio, instituto, escuela}.
3. THE Gestor_Instituciones SHALL almacenar la ubicación geográfica como coordenadas de latitud y longitud y un radio de influencia en metros.
4. WHERE un administrador adjunte un logo, THE Gestor_Instituciones SHALL almacenar la referencia al archivo del logo asociado a la `Institucion`.
5. WHEN un administrador edita una `Institucion`, THE Gestor_Instituciones SHALL persistir los cambios y registrarlos para auditoría.
6. IF un administrador intenta eliminar una `Institucion` referenciada por un `Analisis` existente, THEN THE Gestor_Instituciones SHALL ejecutar como operación atómica el rechazo de la eliminación y la entrega del mensaje de dependencia, y SHALL reintentar o escalar si cualquiera de las dos acciones falla.
7. THE Frontend_GDS SHALL permitir seleccionar la ubicación de la `Institucion` sobre un mapa interactivo y visualizar su radio de influencia.
8. THE Gestor_Instituciones SHALL exponer de forma proactiva las restricciones de eliminación y los mensajes de dependencia de una `Institucion`, aun cuando no se intente eliminarla.

### Requirement 8: Creación de análisis

**User Story:** Como analista, quiero crear un análisis seleccionando instituciones, escenario y configuración, para iniciar una simulación longitudinal.

#### Acceptance Criteria

1. WHEN un analista crea un `Analisis` con nombre, descripción, una o más `Institucion`, radio de análisis, escenario y configuraciones adicionales, THE Gestor_Analisis SHALL persistir el `Analisis` y su configuración.
2. THE Gestor_Analisis SHALL permitir seleccionar el `Escenario` desde un conjunto predefinido (crisis sociopolítica, conflicto universitario, periodo electoral, pandemia, conflictos estudiantiles, protestas, transporte, inseguridad) o ingresar un escenario personalizado en texto libre.
3. THE Gestor_Analisis SHALL permitir seleccionar múltiples `Institucion` para un mismo `Analisis`.
4. IF un analista intenta crear un `Analisis` sin al menos una `Institucion` seleccionada, THEN THE Gestor_Analisis SHALL rechazar la creación y SHALL devolver un mensaje de validación.
5. WHEN un `Analisis` se crea correctamente, THE Gestor_Analisis SHALL disparar el ciclo inicial de simulación (semana 1) para cada `Institucion` seleccionada.
6. THE Gestor_Analisis SHALL fijar el `Escenario` como contexto inmutable del `Analisis` durante todo su ciclo de vida.

### Requirement 9: Simulaciones paralelas por institución e integridad referencial

**User Story:** Como analista, quiero que cada institución de un análisis genere su propia comunidad digital en paralelo, para comparar su evolución dentro del mismo estudio sin mezclar datos.

#### Acceptance Criteria

1. WHEN un `Analisis` con M instituciones ejecuta una `Semana_Simulada`, THE Controlador_Ciclo SHALL producir M generaciones, una por cada `Institucion`.
2. THE Plataforma_GDS SHALL asociar cada resultado y registro de historial semanal a exactamente una `Institucion` y a exactamente un `Analisis`.
3. THE Plataforma_GDS SHALL hacer evolucionar la `Comunidad_Digital` de cada `Institucion` de forma independiente de las demás dentro del mismo `Analisis`.
4. THE Plataforma_GDS SHALL impedir, mediante restricciones de integridad referencial, que un registro semanal quede huérfano de su `Institucion` o de su `Analisis`.
5. IF la generación de una `Institucion` falla en una `Semana_Simulada`, THEN THE Controlador_Ciclo SHALL aislar el fallo de las demás `Institucion` y SHALL permitir reintentar solo la institución afectada.

### Requirement 10: Usuarios sintéticos persistentes

**User Story:** Como investigador, quiero usuarios sintéticos persistentes con perfil conductual, para observar evolución de comportamiento individual a lo largo del tiempo.

#### Acceptance Criteria

1. THE Plataforma_GDS SHALL representar a cada `Usuario_Sintetico` con identificador, perfil conductual, frecuencia de actividad, estilo de escritura, intereses, nivel de participación, patrones de interacción e historial.
2. THE Plataforma_GDS SHALL mantener a cada `Usuario_Sintetico` persistente durante todo el ciclo de vida del `Analisis`.
3. THE Controlador_Ciclo SHALL reutilizar los `Usuario_Sintetico` existentes entre semanas en lugar de regenerarlos en cada `Semana_Simulada`.
4. WHEN ocurre un evento relevante del `Escenario`, THE Modulo_Simulacion SHALL hacer que los `Usuario_Sintetico` afectados modifiquen su comportamiento de forma coherente con su perfil e historial.
5. THE Plataforma_GDS SHALL registrar el historial acumulado de actividad de cada `Usuario_Sintetico` a lo largo de las semanas.
6. IF la modificación de comportamiento de un `Usuario_Sintetico` falla o resulta imposible por restricciones del sistema, THEN THE Controlador_Ciclo SHALL detener el ciclo de la `Semana_Simulada` afectada y marcarlo como fallido para permitir su reinicio.

### Requirement 11: Asociación comunitaria probabilística

**User Story:** Como analista, quiero estimar la probabilidad de vínculo de un usuario sintético con una comunidad educativa, para razonar sobre pertenencia sin afirmar certezas.

#### Acceptance Criteria

1. THE Plataforma_GDS SHALL calcular para cada par (`Usuario_Sintetico`, `Comunidad_Digital`) un `Score_Asociacion` en el rango cerrado de 0 a 1.
2. THE Score_Asociacion SHALL considerar interacciones, frecuencia, temas, contexto, participación, recurrencia, ubicación asociada e historial.
3. THE Plataforma_GDS SHALL expresar la pertenencia de un `Usuario_Sintetico` a una `Comunidad_Digital` únicamente como probabilidad y SHALL evitar afirmaciones de certeza absoluta.
4. WHEN un analista selecciona ("ancla") un `Usuario_Sintetico`, THE Frontend_GDS SHALL mostrar su `Score_Asociacion` con cada `Comunidad_Digital` y la evidencia que lo sustenta.
5. THE Plataforma_GDS SHALL recalcular el `Score_Asociacion` al cerrar cada `Semana_Simulada` con la información acumulada.

### Requirement 12: Ciclo temporal de 6 meses con generación semanal acumulativa

**User Story:** Como investigador, quiero que la simulación avance semana por semana de forma acumulativa, para que la evolución de la comunidad sea coherente y progresiva durante los 6 meses.

#### Acceptance Criteria

1. THE Plataforma_GDS SHALL modelar cada `Analisis` como un ciclo de hasta 24 `Semana_Simulada` (aproximadamente 6 meses), configurable al crear el `Analisis`.
2. THE Controlador_Ciclo SHALL generar el contenido de una sola `Semana_Simulada` por ciclo y por `Institucion`, sin generar todo el periodo de una vez.
3. WHEN se cierra la `Semana_Simulada` N, THE Controlador_Ciclo SHALL ejecutar, en orden, la generación, el análisis, el aprendizaje y el almacenamiento antes de habilitar la `Semana_Simulada` N+1.
4. THE Controlador_Ciclo SHALL ejecutar las `Semana_Simulada` en orden estrictamente creciente, sin omitir ninguna semana intermedia.
5. WHEN finaliza la `Semana_Simulada` 24 (o la última configurada), THE Controlador_Ciclo SHALL marcar el `Analisis` como completado y SHALL habilitar el informe final.

### Requirement 13: Análisis semanal automático (pipeline)

**User Story:** Como analista, quiero que al cerrar cada semana se ejecute automáticamente el pipeline de análisis completo, para obtener resultados semanales sin intervención manual.

#### Acceptance Criteria

1. WHEN se cierra una `Semana_Simulada`, THE Pipeline_Analisis SHALL ejecutar, en orden, limpieza, normalización, anonimización, análisis NLP, visión computacional, análisis temporal y detección de patrones.
2. WHEN finaliza el `Pipeline_Analisis` de una `Semana_Simulada`, THE Plataforma_GDS SHALL actualizar los indicadores, perfiles de `Usuario_Sintetico`, `Comunidad_Digital` y tendencias asociados.
3. WHEN finaliza el `Pipeline_Analisis` de una `Semana_Simulada`, THE Generador_Reportes SHALL producir el resultado semanal correspondiente.
4. IF una etapa del `Pipeline_Analisis` falla, THEN THE Pipeline_Analisis SHALL detener el procesamiento de esa `Semana_Simulada`, registrar la etapa fallida y permitir reintentar desde la etapa fallida sin repetir etapas ya completadas.
5. THE Pipeline_Analisis SHALL ejecutar la etapa de anonimización antes de cualquier etapa de análisis o almacenamiento de resultados.

### Requirement 14: Análisis de Lenguaje Natural (NLP) avanzado

**User Story:** Como analista, quiero un análisis de lenguaje que vaya más allá del sentimiento, para comprender causas, eventos y temas detrás de las tendencias.

#### Acceptance Criteria

1. WHEN el `Servicio_NLP` procesa contenido de una `Semana_Simulada`, THE Servicio_NLP SHALL producir análisis semántico, detección emocional y clasificación temática.
2. THE Servicio_NLP SHALL extraer causas, eventos y detonantes identificados en el contenido.
3. THE Servicio_NLP SHALL realizar agrupamiento temático y análisis conversacional sobre las interacciones.
4. THE Servicio_NLP SHALL producir interpretación de tendencias a partir del contenido analizado.
5. THE Servicio_NLP SHALL implementarse de forma primaria mediante el `Servicio_IA` real en Python (Transformers, Sentence Transformers, spaCy/NLTK), consumido por el `ServidorGDS` a través de una interfaz estable sobre HTTP, y SHALL conservar una implementación TypeScript determinista como fallback para pruebas y para degradación segura cuando el `Servicio_IA` no esté disponible, sin que ninguna de las dos implementaciones acople al `Pipeline_Analisis`.

### Requirement 15: Visión computacional (Servicio_IA en Python con fallback estable)

**User Story:** Como arquitecto, quiero que la visión computacional la ejecute el `Servicio_IA` real en Python detrás de una interfaz estable, con un fallback determinista, para integrar modelos reales de visión como parte del sistema actual sin cambiar la arquitectura.

#### Acceptance Criteria

1. WHEN el `Pipeline_Analisis` procesa el campo `image_description` de un `Contrato_Normalizado`, THE Servicio_Vision SHALL devolver una estructura con `scene`, `objects` (lista) y `emotion_context`.
2. THE Servicio_Vision SHALL implementarse de forma primaria mediante el `Vision_Engine` del `Servicio_IA` real en Python (preparado para modelos de visión reales como LLaVA, Qwen2-VL, Florence-2, BLIP-2 y EasyOCR), consumido por el `ServidorGDS` a través de una interfaz estable sobre HTTP, y SHALL conservar una implementación TypeScript determinista (mock) como fallback para pruebas y para degradación segura cuando el `Servicio_IA` no esté disponible.
3. WHERE existan imágenes reales disponibles, THE Servicio_Vision SHALL procesar las imágenes reales transformándolas en explicaciones de texto; WHERE no existan imágenes reales, THE Servicio_Vision SHALL derivar su salida exclusivamente a partir de la descripción visual textual (`image_description`, simulada por Gemini en v1) generada por el `Modulo_Simulacion`, sin usar plantillas por defecto ni respuestas vacías.
4. WHEN se alterne entre el `Servicio_IA` y el fallback determinista, THE Pipeline_Analisis SHALL consumir la salida del `Servicio_Vision` sin requerir cambios en su código.

### Requirement 16: Aprendizaje contextual

**User Story:** Como investigador, quiero que el sistema construya comprensión contextual en lugar de aplicar reglas fijas, para descubrir relaciones complejas y explicaciones fundamentadas.

#### Acceptance Criteria

1. THE Plataforma_GDS SHALL derivar las conclusiones de comprensión contextual y no de reglas léxicas fijas de palabra a etiqueta.
2. WHEN finaliza el análisis de una `Semana_Simulada`, THE Plataforma_GDS SHALL identificar las relaciones presentes entre eventos, temas y comportamientos a partir del contenido acumulado, aceptándose un resultado de cero relaciones cuando no exista ninguna relación significativa en los datos.
3. THE Plataforma_GDS SHALL inferir contextos y detectar causas que conecten variaciones de los indicadores con eventos del `Escenario`.
4. THE Plataforma_GDS SHALL construir explicaciones y razonamientos respaldados por evidencia almacenada.

### Requirement 17: Índice de riesgo comunitario multidimensional

**User Story:** Como analista, quiero un índice de riesgo con múltiples dimensiones que evolucionan por separado, para entender cada aspecto de la comunidad de forma independiente.

#### Acceptance Criteria

1. THE Indice_Riesgo SHALL representar el riesgo comunitario mediante múltiples dimensiones, incluyendo al menos estrés académico, ansiedad, conflicto social, bullying, aislamiento, agotamiento y violencia verbal.
2. THE Indice_Riesgo SHALL calcular cada dimensión de forma independiente por `Comunidad_Digital` y por `Semana_Simulada`.
3. WHEN una dimensión del `Indice_Riesgo` varía respecto a la semana anterior, THE Motor_Explicativo SHALL generar una explicación de la razón de esa variación respaldada por evidencia.
4. THE Indice_Riesgo SHALL ser un agregado colectivo por `Comunidad_Digital` y SHALL evitar puntuar a `Usuario_Sintetico` individuales como personas de riesgo.
5. THE Indice_Riesgo SHALL permitir configurar dimensiones adicionales sin alterar el cálculo de las dimensiones existentes.
6. WHERE el cálculo interno requiera puntuaciones por `Usuario_Sintetico`, THE Indice_Riesgo SHALL emplearlas exclusivamente para fines internos de agregación y SHALL exponer únicamente resultados colectivos, sin usarlas como diagnóstico individual.

### Requirement 18: Saltos temporales (herramienta de aceleración administrativa)

**User Story:** Como administrador, quiero acelerar la simulación avanzando semanas o meses, para no esperar tiempo real, ejecutando exactamente los mismos procesos que ocurrirían en tiempo real.

#### Acceptance Criteria

1. THE Programador_Temporal SHALL modelar el avance del `Analisis` como tiempo real simulado, en el que cada `Semana_Simulada` se procesa de forma equivalente a una semana de espera real.
2. THE Herramienta_Aceleracion SHALL ofrecer las acciones de avanzar una semana, avanzar un mes y avanzar hasta el final del `Analisis`.
3. WHEN un administrador solicita un salto temporal, THE Herramienta_Aceleracion SHALL ejecutar todos los ciclos semanales pendientes en orden, aplicando la misma lógica del procesamiento en tiempo real, sin omitir ninguna etapa del `Pipeline_Analisis`.
4. THE Herramienta_Aceleracion SHALL producir resultados equivalentes a los que se obtendrían ejecutando las mismas semanas de una en una en tiempo real (equivalencia de salto y paso a paso).
5. IF un salto temporal se interrumpe antes de completar todas las semanas pendientes, THEN THE Plataforma_GDS SHALL conservar de forma consistente los resultados de las semanas ya procesadas y SHALL permitir reanudar desde la siguiente semana pendiente.
6. WHILE un salto temporal está en ejecución, THE Frontend_GDS SHALL mostrar el progreso de las semanas procesadas y pendientes.

### Requirement 19: Reportes en múltiples horizontes temporales

**User Story:** Como autoridad institucional, quiero reportes semanales, mensuales, trimestrales, semestrales y un informe final, para revisar la evolución a distintos niveles de detalle.

#### Acceptance Criteria

1. THE Generador_Reportes SHALL producir reportes en los horizontes semanal, mensual, trimestral, semestral y un informe final.
2. THE Generador_Reportes SHALL incluir en cada reporte explicaciones, evidencias, publicaciones relevantes, indicadores, cambios, tendencias, factores detonantes, conclusiones y recomendaciones.
3. WHEN se completa el periodo correspondiente a un horizonte, THE Generador_Reportes SHALL generar el reporte de ese horizonte a partir de los resultados semanales acumulados.
4. THE Generador_Reportes SHALL asociar cada reporte al `Analisis` y, cuando corresponda, a la `Institucion` específica.
5. WHEN se solicita la exportación de un reporte, THE Generador_Reportes SHALL producir el reporte en un formato descargable conservando explicaciones y evidencias.

### Requirement 20: IA explicativa respaldada por evidencia

**User Story:** Como autoridad institucional, quiero que cada conclusión venga explicada y respaldada por evidencia cuantitativa, para confiar en los resultados y comprender su origen.

#### Acceptance Criteria

1. WHEN el `Motor_Explicativo` reporta una tendencia o nivel de riesgo, THE Motor_Explicativo SHALL acompañar la afirmación con una explicación en lenguaje natural que indique qué ocurre, por qué, cuándo empezó y cómo evolucionó.
2. THE Motor_Explicativo SHALL respaldar cada conclusión con evidencia cuantificable, incluyendo conteos de publicaciones y comentarios y variaciones porcentuales respecto a periodos anteriores.
3. THE Motor_Explicativo SHALL evitar afirmaciones de riesgo sin explicación ni evidencia asociada.
4. THE Motor_Explicativo SHALL referenciar las publicaciones o evidencias concretas que sustentan cada conclusión.
5. THE Motor_Explicativo SHALL expresar las conclusiones únicamente a nivel colectivo de `Comunidad_Digital` y SHALL evitar exponer análisis o diagnósticos a nivel individual de personas.

### Requirement 21: Pantalla principal de la plataforma

**User Story:** Como usuario de la plataforma, quiero una pantalla principal con visión general e indicadores globales, para entender el estado del sistema de un vistazo.

#### Acceptance Criteria

1. WHEN un usuario autorizado abre la Plataforma_GDS y todos los componentes requeridos del panel están disponibles, THE Frontend_GDS SHALL mostrar información general y descripción del sistema, indicadores globales, históricos, un resumen de los análisis realizados y los estados de ejecución.
2. THE Frontend_GDS SHALL mostrar un slider automático con las `Institucion` registradas.
3. THE Frontend_GDS SHALL mostrar el estado de ejecución de cada `Analisis` (por ejemplo: en curso, completado, fallido, en aceleración).
4. WHILE un `Analisis` ejecuta un ciclo o un salto temporal, THE Frontend_GDS SHALL reflejar el avance en tiempo real mediante WebSockets.
5. THE Frontend_GDS SHALL presentar los indicadores globales mediante visualizaciones gráficas (Recharts).
6. IF un usuario no autorizado abre la Plataforma_GDS, THEN THE Frontend_GDS SHALL bloquear todo acceso al panel principal.

### Requirement 22: Vista de trazabilidad del análisis

**User Story:** Como analista, quiero explorar visualmente la evolución completa de un análisis, para revisar semanas, resultados, evidencias y explicaciones con trazabilidad total.

#### Acceptance Criteria

1. WHEN un analista abre un `Analisis`, THE Frontend_GDS SHALL permitir navegar por sus `Semana_Simulada`, meses, resultados, publicaciones, evidencias, indicadores, explicaciones y reportes.
2. THE Frontend_GDS SHALL mostrar la evolución temporal de cada dimensión del `Indice_Riesgo` por `Comunidad_Digital`.
3. WHEN un analista selecciona un resultado o indicador, THE Frontend_GDS SHALL mostrar la explicación y la evidencia que lo sustenta.
4. THE Frontend_GDS SHALL permitir comparar la evolución de varias `Institucion` dentro del mismo `Analisis`.
5. THE Frontend_GDS SHALL mostrar la trazabilidad completa que vincule cada conclusión con su `Semana_Simulada`, `Institucion` y evidencia de origen.
6. IF la explicación o la evidencia de soporte de un resultado seleccionado no puede cargarse, THEN THE Frontend_GDS SHALL mostrar una vista parcial con la información disponible e indicar qué información falta.

### Requirement 23: Anonimización y ausencia de PII real

**User Story:** Como responsable de cumplimiento, quiero que los identificadores se anonimicen y que no exista PII real, para garantizar que la plataforma no maneja datos personales reales.

#### Acceptance Criteria

1. WHEN el `Pipeline_Analisis` procesa contenido, THE Servicio_Anonimizacion SHALL reemplazar los identificadores de `Usuario_Sintetico` por seudónimos generados mediante hashing SHA-256 con salt.
2. THE Servicio_Anonimizacion SHALL producir seudónimos de los que no se pueda recuperar el identificador original (irreversibilidad).
3. THE Plataforma_GDS SHALL operar exclusivamente con datos sintéticos y SHALL evitar el almacenamiento de PII real.
4. FOR ALL identificadores anonimizados, el mismo identificador de entrada con el mismo salt SHALL producir siempre el mismo seudónimo (consistencia del hash).
5. WHERE un reporte o vista exponga contenido, THE Frontend_GDS SHALL mostrar seudónimos anonimizados en lugar de identificadores crudos.

### Requirement 24: Autenticación y autorización propias de la plataforma

**User Story:** Como administrador, quiero roles propios de la plataforma sobre el sistema de autenticación existente y una validación de identidad obligatoria con denegación por defecto (fail-closed), para controlar el acceso de forma independiente del sistema del colegio y evitar concesiones de acceso ante cualquier duda.

#### Acceptance Criteria

1. WHEN un usuario solicita acceso a la Plataforma_GDS, THE Servicio_Autenticacion SHALL validar un token JWT emitido por el sistema existente.
2. THE Servicio_Autenticacion SHALL reconocer los roles propios de la plataforma `ADMIN_PLATAFORMA`, `ANALISTA` y `OBSERVADOR`.
3. IF un usuario con rol `OBSERVADOR` solicita una operación de escritura (crear, editar o eliminar), THEN THE Servicio_Autenticacion SHALL denegar la operación y SHALL devolver un error de autorización.
4. WHERE una operación requiera privilegios administrativos (por ejemplo, la `Herramienta_Aceleracion` o la eliminación de instituciones), THE Servicio_Autenticacion SHALL permitirla solo a usuarios con rol `ADMIN_PLATAFORMA`.
5. THE Servicio_Autenticacion SHALL mantener los roles de la plataforma separados de los roles del sistema del colegio.
6. THE Servicio_Autenticacion SHALL permitir a los usuarios con rol `ADMIN_PLATAFORMA` realizar tanto operaciones administrativas como operaciones regulares.
7. IF la validación del token JWT falla por causas técnicas temporales como problemas de red o indisponibilidad del servicio, THEN THE Servicio_Autenticacion SHALL denegar el acceso sin conceder ningún permiso, ni siquiera de solo lectura, y SHALL reintentar la validación del token mediante reintentos con backoff acotado.
8. THE Servicio_Autenticacion SHALL conceder acceso a la Plataforma_GDS únicamente tras una validación de identidad exitosa del token JWT.

### Requirement 25: Persistencia aislada e integridad de datos

**User Story:** Como arquitecto, quiero que el backend de la Plataforma_GDS sea un servicio independiente con su propia base de datos PostgreSQL dedicada e integridad referencial, para preservar el desacople total respecto al sistema y la base de datos del colegio y la consistencia de los análisis.

#### Acceptance Criteria

1. THE Plataforma_GDS SHALL persistir sus datos en una base de datos **PostgreSQL dedicada e independiente con la extensión pgvector**, gestionada por el cliente y el esquema Prisma propios del backend NestJS autónomo de la Plataforma_GDS, complementada con una instancia de **Redis** propia para cola y caché, todo separado de la base de datos y de la instancia del colegio.
2. THE Plataforma_GDS SHALL definir restricciones de clave foránea que vinculen `Semana_Simulada`, resultados, `Usuario_Sintetico` y `Comunidad_Digital` con su `Institucion` y su `Analisis`.
3. THE Plataforma_GDS SHALL NOT acceder, leer ni modificar la base de datos del colegio de ninguna forma (aislamiento total a nivel de base de datos).
4. WHEN se elimina un `Analisis`, THE Plataforma_GDS SHALL aplicar una política de borrado en cascada consistente sobre sus datos dependientes en su propia base de datos, sin afectar datos de otros análisis.
5. IF una operación de escritura sobre datos del `Analisis` falla a mitad de un ciclo, THEN THE Plataforma_GDS SHALL preservar la consistencia transaccional de los datos del `Analisis` en su propia base de datos.
6. IF el borrado en cascada de un `Analisis` falla, THEN THE Plataforma_GDS SHALL bloquear la eliminación del `Analisis` y SHALL conservar intactos el `Analisis` y todos sus datos dependientes.
7. THE Plataforma_GDS SHALL restringir la eliminación de datos dependientes de un `Analisis` para que ocurra únicamente como parte del borrado en cascada del `Analisis`.
8. THE backend de la Plataforma_GDS SHALL ejecutarse como un servicio **NestJS** independiente y autónomo ubicado en su propia carpeta a nivel de la raíz del repositorio (por ejemplo, `ServidorGDS/`), con su propio `package.json`, su propio puerto y su propia estructura modular de carpetas, endpoints y pipeline, desacoplado del proceso `Servidor` y del código base del colegio.

### Requirement 26: Validación con evidencia técnica por incremento

**User Story:** Como responsable del proyecto, quiero que cada parte construida sea funcional y validada con evidencia técnica real, para no avanzar sobre promesas no verificadas.

#### Acceptance Criteria

1. WHERE un incremento de funcionalidad se declare completado, THE Plataforma_GDS SHALL contar con pruebas automatizadas ejecutables que validen ese incremento.
2. WHEN se ejecuta la suite de pruebas de un incremento, THE Plataforma_GDS SHALL producir un resultado verificable (aprobado o fallido) como evidencia de su estado.
3. THE Plataforma_GDS SHALL incluir pruebas basadas en propiedades para la validación del `Contrato_Normalizado` (round-trip), la consistencia del `Servicio_Anonimizacion` y la equivalencia entre el salto temporal y el procesamiento paso a paso.
4. IF una prueba de un incremento falla, THEN el incremento NO SHALL considerarse completado hasta que la prueba sea aprobada.
5. THE Plataforma_GDS SHALL conservar los rangos válidos de los valores calculados (por ejemplo, `Score_Asociacion` dentro de 0 a 1 y cada dimensión del `Indice_Riesgo` dentro de su rango definido) como invariantes verificables por pruebas.

### Requirement 27: Manejo de errores y resiliencia de la simulación

**User Story:** Como administrador, quiero que los fallos del proveedor LLM o del pipeline no corrompan el análisis, para poder reintentar y continuar de forma segura.

#### Acceptance Criteria

1. IF el `Proveedor_Generacion` agota su cuota, expira por tiempo de espera o devuelve un error, THEN THE Modulo_Simulacion SHALL registrar el incidente y SHALL marcar la generación afectada como reintentable.
2. WHEN se reintenta una `Semana_Simulada` fallida, THE Controlador_Ciclo SHALL reanudar sin duplicar resultados ya persistidos para esa semana e institución.
3. WHILE una `Semana_Simulada` está siendo procesada, THE Controlador_Ciclo SHALL impedir que se inicie un procesamiento concurrente de la misma `Semana_Simulada` para la misma `Institucion`.
4. IF el `Contrato_Normalizado` generado es inválido, THEN THE Modulo_Simulacion SHALL descartarlo, registrar el motivo y solicitar una regeneración antes de continuar el `Pipeline_Analisis`.
5. THE Plataforma_GDS SHALL exponer el estado de cada ciclo (pendiente, en proceso, completado, fallido) de forma consultable.

### Requirement 28: Motor de Memoria Contextual jerárquica

**User Story:** Como analista, quiero que el sistema mantenga una memoria contextual organizada en niveles jerárquicos (semanal, mensual, trimestral y global), para alimentar el contexto longitudinal de cada generación de forma eficiente sin reprocesar las semanas crudas ni exceder el umbral de tokens.

#### Acceptance Criteria

1. WHEN se cierra una `Semana_Simulada`, THE Motor_Memoria_Contextual SHALL generar o actualizar la `Memoria_Semanal` correspondiente con un resumen de lo ocurrido esa semana para cada `Comunidad_Digital`.
2. WHEN se completan las `Memoria_Semanal` de un mes, THE Motor_Memoria_Contextual SHALL consolidar la `Memoria_Mensual` a partir de esas `Memoria_Semanal`.
3. WHEN se completan las `Memoria_Mensual` de un trimestre, THE Motor_Memoria_Contextual SHALL consolidar la `Memoria_Trimestral` a partir de esas `Memoria_Mensual`.
4. WHEN se completan las `Memoria_Trimestral` de un `Analisis`, THE Motor_Memoria_Contextual SHALL consolidar la `Memoria_Global` a partir de esas `Memoria_Trimestral` como resumen acumulativo del `Analisis`.
5. WHEN el `Modulo_Simulacion` genera la `Semana_Simulada` N (con N mayor que 1), THE Motor_Memoria_Contextual SHALL construir el contexto enviado al `Proveedor_Generacion` a partir de la `Memoria_Jerarquica` y no a partir de las `Semana_Simulada` crudas.
6. WHERE el contexto construido a partir de la `Memoria_Jerarquica` supere el umbral de tokens configurado para el `Proveedor_Generacion` activo, THE Motor_Memoria_Contextual SHALL priorizar los niveles de memoria de mayor agregación para respetar dicho umbral.
7. THE Motor_Memoria_Contextual SHALL preservar el `Escenario` original del `Analisis` en la memoria de todos los niveles, desde la `Memoria_Semanal` hasta la `Memoria_Global`.
8. THE Motor_Memoria_Contextual SHALL persistir la `Memoria_Jerarquica` en la base de datos de forma consultable y trazable, conservando el historial completo original aun cuando la compactación enviada al `Proveedor_Generacion` reduzca el detalle.
9. THE Motor_Memoria_Contextual SHALL asociar cada nivel de la `Memoria_Jerarquica`, mediante restricciones de integridad referencial, a exactamente un `Analisis` y a su `Institucion` o `Comunidad_Digital` correspondiente.

### Requirement 29: Motor de Escenarios reutilizables

**User Story:** Como analista, quiero definir, guardar y reutilizar escenarios entre distintos análisis, para no redactar de nuevo contextos que ya he usado y mantener consistencia entre estudios.

#### Acceptance Criteria

1. WHEN un usuario autorizado define un `Escenario_Reutilizable` con nombre, descripción, contexto y parámetros, THE Motor_Escenarios SHALL guardarlo y persistirlo en la `Biblioteca_Escenarios`.
2. WHEN un analista crea un `Analisis`, THE Motor_Escenarios SHALL permitir seleccionar un `Escenario_Reutilizable` de la `Biblioteca_Escenarios` o definir un escenario personalizado.
3. WHERE un analista defina un escenario personalizado al crear un `Analisis`, THE Motor_Escenarios SHALL permitir guardarlo opcionalmente en la `Biblioteca_Escenarios` para su reutilización posterior.
4. WHEN un `Analisis` se crea a partir de un `Escenario_Reutilizable`, THE Motor_Escenarios SHALL copiar el contenido del escenario y fijarlo como contexto inmutable del `Analisis` en el momento de la creación.
5. WHEN un usuario edita un `Escenario_Reutilizable` de la `Biblioteca_Escenarios`, THE Motor_Escenarios SHALL conservar sin cambios el `Escenario` de los `Analisis` ya creados a partir de versiones anteriores.
6. THE Motor_Escenarios SHALL registrar para cada `Analisis` el identificador y la versión del `Escenario_Reutilizable` utilizado, para trazabilidad.
7. THE Motor_Escenarios SHALL admitir tanto escenarios predefinidos como personalizados, coherente con la selección de `Escenario` del `Gestor_Analisis`.

### Requirement 30: Sistema de Evidencias Trazables desacoplado

**User Story:** Como autoridad institucional, quiero un sistema de evidencias trazables independiente del motor de análisis, para auditar el recorrido completo desde cada conclusión hasta el dato original y confiar en la explicabilidad de los resultados.

#### Acceptance Criteria

1. THE Sistema_Evidencias SHALL exigir que toda conclusión, indicador, dimensión del `Indice_Riesgo`, patrón y explicación referencie `Evidencia` concretas (publicaciones, comentarios, conteos o variaciones) mediante identificadores trazables.
2. THE Sistema_Evidencias SHALL almacenar y servir las `Evidencia` a través de una interfaz estable, de modo que el `Motor_Explicativo` y el `Indice_Riesgo` no dependan de su implementación interna.
3. THE Sistema_Evidencias SHALL hacer trazable cada `Evidencia` hasta su `Semana_Simulada`, su `Comunidad_Digital` o `Institucion` y su `Analisis` de origen.
4. WHEN un usuario audita una conclusión, THE Sistema_Evidencias SHALL exponer el recorrido completo conclusión → `Evidencia` → dato original.
5. WHERE una vista o reporte exponga `Evidencia`, THE Sistema_Evidencias SHALL presentar el contenido anonimizado mediante seudónimos, sin exponer identificadores crudos.
6. WHEN el `Motor_Explicativo` cambie su implementación interna, THE Sistema_Evidencias SHALL seguir sirviendo las `Evidencia` sin requerir cambios en su contrato de interfaz.

### Requirement 31: Estrategia de Machine Learning y aprendizaje híbrido

**User Story:** Como responsable técnico, quiero un enfoque híbrido de Machine Learning alineado al hardware disponible (GPU NVIDIA RTX 3060 Ti, 8 GB de VRAM), para combinar razonamiento mediante LLM con una capa de ML clásico que mejore a medida que se acumulan datos longitudinales sin requerir fine-tuning pesado.

#### Acceptance Criteria

1. THE Plataforma_GDS SHALL emplear un enfoque híbrido compuesto por una capa de razonamiento y generación mediante LLM (Google Gemini API en la nube como proveedor por defecto, y Ollama local como alternativa configurable con arquitectura preparada) y por la `Capa_ML` de ML clásico/representacional sobre la `Capa_Analisis`.
2. THE Capa_ML SHALL proveer embeddings de texto (modelos `BAAI/bge-m3`, `BAAI/bge-large-en-v1.5` y `all-MiniLM-L6-v2` mediante Sentence Transformers, almacenados en `pgvector`), agrupamiento temático, detección de anomalías, detección de tendencias y scoring calibrado del `Indice_Riesgo`.
3. WHEN se acumulan nuevas `Semana_Simulada`, THE Capa_ML SHALL calibrarse a partir del `Corpus_Longitudinal` acumulado de los `Analisis` dentro del `Servicio_IA` en Python, mejorando sus salidas a medida que crece dicho corpus.
4. WHERE se ejecuten saltos temporales, THE Plataforma_GDS SHALL aprovecharlos para acumular el `Corpus_Longitudinal` usado por la `Capa_ML`, conservando equivalencia con el procesamiento paso a paso.
5. THE Plataforma_GDS SHALL ejecutar los modelos locales (embeddings y, en el futuro, visión) dentro de la restricción de 8 GB de VRAM, sin depender de fine-tuning local pesado de modelos grandes.
6. THE Capa_ML SHALL implementarse de forma primaria mediante el `Servicio_IA` real en Python (scikit-learn, PyTorch, Sentence Transformers, NumPy, Pandas), consumido por el `ServidorGDS` a través de una interfaz estable sobre HTTP, y SHALL conservar una implementación TypeScript determinista como fallback para pruebas y para degradación segura, sin acoplar el `Pipeline_Analisis` a una implementación concreta.
7. THE Capa_ML SHALL producir resultados exclusivamente a nivel colectivo de `Comunidad_Digital` y SHALL respaldarlos con evidencia técnica verificable, coherente con el principio de no diagnóstico individual.

### Requirement 32: Modos de ejecución de la simulación (control desde el frontend)

**User Story:** Como analista, quiero elegir cómo avanza la simulación de un análisis (automático, manual o tiempo real), para controlar desde el frontend el ritmo de procesamiento sin alterar los resultados obtenidos.

#### Acceptance Criteria

1. THE Frontend_GDS SHALL permitir seleccionar el `Modo_Ejecucion` de un `Analisis` entre los valores automático, manual y tiempo real.
2. WHEN un usuario selecciona el `Modo_Ejecucion` manual, THE Plataforma_GDS SHALL procesar únicamente la siguiente `Semana_Simulada` pendiente por cada solicitud explícita del usuario.
3. WHEN un usuario selecciona el `Modo_Ejecucion` automático, THE Plataforma_GDS SHALL procesar en orden estrictamente creciente todas las `Semana_Simulada` pendientes hasta completar el `Analisis`, reutilizando la `Herramienta_Aceleracion`.
4. WHEN un usuario selecciona el `Modo_Ejecucion` tiempo real, THE Programador_Temporal SHALL procesar una `Semana_Simulada`, iniciar un contador y, al vencer el intervalo configurado, procesar automáticamente la siguiente `Semana_Simulada` pendiente.
5. THE Plataforma_GDS SHALL permitir configurar el valor del intervalo del `Modo_Ejecucion` tiempo real que representa la duración de una `Semana_Simulada`, y SHALL aplicar por defecto un intervalo configurable independiente de la duración de una semana calendario real.
6. WHILE un `Analisis` ejecuta en `Modo_Ejecucion` automático o tiempo real, THE Frontend_GDS SHALL permitir pausar y reanudar la ejecución conservando el estado del `Analisis` de forma consistente.
7. THE Plataforma_GDS SHALL ejecutar los tres valores de `Modo_Ejecucion` a través de la misma lógica `procesarSemana`, de modo que el resultado del `Analisis` sea equivalente independientemente del `Modo_Ejecucion` seleccionado (coherente con el Requirement 18, criterio 4).
8. IF un `Analisis` se pausa a mitad de ejecución, THEN THE Plataforma_GDS SHALL conservar las `Semana_Simulada` completadas y SHALL permitir reanudar desde la siguiente `Semana_Simulada` pendiente (coherente con el Requirement 18, criterio 5).

### Requirement 33: Anclaje geográfico de la simulación y patrones por zona

**User Story:** Como analista, quiero que la simulación y la detección de patrones se anclen a la zona geográfica de cada institución, para obtener tendencias diferenciadas y trazables por ubicación dentro de un mismo análisis.

#### Acceptance Criteria

1. WHEN el `Frontend_GDS` envía un `Analisis` con una o más `Institucion` y un radio de análisis, THE Plataforma_GDS SHALL combinar el radio recibido con las coordenadas almacenadas de cada `Institucion` para definir la `Zona_Geografica` de cada `Comunidad_Digital`.
2. WHEN el `Modulo_Simulacion` genera contenido para una `Comunidad_Digital`, THE Modulo_Simulacion SHALL anclar el contenido al contexto geográfico de la `Zona_Geografica`, definida por las coordenadas y el radio, de esa `Comunidad_Digital`.
3. THE Plataforma_GDS SHALL identificar, mediante la `Capa_ML`, el `Motor_Temporal` y el `Detector_Patrones`, patrones y tendencias diferenciados por la `Zona_Geografica` de cada `Comunidad_Digital`.
4. THE Plataforma_GDS SHALL asociar cada patrón y tendencia detectados a la `Zona_Geografica` de la `Institucion` y `Comunidad_Digital` de origen para su trazabilidad.
5. WHERE un `Analisis` agrupe varias `Institucion`, THE Plataforma_GDS SHALL permitir comparar los patrones por `Zona_Geografica` entre las distintas `Comunidad_Digital` (coherente con el Requirement 22, criterio 4).

### Requirement 34: Filtro de relevancia del contenido

**User Story:** Como analista, quiero que el sistema separe el contenido relevante del ruido antes de calcular indicadores, para que las conclusiones se basen solo en señal sin perder la trazabilidad del contenido descartado.

#### Acceptance Criteria

1. WHEN el `Pipeline_Analisis` procesa el contenido de una `Semana_Simulada`, THE Filtro_Relevancia SHALL clasificar cada publicación y comentario como `Contenido_Contributivo` o `Contenido_No_Contributivo`.
2. THE Pipeline_Analisis SHALL excluir el `Contenido_No_Contributivo` del cálculo del `Indice_Riesgo` y de los indicadores.
3. WHERE no exista una configuración explícita de eliminación, THE Plataforma_GDS SHALL conservar de forma persistente el `Contenido_No_Contributivo`, marcado como tal, para trazabilidad y evidencia.
4. THE Filtro_Relevancia SHALL ejecutarse después de la etapa de anonimización y antes de la etapa de NLP dentro del orden del `Pipeline_Analisis` (coherente con el Requirement 13, criterio 5).
5. WHEN un usuario audita una conclusión, THE Sistema_Evidencias SHALL mostrar el `Contenido_Contributivo` usado como evidencia distinguiéndolo del `Contenido_No_Contributivo` (coherente con el Requirement 30).
6. THE Filtro_Relevancia SHALL exponer sus resultados a través de una interfaz estable reemplazable por una implementación basada en la `Capa_ML` o un microservicio Python, sin acoplar el `Pipeline_Analisis` a una implementación concreta (coherente con el Requirement 14, criterio 5, y el Requirement 31, criterio 6).

### Requirement 35: Servicio de IA/ML en Python consumido por HTTP con degradación segura

**User Story:** Como arquitecto del sistema, quiero que toda la IA/ML pesada (NLP, visión, embeddings, clustering, anomalías, tendencias y scoring) se ejecute en un servicio Python dedicado consumido por el backend NestJS sobre HTTP, para mantener el cerebro analítico desacoplado y poder degradar a un cálculo base cuando el servicio no esté disponible.

#### Acceptance Criteria

1. THE Servicio_IA SHALL ejecutar en un servicio Python dedicado (`ServicioIA/`, FastAPI) el NLP, la visión computacional, los embeddings, el agrupamiento, la detección de anomalías, la detección de tendencias y el scoring del `Indice_Riesgo`.
2. THE ServidorGDS SHALL consumir el `Servicio_IA` exclusivamente sobre HTTP a través de las interfaces estables `Servicio_NLP`, `Servicio_Vision`, `Capa_ML` y `Filtro_Relevancia`, sin acoplarse a la implementación interna en Python.
3. IF el `Servicio_IA` no está disponible o devuelve un error, THEN THE ServidorGDS SHALL degradar de forma segura al fallback determinista en TypeScript que produce un cálculo base, sin bloquear el ciclo y registrando el incidente.
4. WHEN el `Servicio_IA` vuelve a estar disponible tras una degradación, THE ServidorGDS SHALL reanudar el consumo del `Servicio_IA` como implementación primaria sin requerir cambios de código.
5. THE ServidorGDS SHALL exponer el estado de disponibilidad del `Servicio_IA` (disponible o degradado) de forma consultable.

### Requirement 36: Aprendizaje por memoria semántica vectorial (embeddings + pgvector)

**User Story:** Como investigador, quiero que el sistema aprenda acumulando embeddings de todo el contenido en una memoria semántica vectorial y recupere contexto por similitud, para que la generación y el análisis de cada semana se apoyen en el historial longitudinal y mejoren a medida que el corpus crece.

#### Acceptance Criteria

1. WHEN el `Servicio_IA` procesa contenido de una `Semana_Simulada`, THE Servicio_IA SHALL generar `Embeddings` de ese contenido mediante Sentence Transformers (modelos `BAAI/bge-m3`, `BAAI/bge-large-en-v1.5` o `all-MiniLM-L6-v2`) y THE Plataforma_GDS SHALL almacenarlos en `pgvector` como parte de la `Memoria_Semantica`.
2. WHEN se cierra una `Semana_Simulada`, THE Plataforma_GDS SHALL acumular el corpus de la `Memoria_Semantica` agregando los nuevos `Embeddings` sin eliminar los de semanas anteriores.
3. WHEN el `Modulo_Simulacion` genera o el `Pipeline_Analisis` analiza la `Semana_Simulada` N (con N mayor que 1), THE Plataforma_GDS SHALL recuperar contexto desde la `Memoria_Semantica` mediante búsqueda por similitud vectorial (`Embeddings_Search`) sobre `pgvector`.
4. WHEN crece el `Corpus_Longitudinal` acumulado, THE Capa_ML SHALL calibrarse dentro del `Servicio_IA` a partir de dicho corpus y SHALL mejorar sus salidas a medida que el corpus crece, sin requerir un reentrenamiento pesado obligatorio.
5. THE Plataforma_GDS SHALL asociar cada vector de la `Memoria_Semantica`, mediante identificadores trazables, a su `Semana_Simulada`, su `Comunidad_Digital` o `Institucion` y su `Analisis` de origen.
6. FOR ALL consultas de `Embeddings_Search`, THE Servicio_IA SHALL devolver resultados ordenados por similitud dentro del rango de similitud definido, sin exponer resultados a nivel de diagnóstico individual.

### Requirement 37: Motor de visión preparado para imágenes reales

**User Story:** Como arquitecto, quiero que el `Vision_Engine` exista desde v1 procesando descripciones de imagen en texto y quede preparado para procesar imágenes reales a futuro, para integrar modelos de visión reales sin rediseñar la arquitectura ni dejar plantillas vacías.

#### Acceptance Criteria

1. THE Vision_Engine SHALL existir y ejecutarse desde la versión 1 dentro del `Servicio_IA`, aun cuando solo procese texto (`image_description`).
2. WHEN el `Vision_Engine` recibe un `image_description` textual, THE Vision_Engine SHALL producir una explicación de texto estructurada (`scene`, `objects`, `emotion_context`) sin usar plantillas por defecto ni respuestas vacías.
3. THE Vision_Engine SHALL exponer un contrato estable que permita, a futuro, procesar imágenes reales (LLaVA, Qwen2-VL, Florence-2, BLIP-2, EasyOCR) transformándolas en explicaciones de texto, sin requerir cambios en el `Pipeline_Analisis`.
4. WHERE se habiliten imágenes reales en el futuro, THE Vision_Engine SHALL transformar cada imagen real en una explicación de texto con el mismo contrato que usa para el `image_description` textual.

### Requirement 38: Cola de trabajos y planificación de ciclos (BullMQ/Redis)

**User Story:** Como administrador, quiero que los ciclos semanales se procesen mediante una cola de trabajos robusta, para garantizar concurrencia controlada, idempotencia, reintentos y aislamiento de fallos por institución.

#### Acceptance Criteria

1. WHEN el `Programador_Temporal` o el `Controlador_Ciclo` dispara un ciclo semanal, THE Plataforma_GDS SHALL encolar el procesamiento de esa `Semana_Simulada` en la `Cola_Trabajos` (BullMQ sobre Redis).
2. WHILE una `Semana_Simulada` de una `Institucion` está siendo procesada, THE Cola_Trabajos SHALL impedir, mediante bloqueo de concurrencia, que se procese simultáneamente otra ejecución de la misma `Semana_Simulada` para la misma `Institucion`.
3. WHEN un trabajo de la `Cola_Trabajos` se reintenta tras un fallo, THE Plataforma_GDS SHALL garantizar idempotencia, sin duplicar resultados ya persistidos para esa `Semana_Simulada` e `Institucion`.
4. IF un trabajo de la `Cola_Trabajos` falla, THEN THE Cola_Trabajos SHALL aplicar una política de reintentos acotada y SHALL aislar el fallo de las demás `Institucion` sin detener sus trabajos.
5. THE Cola_Trabajos SHALL exponer el estado de cada trabajo (pendiente, en proceso, completado, fallido) de forma consultable, coherente con el Requirement 27, criterio 5.

### Requirement 39: Memoria histórica en PostgreSQL + pgvector

**User Story:** Como analista, quiero que el sistema conserve el historial completo de tendencias, eventos, comunidades y análisis en la base de datos dedicada con soporte vectorial, para consultar y auditar la evolución longitudinal en cualquier momento.

#### Acceptance Criteria

1. THE Plataforma_GDS SHALL persistir el historial de tendencias, eventos, `Comunidad_Digital` y resultados de análisis en su base de datos PostgreSQL dedicada con la extensión `pgvector`.
2. THE Plataforma_GDS SHALL conservar el historial completo de cada `Analisis` de forma consultable y trazable a lo largo de todas sus `Semana_Simulada`.
3. WHEN se completa el análisis de una `Semana_Simulada`, THE Plataforma_GDS SHALL registrar en la memoria histórica las tendencias y eventos detectados junto con sus referencias trazables a la `Semana_Simulada`, `Comunidad_Digital` e `Institucion` de origen.
4. THE Plataforma_GDS SHALL permitir recuperar el historial de tendencias y eventos tanto por consulta relacional como por similitud vectorial sobre `pgvector`.

### Requirement 40: Backend de orquestación NestJS modular

**User Story:** Como responsable técnico, quiero que el backend de orquestación sea un servicio NestJS modular, documentado y validado, para exponer una API estable, segura y mantenible para la Plataforma_GDS.

#### Acceptance Criteria

1. THE ServidorGDS SHALL implementarse en NestJS con una arquitectura Monolito Modular + Clean Architecture + DDD parcial + Event-Driven interno.
2. THE ServidorGDS SHALL organizar su funcionalidad en módulos que incluyan al menos Dashboard, Institutions, Analysis, Communities, Simulation, Timeline, Scheduler, AI Engine, NLP Engine, Vision Engine, Reports, Audit, Users y Authentication.
3. THE ServidorGDS SHALL documentar su API mediante Swagger/OpenAPI.
4. WHEN el ServidorGDS recibe una solicitud con un cuerpo de datos, THE ServidorGDS SHALL validar y transformar la entrada mediante class-validator y class-transformer antes de procesarla.
5. IF la entrada de una solicitud no supera la validación de class-validator, THEN THE ServidorGDS SHALL rechazar la solicitud y SHALL devolver un mensaje que identifique el campo no conforme.
6. THE ServidorGDS SHALL proteger sus endpoints mediante autenticación JWT con Passport y los roles propios de la plataforma definidos en el Requirement 24, coherente con el `Servicio_Autenticacion`.

### Requirement 41: Observabilidad y despliegue contenedorizado (DevOps)

**User Story:** Como responsable de operaciones, quiero observabilidad y despliegue contenedorizado de los tres servicios, para diagnosticar incidentes y desplegar la plataforma de forma reproducible.

#### Acceptance Criteria

1. THE Plataforma_GDS SHALL registrar logs estructurados mediante el `Servicio_Observabilidad` (Winston y Pino) en el `ServidorGDS`.
2. IF ocurre un error no controlado en el `ServidorGDS` o en el `Servicio_IA`, THEN THE Servicio_Observabilidad SHALL capturar y reportar el error mediante Sentry.
3. THE Plataforma_GDS SHALL proveer una configuración de Docker y Docker Compose que contenerice el frontend (`ClienteCDPLPL`), el backend (`ServidorGDS`) y el `Servicio_IA` (`ServicioIA`), junto con PostgreSQL/pgvector y Redis.
4. WHEN se levanta el entorno mediante Docker Compose, THE Plataforma_GDS SHALL iniciar los tres servicios y sus dependencias de datos (PostgreSQL/pgvector y Redis) de forma coordinada.
5. THE Plataforma_GDS SHALL mantener su pipeline de integración continua mediante GitHub Actions ejecutando la suite de pruebas (Jest, Supertest, Vitest, Playwright) como evidencia técnica verificable, coherente con el Requirement 26.
