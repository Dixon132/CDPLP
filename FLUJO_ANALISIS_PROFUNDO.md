# Flujo de Ejecución Profundo: Desde la Petición GDS hasta la IA y Retorno

Este documento describe con máximo rigor técnico el ciclo de vida completo de una petición de análisis en la plataforma, abarcando desde la capa de red del **ServidorGDS** (NestJS), pasando por los sistemas de encolado asíncrono (BullMQ), el pipeline de procesamiento de datos, hasta la delegación matemática en el **ServicioIA** (FastAPI) y la persistencia final en PostgreSQL/pgvector.

---

## 1. Entrada HTTP y Validación (`ServidorGDS`)

El proceso comienza cuando el cliente (dashboard web) solicita la creación de un nuevo estudio longitudinal (Análisis).

1. **Endpoint HTTP**: Se realiza un `POST /api/gds/analisis`.
2. **Capa del Controlador (`AnalysisController`)**:
   - El request es interceptado.
   - Se utiliza el `ValidationPipe` global de NestJS junto con `class-validator` para asegurar que el payload (mapeado al objeto `CrearAnalisisDto`) es estricto. Si faltan datos o tienen el tipo incorrecto, se rechaza inmediatamente con un `HTTP 400 Bad Request`.
3. **Paso al Servicio**: El controlador delega la lógica de negocio a `AnalysisService.crear(dto)`.

---

## 2. Lógica de Dominio y Persistencia Transaccional (`ServidorGDS`)

En el `AnalysisService`, ocurren los preparativos estructurales antes de cualquier procesamiento asíncrono:

1. **Verificación de Integridad**: Se constata contra la base de datos (vía Prisma) que todas las `Instituciones` solicitadas realmente existen.
2. **Inmutabilidad del Escenario**: Se invoca al `Motor_Escenarios` para fijar una copia exacta del escenario en ese instante temporal (`fijarParaAnalisis`). Esto garantiza que, si las reglas cambian en el futuro, este análisis preserve las reglas con las que fue concebido.
3. **Persistencia (Prisma)**: Dentro de una transacción atómica de base de datos, se crea el registro `Analisis` y sus tablas relacionales asociadas (las `Comunidades_Digitales` por institución).

---

## 3. Disparo Asíncrono y Gestión de Colas (BullMQ)

Dado que un análisis abarca 24 semanas y un gran volumen de datos, la petición HTTP original no puede bloquearse esperando que todo termine. Aquí se orquesta el desacoplamiento:

1. **El Disparador (`DisparadorCicloInicialCola`)**:
   - El servicio de análisis invoca este adaptador, cuya única responsabilidad es avisarle al sistema de background que debe arrancar la máquina.
2. **Encolado Idempotente (`ColaProcesarSemanaService`)**:
   - Se genera un identificador de trabajo determinista (Job ID). Por ejemplo, basado en `(analisisId, institucionId, numeroSemana: 1)`. Esto es crítico: garantiza que si hay un error de red o un reintento manual, BullMQ no creará un trabajo duplicado en la base de datos de Redis.
   - El trabajo entra en la cola `COLA_PROCESAR_SEMANA` con una política acotada de reintentos y un *backoff exponencial* (si falla, espera un poco más cada vez antes de reintentar).
3. **Respuesta al Cliente**: El ServidorGDS retorna un `201 Created` al usuario. Para el cliente, la petición ha terminado.

---

## 4. El Worker y el Orquestador del Pipeline (`ServidorGDS`)

Un proceso *worker* (trabajador) del ServidorGDS que está suscrito a Redis detecta el nuevo trabajo en la cola y lo toma. Comienza el "Ciclo".

1. **Instanciación del Pipeline**: Se crea el `OrquestadorPipeline` inyectándole configuraciones y adaptadores (`ManejadoresEtapa`).
2. **Fase de Limpieza**: Se ejecutan expresiones regulares pesadas (Regex) sobre todos los textos (posts, comentarios) del lote:
   - Se eliminan caracteres de control (`\u0000-\u001F`).
   - Se quitan espacios de anchura cero / BOM.
   - Se colapsan espacios y saltos de línea repetidos.
3. **Fase de Normalización**: Se convierten todos los textos a su composición canónica Unicode (NFC) y se estandarizan los hashtags (minúsculas y un solo símbolo `#`).
4. **Fase de Anonimización**: Se invoca al `Servicio_Anonimizacion`, el cual itera sobre los contratos y reemplaza todos los IDs de usuario (`autorId`, `enRespuestaA`) con un *hash* criptográfico (un seudónimo determinista apoyado por un salt específico del análisis). Esto garantiza el cumplimiento de privacidad antes de enviar datos fuera del módulo.

---

## 5. Delegación a la Inteligencia Artificial (Red Interna GDS ➔ IA)

Una vez que el contrato está limpio y anonimizado, el pipeline del ServidorGDS inicia las **Etapas de Análisis**, actuando como un cliente HTTP frente al **ServicioIA**. Todo esto se maneja mediante el `AiModule` y sus `ProxyAdapters`.

El ServidorGDS ejecuta múltiples llamadas HTTP (usualmente mediante Axios o el HttpService nativo) hacia el microservicio en Python. El proxy maneja circuitos de *fallback* (degradación) si la IA principal falla.

### Las Peticiones desde el Pipeline:
1. **Etapa Filtro Relevancia**: `POST http://<servicio-ia>/relevancia`
   - El GDS manda el lote de textos limpios. La IA devuelve cuáles son "ruido" y cuáles son contributivos.
2. **Etapa NLP (Lenguaje Natural)**: `POST http://<servicio-ia>/nlp`
   - Tomando **solo** los textos contributivos, el GDS pide a la IA evaluar el sentimiento, detectar entidades nombradas y calcular métricas semánticas.
3. **Etapa Visión**: `POST http://<servicio-ia>/vision`
   - Se evalúan las descripciones de las imágenes para extraer temáticas o marcas.
4. **Etapa Final: Embeddings**: `POST http://<servicio-ia>/embeddings`
   - Se vectoriza matemáticamente cada frase para búsquedas de similitud (Memoria Semántica).

---

## 6. Procesamiento Matemático (`ServicioIA` - Python/FastAPI)

En las entrañas del ServicioIA, la petición es procesada con alto rendimiento:

1. **Router y Pydantic**: El enrutador (e.g. `routers/nlp.py`) recibe el JSON. Pydantic (`models.py`) valida de forma ultrarrápida la estructura del payload (ej. `EmbeddingsRequest`).
2. **Inyección de Dependencias**: FastAPI usa `Depends()` para recuperar la instancia del servicio requerido (ej. `EmbeddingService`). 
   - *Detalle clave:* Para no saturar la RAM ni perder tiempo, los modelos neuronales pesados (como *SentenceTransformers* o modelos de SpaCy) se cargan **una sola vez** al arrancar la aplicación usando eventos *lifespan* (`app.state.model_registry`) y se re-usan en cada petición en memoria.
3. **Cálculo Tensor**: Los strings se convierten en tensores, pasan por las capas ocultas de la red neuronal y se extraen las predicciones o los vectores de alta dimensionalidad.
4. **Retorno**: El router empaqueta esos vectores o predicciones en los modelos de respuesta (`EmbeddingsResponse`) y los envía como JSON de vuelta al ServidorGDS.

---

## 7. Persistencia y Continuación del Ciclo (`ServidorGDS`)

El trabajador del GDS recibe los resultados de las llamadas a la API de IA.

1. **Acumulación**: El `OrquestadorPipeline` junta todos los resultados en memoria (`ResultadosAnalisis`).
2. **Vectorización y Memoria Semántica**: Durante la etapa final (`EMBEDDINGS`), los vectores recibidos de la IA son almacenados inmediatamente en la tabla habilitada con `pgvector`.
3. **Commit de Transacción (Prisma)**: Una vez que el pipeline finaliza todas sus etapas exitosamente, el GDS toma todos los datos acumulados (sentimientos, frecuencias, métricas) y efectúa actualizaciones (`INSERT` y `UPDATE`) en la base de datos relacional.
4. **WebSockets (Notificación)**: El `WsModule` detecta que la semana fue completada y emite un evento por WebSocket al frontend para actualizar la barra de progreso del cliente en tiempo real.
5. **Recursividad Asíncrona (Siguiente Semana)**: El *worker*, al culminar de guardar la Semana 1, invoca nuevamente al sistema de colas solicitando encolar la **Semana 2** `(analisisId, institucionId, numeroSemana: 2)`. El *Job* actual termina, liberando el worker, y pronto otro worker (o el mismo) tomará el Job de la Semana 2.

Este ciclo iterativo y desacoplado garantiza resistencia ante fallas, control concurrente y la capacidad de procesar enormes cargas de trabajo longitudinal sin que la API principal o la experiencia de usuario se deterioren.
