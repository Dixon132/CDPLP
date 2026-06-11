# Informe Técnico — Plataforma GDS / CDPLP (Sistema IREC)

> **Índice de Riesgo Emocional Comunitario**  
> Sistema web inteligente de detección de tendencias digitales de riesgo emocional en comunidades educativas mediante Inteligencia Artificial.

---

## 1. Introducción y propósito del sistema

### 1.1 ¿Qué es CDPLP / IREC?

CDPLP (o **Plataforma_GDS**) es un **monorepo** que implementa el sistema **IREC** (Índice de Riesgo Emocional Comunitario): una plataforma web impulsada por inteligencia artificial que analiza contenido digital público (redes sociales) de comunidades educativas para detectar **tendencias colectivas** de malestar emocional.

> El sistema **no** diagnostica personas ni las identifica. Trabaja sobre datos agregados de comunidades completas para generar un indicador preventivo institucional.

### 1.2 Problema que resuelve

Las instituciones educativas carecen de herramientas sistemáticas, éticas y no invasivas para detectar malestar emocional estudiantil **antes** de que se convierta en crisis. Los mecanismos actuales (encuestas, reportes individuales) son:

- **Reactivos**: detectan el problema cuando ya está instalado.
- **De alcance limitado**: no capturan la expresión espontánea en redes sociales.
- **Estigmatizantes**: pueden exponer a estudiantes individuales.

IREC propone un paradigma nuevo: análisis **agregado y comunitario** de señales digitales públicas, sin jamás identificar a ningún individuo.

### 1.3 Objetivos clave

| # | Objetivo |
|---|---|
| 1 | Diseñar una arquitectura de IA por capas (NLP + visión + embeddings + análisis temporal) |
| 2 | Implementar modelos de Deep Learning para detección de emociones, temas y riesgo |
| 3 | Construir el Índice IREC (0–100) como indicador compuesto interpretable |
| 4 | Generar datasets sintéticos éticos usando LLM local (Ollama) para plataformas restringidas |
| 5 | Exponer resultados mediante API REST para dashboards institucionales |

---

## 2. Arquitectura general del sistema

El proyecto está estructurado como un **monorepo de cuatro componentes** que se comunican entre sí y se orquestan con Docker Compose:

```
┌─────────────────────────────────────────────────────────────────┐
│                     FUENTES DIGITALES                           │
│    Reddit • YouTube • Instagram* • TikTok* • Facebook*          │
│                      (* sintéticos inicialmente)                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
               ┌───────────▼───────────┐
               │  ClienteCDPLPL        │  ← Puerto 5173 (dev) / 8080 (prod)
               │  React 19 + Vite      │     Dashboard institucional
               │  TypeScript + MUI     │     Nginx en producción
               └───────────┬───────────┘
                           │ HTTP REST + WebSockets
               ┌───────────▼───────────┐
               │  ServidorGDS          │  ← Puerto 4100
               │  NestJS 10 +          │     Orquestador central
               │  BullMQ + WebSockets  │     Gestiona análisis,
               │  Prisma + pgvector    │     colas, ciclos semanales
               └───────────┬───────────┘
                           │ HTTP interno (Axios)
               ┌───────────▼───────────┐
               │  ServicioIA           │  ← Puerto 8000 (INTERNO)
               │  Python 3.11+         │     "Cerebro analítico"
               │  FastAPI + PyTorch    │     NLP, visión, embeddings,
               │  Transformers + spaCy │     scoring IREC
               └───────────┬───────────┘
                           │ PostgreSQL + pgvector
               ┌───────────▼───────────┐
               │  BD Dedicada GDS      │
               │  PostgreSQL 16        │
               │  + extensión pgvector │
               └───────────────────────┘

               [Aparte]
               ┌───────────────────────┐
               │  Servidor (colegio)   │  ← Puerto 3000
               │  Node + Express 5     │     API REST tradicional
               │  Prisma + BD propia   │     Gestión académica general
               └───────────────────────┘
```

> **Nota de aislamiento**: `ServidorGDS` y `Servidor` usan **bases de datos completamente separadas**. El `ServicioIA` nunca se expone públicamente; solo es accesible dentro de la red interna Docker.

---

## 3. Componentes técnicos detallados

### 3.1 ClienteCDPLPL — Frontend web

| Atributo | Valor |
|---|---|
| Framework | React 19 |
| Build tool | Vite |
| Lenguaje | TypeScript |
| UI | Material-UI (MUI) + componentes propios |
| Testing | Vitest (unitarios) + Playwright (E2E) |
| Despliegue prod | Nginx (sirve archivos estáticos + reverse proxy) |
| Puerto dev | 5173 |
| Puerto prod | 8080 |

**¿Por qué Vite + React?** Vite ofrece HMR (Hot Module Replacement) extremadamente rápido en desarrollo y un build de producción optimizado. React 19 es el estándar de facto para SPA complejas con estado reactivo.

**Variables de entorno clave:**
- `VITE_API_URL` → URL del Servidor del colegio
- `VITE_GDS_API_URL` → URL del ServidorGDS (orquestador)

**En producción** Nginx funciona como reverse proxy: enruta `/api/gds/*` y `/socket.io` al contenedor del ServidorGDS, y sirve los archivos estáticos de React directamente, evitando problemas de CORS.

---

### 3.2 Servidor — API REST del colegio

| Atributo | Valor |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express 5 (con soporte async nativo) |
| Lenguaje | TypeScript (ts-node + nodemon) |
| ORM | Prisma |
| BD | PostgreSQL (instancia propia, independiente de GDS) |
| Almacenamiento | AWS S3 (archivos/documentos) |
| Autenticación | JWT |
| Puerto | 3000 |

Este componente gestiona la lógica académica tradicional del colegio (usuarios, matrículas, etc.) y es **completamente independiente** del sistema de análisis IREC. Comparte únicamente el `JWT_SECRET` con el ServidorGDS para que un mismo token de autenticación sea válido en ambos servicios.

**¿Por qué Express y no NestJS?** Al ser el servicio "legado" del colegio, Express es suficiente para su carga de trabajo y no requiere la estructura modular de NestJS. Mantenerlos tecnológicamente separados también permite evolucionar cada uno de forma independiente.

---

### 3.3 ServidorGDS — Backend orquestador GDS ⭐

Este es el componente más complejo. Es un **backend autónomo NestJS** que:

1. **Orquesta** el ciclo de análisis (semanas simuladas por institución)
2. **Gestiona** colas de trabajo asíncronas con BullMQ sobre Redis
3. **Consume** el ServicioIA por HTTP para obtener análisis de IA
4. **Expone** API REST bajo `/api/gds/*` con documentación Swagger
5. **Emite** eventos en tiempo real a través de WebSockets (Socket.IO)
6. **Almacena** resultados en PostgreSQL + pgvector (memoria semántica vectorial)

| Atributo | Valor |
|---|---|
| Framework | NestJS 10 (arquitectura modular por DI) |
| Lenguaje | TypeScript 5 |
| ORM | Prisma 5 + extensión pgvector |
| Cola de trabajos | BullMQ sobre Redis 7 |
| WebSockets | Socket.IO (@nestjs/websockets) |
| HTTP client | Axios (@nestjs/axios) |
| Autenticación | JWT + Passport |
| Validación | class-validator + class-transformer |
| Documentación | Swagger/OpenAPI (auto-generado) |
| Logger | Pino (logging estructurado JSON) |
| Observabilidad | Sentry (errores) |
| Testing | Jest + fast-check (Property-Based Testing) |
| Puerto | 4100 |

**Módulos internos principales:**

| Módulo | Responsabilidad |
|---|---|
| `ai/` | Clientes HTTP del ServicioIA + proxy de degradación |
| `queue/` | Configuración BullMQ + Redis |
| `modules/pipeline/` | Pipeline de análisis semanal |
| `modules/ciclo/` | Controlador del ciclo de análisis |
| `modules/scheduler/` | Programador temporal de análisis |
| `modules/analisis/` | Interfaces y lógica de análisis |
| `modules/ml/` | Interfaz de capa ML (embeddings, clustering, etc.) |
| `modules/communities/` | Gestión de comunidades digitales |
| `modules/instituciones/` | Gestión de instituciones educativas |
| `modules/dashboard/` | Datos para el dashboard |
| `modules/reportes/` | Generación de reportes (PDF/Excel) |
| `modules/memoria/` | Memoria semántica vectorial |
| `events/` | Sistema de eventos internos |
| `ws/` | Gateway WebSocket |

---

### 3.4 ServicioIA — Cerebro analítico ⭐

Es el motor de inteligencia artificial del sistema. Un microservicio Python con FastAPI que expone **endpoints HTTP** consumidos exclusivamente por el ServidorGDS.

| Atributo | Valor |
|---|---|
| Lenguaje | Python 3.11+ |
| Framework | FastAPI + Uvicorn (ASGI) |
| NLP | Transformers (HuggingFace) + spaCy + NLTK |
| Embeddings | sentence-transformers (Sentence-BERT multilingüe) |
| ML clásico | scikit-learn + XGBoost |
| Deep Learning | PyTorch 2.2+ |
| Persistencia vectorial | pgvector (vía psycopg3) |
| Observabilidad | Sentry |
| Testing | pytest |
| Puerto | 8000 (solo red interna) |

**Endpoints que expone:**

| Endpoint | Método | Función |
|---|---|---|
| `/health` | GET | Sonda de disponibilidad |
| `/nlp` | POST | Análisis de texto: semántico, emocional, temático |
| `/vision` | POST | Análisis de imagen (escena, objetos, contexto emocional) |
| `/embeddings` | POST | Generación de vectores semánticos |
| `/embeddings/search` | POST | Búsqueda por similitud semántica |
| `/relevancia` | POST | Clasificación de contenido contributivo vs no contributivo |
| `/clustering` | POST | Agrupamiento temático de vectores |
| `/anomalias` | POST | Detección de anomalías en series temporales |
| `/tendencias` | POST | Análisis de tendencias temporales |
| `/score-calibrado` | POST | Cálculo del score IREC calibrado |
| `/calibrar` | POST | Calibración del modelo de scoring |

**¿Por qué Python y no TypeScript?** El ecosistema de Machine Learning y Deep Learning es dominado por Python. Las librerías clave (PyTorch, Transformers de HuggingFace, sentence-transformers, scikit-learn, spaCy) no tienen equivalente en Node.js en calidad ni madurez. Separarlo como microservicio permite escalarlo independientemente (p. ej., en GPU) sin afectar el orquestador.

---

## 4. La conexión ServidorGDS ↔ ServicioIA (el núcleo técnico)

Esta es la parte más sofisticada del sistema. Se explica en detalle a continuación con ejemplos de código real.

### 4.1 Visión general del flujo

```
ServidorGDS (NestJS / TypeScript)           ServicioIA (FastAPI / Python)
─────────────────────────────────           ──────────────────────────────
Pipeline_Analisis
    │
    ├─ inyecta SERVICIO_NLP ──────────────────── POST /nlp ──────────────→
    │                         { contenido: [...] }              analiza texto
    │                         ←──────── { semantico, emocion, temas, ... } ──
    │
    ├─ inyecta SERVICIO_VISION ───────────────── POST /vision ──────────→
    │                         { image_description: "..." }
    │                         ←──────── { scene, objects, emotion_context } ─
    │
    ├─ inyecta FILTRO_RELEVANCIA ─────────────── POST /relevancia ──────→
    │                         { items: [{refId, texto}, ...] }
    │                         ←──────── { contributivos, noContributivos } ──
    │
    └─ inyecta CAPA_ML ───────────────────────── POST /embeddings ───────→
                              { textos: [...] }
                              ←──────── { vectores: [[...], ...], dim: 768 } ─
                              ─────────── POST /clustering ───super─────────→
                              { vectores: [[...]], k: 5 }
                              ←──────── { clusters: [{clusterId, ...}] } ────
                              ─────────── POST /score-calibrado ─────────→
                              { entradaIndice: { dimensiones: [...] } }
                              ←──────── { score: 42.7, evidenciaIds: [...] } ─
```

### 4.2 Las cuatro interfaces estables (contrato interno)

El ServidorGDS **no habla directamente** con el ServicioIA. Habla con **interfaces TypeScript abstractas**:

```typescript
// Interface estable: el Pipeline no sabe si hay Python o un fallback detrás
interface ServicioNLP {
    analizar(contrato: ContratoNormalizado): Promise<ResultadoNLP>;
}

interface ServicioVision {
    analizar(imageDescription: string): Promise<ResultadoVision>;
}

interface FiltroRelevancia {
    clasificar(contrato: ContratoNormalizado): Promise<ResultadoFiltroRelevancia>;
}

interface CapaML {
    embeddings(textos: string[]): Promise<number[][]>;
    clustering(vectores: number[][]): Promise<ResultadoClustering[]>;
    anomalias(serie: number[][], zona?: ZonaGeografica): Promise<Anomalia[]>;
    tendencias(evolucion: EvolucionTemporal): Promise<Tendencia[]>;
    scoreRiesgoCalibrado(entrada: EntradaIndice): Promise<ScoreCalibrado>;
    calibrar(corpus: ReferenciaCorpus): Promise<ResultadoCalibracion>;
}
```

**¿Por qué este diseño?** Porque permite que el Pipeline de análisis sea completamente independiente de si el ServicioIA está disponible o no. Si cae el microservicio Python, el sistema no falla: activa automáticamente un **fallback determinista en TypeScript**.

### 4.3 Los clientes HTTP (cómo se hace la llamada real)

Cuando el ServicioIA está disponible, la implementación concreta es un cliente HTTP (Axios sobre NestJS HttpModule):

```typescript
// ServicioNlpClient — llama a POST /nlp del ServicioIA
@Injectable()
export class ServicioNlpClient extends ServicioIaHttpBase implements ServicioNLP {

    async analizar(contrato: ContratoNormalizado): Promise<ResultadoNLP> {
        // 1. Extrae los textos del contrato (anonimizados)
        const contenido = aplanarTextos(contrato);

        // 2. Llama a POST http://servicio-ia:8000/nlp
        const dto = await this.post<NlpRequestDTO, NlpResponseDTO>('/nlp', {
            contenido,  // string[]
        });

        // 3. Mapea la respuesta Python al tipo TypeScript interno
        return this.mapearNlp(dto, contenido.length);
    }
}
```

El cuerpo que envía (`NlpRequestDTO`):
```json
{
  "contenido": [
    "Estoy muy estresado con los parciales",
    "No duermo desde hace días, esto ya no da para más",
    "Siento que no encajo en la facultad"
  ]
}
```

La respuesta que devuelve el ServicioIA (`NlpResponseDTO`):
```json
{
  "semantico": {
    "resumen": "Expresiones de estrés académico y agotamiento emocional",
    "terminosClave": ["parciales", "estresado", "duermo", "agotamiento"],
    "conversacional": {
      "numIntervenciones": 3,
      "longitudPromedio": 8.5,
      "diversidadLexica": 0.72
    }
  },
  "emocion": {
    "etiqueta": "tristeza",
    "puntuacion": 0.81,
    "distribucion": {
      "tristeza": 0.81,
      "miedo": 0.12,
      "alegria": 0.02,
      "enojo": 0.05
    }
  },
  "temas": [
    { "etiqueta": "estrés académico", "peso": 0.75, "miembros": [0, 1] },
    { "etiqueta": "aislamiento",      "peso": 0.25, "miembros": [2] }
  ],
  "entidades": [],
  "causas": ["parciales", "falta de sueño"],
  "eventos": ["evaluacion"],
  "tendenciasTexto": "Incremento de señales de agotamiento emocional"
}
```

El cliente entonces **mapea** esta respuesta al tipo interno TypeScript `ResultadoNLP`, adaptando los nombres y estructuras para que el Pipeline de análisis nunca sepa nada de Python.

### 4.4 El Proxy de Degradación (resiliencia automática)

Este es el mecanismo más elegante del sistema. Se llama **ProxyDegradacionServicioIA** y funciona como un "guardián" transparente:

```
Cada vez que el Pipeline llama a SERVICIO_NLP.analizar(...)
                        │
                        ▼
          ProxyDegradacionServicioIA
                        │
           ┌────────────▼────────────┐
           │ ¿Está disponible el     │
           │ ServicioIA?             │
           │ (GET /health)           │
           └────────────┬────────────┘
                   ┌────┴────┐
                 SÍ│         │NO (o falla HTTP)
                   ▼         ▼
         ServicioNlpClient  ServicioNlpFallback
         (HTTP → Python)    (TypeScript puro,
                             determinista)
                   │         │
                   └────┬────┘
                        │
                ResultadoNLP
         (siempre llega un resultado,
          nunca se bloquea el ciclo)
```

Implementación real del proxy:

```typescript
async ejecutar<R>(operacion: (implementacion: T) => Promise<R>): Promise<R> {
    const disponible = await this.sonda.disponible();  // GET /health

    if (disponible) {
        try {
            const resultado = await operacion(this.primario);  // HTTP → Python
            this.marcarDisponible();
            return resultado;
        } catch (error: unknown) {
            // Fallo HTTP en tiempo de llamada → fallback automático
            this.marcarDegradado(`fallo HTTP: ${error.message}`);
            return operacion(this.fallback);  // TypeScript puro
        }
    }

    // ServicioIA no disponible → fallback automático
    this.marcarDegradado('la sonda GET /health reporta indisponibilidad');
    return operacion(this.fallback);  // TypeScript puro
}
```

**¿Por qué este diseño?** El análisis semanal no puede detenerse porque el microservicio Python esté caído (por reinicio, por actualización de modelos, por falta de GPU, etc.). El fallback TS garantiza que siempre haya un resultado, aunque sea con menor sofisticación analítica. Cuando el ServicioIA se recupera, el sistema lo detecta automáticamente en la siguiente llamada.

### 4.5 Registro de tokens DI y resolución por disponibilidad

La inyección de dependencias (DI) de NestJS es la que conecta todo. El `AiModule` registra cada token de interfaz con una `useFactory` que crea el proxy con el cliente HTTP primario + el fallback TS:

```typescript
// ai.module.ts — extracto simplificado
{
    provide: SERVICIO_NLP,  // token abstracto
    inject: [ServicioNlpClient, ServicioNlpFallback, SondaServicioIaHttp],
    useFactory: (primario, fallback, sonda): ServicioNLP =>
        crearAdaptadorServicioNlp(
            new ProxyDegradacionServicioIA(primario, fallback, sonda, {
                nombre: 'Servicio_NLP',
            }),
        ),
},
```

El Pipeline de análisis solo inyecta `@Inject(SERVICIO_NLP)` y nunca sabe si obtiene Python o TypeScript. El aislamiento es total.

---

## 5. Cola de trabajos asíncrona (BullMQ + Redis)

El análisis de una semana completa de datos es costoso. No puede hacerse síncronamente en una petición HTTP. Por eso existe la **cola BullMQ**:

```
Cliente HTTP                 ServidorGDS                  Redis + BullMQ
──────────                   ──────────────               ──────────────
POST /api/gds/ciclo/start
        │                         │
        │────────────────────────►│
        │                         │
        │◄────────────────────────│  202 Accepted
        │                         │  { jobId: "abc123" }
                                  │
                                  │──── encola trabajo ──►│
                                  │    "procesar-semana"   │
                                  │    { analisisId, ...}  │
                                  │                        │
                                  │◄─── worker procesa ────│
                                  │     (async)            │
                                  │                        │
                                  │ → llama ServicioIA     │
                                  │ → guarda en PostgreSQL │
                                  │ → emite WebSocket      │
                                  │   al frontend          │
```

**Configuración de la cola (redis-connection.ts):**
- Nombre: `procesar-semana`
- Reintentos: 3 intentos con backoff exponencial (base: 5 segundos)
- Limpieza automática: guarda los últimos 1.000 trabajos completados y 5.000 fallidos
- Persistencia: Redis con AOF (Append Only File) activado

**¿Por qué BullMQ y no una simple llamada async?** Los análisis pueden tardar minutos. BullMQ garantiza que el trabajo se complete aunque el servidor se reinicie (persistencia en Redis), permite reintentos ante fallos transitorios del ServicioIA, y desacopla la recepción de la petición de su procesamiento.

---

## 6. Base de datos y memoria semántica vectorial

### 6.1 Esquema PostgreSQL + pgvector

El ServidorGDS tiene su **propia base de datos dedicada**, completamente separada del Servidor del colegio. Las entidades principales del esquema:

| Tabla (model Prisma) | Propósito |
|---|---|
| `gds_institucion` | Institución educativa con geolocalización |
| `gds_analisis` | Raíz de cada análisis (escenario, semanas, estado) |
| `gds_comunidad_digital` | Comunidad asociada a un análisis |
| `gds_ciclo_semanal` | Ciclo/semana de análisis |
| `gds_scenarios` | Biblioteca de escenarios reutilizables |
| `gds_patron` | Patrones detectados por el pipeline |
| `gds_reporte` | Reportes generados (PDF/Excel) |
| `gds_calibracion` | Histórico de calibraciones del modelo IREC |
| `gds_evidence` | Evidencias del análisis |
| `Embedding` | Vectores semánticos (pgvector) |
| `gds_tendencia_historica` | Histórico de tendencias |
| `gds_memoria_semanal/mensual/...` | Memorias consolidadas por período |

### 6.2 ¿Por qué pgvector?

La extensión `pgvector` de PostgreSQL habilita búsqueda por similitud semántica directamente en la base de datos relacional. Esto permite:

1. **Almacenar embeddings** (vectores de 768 dimensiones) junto a los datos relacionales
2. **Buscar por similitud coseno/euclidiana**: `SELECT * FROM embeddings ORDER BY vector <=> $1 LIMIT 10`
3. No necesitar una base de datos vectorial separada (ChromaDB, Weaviate, Pinecone)

El ServicioIA genera los vectores vía `POST /embeddings` (Sentence-BERT multilingüe) y el ServidorGDS los persiste en PostgreSQL para búsquedas posteriores.

---

## 7. El Motor IREC — Fórmula e interpretación

El IREC es el indicador compuesto que sintetiza todo el análisis:

```
IREC = w₁·Estrés + w₂·Burnout + w₃·Ansiedad + w₄·Desesperanza
     + w₅·Aislamiento + w₆·Desmotivación + w₇·Conflicto
     + w₈·Persistencia − w₉·SeñalesProtectoras

Rango: 0 (sin riesgo) a 100 (riesgo crítico agregado)
```

| Rango IREC | Nivel | Acción institucional |
|---|---|---|
| 0–20 | Sin tendencia significativa | Monitoreo normal |
| 21–40 | Tendencia leve | Observación |
| 41–60 | Tendencia moderada | Revisión institucional |
| 61–80 | Tendencia elevada | Intervención preventiva |
| 81–100 | Tendencia crítica | Activación de protocolos |

El cálculo se realiza en el ServicioIA (`POST /score-calibrado`) y los pesos son **calibrables** vía `POST /calibrar` con datos históricos de referencia.

---

## 8. Stack tecnológico completo — Justificación de elecciones

### 8.1 NestJS para el ServidorGDS

**¿Por qué NestJS y no Express puro?**
- **Inyección de dependencias** (DI): fundamental para el patrón de proxy de degradación. Permite swapear implementaciones (HTTP vs fallback) sin modificar el pipeline.
- **Arquitectura modular**: cada dominio (análisis, comunidades, reportes) es un módulo independiente con sus propios providers y exports.
- **Decoradores y metadatos**: simplifican la validación (class-validator), Swagger auto-generado, guards de autenticación.
- **BullMQ integrado**: `@nestjs/bullmq` ofrece decoradores nativos para registrar colas y workers.
- **WebSockets integrados**: `@nestjs/websockets` con Socket.IO para actualizaciones en tiempo real al frontend.

### 8.2 FastAPI para el ServicioIA

**¿Por qué FastAPI y no Flask/Django?**
- **Asíncrono nativo** (ASGI con Uvicorn): puede manejar múltiples solicitudes de modelos concurrentemente sin bloquear.
- **Validación automática** con Pydantic: los DTOs de entrada/salida se validan y documentan automáticamente.
- **Documentación OpenAPI auto-generada** en `/docs`.
- **Lifespan hooks**: permite cargar modelos pesados una sola vez al arranque (no en cada request).
- **Performance**: comparable a Node.js, muy superior a Flask síncrono.

### 8.3 pgvector vs base de datos vectorial dedicada

**¿Por qué pgvector y no ChromaDB/Pinecone?**
- **Menos infraestructura**: un solo servicio PostgreSQL en lugar de dos sistemas de datos separados.
- **ACID**: las inserciones de vectores y datos relacionales son transaccionales.
- **SQL familiar**: consultas mixtas (semántica + relacional) en una sola query.
- **Madurez**: PostgreSQL es altamente confiable y pgvector tiene soporte activo.

### 8.4 BullMQ vs colas alternativas

**¿Por qué BullMQ sobre Redis y no RabbitMQ/Kafka?**
- **Complejidad adecuada**: el volumen de trabajos (semanas × instituciones) no requiere el throughput de Kafka.
- **Redis ya en el stack**: se reutiliza la misma instancia para caché.
- **Dashboard visual disponible**: BullBoard para monitorear colas en desarrollo.
- **Reintentos y backoff** configurables nativamente.

### 8.5 Separación de bases de datos

**¿Por qué dos PostgreSQL separados y no uno compartido?**
- **Aislamiento de dominio**: el sistema IREC y el sistema académico del colegio son dominios de negocio independientes.
- **Escalabilidad independiente**: se puede escalar la BD de IREC sin afectar la del colegio.
- **Seguridad**: una brecha en uno no expone automáticamente el otro.
- **pgvector**: la BD del GDS necesita la extensión `pgvector`; la del colegio no.

---

## 9. Despliegue con Docker Compose

El archivo `docker-compose.yml` orquesta cinco contenedores en una red interna privada (`gds_internal`):

```yaml
# Servicios y su visibilidad:
postgres     → solo red interna  (puerto 5432, sin exposición externa)
redis        → solo red interna  (puerto 6379, sin exposición externa)
servicio-ia  → solo red interna  (puerto 8000 con `expose`, sin `ports`)
servidor-gds → red interna + externo (puerto 4100:4100)
frontend     → red interna + externo (puerto 8080:80)
```

**Restricción de seguridad clave**: el `servicio-ia` usa `expose` (no `ports`), lo que significa que su puerto 8000 es accesible entre contenedores pero **nunca desde el host ni desde Internet**. Solo el `servidor-gds` puede llamarlo.

**Orden de arranque garantizado** (healthchecks):
1. `postgres` → healthcheck: `pg_isready`
2. `redis` → healthcheck: `redis-cli ping`
3. `servicio-ia` → healthcheck: `GET /health` (60s de gracia para cargar modelos)
4. `servidor-gds` → depende de postgres, redis y servicio-ia
5. `frontend` → depende de servidor-gds

**Volúmenes persistentes:**
- `postgres_data`: datos de la base de datos
- `redis_data`: datos de Redis (cola BullMQ con AOF)
- `model_cache`: modelos descargados por el ServicioIA (evita re-descargar en cada reinicio)

---

## 10. Flujo completo de un análisis (ejemplo paso a paso)

A continuación se traza el flujo completo desde que el usuario solicita un análisis hasta que ve el resultado en el dashboard:

```
1. USUARIO abre el dashboard (ClienteCDPLPL)
   └─ React → GET /api/gds/instituciones  (ServidorGDS)
              → lista instituciones disponibles

2. USUARIO configura un análisis:
   - Institución: "Universidad XYZ"
   - Escenario: "Época de finales"
   - Semanas a simular: 4
   └─ React → POST /api/gds/analisis  (ServidorGDS)
              → crea registro en gds_analisis
              → devuelve { analisisId: "abc", jobId: "xyz" }

3. ServidorGDS ENCOLA el trabajo:
   └─ BullMQ → Redis → cola "procesar-semana"
              → job { analisisId: "abc", semana: 1 }

4. Worker de BullMQ PROCESA la semana 1:
   └─ genera datos sintéticos de redes sociales para la semana
      └─ filtra contenido relevante:
         ServidorGDS → POST /relevancia → ServicioIA
         ServicioIA ← { items: [{refId:"1", texto:"no duermo..."},...] }
         ServicioIA → { contributivos: ["1","3"], noContributivos: ["2"] }

      └─ analiza texto del contenido contributivo:
         ServidorGDS → POST /nlp → ServicioIA
         ServicioIA ← { contenido: ["no duermo...", "estrés parciales..."] }
         ServicioIA → {
           emocion: { etiqueta: "tristeza", puntuacion: 0.81 },
           temas: [{ etiqueta: "estrés académico", peso: 0.75 }],
           ...
         }

      └─ genera embeddings semánticos:
         ServidorGDS → POST /embeddings → ServicioIA
         ServicioIA ← { textos: ["no duermo...", ...] }
         ServicioIA → { vectores: [[0.12, -0.34, ...768 dims...], ...] }
         → almacena en gds_embedding (pgvector)

      └─ detecta anomalías temporales:
         ServidorGDS → POST /anomalias → ServicioIA
         ServicioIA ← { serie: [[0.3, 0.4, 0.5, 0.8]] }
         ServicioIA → { anomalias: [{ refId: 3, score: 2.4, descripcion: "pico" }] }

      └─ calcula IREC:
         ServidorGDS → POST /score-calibrado → ServicioIA
         ServicioIA ← { entradaIndice: {
           dimensiones: [
             { nombre: "Estrés", valor: 0.75, peso: 0.2 },
             { nombre: "Burnout", valor: 0.6,  peso: 0.15 },
             ...
           ]
         }}
         ServicioIA → { score: 58.3, evidenciaIds: ["1","3"] }
         → IREC 58.3 = "Tendencia moderada"

      └─ guarda resultados en PostgreSQL
         → gds_ciclo_semanal (semana 1, IREC: 58.3)
         → gds_patron (patrones detectados)
         → gds_tendencia_historica

      └─ emite evento WebSocket al frontend:
         Socket.IO → evento "analisis:semana-completada"
         → { analisisId: "abc", semana: 1, irec: 58.3, nivel: "moderado" }

5. FRONTEND recibe el evento WebSocket:
   └─ React actualiza el dashboard en tiempo real
      → muestra gráfica de evolución IREC
      → muestra indicadores dominantes
      → muestra alerta: "Tendencia moderada detectada"

6. USUARIO solicita reporte:
   └─ React → POST /api/gds/reportes  (ServidorGDS)
   → ServidorGDS genera PDF con pdfkit / Excel con exceljs
   → descarga automática
```

---

## 11. Consideraciones éticas y de privacidad

El sistema está diseñado con **privacidad por diseño** desde su arquitectura:

1. **Sin diagnóstico individual**: el IREC es un índice de comunidad, no de persona.
2. **Sin identificación**: no se almacenan nombres, handles ni identificadores de usuarios.
3. **Anonimización en ingesta**: los textos se procesan eliminando PII antes de cualquier análisis.
4. **Solo datos públicos**: únicamente se analiza contenido accesible públicamente.
5. **Sin reconocimiento facial**: el módulo de visión analiza escenas y objetos, nunca rostros.
6. **Sin acciones automáticas**: el sistema genera indicadores, no toma decisiones por sí mismo.
7. **Validación humana requerida**: todo resultado requiere interpretación institucional.
8. **Auditabilidad**: logging estructurado (Pino) + trazabilidad completa de evidencias.

---

## 12. Limitaciones declaradas

| Limitación | Impacto |
|---|---|
| No es herramienta clínica | No reemplaza orientación psicológica |
| Datos sintéticos iniciales | Resultados en plataformas restringidas son simulados |
| Sesgo de plataforma | Solo usuarios activos en redes públicas |
| Idioma español (principalmente) | Soporte multilingüe limitado |
| Requiere línea base temporal | Mínimo varias semanas de datos para IREC confiable |
| Asociación probabilística | Vincular contenido a una institución no es determinista |

---

## 13. Resumen de tecnologías por componente

| Componente | Lenguaje | Framework principal | BD | Puerto |
|---|---|---|---|---|
| ClienteCDPLPL | TypeScript | React 19 + Vite | — | 5173/8080 |
| Servidor | TypeScript | Express 5 | PostgreSQL (propia) | 3000 |
| ServidorGDS | TypeScript | NestJS 10 | PostgreSQL + pgvector + Redis | 4100 |
| ServicioIA | Python 3.11+ | FastAPI | PostgreSQL + pgvector | 8000 (interno) |

---

*Informe generado automáticamente a partir del análisis del código fuente del repositorio CDPLP.*  
*Fecha: Junio 2026*
