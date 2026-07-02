# Implementation Plan: Plataforma_GDS (tres componentes + bucle de aprendizaje)

## Overview

Este plan convierte el diseño de la **Plataforma_GDS** en una secuencia de incrementos de codificación, cada uno **funcional y validado con evidencia técnica real** (pruebas ejecutables), conforme a la exigencia del **Req. 26**. El sistema se entrega como **tres componentes (deployables) reales y simultáneos**:

1. **`ClienteCDPLPL/` — Frontend_GDS** (React + **TypeScript** + Vite + TailwindCSS + **Shadcn/UI** + **TanStack Query** + React Router + **Zustand** + Recharts + **Framer Motion** + Leaflet + React Hook Form + Zod + Axios), feature `gds` con layout propio bajo `/gds`, que consume el backend por HTTP (`VITE_GDS_API_URL`) y recibe el progreso por WebSockets.
2. **`ServidorGDS/` — Backend de orquestación y API** (**NestJS** + TypeScript + Prisma + **Swagger/OpenAPI** + **BullMQ/Redis** + **JWT/Passport** + class-validator/class-transformer), Monolito Modular + Clean Architecture + DDD parcial + Event-Driven interno. Orquesta `procesarSemana`, el `Pipeline_Analisis`, la cola y la persistencia en su **BD PostgreSQL + pgvector dedicada**. Consume el `Servicio_IA` por HTTP con **fallback determinista en TypeScript** y **degradación segura** (R35).
3. **`ServicioIA/` — Servicio de IA en Python** (**FastAPI** + Transformers, Sentence Transformers, spaCy, NLTK, scikit-learn, PyTorch, NumPy, Pandas): cerebro analítico real (embeddings, NLP, visión, clustering, anomalías, tendencias, scoring calibrado), consumido por HTTP.

**Reubicación del trabajo previo (no se descarta):** el backend Express/TS ya construido (Contrato_Normalizado + Validador, anonimización, framework de pipeline + etapas, Filtro_Relevancia, Servicio_NLP/Servicio_Vision base, Capa_ML base, Indice_Riesgo, Sistema_Evidencias, Motor_Escenarios, Motor_Memoria_Contextual, scoreAsociacion, detectorPatrones, usuarioSintetico, zonaGeografica, auth, instituciones y sus PBT) se **migra a NestJS** y se **reposiciona como el fallback determinista TS** y la lógica de dominio. La feature React `gds` (hoy JS) se **migra/alinea** a TypeScript + Shadcn/UI.

Reglas transversales que aplican a **toda** tarea:

- **Lenguajes:** TypeScript (backend NestJS), TypeScript/React (frontend), Python (Servicio_IA).
- **Evidencia por incremento (Req. 26.1, 26.2, 26.4):** una tarea solo se considera completada cuando sus pruebas asociadas pasan. Backend: `jest --runInBand` (+ Supertest); Frontend: `vitest run` (+ Playwright); Servicio_IA: `pytest`. Un test fallido implica incremento **no** completado.
- **Pruebas basadas en propiedades (PBT):** cada una de las **42 Correctness Properties** del diseño se implementa **una sola vez**, con **fast-check** en el backend (mínimo 100 iteraciones, `{ numRuns: 100 }`) y con **pytest/Hypothesis** cuando la propiedad es del lado Python (Properties 21, 33, 42). Cada prueba lleva el comentario `// Feature: analisis-tendencias-riesgo-emocional, Property N: <texto>` (o `# ...` en Python).
- **Prioridad del Req. 26.3:** Properties 1 (round-trip), 4 y 5 (anonimización) y 9 (equivalencia salto/paso a paso) son de implementación obligatoria; más la 34 (equivalencia entre modos).
- **Entorno Windows/cmd:** comandos **no interactivos** (`jest --runInBand`, `vitest run`, `pytest`, `playwright test`); nunca modo watch ni servidores de larga ejecución. El motor de ciclos y la equivalencia se prueban de forma **síncrona y determinista** con dobles (proveedor con semilla fija, `Servicio_IA`/fallback dobles deterministas, relojes e IDs inyectables, BullMQ en ejecución inmediata o cola en memoria).
- **Aislamiento de datos:** el `ServidorGDS` usa su **BD PostgreSQL + pgvector dedicada** y su **Redis** propia; **nunca** accede ni modifica la BD del colegio. El `Servicio_IA` no se expone públicamente (red interna/contenedores).
- Las sub-tareas marcadas con `*` (pruebas) son opcionales para un MVP, pero el Req. 26 las considera parte del criterio de "hecho".

## Tasks

- [x] 1. Migrar el backend `ServidorGDS/` a NestJS (scaffold, Swagger, validación, guards, Prisma)
  - [x] 1.1 Inicializar el proyecto NestJS autónomo y el bootstrap de la app
    - Reemplazar el andamiaje Express por **NestJS** en `ServidorGDS/` (`nest-cli.json`, `package.json` con NestJS/Prisma/BullMQ/Passport/class-validator/jest/supertest/fast-check, `tsconfig.json`); crear `src/main.ts` (bootstrap, prefijo global `/api/gds`, **Swagger/OpenAPI**, **ValidationPipe** global con class-validator/class-transformer, `ExceptionFilter` global) y `src/app.module.ts` que importará los módulos de dominio
    - Crear los esqueletos de módulos por dominio en `src/modules/` (dashboard, institutions, analysis, communities, simulation, timeline, scheduler, ai-engine, nlp-engine, vision-engine, reports, audit, users, authentication) y `src/common/`, `src/ai/`, `src/queue/`, `src/events/`
    - `.env` propio con `DATABASE_URL` (PostgreSQL+pgvector dedicada), `REDIS_URL`, `JWT_SECRET` compartido, `SERVICIO_IA_URL` y `PORT`
    - _Requirements: 1.2, 25.1, 25.3, 25.8, 40.4, 40.5_
  - [x] 1.2 Configurar el entorno de pruebas (Jest + Supertest + fast-check)
    - Añadir Jest como runner, Supertest para HTTP y fast-check para PBT en `devDependencies`; scripts no interactivos `"test": "jest --runInBand"`, `"test:e2e": "jest --config ./test/jest-e2e.json --runInBand"`, `"test:pbt": "jest pbt --runInBand"`
    - _Requirements: 26.1, 26.2, 41.5_
  - [x] 1.3 Implementar `PrismaModule`/`PrismaService` (cliente propio → BD dedicada)
    - Proveer un `PrismaService` inyectable conectado al `DATABASE_URL` dedicado; exportarlo para los módulos de dominio; ningún import ni acceso a la BD del colegio
    - _Requirements: 25.1, 25.3_
  - [x] 1.4 Smoke test de bootstrap y aislamiento
    - Con Supertest verificar que `GET /api/gds/health` responde y que la app no importa símbolos del colegio ni del módulo IREC ni accede a su BD
    - _Requirements: 1.3, 1.4, 25.3_

- [x] 2. Base de datos PostgreSQL + pgvector + Redis y esquema Prisma ampliado
  - [x] 2.1 Habilitar `pgvector` en la BD dedicada y preparar Redis
    - Crear la migración que habilita la extensión `pgvector` (`CREATE EXTENSION IF NOT EXISTS vector`) en la BD dedicada; declarar la conexión Redis propia para BullMQ/caché vía `REDIS_URL`
    - _Requirements: 25.1, 36.1, 38.1_
  - [x] 2.2 Ampliar el esquema Prisma con las tablas vectoriales, históricas y de memoria
    - Añadir/confirmar en `prisma/schema.prisma`: **`gds_embedding`** (columna `vector` vía `Unsupported("vector")`/SQL nativo, `modelo`, `dim`, refs trazables), **`gds_tendencia_historica`**, **`gds_evento_historico`** (memoria histórica), **`gds_memoria_semestral`** y **`gds_calibracion`**, junto con todas las `gds_*` existentes (institucion, scenarios, analisis, comunidad_digital, ciclo_semanal, generacion, usuario_sintetico, historial_usuario, score_asociacion, resultado_analisis, dimension_riesgo, evidences, evidence_ref, explicacion, patron, reporte, log_generacion, memoria_semanal/mensual/trimestral/global, usuario_plataforma, rol_plataforma)
    - Definir FKs y cascada dentro del subgrafo de `gds_analisis`; FK **restrictiva** comunidad→institucion; índices únicos `(analisis_id, institucion_id)` y `(analisis_id, institucion_id, numero_semana)`; índice vectorial `ivfflat`/`hnsw` en `gds_embedding`
    - Generar la migración sobre la BD dedicada (sin tocar la BD del colegio)
    - _Requirements: 25.1, 25.2, 25.3, 9.2, 9.4, 28.9, 36.1, 36.5, 39.1, 39.3, 31.3_
  - [x] 2.3 Configurar el módulo de cola BullMQ/Redis
    - En `src/queue/` registrar la conexión BullMQ sobre Redis (cola, opciones de reintento/backoff) reutilizable por el `Scheduler`
    - _Requirements: 38.1, 38.4_
  - [x] 2.4 Pruebas de integridad referencial y cascada del esquema ampliado
    - Verificar ausencia de registros semanales/vectoriales huérfanos, cascada solo del subgrafo del análisis (incl. embeddings, memorias e histórico) y restricción de borrado de institución referenciada
    - _Requirements: 9.4, 25.2, 25.4, 25.7, 28.9, 36.5, 39.3_

- [x] 3. Reposicionar el dominio TS como fallback determinista e interfaces estables (reutilización)
  - [x] 3.1 Migrar `Contrato_Normalizado` + `Validador_Contrato` al módulo `simulation`
    - Mover el esquema `zod` versionado (`post`, `comments[]`, `image_description`, `hashtags[]`, `metadata.version`) y el validador (validar/serializar canónico/deserializar) reutilizando el código previo; exponer la frontera estable de la `Capa_Analisis`
    - _Requirements: 2.1, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 3.2 Migrar `Servicio_Anonimizacion` (SHA-256 + salt)
    - Reusar la implementación previa; seudónimos hex(64) consistentes por `(id, salt)` sobre `post`, `comments[]` y referencias
    - _Requirements: 23.1, 23.2, 23.4, 13.5_
  - [x] 3.3 Reposicionar `Filtro_Relevancia`, `Servicio_NLP` y `Servicio_Vision` deterministas como **providers fallback**
    - Registrar las implementaciones TS previas como providers inyectables (tokens DI) que satisfacen las interfaces estables; servirán de fallback y para pruebas deterministas
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 15.1, 15.2, 15.3, 15.4, 34.1, 34.2, 34.3, 34.6, 35.3_
  - [x] 3.4 Reposicionar `Capa_ML` base determinista como **fallback**
    - Registrar la `Capa_ML` TS previa (embeddings/clustering/anomalías/tendencias/score) como fallback inyectable tras la interfaz estable
    - _Requirements: 31.1, 31.6, 35.3_
  - [x] 3.5 Migrar `Sistema_Evidencias`, `Motor_Escenarios` y `Motor_Memoria_Contextual` base
    - Trasladar las implementaciones previas a sus módulos NestJS (`audit`, `analysis/escenarios`, `timeline`) manteniendo sus interfaces estables y conectándolas a `PrismaService`
    - _Requirements: 30.1, 30.2, 30.6, 29.1, 28.1, 28.8_
  - [x] 3.6 PBT round-trip del `Contrato_Normalizado`
    - **Property 1: Round-trip del Contrato Normalizado**
    - Generador `contratoNormalizadoArb` (casos límite no-ASCII/listas vacías) y verificar `deserializar(serializar(c)) ≡ c`
    - **Validates: Requirements 3.4, 3.2**
  - [x] 3.7 PBT rechazo de contratos no conformes con identificación de campo
    - **Property 3: Rechazo de contratos no conformes con identificación de campo**
    - Generador `contratoInvalidoArb`; verificar rechazo + campo no conforme + que no llega a la `Capa_Analisis` (incl. `ValidationPipe`)
    - **Validates: Requirements 2.5, 2.6, 3.3, 27.4, 40.5**
  - [x] 3.8 PBT consistencia del seudónimo de anonimización
    - **Property 4: Consistencia del seudónimo de anonimización**
    - Generadores `idSinteticoArb` y `saltArb`
    - **Validates: Requirements 23.4**
  - [x] 3.9 PBT irreversibilidad del seudónimo de anonimización
    - **Property 5: Irreversibilidad del seudónimo de anonimización**
    - **Validates: Requirements 23.2**
  - [x] 3.10 PBT reemplazo total de identificadores antes del análisis
    - **Property 6: Reemplazo total de identificadores antes del análisis**
    - **Validates: Requirements 23.1, 13.5**

- [ ] 4. Checkpoint — Migración NestJS, datos y dominio fallback
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Andamiaje del `ServicioIA/` (Python/FastAPI)
  - [x] 5.1 Crear el servicio FastAPI con carga de modelos y `/health`
    - Andamiar `ServicioIA/` (`requirements.txt` con fastapi/uvicorn/transformers/sentence-transformers/spacy/nltk/scikit-learn/torch/numpy/pandas/pgvector/psycopg/pydantic, `Dockerfile`, `.env` con `DATABASE_URL`/`MODEL_CACHE`/`DEVICE`); `app/main.py` (app FastAPI, registro de routers, `lifespan` que carga modelos una vez), `app/config.py` (settings/límite VRAM), `app/models/` (schemas pydantic), `app/routers/health.py` con `GET /health` (`{ status, modelos[], device }`)
    - _Requirements: 14.x, 35.5_
  - [x] 5.2 Configurar pytest (+ Hypothesis) con modelos pequeños/dobles
    - Configurar `pytest` y `Hypothesis`; usar modelos pequeños o dobles de test para mantener el coste bajo y la ejecución determinista
    - _Requirements: 26.1, 26.2, 41.5_
  - [x] 5.3 pytest del contrato `/health`
    - Verificar que `/health` reporta estado y modelos cargados
    - _Requirements: 35.5_

- [x] 6. Endpoints del `Servicio_IA` (cerebro analítico real)
  - [x] 6.1 `embedding_service` + `POST /embeddings` y acceso pgvector
    - Implementar embeddings con Sentence Transformers (`BAAI/bge-m3`, `BAAI/bge-large-en-v1.5`, `all-MiniLM-L6-v2`) y `repositories/pgvector_repo.py` para persistir/leer la `Memoria_Semantica`
    - _Requirements: 31.2, 36.1_
  - [x] 6.2 `POST /embeddings/search` (Embeddings_Search por similitud)
    - Recuperación por similitud vectorial sobre `pgvector`, ordenada por similitud, filtrada por `analisisId`/`comunidadId`, sin diagnóstico individual
    - _Requirements: 36.3, 36.6, 39.4_
  - [x] 6.3 `nlp_service` + `POST /nlp` (Transformers + spaCy + NLTK)
    - Análisis semántico, emocional, temático, NER, causas/eventos y conversacional sobre contenido anonimizado contributivo
    - _Requirements: 14.1, 14.2, 14.3, 14.4_
  - [x] 6.4 `vision_service` (Vision_Engine) + `POST /vision`
    - Derivar `{ scene, objects[], emotion_context }` de `image_description` (texto v1, sin plantillas vacías); arquitectura preparada para imágenes reales (LLaVA/Qwen2-VL/Florence-2/BLIP-2/EasyOCR)
    - _Requirements: 15.1, 37.2_
  - [x] 6.5 `clustering`/`anomaly`/`trend` services + `POST /clustering`, `/anomalias`, `/tendencias`
    - scikit-learn (KMeans/HDBSCAN, IsolationForest/zscore) y series temporales (NumPy/Pandas)
    - _Requirements: 31.2_
  - [x] 6.6 `scoring_service` + `POST /score-calibrado` y `calibration_service` + `POST /calibrar`
    - Scoring calibrado del `Indice_Riesgo` en `[0,1]` con evidencia; calibración con el `Corpus_Longitudinal` (CRISP-DM/MLOps) dentro del `Servicio_IA`, devolviendo `version` y `metricas`
    - _Requirements: 31.2, 31.3, 31.4, 31.7, 36.4_
  - [x] 6.7 `POST /relevancia` (Filtro_Relevancia primario)
    - Clasifica items en contributivo/no-contributivo con el mismo contrato que el fallback TS
    - _Requirements: 34.1, 34.6_
  - [x] 6.8 pytest del contrato de routers
    - Verificar forma de request/response de `/nlp`, `/clustering`, `/anomalias`, `/tendencias`, `/relevancia` con dobles de modelos
    - _Requirements: 14.1, 14.2, 31.2, 34.1_
  - [x] 6.9 PBT (pytest/Hypothesis) contrato estable del Vision_Engine
    - **Property 21: Contrato estable del Vision_Engine derivado de la descripción**
    - **Validates: Requirements 15.1, 15.3, 37.2, 37.4**
  - [x] 6.10 PBT (pytest/Hypothesis) score calibrado del índice dentro de rango
    - **Property 33: Score calibrado del Índice por la Capa_ML dentro de rango**
    - **Validates: Requirements 31.2, 31.7, 35.1**
  - [x] 6.11 PBT (pytest/Hypothesis) acumulación de la Memoria_Semantica y recuperación ordenada
    - **Property 42: Acumulación de la Memoria_Semantica y recuperación ordenada por similitud**
    - Verificar acumulación monotónica en `pgvector`, trazabilidad de cada vector y orden por similitud descendente
    - **Validates: Requirements 36.1, 36.2, 36.5, 36.6, 39.4**

- [ ] 7. Checkpoint — Servicio_IA operativo (endpoints + pytest)
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Capa de integración IA por HTTP + degradación segura (R35)
  - [x] 8.1 Implementar el cliente HTTP del `Servicio_IA`
    - `ai/servicio-ia.client.ts` (HttpModule/Axios) que implementa `Servicio_NLP`, `Servicio_Vision`, `Capa_ML` y `Filtro_Relevancia` consumiendo `/nlp`, `/vision`, `/embeddings`, `/clustering`, `/anomalias`, `/tendencias`, `/score-calibrado`, `/calibrar`, `/embeddings/search`, `/relevancia`
    - _Requirements: 14.5, 15.4, 31.6, 34.6_
  - [x] 8.2 Implementar la sonda de disponibilidad y el proxy de degradación
    - `SondaServicioIA.disponible()` (GET `/health`) y `ProxyDegradacion<T>` que delega en el **fallback determinista TS** ante fallo HTTP/indisponibilidad, sin bloquear el ciclo, registrando el incidente y exponiendo el estado `degradado`; al recuperarse, reanuda el consumo del `Servicio_IA` sin cambios de código
    - _Requirements: 35.3, 35.4, 35.5_
  - [x] 8.3 Resolver las implementaciones por DI según disponibilidad
    - Cada interfaz estable se inyecta como provider cuya implementación concreta (cliente HTTP o fallback TS) se resuelve por el proxy; el `Pipeline_Analisis` depende solo de las interfaces
    - _Requirements: 31.6, 35.4_
  - [x] 8.4 PBT desacople estable de subsistemas reemplazables y degradación segura
    - **Property 32: Desacople estable de subsistemas reemplazables y degradación segura**
    - Generador `implementacionSubsistemaArb` (≥2 dobles: cliente `Servicio_IA` simulado vs fallback TS) de `ServicioNLP`/`ServicioVision`/`CapaML`/`FiltroRelevancia`/`SistemaEvidencias`
    - **Validates: Requirements 30.2, 30.6, 31.6, 34.6, 35.2, 35.3, 35.4**
  - [x] 8.5 Pruebas de degradación (Supertest)
    - Con el `Servicio_IA` caído, verificar que el ciclo continúa con el fallback y se registra el incidente
    - _Requirements: 35.3_

- [x] 9. Bucle de aprendizaje (embeddings → pgvector, Embeddings_Search, calibración)
  - [x] 9.1 Implementar `MemoriaSemantica` (indexar en `gds_embedding`/pgvector)
    - `indexar(...)` genera embeddings vía `Servicio_IA` y los acumula en `pgvector` **sin borrar** previos, con refs trazables a semana/comunidad/institución/análisis
    - _Requirements: 36.1, 36.2, 36.5_
  - [x] 9.2 Implementar la recuperación de contexto por `Embeddings_Search`
    - `buscarSimilares(...)` alimenta el `contextoSemantico` del `ContextoGeneracion` que arma el `Motor_Memoria_Contextual`; si falla, degradar a la `Memoria_Jerarquica` registrando el incidente
    - _Requirements: 36.3, 28.5_
  - [x] 9.3 Añadir la etapa `EMBEDDINGS` al `Pipeline_Analisis`
    - Tras la explicación, calcular embeddings del contenido analizado y persistirlos transaccionalmente con el resultado de la semana
    - _Requirements: 36.1_
  - [x] 9.4 Integrar la calibración de la `Capa_ML` con el `Corpus_Longitudinal`
    - Invocar `POST /calibrar` al crecer el corpus, registrar `gds_calibracion` (`version`, `artefacto_ref`, `metricas`); conservar la última calibración válida ante fallo
    - _Requirements: 31.3, 31.4, 36.4_

- [ ] 10. Checkpoint — Integración IA y bucle de aprendizaje
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. `IDataProvider` (Gemini/Ollama) y `Modulo_Simulacion`
  - [x] 11.1 Definir la interfaz `IDataProvider`, `ContextoGeneracion` y `FabricaDataProvider`
    - Tipar `generar(ctx): Promise<ContratoNormalizado>`, `nombre`, `limiteTokens`; contemplar `MetaProvider`/`TwitterProvider`/`ScrapingProvider`/`HistoricalProvider`
    - _Requirements: 4.1, 4.2, 4.6_
  - [x] 11.2 Implementar `GeminiProvider` (Google Gemini API, por defecto en la nube)
    - Invocar Gemini, transformar a `Contrato_Normalizado` válido; proveedor por defecto si no se especifica
    - _Requirements: 4.2, 4.3, 4.4_
  - [x] 11.3 Implementar `OllamaProvider` (local, arquitectura preparada)
    - Alternativa local configurable detrás de la misma interfaz, sin tocar el pipeline
    - _Requirements: 4.2, 4.4_
  - [x] 11.4 Implementar el manejo de fallos del proveedor
    - Ante no-respuesta/error/datos malformados: normalización de respaldo o reintento y, si persiste, marcar la generación `FALLIDA`/reintentable sin corromper el historial; registrar en `gds_log_generacion`
    - _Requirements: 4.5, 4.7, 4.8, 27.1_
  - [x] 11.5 Implementar el `Modulo_Simulacion` y el diseño del prompt de generación realista
    - Orquestar `IDataProvider` + `Motor_Memoria_Contextual`; diseñar el prompt que produce publicaciones/comentarios/conversaciones atribuidas a `Usuario_Sintetico` persistentes, en **español andino (Bolivia/regional)**, coherente con el `Escenario`, con variedad (sarcasmo, ironía, positivo/negativo/neutral, conflictos, ruido), entregado como `Contrato_Normalizado` válido
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.6_
  - [x] 11.6 Implementar la reacción de los `Usuario_Sintetico` a eventos del `Escenario`
    - Ante un evento relevante, los usuarios afectados modifican su comportamiento de forma coherente con su perfil e historial, integrándose en el contexto de la siguiente generación
    - _Requirements: 10.4_
  - [x] 11.7 PBT validez estructural y versionado de la salida del proveedor
    - **Property 2: Validez estructural y versionado del contrato producido**
    - **Validates: Requirements 2.1, 3.5, 4.6**
  - [x] 11.8 Pruebas unitarias de fallos/reintentos del proveedor
    - Cubrir no-respuesta, error, datos malformables/no normalizables y registro de todos los fallos
    - _Requirements: 4.5, 4.7, 4.8, 27.1, 27.4_
  - [x] 11.9 Prueba determinista de la forma del contenido generado
    - Con proveedor doble/fixtures, verificar atribución a usuarios persistentes, variedad de categorías y coherencia con el `Contrato_Normalizado`
    - _Requirements: 6.1, 6.2, 6.4_

- [x] 12. `Pipeline_Analisis` en NestJS (orden de etapas y reanudación)
  - [x] 12.1 Definir `ORDEN_ETAPAS` y el framework con estado por etapa
    - Orden: limpieza → normalización → anonimización → `FILTRO_RELEVANCIA` → NLP → visión → temporal → patrones → índice → explicación → `EMBEDDINGS`; firma `procesar(contrato): Promise<ResultadoSemana>` sin parámetro de origen; persistir `etapas_completadas`
    - _Requirements: 2.2, 2.4, 13.1, 13.5_
  - [x] 12.2 Implementar las etapas y su integración con los servicios (IA/fallback)
    - Ejecutar etapas en orden; anonimización antes de todo; `Filtro_Relevancia` tras anonimización y antes de NLP; NLP/visión vía proxy IA→fallback; reanudación desde la etapa fallida sin repetir
    - _Requirements: 13.1, 13.4, 13.5, 34.4_
  - [x] 12.3 Implementar el `Motor_Temporal` (etapa `TEMPORAL`)
    - Correlacionar resultados por semanas/meses para detectar evolución por `Zona_Geografica`, aceptando cero relaciones; alimentar `Detector_Patrones` y `Motor_Explicativo`
    - _Requirements: 16.2, 16.3, 13.1, 33.3_
  - [x] 12.4 PBT orden de etapas con anonimización como precondición
    - **Property 7: Orden de etapas del pipeline con anonimización como precondición**
    - **Validates: Requirements 13.1, 13.5**
  - [x] 12.5 PBT clasificación, exclusión y conservación del filtro de relevancia en su posición
    - **Property 39: Clasificación, exclusión y conservación del filtro de relevancia en su posición del pipeline**
    - Generador `clasificacionRelevanciaArb`
    - **Validates: Requirements 34.1, 34.2, 34.3, 34.4**
  - [x] 12.6 Pruebas unitarias de NLP/Visión/Temporal integradas
    - Verificar la forma de las salidas y la integración tras las interfaces estables (sin red real)
    - _Requirements: 14.1, 14.2, 14.4, 14.5, 16.2_

- [x] 13. Índice de Riesgo, Motor Explicativo y Sistema de Evidencias
  - [ ] 13.1 Implementar el `Indice_Riesgo` multidimensional
    - Calcular cada dimensión por comunidad/semana dentro de su `[minimo, maximo]`; integrar `score_calibrado_ml` del `Servicio_IA`; exponer solo resultados colectivos; dimensiones configurables sin alterar las existentes
    - _Requirements: 17.1, 17.2, 17.4, 17.5, 17.6, 31.2_
  - [x] 13.2 Implementar el `Sistema_Evidencias` (módulo `audit`)
    - Almacenar/servir `Evidencia` por id trazable (`gds_evidences` + `gds_evidence_ref`); recorrido auditable conclusión → evidencia → dato original; contenido anonimizado y marca de `contributividad`
    - _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5, 34.5_
  - [x] 13.3 Implementar el `Motor_Explicativo`
    - Explicación NL (qué/por qué/cuándo empezó/cómo evolucionó) con evidencia cuantificable (conteos, variación %) por cada variación de dimensión; bloquear conclusiones sin evidencia referenciable
    - _Requirements: 16.4, 17.3, 20.1, 20.2, 20.3, 20.4_
  - [x] 13.4 PBT rango e independencia de las dimensiones del índice
    - **Property 16: Rango e independencia de las dimensiones del índice de riesgo**
    - Generadores `entradaIndiceArb` y `definicionDimensionArb`
    - **Validates: Requirements 17.1, 17.2, 17.5, 26.5**
  - [x] 13.5 PBT exposición exclusivamente colectiva
    - **Property 17: Exposición exclusivamente colectiva**
    - **Validates: Requirements 17.4, 17.6, 20.5**
  - [x] 13.6 PBT toda conclusión tiene explicación y evidencia cuantificable
    - **Property 18: Toda conclusión tiene explicación y evidencia cuantificable**
    - **Validates: Requirements 16.4, 17.3, 20.1, 20.2, 20.3, 20.4**
  - [x] 13.7 PBT toda conclusión referencia evidencia trazable, auditable y anonimizada
    - **Property 31: Toda conclusión referencia evidencia trazable, auditable y anonimizada**
    - Generador `conclusionConEvidenciaArb`
    - **Validates: Requirements 30.1, 30.3, 30.4, 30.5, 34.5**

- [x] 14. Score de Asociación, Usuarios sintéticos y anclaje geográfico
  - [x] 14.1 Implementar el `Score_Asociacion` recalculado por semana
    - Calcular en `[0,1]` considerando interacciones, frecuencia, temas, contexto, participación, recurrencia, ubicación e historial; recalcular al cerrar cada semana
    - _Requirements: 11.1, 11.2, 11.3, 11.5_
  - [x] 14.2 Implementar `Usuario_Sintetico` persistente con historial y reutilización
    - Perfil conductual, frecuencia, estilo, intereses, participación e historial; reutilizar (no regenerar) entre semanas; historial monotónico
    - _Requirements: 10.1, 10.2, 10.3, 10.5_
  - [x] 14.3 Implementar `Zona_Geografica` y el anclaje de patrones por zona
    - Derivar la zona (coordenadas de institución + radio del análisis), incluirla en el `ContextoGeneracion`; persistir cada patrón con su zona para trazabilidad y comparación
    - _Requirements: 33.1, 33.2, 33.3, 33.4, 33.5_
  - [x] 14.4 PBT score de asociación en rango válido y recalculado por semana
    - **Property 15: Score de asociación en rango válido y recalculado por semana**
    - **Validates: Requirements 11.1, 11.3, 11.5, 26.5**
  - [x] 14.5 PBT persistencia y reutilización de usuarios sintéticos
    - **Property 14: Persistencia y reutilización de usuarios sintéticos**
    - **Validates: Requirements 10.2, 10.3, 10.5**
  - [x] 14.6 PBT derivación y presencia de la zona geográfica
    - **Property 37: Derivación y presencia de la zona geográfica**
    - Generador `institucionZonaArb`
    - **Validates: Requirements 33.1, 33.2**
  - [x] 14.7 PBT trazabilidad de patrones a su zona geográfica
    - **Property 38: Trazabilidad de patrones a su zona geográfica**
    - **Validates: Requirements 33.4, 33.5**

- [ ] 15. Checkpoint — Pipeline y analítica sobre Servicio_IA + fallback
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Cola y motor de ciclos sobre BullMQ/Redis
  - [x] 16.1 Implementar `procesarSemana` único y transaccional
    - `procesarSemana(analisisId, institucionId, semanaN)`: genera → valida → analiza (pipeline) → aprende (perfiles, comunidad, memoria, índice, scores, patrones, embeddings) → almacena en transacción atómica; misma lógica reutilizada por todos los modos
    - _Requirements: 12.2, 12.3, 13.2, 13.3, 25.5_
  - [x] 16.2 Portar el procesamiento a la `Cola_Trabajos` BullMQ
    - Procesadores BullMQ que ejecutan `procesarSemana` con `jobId` determinista, bloqueo de concurrencia sobre `(A,I,N)`, idempotencia, reintentos acotados (backoff), aislamiento de fallos por institución y estado consultable {PENDIENTE, EN_PROCESO, COMPLETADO, FALLIDO}; relojes/IDs inyectables
    - _Requirements: 9.1, 9.5, 27.2, 27.3, 27.5, 38.1, 38.2, 38.3, 38.4, 38.5, 10.6_
  - [x] 16.3 Implementar `Programador_Temporal` y `Herramienta_Aceleracion`
    - Encolar `procesarSemana` por semanas pendientes en orden creciente (una semana / un mes / hasta el final), sin ruta alternativa por modo
    - _Requirements: 12.4, 12.5, 18.1, 18.2, 18.3_
  - [x] 16.4 PBT reanudación idempotente del pipeline y de la cola
    - **Property 8: Reanudación idempotente del pipeline y de la cola**
    - **Validates: Requirements 13.4, 27.2, 38.3**
  - [x] 16.5 PBT equivalencia entre salto temporal y procesamiento paso a paso
    - **Property 9: Equivalencia entre salto temporal y procesamiento paso a paso**
    - Generador `analisisDeterministaArb` (proveedor con semilla fija, `Servicio_IA`/fallback dobles)
    - **Validates: Requirements 18.1, 18.3, 18.4**
  - [x] 16.6 PBT secuencia de semanas estrictamente creciente y contigua
    - **Property 10: Secuencia de semanas estrictamente creciente y contigua**
    - **Validates: Requirements 12.2, 12.3, 12.4**
  - [x] 16.7 PBT interrupción reanudable conserva resultados
    - **Property 11: Interrupción reanudable conserva resultados**
    - **Validates: Requirements 18.5, 25.5**
  - [x] 16.8 PBT cardinalidad e integridad referencial por institución
    - **Property 12: Cardinalidad e integridad referencial por institución**
    - **Validates: Requirements 9.1, 9.2, 9.4**
  - [x] 16.9 PBT aislamiento de fallos entre instituciones
    - **Property 13: Aislamiento de fallos entre instituciones**
    - **Validates: Requirements 9.3, 9.5, 38.4**
  - [x] 16.10 PBT dominio consultable de estados de ciclo y de trabajo
    - **Property 26: Dominio consultable de estados de ciclo y de trabajo**
    - **Validates: Requirements 27.5, 38.5**

- [x] 17. Gestor de Ejecución (modos Manual / Automático / Tiempo Real)
  - [x] 17.1 Implementar `GestorEjecucion` con los tres modos y pausar/reanudar
    - Manual: avanzar exactamente la siguiente semana pendiente por solicitud; Automatico: reutiliza `Herramienta_Aceleracion`; Tiempo_Real: reutiliza `Programador_Temporal` con intervalo configurable y reloj inyectable; pausar/reanudar consistente; los tres usan `procesarSemana` (encolado en BullMQ); endpoints `PUT /analisis/:id/modo`, `POST /analisis/:id/avanzar|pausar|reanudar`
    - _Requirements: 32.1, 32.2, 32.3, 32.4, 32.5, 32.6, 32.7, 32.8_
  - [x] 17.2 PBT equivalencia de resultado entre los tres modos de ejecución
    - **Property 34: Equivalencia de resultado entre los tres modos de ejecución**
    - Generador `modoEjecucionArb` sobre `analisisDeterministaArb`
    - **Validates: Requirements 32.7, 32.3, 31.4**
  - [x] 17.3 PBT el modo manual avanza exactamente una semana pendiente
    - **Property 35: El modo manual avanza exactamente una semana pendiente**
    - **Validates: Requirements 32.2**
  - [x] 17.4 PBT pausa y reanudación conservan estado consistente
    - **Property 36: Pausa y reanudación conservan estado consistente**
    - **Validates: Requirements 32.6, 32.8**

- [ ] 18. Checkpoint — Motor de ciclos (BullMQ) y modos de ejecución
  - Ensure all tests pass, ask the user if questions arise.

- [x] 19. Authentication (NestJS + Passport) y roles GDS
  - [x] 19.1 Implementar `JwtAuthGuard` + `RolesGuard` + `ServicioAutenticacion` fail-closed
    - Validar el JWT del colegio con el `JWT_SECRET` compartido (Passport JWT strategy); resolver roles GDS (`ADMIN_PLATAFORMA`/`ANALISTA`/`OBSERVADOR`) en la **BD propia** (`gds_usuario_plataforma`/`gds_rol_plataforma`); decorador `@Roles(...)`; fail-closed con backoff acotado (sin acceso degradado); proteger todas las rutas `/api/gds/*` y el handshake WS
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7, 24.8, 40.6_
  - [x] 19.2 PBT autorización por rol de la plataforma
    - **Property 22: Autorización por rol de la plataforma**
    - Generador `rolOperacionArb`
    - **Validates: Requirements 24.3, 24.4, 24.6, 40.6**
  - [x] 19.3 PBT denegación segura ante fallo técnico (fail-closed)
    - **Property 23: Denegación segura ante fallo técnico de validación del token (fail-closed)**
    - **Validates: Requirements 24.7, 24.8**

- [x] 20. Institutions module (CRUD + geolocalización)
  - [x] 20.1 Implementar el controlador/servicio de `Institutions`
    - CRUD con DTOs class-validator (nombre, categoría {universidad, colegio, instituto, escuela}, lat/lng, radio, logo, descripción); registrar cambios para auditoría; rechazo atómico de borrado si está referenciada con mensaje de dependencia; Swagger
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8, 40.4_
  - [x] 20.2 PBT restricción de borrado de instituciones con dependencias
    - **Property 25: Restricción de borrado de instituciones con dependencias**
    - **Validates: Requirements 7.6, 7.8**
  - [x] 20.3 Pruebas unitarias de CRUD y geolocalización
    - Cubrir alta/edición, categorías válidas, almacenamiento de coordenadas/radio y referencia de logo
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 21. Analysis module y Motor de Escenarios
  - [x] 21.1 Implementar el controlador/servicio de `Analysis`
    - Crear análisis (nombre, ≥1 institución, radio, escenario biblioteca/personalizado, semanas ≤24); fijar escenario inmutable + `(escenario_id, escenario_version)`; disparar la semana 1 por institución vía `Cola_Trabajos`; borrado en cascada transaccional aislado por análisis; Swagger
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 8.6, 25.4, 25.6, 25.7, 29.4, 29.6_
  - [x] 21.2 Implementar el `Motor_Escenarios` y la `Biblioteca_Escenarios`
    - CRUD versionado, predefinidos sembrados ("Guerra del Gas", "Conflicto Universitario", "Crisis Política", "Pandemia", "Problemas de Transporte", "Elecciones"); editar genera nueva versión sin mutar previas; copia inmutable al fijar en el análisis
    - _Requirements: 29.1, 29.2, 29.3, 29.5, 29.6, 29.7_
  - [x] 21.3 PBT borrado en cascada consistente y aislado por análisis
    - **Property 24: Borrado en cascada consistente y aislado por análisis**
    - **Validates: Requirements 25.4, 25.6, 25.7**
  - [x] 21.4 PBT inmutabilidad del escenario copiado al crear el análisis
    - **Property 30: Inmutabilidad del escenario copiado al crear el análisis**
    - **Validates: Requirements 29.4, 29.5, 29.6**
  - [x] 21.5 PBT inmutabilidad del escenario copiado desde la biblioteca (versionado)
    - **Property 41: Inmutabilidad del escenario copiado desde la biblioteca al crear el análisis**
    - Generadores `escenarioBibliotecaArb` y `secuenciaEdicionesArb`
    - **Validates: Requirements 29.4, 29.5**
  - [x] 21.6 Pruebas unitarias de creación y validación del análisis
    - Cubrir rechazo de creación sin institución y selección de escenario predefinido/personalizado
    - _Requirements: 8.2, 8.3, 8.4_

- [x] 22. Motor de Memoria Contextual (jerarquía de 5 niveles) y memoria histórica
  - [x] 22.1 Implementar la consolidación jerárquica acumulativa con escenario preservado
    - Generar `Memoria_Semanal` al cerrar semana; consolidar mensual→trimestral→semestral→global a partir de los niveles inferiores cerrados; preservar el `Escenario` original en todos los niveles; conservar el historial completo
    - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.7, 28.8_
  - [x] 22.2 Implementar `construirContexto` bajo umbral + Embeddings_Search + memoria histórica
    - Construir el `ContextoGeneracion` desde la `Memoria_Jerarquica` (no semanas crudas) + contexto semántico (`Embeddings_Search`); recortar de menor a mayor agregación si excede `limiteTokens`; registrar `gds_tendencia_historica`/`gds_evento_historico` recuperables relacional y vectorialmente
    - _Requirements: 5.1, 5.2, 28.5, 28.6, 36.3, 39.1, 39.2, 39.3_
  - [x] 22.3 PBT contexto longitudinal con escenario inmutable
    - **Property 19: Contexto longitudinal con escenario inmutable**
    - **Validates: Requirements 5.1, 5.3, 8.6, 36.3**
  - [x] 22.4 PBT compactación bajo umbral conservando el historial completo
    - **Property 20: Compactación bajo umbral conservando el historial completo**
    - Generadores `historialArb` y `umbralTokensArb`
    - **Validates: Requirements 5.2, 5.4**
  - [x] 22.5 PBT consolidación monotónica acumulativa con escenario preservado
    - **Property 27: Consolidación monotónica acumulativa de la memoria con escenario preservado**
    - Generador `memoriaJerarquicaArb`
    - **Validates: Requirements 28.1, 28.2, 28.3, 28.4, 28.7**
  - [x] 22.6 PBT construcción del contexto desde la memoria jerárquica bajo umbral
    - **Property 28: Construcción del contexto desde la memoria jerárquica bajo umbral de tokens**
    - **Validates: Requirements 28.5, 28.6, 28.8**
  - [x] 22.7 PBT construcción del contexto de cinco niveles + memoria semántica sin crudas
    - **Property 40: Construcción del contexto desde la memoria de cinco niveles + memoria semántica sin publicaciones crudas completas**
    - Generador `memoriaSemanticaArb`
    - **Validates: Requirements 28.5, 28.6, 28.8, 36.3**
  - [x] 22.8 PBT integridad referencial de la memoria jerárquica, histórica y semántica
    - **Property 29: Integridad referencial de la memoria jerárquica y de la memoria histórica**
    - **Validates: Requirements 28.9, 36.5, 39.3**

- [x] 23. Generador de Reportes (múltiples horizontes y exportación)
  - [x] 23.1 Implementar el `Generador_Reportes`
    - Reportes semanal/mensual/trimestral/semestral/final desde los resultados acumulados (explicaciones, evidencias, indicadores, cambios, tendencias, detonantes, conclusiones, recomendaciones) con Handlebars
    - _Requirements: 19.1, 19.2, 19.3, 19.4_
  - [x] 23.2 Implementar la exportación descargable (PDF/Excel)
    - Generar formatos con PDFKit/Puppeteer (PDF) y ExcelJS (hojas), conservando explicaciones y evidencias anonimizadas
    - _Requirements: 19.5_
  - [x] 23.3 Pruebas unitarias de generación por horizonte y exportación
    - Verificar cada horizonte y que la exportación conserva explicaciones/evidencias
    - _Requirements: 19.1, 19.2, 19.5_

- [x] 24. Hub de progreso por WebSockets
  - [x] 24.1 Implementar el WS Hub de progreso (handshake con JWT)
    - Validar el JWT en el handshake; emitir progreso de ciclos/saltos/modos (semanas procesadas/pendientes, estado de ejecución/pausa) solo de los análisis autorizados
    - _Requirements: 18.6, 21.4_
  - [x] 24.2 Pruebas unitarias del WS Hub
    - Cubrir handshake/autorización y emisión de eventos de progreso
    - _Requirements: 18.6, 21.4_

- [ ] 25. Checkpoint — API GDS completa (NestJS + Swagger)
  - Ensure all tests pass, ask the user if questions arise.

- [x] 26. Frontend `ClienteCDPLPL` (migración a TypeScript + Shadcn/UI + TanStack Query + Zustand + Framer Motion)
  - [x] 26.1 Migrar la feature `gds` a TypeScript y configurar el stack de UI/datos
    - Migrar/alinear `src/features/gds` a **TypeScript**; integrar **Shadcn/UI** (sobre Tailwind), **TanStack Query** (caché/fetch), **Zustand** (estado UI), **Framer Motion**; cliente **Axios** con `VITE_GDS_API_URL`; configurar **Vitest** + `@testing-library/react` y **Playwright** (no interactivos)
    - _Requirements: 26.1, 26.2_
  - [x] 26.2 Implementar `GdsLayout`, rutas `/gds` y guard de autenticación (excluir IREC)
    - Layout propio (estética enterprise) distinto del `DashboardLayout`; rutas bajo `/gds` con React Router; guard que redirige a login si no autenticado y bloquea no autorizados; sin dependencias del módulo IREC
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x] 26.3 Implementar la pantalla principal (Recharts, slider, estados, progreso WS)
    - Indicadores globales con Recharts, históricos, resumen de análisis, estados de ejecución; slider de instituciones; progreso en vivo por WebSockets; transiciones con Framer Motion; bloqueo si no autorizado
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6_
  - [x] 26.4 Implementar la gestión de instituciones con mapa (Leaflet + radio)
    - Selección de ubicación sobre mapa interactivo y visualización del radio (= `Zona_Geografica`); CRUD conectado al backend vía `VITE_GDS_API_URL`
    - _Requirements: 7.7_
  - [x] 26.5 Implementar la creación de análisis (multi-institución, escenario biblioteca/personalizado)
    - Formulario RHF + Zod con selección múltiple de instituciones, radio, escenario predefinido/personalizado y configuración temporal
    - _Requirements: 8.1, 8.2, 8.3, 29.2_
  - [x] 26.6 Implementar el control de modos de ejecución
    - Selector Automatico/Manual/Tiempo_Real, configuración de intervalo, avanzar manual, pausar/reanudar, reflejados por WebSockets
    - _Requirements: 32.1, 32.6_
  - [x] 26.7 Implementar la vista de trazabilidad (evidencias, explicaciones, comparación por zona)
    - Navegar semanas/meses/resultados/evidencias/indicadores/explicaciones; evolución por dimensión; comparación entre instituciones/zonas; vista parcial si falta evidencia
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 23.5_
  - [x] 26.8 Implementar la vista de reportes y exportación
    - Listar reportes por horizonte y disparar la exportación descargable
    - _Requirements: 19.5_
  - [x] 26.9 Implementar el cliente WebSocket de progreso
    - Suscripción al hub para reflejar avance de ciclos/saltos/modos en tiempo real
    - _Requirements: 18.6, 21.4_
  - [x] 26.10 Implementar el punto de acceso desde el dashboard del colegio y retirar IREC
    - Añadir la entrada de navegación a `/gds` desde el `Sidebar`/`DashboardLayout` del colegio (monta el `GdsLayout` propio); eliminar de forma segura la entrada y la ruta del módulo IREC anterior del dashboard del colegio
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 26.11 Pruebas de componentes y guards (Vitest)
    - Verificar layout propio, redirección/bloqueo del guard, exclusión de IREC, render de indicadores/estados, mapa+radio, formularios, selector de modos y trazabilidad (incl. vista parcial)
    - _Requirements: 1.1, 1.4, 1.5, 7.7, 8.4, 21.1, 21.6, 22.3, 22.6, 32.1_
  - [x] 26.12 Pruebas E2E (Playwright)
    - Flujos: login/fail-closed, creación de análisis, avance de modo y progreso por WS, trazabilidad y comparación por zona, exportación de reportes
    - _Requirements: 1.5, 8.1, 32.1, 22.4, 19.5_

- [x] 27. Observabilidad y DevOps (contenerización y CI)
  - [x] 27.1 Integrar observabilidad (Winston/Pino + Sentry)
    - Logging estructurado y captura de errores en `ServidorGDS` (Winston/Pino + Sentry) y en `Servicio_IA` (logging + Sentry)
    - _Requirements: 41.1, 41.2_
  - [x] 27.2 Crear Dockerfiles y Docker Compose de los tres servicios + datos
    - `Dockerfile` para `ClienteCDPLPL`, `ServidorGDS` y `ServicioIA`; `docker-compose.yml` que levanta los tres servicios + PostgreSQL/pgvector + Redis (red interna; `Servicio_IA` no expuesto públicamente)
    - _Requirements: 41.3, 41.4_
  - [x] 27.3 Configurar el pipeline de CI (GitHub Actions)
    - Ejecutar la suite como evidencia técnica: Jest/Supertest (backend), Vitest/Playwright (frontend), pytest (Servicio_IA); un incremento se considera completo solo si su suite pasa
    - _Requirements: 26.1, 26.2, 41.5_
  - [x] 27.4 Pruebas estructurales (SMOKE)
    - Verificar aislamiento por BD dedicada, `pgvector` habilitado, ausencia de dependencias IREC, separación de roles GDS y que Docker Compose levanta los tres servicios + PostgreSQL/pgvector + Redis
    - _Requirements: 41.3, 41.4_

- [x] 28. Integración end-to-end del ciclo completo (tres componentes)
  - [x] 28.1 Cablear el ciclo completo end-to-end
    - Conectar crear análisis → `procesarSemana` (BullMQ) → `IDataProvider` → pipeline (anonimización → filtro → NLP → visión → temporal → patrones → índice → explicación → embeddings) → `Servicio_IA` con fallback → `pgvector` (`Memoria_Semantica`) → reportes → progreso WS, sin código huérfano
    - _Requirements: 12.3, 13.1, 13.2, 13.3, 18.4, 33.2, 36.1_
  - [x] 28.2 Prueba de integración determinista del ciclo completo
    - Ejecutar el ciclo de extremo a extremo con dobles deterministas (proveedor con semilla, `Servicio_IA`/fallback dobles, BullMQ inmediato/in-memory) y verificar resultados/indicadores/evidencias/embeddings/reporte reproducibles (sin red ni esperas reales)
    - _Requirements: 26.1, 26.2, 26.4, 12.5_

- [ ] 29. Checkpoint final — Suite completa verde (Jest/Supertest/Vitest/Playwright/pytest)
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- **Tres componentes:** `ClienteCDPLPL/` (React+TS), `ServidorGDS/` (NestJS) y `ServicioIA/` (Python/FastAPI) se construyen y prueban de forma independiente y se integran por HTTP + WebSockets.
- **Reutilización, no descarte:** el dominio Express/TS previo y sus PBT se migran a NestJS y se reposicionan como **fallback determinista TS**; la feature React `gds` se migra a TypeScript + Shadcn/UI.
- **Bucle de aprendizaje:** embeddings → `pgvector` (`Memoria_Semantica`), `Embeddings_Search` para el contexto de generación y calibración de la `Capa_ML` con el `Corpus_Longitudinal` (Tareas 9, 22).
- **Degradación segura (R35):** el proxy de degradación consume el `Servicio_IA` y cae al fallback TS cuando `/health` está caído, sin bloquear el ciclo (Tarea 8).
- **PBT (42 propiedades):** cada Correctness Property se implementa **una sola vez**. Lado backend con **fast-check** (≥100 iteraciones); Properties 21, 33 y 42 con **pytest/Hypothesis** en `ServicioIA/`. Cada prueba lleva el comentario `Feature: analisis-tendencias-riesgo-emocional, Property N: ...`.
- **Properties obligatorias del Req. 26.3:** 1 (3.6), 4 (3.8), 5 (3.9) y 9 (16.5); más la 34 (17.2) por equivalencia entre modos.
- **Cobertura de propiedades por tarea:** T3 → 1,3,4,5,6; T6 → 21,33,42; T8 → 32; T11 → 2; T12 → 7,39; T13 → 16,17,18,31; T14 → 15,14,37,38; T16 → 8,9,10,11,12,13,26; T17 → 34,35,36; T19 → 22,23; T20 → 25; T21 → 24,30,41; T22 → 19,20,27,28,29,40.
- **Ejecución no interactiva:** `jest --runInBand`, `vitest run`, `playwright test`, `pytest`; nunca watch ni servidores de larga ejecución. El motor de ciclos y la equivalencia se prueban con dobles deterministas y BullMQ en modo inmediato/in-memory.
- **Aislamiento de datos:** el `ServidorGDS` usa su propia BD PostgreSQL+pgvector dedicada y su Redis; nunca accede ni modifica la BD del colegio.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "5.1", "5.2", "26.1"] },
    { "id": 1, "tasks": ["1.4", "2.1", "2.2", "2.3", "5.3", "26.2"] },
    { "id": 2, "tasks": ["2.4", "3.1", "3.2", "3.3", "3.4", "3.5", "6.1", "6.3", "6.4", "6.7"] },
    { "id": 3, "tasks": ["3.6", "3.7", "3.8", "3.9", "3.10", "6.2", "6.5", "6.6", "6.8"] },
    { "id": 4, "tasks": ["6.9", "6.10", "6.11", "8.1", "8.2", "8.3", "11.1", "11.2", "11.3"] },
    { "id": 5, "tasks": ["8.4", "8.5", "9.1", "9.2", "9.3", "9.4", "11.4", "11.5", "11.6"] },
    { "id": 6, "tasks": ["11.7", "11.8", "11.9", "12.1", "12.2", "12.3", "13.1", "13.2", "13.3", "14.1", "14.2", "14.3"] },
    { "id": 7, "tasks": ["12.4", "12.5", "12.6", "13.4", "13.5", "13.6", "13.7", "14.4", "14.5", "14.6", "14.7", "21.2"] },
    { "id": 8, "tasks": ["16.1", "16.2", "16.3", "22.1", "22.2"] },
    { "id": 9, "tasks": ["16.4", "16.5", "16.6", "16.7", "16.8", "16.9", "16.10", "17.1", "21.1", "19.1", "20.1", "22.3", "22.4", "22.5", "22.6", "22.7", "22.8"] },
    { "id": 10, "tasks": ["17.2", "17.3", "17.4", "19.2", "19.3", "20.2", "20.3", "21.3", "21.4", "21.5", "21.6", "23.1", "24.1"] },
    { "id": 11, "tasks": ["23.2", "23.3", "24.2", "26.3", "26.4", "26.5", "26.6", "26.7", "26.8", "26.9", "26.10"] },
    { "id": 12, "tasks": ["26.11", "26.12", "27.1", "27.2", "27.3", "27.4"] },
    { "id": 13, "tasks": ["28.1"] },
    { "id": 14, "tasks": ["28.2"] }
  ]
}
```
