# Informe de Arquitectura de Software — Sistema CDPLP

**Proyecto:** Colegio de Profesionales en Derecho y Leyes de La Plata (CDPLP)
**Fecha:** Junio 2026
**Versión:** 1.0
**Tipo:** Informe de Arquitectura de Software

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Vista General del Sistema](#2-vista-general-del-sistema)
3. [Tabla Resumen de Arquitecturas](#3-tabla-resumen-de-arquitecturas)
4. [Análisis Detallado por Servicio](#4-análisis-detallado-por-servicio)
   - 4.1 [Cliente — Feature-Based Architecture](#41-cliente--feature-based-architecture)
   - 4.2 [Servidor — MVC Modular Plano](#42-servidor--mvc-modular-plano)
   - 4.3 [ServidorGDS — Hexagonal + Pipeline + Event-Driven](#43-servidorgds--hexagonal--pipeline--event-driven)
   - 4.4 [ServicioIA — Clean Layered + Strategy/Factory](#44-servicioia--clean-layered--strategyfactory)
5. [Patrones Arquitectónicos Globales](#5-patrones-arquitectónicos-globales)
6. [Matriz de Fortalezas y Debilidades](#6-matriz-de-fortalezas-y-debilidades)
7. [Rutas y Endpoints del Sistema](#7-rutas-y-endpoints-del-sistema)
8. [Conclusiones y Diagnóstico Enterprise](#8-conclusiones-y-diagnóstico-enterprise)

---

## 1. Resumen Ejecutivo

El sistema CDPLP es una **plataforma distribuida políglota** compuesta por cuatro servicios independientes que operan en conjunto para gestionar la administración de un colegio profesional y proveer capacidades avanzadas de análisis de riesgo emocional sobre comunidades digitales.

El sistema no aplica un arquitectura de software unificada a nivel global. Cada servicio evolucionó con su propio estilo arquitectónico, generando un ecosistema heterogéneo donde coexisten patrones de distinta madurez:

| Servicio | Patrón | Madurez Enterprise |
|---|---|---|
| **Cliente** | Feature-Based / Vertical Slice | Media |
| **Servidor** | MVC Modular (Controller-Centric) | Baja-Media |
| **ServidorGDS** | Hexagonal + Pipeline + Event-Driven | Alta |
| **ServicioIA** | Clean Layered + Strategy/Factory | Alta |

La arquitectura más enterprise y profesional está concentrada en el eje **ServidorGDS ↔ ServicioIA**, que funciona como una plataforma analítica con calidad de producción real. El **Servidor** original y partes del **Cliente** operan en un nivel de madurez menor, con deuda técnica significativa.

---

## 2. Vista General del Sistema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SISTEMA CDPLP (Polyglot)                        │
│                                                                        │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │                  │    │                  │    │                  │  │
│  │    CLIENTE       │    │    SERVIDOR      │    │  SERVIDORGDS     │  │
│  │  React 19/Vite 6 │───▶│  Express.js 5    │    │  NestJS 10       │  │
│  │  JS → TS         │    │  TypeScript      │    │  TypeScript      │  │
│  │                  │    │                  │    │                  │  │
│  │  Feature-Based   │    │  MVC Modular     │    │  Hexagonal       │  │
│  │                  │    │                  │    │                  │  │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘  │
│           │                       │                       │            │
│           │   REST /api           │   REST /api/gds       │            │
│           └───────────────────────┘                       │            │
│                                                           │            │
│                                              HTTP interno │            │
│                                                           ▼            │
│                                                  ┌──────────────────┐  │
│                                                  │                  │  │
│                                                  │  SERVICIOIA      │  │
│                                                  │  FastAPI         │  │
│                                                  │  Python          │  │
│                                                  │                  │  │
│                                                  │  Clean Layered   │  │
│                                                  │                  │  │
│                                                  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Flujo de Comunicación

```
Usuario (Browser)
    │
    ├──▶ Cliente ──REST──▶ Servidor (/api)
    │       │                    │
    │       │                    ├── PostgreSQL (compartida)
    │       │                    └── AWS S3 (documentos)
    │       │
    │       └──REST──▶ ServidorGDS (/api/gds)
    │                        │
    │                        ├── PostgreSQL + pgvector (dedicada)
    │                        ├── Redis (BullMQ colas)
    │                        └── HTTP interno ──▶ ServicioIA
    │                                                 │
    │                                                 ├── PostgreSQL + pgvector
    │                                                 └── Modelos ML locales
    │
    └──WebSocket──▶ ServidorGDS (gds/progreso)
```

---

## 3. Tabla Resumen de Arquitecturas

| Criterio | Cliente | Servidor | ServidorGDS | ServicioIA |
|---|---|---|---|---|
| **Framework** | React 19 + Vite 6 | Express.js 5 | NestJS 10 | FastAPI |
| **Lenguaje** | JS → TS (migración activa) | TypeScript | TypeScript | Python |
| **Patrón Principal** | Feature-Based (Vertical Slice) | MVC Modular Plano | Hexagonal + Pipeline + Event-Driven | Clean Layered + Strategy |
| **DB Access** | N/A (consume APIs) | Prisma directo en controllers | Prisma vía DI + Repository pattern | pgvector vía Repository pattern |
| **Base de Datos** | N/A | PostgreSQL (compartida) | PostgreSQL + pgvector (dedicada) | PostgreSQL + pgvector |
| **Estado** | Zustand + TanStack Query + localStorage | N/A | EventEmitter2 + BullMQ + Redis | N/A (stateless) |
| **Validación** | Zod + react-hook-form (GDS) | Zod (inconsistente) | class-validator + ValidationPipe global | Pydantic v2 |
| **Auth** | JWT en localStorage + Guards por feature | JWT opt-in por ruta | JWT + Passport + Guards (fail-closed) | N/A (servicio interno) |
| **Testing** | Vitest + Playwright (mínimo) | Inexistente | 100+ archivos (unit, PBT, E2E, structural) | 16 archivos (unit, PBT, contract, smoke) |
| **Observabilidad** | N/A | N/A | Pino (structured logs) + Sentry | JSON structured logs + Sentry |
| **Contenedores** | Dockerfile | N/A | Dockerfile | Dockerfile |
| **Documentación API** | N/A | N/A | Swagger/OpenAPI | FastAPI auto-docs |
| **Madurez Enterprise** | Media | Baja-Media | Alta | Alta |

---

## 4. Análisis Detallado por Servicio

---

### 4.1 Cliente — Feature-Based Architecture

**Ruta:** `ClienteCDPLPL/`
**Stack:** React 19, Vite 6, react-router-dom 7, MUI 7, Tailwind 4, Shadcn/UI, Zustand 5, TanStack Query 5, Axios, socket.io-client

#### Estructura Organizativa

```
src/
├── main.jsx                     # Entry point
├── router/router.jsx            # Composición central de rutas
├── layouts/                     # Layouts compartidos (Auth, Dashboard, User)
├── hooks/                       # Hooks compartidos (useAxiosInterceptor)
├── utils/                       # Utilidades transversales (JWT, theme, axios config)
├── lib/                         # Helpers (cn() de Shadcn)
└── features/                    # ★ Organización principal
    ├── auth/                    #   Login/autenticación
    │   ├── components/
    │   ├── hooks/
    │   ├── pages/
    │   ├── services/
    │   └── routes.jsx
    ├── users/                   #   Páginas públicas (Home, Nosotros, Contacto)
    ├── dashboard/               #   Panel administrativo del colegio
    │   ├── components/
    │   ├── hooks/
    │   ├── pages/
    │   │   ├── Usuarios/
    │   │   ├── Colegiados/
    │   │   ├── Tesoreria/
    │   │   ├── Correspondencia/
    │   │   ├── Ac-soc/
    │   │   ├── Ac-Inst/
    │   │   └── Auditorias/
    │   ├── services/            #   10 módulos de servicio API
    │   └── routes.jsx
    ├── campo/                   #   Acceso a campo
    └── gds/                     #   ★ Feature más madura (TypeScript)
        ├── api/                 #   Cliente Axios dedicado + APIs tipadas
        ├── components/          #   UI con Shadcn
        ├── guards/              #   Protección de rutas
        ├── hooks/               #   Custom hooks con TanStack Query
        ├── layouts/             #   Layout propio (GdsLayout)
        ├── lib/                 #   QueryClient configurado
        ├── pages/               #   Páginas del módulo GDS
        ├── store/               #   Zustand (estado UI)
        ├── types/               #   Tipos TypeScript compartidos
        └── routes.tsx
```

#### Gestión de Estado

| Mecanismo | Alcance | Uso |
|---|---|---|
| **Zustand** | Solo feature `gds` | Estado UI (sidebar, institución seleccionada) |
| **TanStack Query** | Solo feature `gds` | Estado del servidor (cache, retries, stale time 30s) |
| **localStorage** | App-wide | JWT token para autenticación |
| **useState/useEffect** | Dashboard y auth | Sin estado formal, React local |

#### Comunicación API

| Backend | Cliente HTTP | Auth | Patrón |
|---|---|---|---|
| Servidor (/api) | Axios global con interceptor | JWT desde localStorage | Services por dominio (10 archivos) |
| ServidorGDS (/api/gds) | Instancia Axios dedicada | JWT desde localStorage | API tipadas + TanStack Query hooks |
| ServidorGDS (WebSocket) | socket.io-client | JWT en handshake | Suscripción por room con fallback |

#### Patrones Identificados

- **Feature-Based / Vertical Slice**: Cada feature encapsula rutas, páginas, componentes, hooks y servicios.
- **Layout Pattern**: Tres shells de layout (Auth, Dashboard, User) + uno feature-local (GDS).
- **Guard Pattern**: `RequireRole` y `RequireGdsAuth` protegen rutas (fail-closed).
- **Graceful Degradation**: APIs de GDS nunca lanzan excepciones — retornan formas vacías válidas.
- **Barrel Exports**: `gds/index.ts` expone API pública limpia.

#### Dualidad de Sistemas UI

| Sistema | Features que lo usan | Estado |
|---|---|---|
| **MUI (Material UI)** | dashboard, auth | Legacy |
| **Tailwind + Shadcn/UI** | users, gds, layouts | Moderno (target) |

#### Fortalezas

- Separación clara por dominio de negocio
- Feature GDS como referencia de arquitectura objetivo (TS, Zod, TanStack Query, WebSocket)
- Guards con política fail-closed
- Graceful degradation en APIs de GDS

#### Debilidades

- Sin estado global formal (`contexts/` vacío)
- Dos sistemas UI coexistiendo (MUI vs Tailwind/Shadcn)
- Testing mínimo (solo smoke tests)
- Feature `dashboard` sin gestión de estado formal ni tests

---

### 4.2 Servidor — MVC Modular Plano

**Ruta:** `Servidor/`
**Stack:** Express.js 5, TypeScript, Prisma 6.6, Zod, jsonwebtoken, bcrypt, multer, AWS S3 SDK, Puppeteer

#### Estructura Organizativa

```
src/
├── index.ts                     # Bootstrap de Express
├── exceptions/                  # Jerarquía de excepciones HTTP
│   ├── root.ts                  #   HttpException base + ErrorCodes enum
│   ├── bad-request.ts           #   400
│   ├── unauthorized.ts          #   401
│   ├── not-found.ts             #   404
│   └── internal-exception.ts    #   500
├── middlewares/
│   ├── auth.ts                  # JWT authentication (opt-in por ruta)
│   ├── errors.ts                # Error handler global
│   └── multer.ts                # File upload (in-memory para S3)
├── modules/                     # ★ Organización principal
│   ├── usuarios/                #   Auth, usuarios, roles
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── schemas/             #   Zod validation
│   ├── colegiados/              #   Colegiados, documentos, pagos, pasantes, invitados
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── schemas/
│   ├── actividad-social/        #   Actividades sociales, convenios
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── schemas/
│   ├── actividad-institucional/ #   Actividades institucionales
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── schemas/
│   ├── correspondencia/         #   Correspondencia y buzón
│   │   ├── controllers/
│   │   └── routes/
│   ├── financiero/              #   Tesorería, presupuestos, movimientos
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── services/            #   ★ Único con service layer parcial
│   ├── Auditorias/              #   ★ Único con patrón en capas
│   │   ├── controllers/
│   │   ├── db/                  #   Repository-like
│   │   ├── routes/
│   │   └── services/
│   └── gds/                     #   Scaffold vacío (12 sub-módulos sin implementar)
├── routes/index.ts              # Router raíz agregador
├── types/                       # Tipos compartidos (enums, express.d.ts)
└── utils/
    ├── error-handler.ts         # Wrapper async para controllers
    ├── prismaClient.ts          # Singleton PrismaClient
    ├── secrets.ts               # dotenv config
    └── uploadS3.ts              # AWS S3 helpers
```

#### Patrones de Módulos (3 variantes coexistentes)

**Patrón A — Estándar (6 módulos):**
```
modulo/
├── controllers/   # Handlers (lógica de negocio + DB + respuesta HTTP)
├── routes/        # Express Router + middleware
└── schemas/       # Zod validation
```

**Patrón B — En Capas (solo Auditorías):**
```
Auditorias/
├── controllers/   # Handlers
├── services/      # Lógica de negocio
├── db/            # Data access (repository-like)
└── routes/
```

**Patrón C — Scaffold (solo GDS):**
```
gds/
└── 12 sub-módulos con routes.ts vacíos (Router sin endpoints)
```

#### Acceso a Base de Datos

- **ORM:** Prisma 6.6 con PostgreSQL
- **Patrón:** Active Record — Prisma llamado directamente desde controllers
- **Sin repository pattern** (excepto módulo Auditorías)
- **Sin service layer** (excepto `financiero/services/` y `Auditorias/services/`)
- **Transacciones:** `$transaction()` usado en operaciones financieras

#### Middleware Chain

```
express.json() → rootRouter (/api) → errorMiddleware
```

- `helmet` y `cors` están instalados pero **no cableados** en la app
- Auth middleware es **opt-in por ruta**, no global

#### Manejo de Errores (Dual-Track)

| Vía | Flujo |
|---|---|
| **Pipeline formal** | Controller → throw HttpException → errorHandler wrapper → errorMiddleware → JSON response |
| **Inline** | Controller → try/catch → `res.status(500).json(...)` directamente |

#### Jerarquía de Excepciones

```
Error
└── HttpException (base)
    ├── BadRequestException (400)
    ├── UnauthorizedException (401)
    ├── NotFoundException (404)
    └── InternalException (500)
```

#### Fortalezas

- Estructura modular clara por dominio de negocio
- Jerarquía de excepciones bien definida
- Schemas Zod por dominio
- Transacciones Prisma en operaciones financieras

#### Debilidades

- **Controllers "gordos"** (100-800+ líneas): mezclan validación, lógica, DB, generación de PDFs y respuesta HTTP
- **Sin service layer** en la mayoría de módulos
- **Sin repository pattern** — Prisma directo en controllers
- **Sin tests** (carpeta `tests/` vacía)
- **Auth no global** — endpoints sensibles sin protección
- **Bug en `secrets.ts`**: `JWT_SECRET = process.env.PORT` en lugar de `process.env.JWT_SECRET`
- **`helmet`/`cors` instalados pero no aplicados**
- **Generación de PDFs** (Puppeteer) copiada y pegada entre controllers sin abstracción
- **Manejo de errores dual** — inconsistente entre pipeline formal e inline

---

### 4.3 ServidorGDS — Hexagonal + Pipeline + Event-Driven

**Ruta:** `ServidorGDS/`
**Stack:** NestJS 10, TypeScript, Prisma 5.22, BullMQ + Redis, socket.io, Passport JWT, class-validator, Pino, Sentry, Handlebars, ExcelJS, PDFKit

#### Estructura Organizativa

```
src/
├── main.ts                          # Bootstrap NestJS + ValidationPipe global
├── app.module.ts                    # Módulo raíz (19 módulos registrados)
├── app.controller.ts                # Health check
├── config/env.ts                    # Configuración de entorno
├── prisma/
│   ├── prisma.module.ts             # @Global() PrismaModule
│   └── prisma.service.ts            # PrismaService con lifecycle hooks
├── common/
│   ├── common.module.ts             # Logger Pino estructurado
│   ├── filters/                     # AllExceptionsFilter global + Sentry
│   └── observability/               # Logger config + Sentry integration
├── events/events.module.ts          # EventEmitter2 bus interno
├── queue/
│   ├── queue.module.ts              # @Global() BullMQ + Redis
│   ├── redis-connection.ts
│   └── queue.constants.ts
└── modules/                         # ★ 27 módulos de dominio
    │
    │  ── Módulos de Dominio Puro (TypeScript, sin NestJS) ──
    ├── analisis/                    # NLP, Vision, Patrones, Riesgo, Anonimización
    ├── adquisicion/                 # Data providers, generación sintética
    ├── auth/                        # Dominio de autenticación (JWT, roles)
    ├── contracts/                   # Schema de contrato normalizado
    ├── communities/                 # Comunidades digitales, scores
    ├── ml/                          # Capa ML (calibración, degradación)
    ├── pipeline/                    # Orquestador de pipeline (11 etapas)
    ├── escenarios/                  # Motor de escenarios
    │
    │  ── Módulos de Integración NestJS ──
    ├── analysis/                    # CRUD Analisis + Biblioteca Escenarios
    │   ├── analysis.module.ts
    │   ├── analysis.controller.ts
    │   ├── analysis.service.ts
    │   ├── dto/
    │   └── escenarios/              # Sub-módulo de escenarios
    ├── authentication/              # Passport JWT + Guards + Roles
    │   ├── jwt.strategy.ts
    │   ├── jwt-auth.guard.ts
    │   ├── roles.guard.ts
    │   └── roles.decorator.ts
    ├── institutions/                # CRUD Instituciones (NestJS activo)
    ├── reports/                     # Generación de reportes + export PDF/Excel
    ├── audit/                       # Sistema de evidencias/trazabilidad
    ├── ai/                          # Proxy de degradación para ServicioIA
    │   ├── proxy-adapters.ts
    │   ├── servicio-ia.client.ts
    │   ├── fallback/                # Implementaciones fallback en TS
    │   └── health/                  # Sonda de salud del servicio IA
    ├── ai-engine/                   # Memoria semántica + embeddings (pgvector)
    ├── scheduler/                   # Orquestación de ciclos
    │   ├── cola/                    # BullMQ worker/processor
    │   ├── gestor/                  # Gestor de modo de ejecución
    │   └── programador/             # Scheduler temporal + aceleración
    ├── ciclo/                       # Cableado real de procesarSemana
    ├── simulation/                  # Generación de datos sintéticos (Gemini/Ollama)
    ├── timeline/                    # Sistema de memoria jerárquica (5 niveles)
    ├── ws/                          # WebSocket Gateway (progreso en tiempo real)
    ├── nlp-engine/                  # Wrapper NestJS para NLP
    ├── vision-engine/               # Wrapper NestJS para Vision
    ├── dashboard/                   # Placeholder
    └── users/                       # Placeholder
```

#### Arquitectura Hexagonal (Ports & Adapters)

El núcleo del sistema (`procesarSemana`) está diseñado como un **orquestador puro** con todas sus dependencias expresadas como **puertos** (interfaces):

```
                    ┌─────────────────────────┐
                    │    procesarSemana()      │
                    │   (Orquestador Puro)     │
                    └─────────┬───────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    ┌────▼─────┐       ┌─────▼──────┐      ┌─────▼──────┐
    │Generador │       │Validador   │      │Analizador  │
    │Semana    │       │Contrato    │      │Pipeline    │
    │(Puerto)  │       │(Puerto)    │      │(Puerto)    │
    └────┬─────┘       └─────┬──────┘      └─────┬──────┘
         │                    │                    │
    ┌────▼─────┐       ┌─────▼──────┐      ┌─────▼──────┐
    │Motor     │       │Ejecutor    │      │Persistor   │
    │Aprendizaje│      │Transaccional│     │Semana      │
    │(Puerto)  │       │(Puerto)    │      │(Puerto)    │
    └────┬─────┘       └─────┬──────┘      └─────┬──────┘
         │                    │                    │
    Adaptadores          Adaptadores          Adaptadores
    (Simulación)         (Prisma)             (Prisma)
```

#### Pipeline de Análisis (11 Etapas)

```
LIMPIEZA → NORMALIZACIÓN → ANONIMIZACIÓN → FILTRO_RELEVANCIA → NLP →
VISION → TEMPORAL → PATRONES → INDICE → EXPLICACIÓN → EMBEDDINGS
```

- **Resumible**: Si una etapa falla, el pipeline registra las etapas completadas y reanuda desde la fallida.
- **Idempotente**: Re-ejecución segura gracias al tracking de `EstadoPipeline`.
- **Pluggable**: Cada etapa es un `ManejadorEtapa` inyectable.

#### Event-Driven Architecture

```
Motor de Ciclo ──emit──▶ EventEmitter2 ──▶ WsProgresoService
                                                │
                                           @OnEvent()
                                                │
                                                ▼
                                          ProgresoGateway ──▶ WebSocket Client
                                          (namespace: gds/progreso)
```

#### Queue-Based Processing (BullMQ + Redis)

```
API Request ──▶ Queue.add('procesar-semana', {analisisId, semana})
                         │
                    ┌────▼─────┐
                    │  Redis   │  (exponential backoff: 3 intentos, 5s base)
                    └────┬─────┘
                         │
              ┌──────────▼──────────┐
              │ ProcesarSemanaWorker │  (BullMQ Processor)
              └──────────┬──────────┘
                         │
                    ┌────▼─────┐
                    │Ejecutor  │  → procesarSemana() + transacción atómica
                    │Trabajo   │
                    └──────────┘
```

#### Proxy de Degradación (ServicioIA)

```
ServidorGDS ──HTTP──▶ ServicioIA (Python)
     │
     ├── Servicio disponible → Respuesta real del modelo ML
     │
     └── Servicio no disponible (sonda de salud falla)
              │
              ▼
         ProxyDegradacionServicioIA
              │
              ▼
         Fallback TypeScript (implementaciones determinísticas)
              ├── nlp.fallback.ts
              ├── vision.fallback.ts
              ├── filtro-relevancia.fallback.ts
              └── capa-ml.fallback.ts
```

#### Sistema de Memoria Jerárquica (5 Niveles)

```
Semanal → Mensual → Trimestral → Semestral → Global
                                                    │
                                            + Memoria Semántica
                                              (pgvector, 1024 dims)
```

#### Modos de Ejecución (Strategy Pattern)

| Modo | Trigger | Descripción |
|---|---|---|
| **Manual** | API call `POST /analisis/:id/avanzar` | Avance semana por semana manual |
| **Automático** | Scheduler temporal | Procesamiento semanal automático |
| **Tiempo Real** | Scheduler continuo | Procesamiento con intervalos configurables |

#### Patrones NestJS Utilizados

| Patrón | Implementación |
|---|---|
| **Guards** | `JwtAuthGuard` (fail-closed), `RolesGuard` (ADMIN, ANALISTA, OBSERVADOR) |
| **Decorators** | `@Roles()` para autorización declarativa |
| **Filters** | `AllExceptionsFilter` global con reporte a Sentry |
| **Pipes** | `ValidationPipe` global (whitelist, forbid, transform) |
| **DI Tokens** | Symbols extensivos (`PROCESADOR_SEMANA`, `MOTOR_ESCENARIOS`, `CAPA_ML`, etc.) |
| **@Global()** | `PrismaModule`, `QueueModule` |
| **useFactory** | AI proxy, cycle processor, auth service |

#### Fortalezas

- Arquitectura Hexagonal real en el core del ciclo
- Pipeline resumible e idempotente
- Graceful degradation para servicio IA externo
- Testing exhaustivo (unit, PBT con fast-check, E2E, structural)
- DI extensivo con Symbols y factories
- Observabilidad production-ready (Pino + Sentry)
- Seguridad fail-closed (JWT + roles, HTTP y WebSocket)
- Cola de procesamiento con retries y claves de idempotencia

#### Debilidades

- Código legacy duplicado (`instituciones/` muerto, `analisis/` como librería vs `analysis/` como módulo)
- Algunos módulos placeholder vacíos (`dashboard/`, `users/`)
- Sin CQRS ni Event Sourcing (lecturas y escrituras por el mismo servicio)
- Complejidad alta — curva de aprendizaje pronunciada

---

### 4.4 ServicioIA — Clean Layered + Strategy/Factory

**Ruta:** `ServicioIA/`
**Stack:** FastAPI, Python, Pydantic v2, Transformers, Sentence-Transformers, spaCy, NLTK, scikit-learn, PyTorch, pgvector, psycopg3, Sentry

#### Estructura Organizativa

```
app/
├── main.py                        # App factory + lifespan (carga de modelos)
├── config.py                      # Pydantic Settings (env-based)
├── model_registry.py              # Registro de modelos ML (cargados al startup)
├── observability.py               # JSON structured logging + Sentry
│
├── models/                        # ★ Pydantic schemas (contratos HTTP)
│   ├── health.py                  #   HealthResponse
│   ├── embeddings.py              #   EmbeddingsRequest/Response
│   ├── nlp.py                     #   NlpRequest/Response + schemas anidados
│   ├── vision.py                  #   VisionRequest/Response
│   ├── relevancia.py              #   RelevanciaRequest/Response
│   ├── clustering.py              #   ClusteringRequest/Response
│   ├── anomalias.py               #   AnomaliasRequest/Response
│   ├── tendencias.py              #   TendenciasRequest/Response
│   └── scoring.py                 #   ScoreCalibrado + Calibrar schemas
│
├── routers/                       # ★ FastAPI APIRouter por capability
│   ├── health.py                  #   GET  /health
│   ├── embeddings.py              #   POST /embeddings, /embeddings/search
│   ├── nlp.py                     #   POST /nlp
│   ├── vision.py                  #   POST /vision
│   ├── relevancia.py              #   POST /relevancia
│   ├── clustering.py              #   POST /clustering
│   ├── anomalias.py               #   POST /anomalias
│   ├── tendencias.py              #   POST /tendencias
│   └── scoring.py                 #   POST /score-calibrado, /calibrar
│
├── services/                      # ★ Lógica de negocio por capability
│   ├── embedding_service.py       #   Sentence Transformers encoder
│   ├── nlp_service.py             #   Transformers + spaCy + NLTK
│   ├── vision_service.py          #   Vision engine (text-description v1)
│   ├── relevancia_service.py      #   Clasificador señal vs ruido
│   ├── clustering_service.py      #   KMeans clustering
│   ├── anomaly_service.py         #   Z-score anomaly detection
│   ├── trend_service.py           #   Least-squares trend estimation
│   ├── scoring_service.py         #   Calibrated risk scoring
│   └── calibration_service.py     #   ML calibration (CRISP-DM ligero)
│
├── repositories/                  # ★ Data access layer
│   └── pgvector_repo.py           #   PostgreSQL + pgvector persistence
│
└── tests/                         # 16 archivos de test
    ├── test_smoke.py              #   Smoke tests
    ├── test_estructura_smoke.py   #   Structural tests
    ├── test_health.py             #   Contract tests
    ├── test_router_contracts.py   #   Consolidated contract tests
    ├── test_scoring_property.py   #   Hypothesis PBT
    ├── test_memoria_semantica_property.py  # Hypothesis PBT
    └── test_*.py                  #   Unit tests por capability
```

#### Flujo de Capas

```
HTTP Request
    │
    ▼
[routers/]      Handlers delgados (5-15 líneas): parsear, llamar service, responder
    │
    ▼
[services/]     Lógica de negocio: orquestación, algoritmos, primitivas ML
    │
    ▼
[models/]       Pydantic schemas: contratos request/response (formas de datos)
    │
    ▼
[repositories/] Data access: persistencia pgvector (solo embeddings actualmente)
```

#### Inyección de Dependencias (FastAPI Depends)

```python
def get_nlp_service(request: Request) -> NlpService:
    service = getattr(request.app.state, "nlp_service", None)
    if service is None:
        service = NlpService()
        request.app.state.nlp_service = service
    return service
```

- Singleton por lifecycle de la app
- Overridable en tests vía `app.dependency_overrides`

#### Strategy Pattern (Algoritmos Inyectables)

Cada servicio acepta una **factory inyectable** para su algoritmo core:

| Servicio | Protocol | Default Factory |
|---|---|---|
| EmbeddingService | `Encoder` | SentenceTransformer real |
| NlpService | `NlpAnalyzer` | Transformers + spaCy + NLTK |
| VisionService | `VisionAnalyzer` | TextDescriptionVisionAnalyzer |
| ClusteringService | `Clusterer` | KMeans (sklearn) / PurePythonKMeans |
| AnomalyService | `AnomalyDetector` | Z-score (sklearn) / PurePython |
| TrendService | `TrendEstimator` | Least-squares (numpy) / PurePython |
| ScoringService | `Calibrator` | LinearCalibrator |
| RelevanciaService | `Classifier` | HeuristicClassifier |

#### Protocol-Based Structural Typing

```python
@runtime_checkable
class Encoder(Protocol):
    def encode(self, textos: list[str]) -> list[list[float]]: ...

@runtime_checkable
class NlpAnalyzer(Protocol):
    def emociones(self, texto: str) -> dict: ...
    def entidades(self, texto: str) -> list[dict]: ...
    def tokenizar(self, texto: str) -> list[str]: ...
```

#### Algoritmos Pure-Python (Sin ML para Tests)

| Algoritmo | Capacidad | Dependencias ML |
|---|---|---|
| `_PurePythonKMeans` | Clustering | Ninguna |
| `_ZScoreDetector` | Anomalías | Ninguna |
| `_LeastSquaresEstimator` | Tendencias | Ninguna |
| `_HeuristicClassifier` | Relevancia | Ninguna |
| `TextDescriptionVisionAnalyzer` | Visión | Ninguna |
| `IdentityCalibrator` | Scoring | Ninguna |

#### Ciclo de Calibración ML (CRISP-DM Ligero)

```
1. DATA      → ReferenciaCorpus con muestras supervisadas
2. MODELING  → LinearCalibrator (least squares closed-form)
3. EVALUATION→ MAE/RMSE antes y después
4. VERSIONING→ Hash determinístico del corpus + parámetros
```

#### Fortalezas

- Excelente testabilidad (Protocolos inyectables + algoritmos deterministicos)
- Sin necesidad de GPU/modelos para ejecutar tests completos
- MLOps-aware (calibración con versionado determinístico)
- Observabilidad production-ready (JSON logs + redacción de secrets + Sentry)
- Lazy imports de librerías pesadas (no descarga modelos al importar)
- App factory pattern (`create_app()`) para testing
- Contratos Pydantic estrictos con camelCase para consumo TypeScript

#### Debilidades

- Un solo repositorio (pgvector) — sin abstracción para futuras fuentes de datos
- Sin capa de dominio explícita separada de services
- Sin middleware custom (confía en FastAPI built-in)

---

## 5. Patrones Arquitectónicos Globales

### 5.1 Estilo de Comunicación

| Tipo | Protocolo | Servicios |
|---|---|---|
| **REST sincrónico** | HTTP/JSON | Cliente ↔ Servidor, Cliente ↔ ServidorGDS |
| **HTTP interno** | HTTP/JSON | ServidorGDS → ServicioIA |
| **WebSocket** | socket.io | Cliente ↔ ServidorGDS (progreso en tiempo real) |
| **Cola de mensajes** | BullMQ/Redis | ServidorGDS interno (procesamiento asíncrono) |
| **Eventos internos** | EventEmitter2 | ServidorGDS interno (ciclo → WebSocket) |

### 5.2 Persistencia

| Servicio | Base de Datos | ORM | Patrón |
|---|---|---|---|
| Servidor | PostgreSQL (compartida) | Prisma 6.6 | Active Record (directo en controllers) |
| ServidorGDS | PostgreSQL + pgvector (dedicada) | Prisma 5.22 | Repository pattern + DI |
| ServicioIA | PostgreSQL + pgvector | psycopg3 | Repository pattern (pgvector_repo) |

### 5.3 Seguridad

| Aspecto | Implementación |
|---|---|
| **Autenticación** | JWT compartido entre Servidor y ServidorGDS |
| **Autorización** | Roles por módulo (Servidor) / Guards globales (ServidorGDS) |
| **Transporte** | HTTPS (producción), CORS configurado |
| **Fail-closed** | ServidorGDS deniega por defecto; Servidor permite por defecto |

### 5.4 Orquestación

```
ServidorGDS actúa como orquestador del pipeline analítico:
    1. Recibe solicitud de análisis del Cliente
    2. Genera datos sintéticos (Simulation Module)
    3. Ejecuta pipeline de 11 etapas
    4. Delega análisis ML a ServicioIA (con fallback local)
    5. Persiste resultados + embeddings + memoria
    6. Genera reportes (PDF/Excel)
    7. Notifica progreso en tiempo real (WebSocket)
```

### 5.5 Patrón Global del Sistema

> **Arquitectura de Microservicios Políglota con Orquestador Inteligente**

| Característica | Implementación |
|---|---|
| Estilo global | Microservicios políglotas |
| Orquestador | ServidorGDS (NestJS) |
| Cerebro analítico | ServicioIA (FastAPI + ML) |
| Backend administrativo | Servidor (Express.js) |
| Frontend | SPA React (consume 2 backends) |
| Tiempo real | WebSocket (ServidorGDS → Cliente) |
| Colas | BullMQ + Redis (ServidorGDS) |

---

## 6. Matriz de Fortalezas y Debilidades

### Fortalezas por Servicio

| # | Cliente | Servidor | ServidorGDS | ServicioIA |
|---|---|---|---|---|
| 1 | Separación por feature | Estructura modular clara | Arquitectura Hexagonal real | Excelente testabilidad |
| 2 | Graceful degradation (GDS) | Jerarquía de excepciones | Pipeline resumible e idempotente | Protocolos inyectables |
| 3 | Guards fail-closed (GDS) | Schemas Zod por dominio | Graceful degradation (proxy IA) | Algoritmos pure-Python |
| 4 | Zustand + TanStack Query | Transacciones Prisma | Testing exhaustivo (100+ archivos) | MLOps-aware (CRISP-DM) |
| 5 | Barrel exports | — | DI extensivo (Symbols + factories) | Lazy imports de ML |
| 6 | — | — | Observabilidad (Pino + Sentry) | Observabilidad (JSON + Sentry) |
| 7 | — | — | Seguridad fail-closed | App factory pattern |

### Debilidades por Servicio

| # | Cliente | Servidor | ServidorGDS | ServicioIA |
|---|---|---|---|---|
| 1 | Sin estado global formal | Controllers "gordos" (800+ líneas) | Código legacy duplicado | Un solo repositorio |
| 2 | Dos sistemas UI coexistiendo | Sin service layer | Módulos placeholder vacíos | Sin capa de dominio explícita |
| 3 | Testing mínimo | Sin repository pattern | Sin CQRS/Event Sourcing | Sin middleware custom |
| 4 | Feature dashboard sin tests | Sin tests | Complejidad alta | — |
| 5 | `contexts/` vacío | Auth no global | — | — |
| 6 | — | Bug en JWT_SECRET | — | — |
| 7 | — | helmet/cors no cableados | — | — |
| 8 | — | PDFs sin abstracción | — | — |

---

## 7. Rutas y Endpoints del Sistema

### 7.1 Servidor (Express.js) — Prefijo `/api`

| Módulo | Prefijo | Endpoints |
|---|---|---|
| **Usuarios / Auth** | `/api/usuarios/auth` | `POST /signup`, `POST /login`, `POST /me` |
| **Usuarios / Auth Campo** | `/api/usuarios/auth/campo` | `POST /login` |
| **Usuarios / Usuario** | `/api/usuarios/usuario` | `GET /`, `GET /simple`, `GET /:id`, `PUT /:id`, `DELETE /:id/desactivar`, `POST /:id/activar`, `GET /filtrar` |
| **Usuarios / Roles** | `/api/usuarios/roles` | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `PUT /update/:id` |
| **Colegiados** | `/api/colegiados/colegiado` | `GET /`, `POST /`, `GET /report/summary`, `GET /:id/report`, `GET /getSimple`, `GET /getInvitados`, `GET /getOne/:id`, `PUT /update/:id`, `PUT /:id` |
| **Documentos** | `/api/colegiados/documentos` | `GET /:id`, `POST /:id`, `GET /ver/:id`, `GET /getOne/:id`, `GET /especifico/:id`, `PUT /update/:id` |
| **Pagos** | `/api/colegiados/pagos` | `GET /:id`, `POST /:id`, `GET /getOne/:id`, `PUT /update/:id` |
| **Invitados** | `/api/colegiados/invitados` | `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `GET /simple/:id`, `GET /reportSummary`, `GET /report/:id` |
| **Pasantes** | `/api/colegiados/pasantes` | `GET /`, `POST /`, `GET /:id`, `PUT /estado/:id`, `PUT /:id`, `DELETE /:id`, `GET /simple/:id`, `PUT /` |
| **Actividad Social** | `/api/ac-sociales/ac-social` | `GET /`, `GET /lista-minimal`, `GET /report`, `GET /:id/report`, `POST /asignarColegiado`, `POST /asignarPasante`, `PUT /update/:id`, `DELETE /:id`, `GET /detalles/:id`, `POST /:id/updateEstado`, `POST /create`, `GET /usuario/:rol/:id`, `GET /asignacion/:id`, `PATCH /asignacion/:id/entrada`, `PATCH /asignacion/:id/salida`, `PATCH /asignacion/:id/meta`, `GET /:id` |
| **Convenios** | `/api/ac-sociales/convenios` | `GET /`, `POST /`, `GET /getSimple`, `PUT /:id`, `GET /:id` |
| **Actividad Institucional** | `/api/ac-institucionales/ac-ins` | `GET /`, `POST /registrarColegiado`, `GET /lista-minimal`, `GET /:id/report`, `GET /report`, `GET /getRegistros/:id`, `GET /usuario/:id_colegiado`, `GET /getAsistencias/:id`, `GET /registro/:id/certificado`, `POST /createAsistencia`, `DELETE /deleteAsistencia/:id`, `GET /:id`, `PATCH /:id`, `PATCH /:id/estado`, `POST /` |
| **Correspondencia** | `/api/correspondencia/crsp` | `GET /`, `POST /`, `GET /report`, `GET /lista-minimal`, `GET /getAll`, `GET /getContenido/:id`, `PUT /marcarVisto/:id`, `DELETE /eliminar/:id`, `PUT /cambiarEstado/:id`, `GET /getOne/:id`, `PUT /:id`, `GET /ver/:id` |
| **Tesorería** | `/api/financiero/tesoreria` | `GET /report`, `GET /reportMovimiento`, `GET /:id/report`, `GET /presupuestos`, `GET /presupuestos/:id`, `POST /presupuestos`, `PATCH /presupuestos/:id`, `DELETE /presupuestos/:id`, `GET /presupuestos/:id/movimientos`, `POST /movimientos`, `PATCH /movimientos/:id`, `DELETE /movimientos/:id` |
| **Auditorías** | `/api/auditorias` | `GET /`, `GET /report` |

**Total Servidor:** ~88 endpoints HTTP

### 7.2 ServidorGDS (NestJS) — Prefijo `/api/gds`

| Controlador | Prefijo | Endpoints |
|---|---|---|
| **Health** | `/api/gds` | `GET /health` |
| **Institutions** | `/api/gds/institutions` | `GET /`, `GET /:id`, `GET /:id/restricciones`, `POST /`, `PUT /:id`, `DELETE /:id` |
| **Analysis** | `/api/gds/analisis` | `GET /`, `GET /:id`, `POST /`, `DELETE /:id` |
| **Escenarios** | `/api/gds/escenarios` | `GET /`, `GET /:id`, `POST /`, `POST /seed`, `PUT /:id` |
| **Reports** | `/api/gds` | `POST /analisis/:analisisId/reportes`, `GET /analisis/:analisisId/reportes`, `GET /reportes/:id`, `GET /reportes/:id/export/pdf`, `GET /reportes/:id/export/excel` |
| **Gestor Ejecución** | `/api/gds/analisis` | `PUT /:id/modo`, `POST /:id/avanzar`, `POST /:id/pausar`, `POST /:id/reanudar` |
| **WebSocket** | `gds/progreso` | Eventos: `suscribir`, `desuscribir`, `progreso` |

**Total ServidorGDS:** ~22 endpoints HTTP + 3 eventos WebSocket

### 7.3 ServicioIA (FastAPI) — Sin Prefijo

| Router | Endpoints |
|---|---|
| **Health** | `GET /health` |
| **Embeddings** | `POST /embeddings`, `POST /embeddings/search` |
| **NLP** | `POST /nlp` |
| **Vision** | `POST /vision` |
| **Relevancia** | `POST /relevancia` |
| **Clustering** | `POST /clustering` |
| **Anomalías** | `POST /anomalias` |
| **Tendencias** | `POST /tendencias` |
| **Scoring** | `POST /score-calibrado`, `POST /calibrar` |

**Total ServicioIA:** 11 endpoints HTTP

### Resumen Global

| Servicio | Archivos de Rutas | Endpoints Definidos |
|---|---|---|
| **Servidor** (Express) | 17 archivos | ~88 HTTP |
| **ServidorGDS** (NestJS) | 6 controllers + 1 WS gateway | ~22 HTTP + 3 WS |
| **ServicioIA** (FastAPI) | 9 routers | 11 HTTP |
| **Total** | **32 archivos** | **~121 HTTP + 3 WS** |

---

## 8. Conclusiones y Diagnóstico Enterprise

### 8.1 Diagnóstico Global

| Nivel | Patrón Arquitectónico |
|---|---|
| **Sistema completo** | Microservicios políglotas con orquestador inteligente |
| **ServidorGDS + ServicioIA** | Hexagonal / Ports-and-Adapters (integrados entre ambos) |
| **Servidor** | MVC modular (independiente, pragmático) |
| **Cliente** | Feature-Based / Vertical Slice (independiente) |

### 8.2 No Existe un Patrón Enterprise Unificado

El sistema **no aplica una arquitectura de software unificada** a nivel global. Los cuatro servicios evolucionaron de forma independiente, resultando en:

- **Eje ServidorGDS ↔ ServicioIA**: Calidad enterprise real. Hexagonal, DI extensivo, testing robusto (unit + PBT + E2E), graceful degradation, observabilidad production-ready, colas de procesamiento, WebSocket en tiempo real.
- **Servidor**: Calidad pragmática. Funcional pero con deuda técnica significativa (controllers monolíticos, sin tests, auth inconsistente, bug en JWT_SECRET).
- **Cliente**: Calidad media. Buena separación por features en el módulo GDS, pero el dashboard carece de gestión de estado formal y testing.

### 8.3 Recomendaciones Prioritarias

| Prioridad | Acción | Servicio | Impacto |
|---|---|---|---|
| **Crítica** | Corregir bug `JWT_SECRET = process.env.PORT` | Servidor | Seguridad |
| **Crítica** | Cablear `helmet` y `cors` en Express | Servidor | Seguridad |
| **Alta** | Implementar auth middleware global | Servidor | Seguridad |
| **Alta** | Eliminar código muerto (`instituciones/` legacy) | ServidorGDS | Mantenibilidad |
| **Alta** | Extraer service layer de controllers "gordos" | Servidor | Mantenibilidad |
| **Media** | Implementar test suite básico | Servidor | Calidad |
| **Media** | Unificar sistema UI (MUI → Tailwind/Shadcn) | Cliente | Consistencia |
| **Media** | Agregar estado global formal (Zustand/Context) | Cliente | Escalabilidad |
| **Baja** | Renombrar `analisis/` a `pipeline-services/` | ServidorGDS | Claridad |
| **Baja** | Agregar repository pattern a ServicioIA | ServicioIA | Extensibilidad |

### 8.4 Resumen Ejecutivo Final

El sistema CDPLP demuestra capacidad de diseño arquitectónico de alto nivel en los servicios más recientes (ServidorGDS y ServicioIA), donde se aplican patrones enterprise como Arquitectura Hexagonal, Pipeline Processing, Event-Driven Architecture, Graceful Degradation y Property-Based Testing. Sin embargo, el servicio original (Servidor) y partes del frontend (Cliente) representan deuda técnica acumulada que requiere atención para alcanzar un nivel enterprise consistente en toda la plataforma.

La arquitectura global se clasifica como **Microservicios Políglotas con Orquestador Inteligente**, donde cada servicio mantiene independencia arquitectónica pero se integran mediante REST, WebSocket y colas de procesamiento para formar una plataforma cohesiva.

---

*Documento generado automáticamente — Junio 2026*
