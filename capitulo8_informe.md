# Capítulo 8 — Programación Gráfica

## 8.1. Introducción al desarrollo de proyectos académicos

### 8.1.1. Propósito

<!-- COMPLETAR: Describir el propósito del sistema CDPLP / Plataforma_GDS (gestión de colegiados, análisis de tendencias de riesgo emocional mediante IA, etc.). -->

El presente capítulo documenta el proceso de desarrollo de la **Plataforma CDPLP / Plataforma_GDS**, un sistema integral orientado a la gestión de colegiados y al análisis inteligente de datos institucionales. El sistema integra programación orientada a componentes gráficos, arquitecturas modernas de software y capacidades de inteligencia artificial, con el objetivo de ofrecer una herramienta funcional, escalable y visualmente efectiva.

### 8.1.2. Importancia de la integración entre programación, diseño e innovación

<!-- COMPLETAR: Explicar por qué se decidió unificar frontend moderno (React), múltiples backends (Node/Express, NestJS) y un servicio de IA (FastAPI/Python) en un único monorepo. -->

La plataforma demuestra cómo la convergencia entre diseño de interfaz, arquitecturas de backend robustas y módulos de inteligencia artificial produce un sistema capaz de responder tanto a necesidades operativas como analíticas. La integración de tecnologías heterogéneas —React 19, NestJS, Express, FastAPI y PostgreSQL con pgvector— refleja una apuesta deliberada por la innovación técnica en un entorno académico-institucional real.

---

## 8.2. Tecnologías obligatorias para el desarrollo

### 8.2.1. Tecnologías de backend permitidas

El sistema utiliza **tres servicios de backend** diferenciados por responsabilidad:

| Servicio      | Stack principal                           | Puerto |
|---------------|-------------------------------------------|--------|
| `Servidor`    | Node.js + Express 5 + Prisma (TypeScript) | 3000   |
| `ServidorGDS` | NestJS 10 + Prisma + BullMQ + WebSockets  | 4100   |
| `ServicioIA`  | Python 3.11+ + FastAPI + Uvicorn          | 8000   |

> **Nota sobre Django:** El servicio Python del proyecto se implementó con **FastAPI**, no con Django. FastAPI fue elegido por su soporte nativo de tipado con Pydantic, alto rendimiento asíncrono (ASGI) y generación automática de documentación OpenAPI, características más adecuadas para un servicio interno de inferencia de modelos ML.

### 8.2.4. Tecnologías de frontend web permitidas

El frontend web está desarrollado con **React 19** empaquetado mediante **Vite 6**, con las siguientes bibliotecas de soporte:

- **Material UI v7** (MUI): sistema de componentes accesibles y temáticos.
- **Tailwind CSS v4**: utilidades de estilos complementarias.
- **Framer Motion**: animaciones declarativas de alta calidad.
- **Chart.js / Recharts**: gráficas de datos interactivas.
- **React Leaflet**: mapas interactivos georreferenciados.
- **React Hook Form + Zod**: formularios con validación de esquemas.
- **TanStack Query v5**: gestión de estado asíncrono y caché de peticiones.
- **Zustand v5**: estado global del cliente.
- **Socket.IO Client**: comunicación en tiempo real con el backend.
- **@react-pdf/renderer**: generación de PDFs desde el frontend.

### 8.2.6. Desarrollo con React

<!-- COMPLETAR: Describir con más detalle la estructura de la aplicación React: cada feature, el sistema de rutas con React Router v7, la protección de rutas por rol, y el flujo de autenticación. -->

La interfaz de usuario está construida íntegramente en **React 19** con un enfoque de *feature-based architecture*. Las funcionalidades se agrupan en módulos de características bajo `ClienteCDPLPL/src/features/`:

- `auth/` — login, registro, recuperación de contraseña.
- `dashboard/` — panel principal con métricas e indicadores.
- `gds/` — módulo del Sistema GDS (análisis, instituciones, reportes IA).
- `campo/` — funcionalidades de trabajo de campo.
- `public/` — vistas sin autenticación.

La navegación se gestiona con **React Router DOM v7** y la sesión de usuario con **Zustand** (persistida en localStorage).

---

## 8.3. Requerimientos mínimos del sistema

### 8.3.1. Componentes gráficos funcionales

<!-- COMPLETAR: Ampliar con capturas o descripción detallada de cada componente gráfico implementado en el sistema real. -->

El sistema implementa los siguientes componentes gráficos funcionales:

- **Navbar** dinámico con control de sesión y menú por roles.
- **Modal** reutilizable para confirmaciones y formularios emergentes.
- Biblioteca de componentes UI personalizados en `src/components/ui/`.
- **Formularios** con validación integrada en tiempo real (React Hook Form + Zod).
- **Tablas de datos** con paginación, filtros y ordenamiento.
- **Cards** informativas por módulo (colegiados, actividades, finanzas, GDS).
- **Menús dinámicos** condicionados al rol del usuario autenticado (RBAC).

### 8.3.2. Integración mínima de dashboards, tablas, formularios, gráficas, cards y menús dinámicos

<!-- COMPLETAR: Describir cada sección del dashboard: qué métricas muestra, qué gráficas específicas usa (barras, líneas, radar, etc.), qué tablas tiene cada módulo. -->

El módulo `features/dashboard` centraliza los indicadores clave del sistema. Se emplean gráficas de líneas, barras y radar mediante **Chart.js** y **Recharts** para visualizar:

- Métricas de actividad institucional y social.
- Tendencias financieras (cuotas, egresos, balance).
- Indicadores del sistema GDS (análisis emocional, clustering, scoring de riesgo).
- Mapa de actividades sociales con **React Leaflet** (geolocalización).

Las tablas de gestión operativa abarcan los módulos: colegiados, correspondencia, actividades institucionales y sociales, y finanzas.

### 8.3.3. Incorporación de componentes multimedia

<!-- COMPLETAR: Detallar qué tipos de archivos soporta el sistema, el flujo de subida con multer/S3, y cómo se visualizan en el frontend. -->

El sistema integra manejo de archivos multimedia a través de:

- **AWS S3** para almacenamiento persistente de documentos, imágenes y adjuntos. El `Servidor` recibe archivos mediante `multer` y los sube a S3 con `@aws-sdk/client-s3`; el acceso se genera con URLs prefirmadas mediante `s3-request-presigner`.
- Generación de documentos **PDF** con `pdfkit` y `puppeteer` (capturas automáticas de reportes).
- Soporte de archivos adjuntos en los módulos de correspondencia y actividades institucionales.
- Generación de PDFs desde el frontend con `@react-pdf/renderer`.

### 8.3.5. Funcionalidades basadas en inteligencia artificial

El **ServicioIA** constituye el cerebro analítico de la plataforma. Implementado en Python 3.11+ con FastAPI, expone los siguientes endpoints de inferencia:

| Endpoint                 | Función                                                     |
|--------------------------|-------------------------------------------------------------|
| `POST /embeddings`       | Generación de embeddings semánticos (Sentence-Transformers) |
| `POST /nlp`              | Análisis de lenguaje natural (spaCy, NLTK, Transformers)    |
| `POST /vision`           | Procesamiento de imágenes (Torch + Transformers)            |
| `POST /relevancia`       | Filtro de relevancia semántica                              |
| `POST /clustering`       | Agrupamiento temático (scikit-learn)                        |
| `POST /anomalias`        | Detección de anomalías en datos de comportamiento           |
| `POST /tendencias`       | Análisis de tendencias temporales                           |
| `POST /score-calibrado`  | Scoring de riesgo emocional calibrado                       |

### 8.3.6. Requisitos mínimos de IA en el sistema

<!-- COMPLETAR: Especificar los modelos concretos usados (nombre del modelo Sentence-Transformers, pipeline de spaCy en español, modelo de visión, etc.) y el rol de cada uno en el análisis GDS. -->

Los modelos de IA se cargan en memoria al arranque del `ServicioIA` mediante el `ModelRegistry` (patrón Singleton), garantizando una única instancia por proceso. El `ServidorGDS` actúa como orquestador: consume los endpoints del `ServicioIA` vía HTTP interno y coordina los resultados a través de colas **BullMQ** sobre Redis para procesamiento asíncrono desacoplado. Los resultados se persisten en PostgreSQL con la extensión **pgvector**, habilitando búsqueda semántica vectorial sobre los embeddings generados.

---

## 8.4. Arquitectura de software aplicada

### 8.4.1. Aplicación de Clean Architecture

<!-- COMPLETAR: Describir con más detalle cómo fluye una petición en el Servidor: desde la ruta hasta el módulo de dominio, cómo se valida, cómo accede a Prisma y cómo responde. -->

El `Servidor` (Express 5) aplica principios de Clean Architecture mediante la separación en capas:

- **Rutas** (`src/routes/`): definición y agrupación de endpoints HTTP.
- **Módulos de dominio** (`src/modules/`): lógica de negocio por entidad de dominio:
  - `colegiados/`, `financiero/`, `correspondencia/`, `actividad-institucional/`, `actividad-social/`, `usuarios/`, `gds/`, `Auditorias/`.
- **Middlewares** (`src/middlewares/`): autenticación JWT, manejo centralizado de errores.
- **Utilidades** (`src/utils/`): helpers transversales (generación de PDF, helpers de S3, etc.).
- **Tipos** (`src/types/`): contratos de TypeScript compartidos entre capas.

### 8.4.2. Aplicación de Arquitectura Hexagonal

<!-- COMPLETAR: Describir con ejemplos concretos cómo cada módulo NestJS de ServidorGDS separa su lógica de dominio de los adaptadores (Prisma, BullMQ, HTTP al ServicioIA). -->

El `ServidorGDS` (NestJS 10) implementa una variante de **Arquitectura Hexagonal** (Ports & Adapters):

- **Núcleo de dominio**: módulos de análisis (`analisis/`, `ml/`, `nlp-engine/`, `vision-engine/`, `ai-engine/`) que encapsulan la lógica de orquestación sin depender de detalles de infraestructura.
- **Puertos de salida**: interfaces hacia Prisma (persistencia), Redis/BullMQ (colas asíncronas), ServicioIA (inferencia IA) y WebSockets (notificaciones en tiempo real).
- **Adaptadores de entrada**: controladores NestJS que reciben peticiones HTTP y eventos de WebSocket (`ws/`).
- **Adaptadores de infraestructura**: módulos transversales `queue/`, `events/`, `config/`, `prisma/`.

### 8.4.3. Separación de responsabilidades

Cada componente del monorepo tiene una responsabilidad única y delimitada:

| Componente      | Responsabilidad única                                            |
|-----------------|------------------------------------------------------------------|
| `ClienteCDPLPL` | Presentación, interacción de usuario y visualización de datos    |
| `Servidor`      | CRUD operacional del colegio (colegiados, finanzas, actividades) |
| `ServidorGDS`   | Análisis de tendencias, orquestación IA, datos del sistema GDS   |
| `ServicioIA`    | Inferencia de modelos ML/NLP (servicio interno, no público)      |

### 8.4.4. Escalabilidad y mantenibilidad del código

<!-- COMPLETAR: Mencionar cómo Docker Compose permite reemplazar un servicio sin afectar a los demás, y cómo la separación de DBs evita acoplamiento de esquemas. -->

La plataforma está diseñada para escalar de forma independiente por componente:

- **Contenerización** completa con Docker; orquestación mediante `docker-compose.yml` en la raíz del monorepo.
- **Bases de datos separadas**: `Servidor` y `ServidorGDS` poseen instancias PostgreSQL independientes (sin acoplamiento de esquemas).
- **Redis** como broker de colas BullMQ para procesamiento asíncrono desacoplado y resiliente.
- **pgvector** en la BD del `ServidorGDS` para operaciones de similitud semántica de alta eficiencia.
- **TypeScript** en todos los servicios Node.js garantiza contratos de tipo en tiempo de compilación, reduciendo errores en integración.

### 8.4.5. Buenas prácticas de diseño y desarrollo

- Validación de entrada con **Zod** (frontend y `Servidor`) y **class-validator** + `ValidationPipe` global (`ServidorGDS`).
- Hashing de contraseñas con **bcrypt** (factor de coste configurable).
- Cabeceras de seguridad HTTP con **Helmet** en ambos backends Node.js.
- Logging estructurado con **Pino** (`ServidorGDS`) y captura de errores no controlados con **Sentry** (todos los servicios).
- Documentación **OpenAPI/Swagger** auto-generada en `ServidorGDS` en `/api/gds/docs`.
- Variables de entorno gestionadas con `.env.example` como referencia; los `.env` reales no se versionan.

---

## 8.5. Comunicación entre sistemas

### 8.5.1. Integración frontend y backend

El `ClienteCDPLPL` se comunica con dos backends mediante variables de entorno Vite:

- `VITE_API_URL` → `Servidor` (puerto 3000): operaciones CRUD del colegio.
- `VITE_GDS_API_URL` → `ServidorGDS` (puerto 4100): análisis GDS, dashboards avanzados.

La comunicación en tiempo real se realiza mediante **Socket.IO** (cliente React ↔ servidor NestJS con `@nestjs/platform-socket.io` y `socket.io` v4.8).

### 8.5.2. Uso de API's RESTful

Todos los endpoints siguen convenciones REST con respuestas JSON estandarizadas:

- `Servidor`: API REST en `http://localhost:3000/`.
- `ServidorGDS`: API REST en `http://localhost:4100/api/gds/` con documentación Swagger integrada en `/api/gds/docs`.
- `ServicioIA`: API REST interna en `http://localhost:8000/` con documentación FastAPI en `/docs` (solo acceso de desarrollo).

Las peticiones HTTP se realizan con **Axios** en el frontend (`ClienteCDPLPL`) y en el `ServidorGDS` (para consumir el `ServicioIA` mediante `@nestjs/axios`).

### 8.5.3. Intercambio de datos entre capas

<!-- COMPLETAR: Describir el flujo completo de datos de un caso de uso GDS: desde que el frontend solicita un análisis hasta que recibe los resultados por WebSocket. -->

El intercambio de datos entre capas sigue el formato **JSON** en todos los extremos. Los contratos se formalizan mediante:

- **DTOs con class-validator** en `ServidorGDS` (validados automáticamente por `ValidationPipe` global; entradas no conformes son rechazadas con error 400).
- **Esquemas Zod** en `Servidor` y `ClienteCDPLPL` para validación en runtime.
- **Modelos Pydantic v2** en `ServicioIA` para validación de payloads de entrada y salida de los endpoints de inferencia.

### 8.5.4. Consideraciones para consumo de servicios

- El `ServicioIA` **no se expone públicamente** en producción; en Docker Compose solo es accesible dentro de la red interna de contenedores.
- La autenticación se gestiona con **JWT Bearer tokens** (secreto `JWT_SECRET` compartido entre `Servidor` y `ServidorGDS`).
- **CORS** configurado por variable de entorno (`CORS_ORIGIN`) en ambos backends Node.js, restringiendo el origen permitido al dominio del frontend.

---

## 8.6. Base de Datos del proyecto

### 8.6.1. Uso de PostgreSQL

El proyecto utiliza **PostgreSQL** como único motor de base de datos, con dos instancias independientes:

- **BD del `Servidor`**: datos operacionales del colegio (colegiados, actividades, finanzas, correspondencia, usuarios).
- **BD del `ServidorGDS`**: datos analíticos con la extensión **pgvector** habilitada para almacenamiento y búsqueda semántica de embeddings generados por el `ServicioIA`.

### 8.6.2. Estructura general de persistencia

<!-- COMPLETAR: Listar todas las entidades del schema del Servidor con una descripción breve de su función. También describir las entidades principales del ServidorGDS (ciclos, instituciones, evidencias, escenarios, memoria vectorial). -->

La persistencia se gestiona mediante **Prisma ORM** en ambos backends Node.js. El esquema del `Servidor` (`Servidor/prisma/schema.prisma`) comprende las entidades:

- `usuarios` — cuentas y roles de acceso al sistema.
- `colegiados` — miembros del colegio profesional con todos sus datos.
- `actividades_institucionales` — eventos institucionales programados.
- `actividades_sociales` — actividades sociales con geolocalización (latitud/longitud).
- `asistencias_actividad` — registro de asistencia colegiado-actividad.
- `colegiados_registrados_actividad_institucional` — inscripción a actividades con método de pago.
- `correspondencia` — gestión documental de comunicaciones.
- `invitados` — participantes externos a actividades.
- Módulo financiero: cuotas, egresos, origen de movimientos.

El `ServidorGDS` mantiene su propio esquema Prisma con entidades para ciclos de análisis, instituciones monitoreadas, evidencias recopiladas, escenarios de riesgo, memoria vectorial (embeddings en pgvector) y reportes generados por IA.

### 8.6.3. Relación entre la Base de Datos y la lógica de negocio

Prisma actúa como capa de abstracción entre la lógica de negocio y PostgreSQL: genera un cliente tipado (`@prisma/client`) que garantiza correspondencia entre el esquema y el código TypeScript. Los módulos de dominio de cada backend delegan en el cliente Prisma para operaciones de lectura/escritura, manteniendo la lógica de negocio desacoplada del SQL directo.

### 8.6.4. Buenas prácticas en modelado y acceso a datos

- **Migraciones versionadas** con `prisma migrate dev` para control de cambios del esquema.
- **Bases de datos separadas** para `Servidor` y `ServidorGDS` (aislamiento total de dominios).
- Variables `DATABASE_URL` gestionadas por entorno, excluidas del repositorio con `.gitignore`.
- Extensión **pgvector** para columnas de tipo `vector` y operaciones de similitud coseno/L2 sobre embeddings float[].
- **Seed de datos iniciales** (`seed_admin.ts`) para poblar el administrador por defecto en entornos nuevos.

---

## 8.7. Consideraciones adicionales de desarrollo

### 8.7.1. Control de versiones con Git o GitLab

El proyecto utiliza **Git** como sistema de control de versiones. El repositorio contiene:

- `.git/` — historial completo de versiones.
- `.github/` — workflows de CI/CD (GitHub Actions).
- `.gitignore` configurados en cada componente para excluir: `node_modules/`, `.venv/`, `dist/`, archivos `.env` con secretos, logs, cachés de builds.

### 8.7.2. Manejo adecuado de dependencias

- **Node.js**: dependencias declaradas en `package.json` con versiones fijadas; `package-lock.json` versionado para builds reproducibles.
- **Python**: dependencias separadas en `requirements.txt` (producción) y `requirements-dev.txt` (desarrollo/tests); entorno virtual `.venv` aislado del sistema.
- **Docker**: cada servicio tiene su propio `Dockerfile` con imagen base fija y `.dockerignore` para excluir artefactos innecesarios del contexto de build.

### 8.7.3. Seguridad básica de autenticación y autorización

- **JWT** para autenticación stateless en ambos backends Node.js (`jsonwebtoken`, `@nestjs/jwt`, `passport-jwt`).
- **bcrypt** para hashing seguro de contraseñas en el `Servidor`.
- **Helmet** para cabeceras de seguridad HTTP (CSP, HSTS, X-Frame-Options, etc.) en ambos backends.
- **RBAC** (Control de Acceso Basado en Roles) implementado en el frontend mediante menús dinámicos condicionados al rol del token JWT y guards de ruta en React Router.
- **Zod / class-validator** para validación y sanitización estricta de entradas en todos los niveles del sistema.

### 8.7.4. Diseño responsivo

<!-- COMPLETAR: Describir breakpoints específicos usados, cómo se adapta el menú en mobile, y qué vistas tienen comportamiento diferenciado por tamaño de pantalla. -->

La interfaz implementa diseño responsivo mediante:

- **Material UI v7**: sistema de grid de 12 columnas con breakpoints (`xs`, `sm`, `md`, `lg`, `xl`) y componentes adaptativos.
- **Tailwind CSS v4**: clases utilitarias responsivas (`sm:`, `md:`, `lg:`, `xl:`) para ajustes finos de layout.
- **Layouts adaptativos** en `ClienteCDPLPL/src/layouts/` diferenciados por contexto: autenticado, público y campo (trabajo de campo en dispositivos móviles).

### 8.7.5. Documentación técnica y funcional del proyecto

- **README.md** en la raíz del monorepo con instrucciones completas de instalación, configuración de variables de entorno y arranque de cada componente.
- **README.md** individuales en `ClienteCDPLPL/` y `ServidorGDS/` con detalles específicos.
- **Swagger/OpenAPI** auto-generado en `ServidorGDS` en `/api/gds/docs`.
- **FastAPI Docs** auto-generada en `ServicioIA` en `/docs` (entorno de desarrollo).
- **`.env.example`** en cada componente como referencia documentada de variables de entorno requeridas.

---

## 8.8. Evaluación del proyecto académico

### 8.8.1. Criterios de cumplimiento técnico

<!-- COMPLETAR: Expandir cada criterio con evidencia concreta del código (rutas, archivos, módulos). -->

El sistema satisface los siguientes criterios técnicos:

- ✅ Backend con Node.js/Express (API CRUD del colegio) y NestJS (servicio analítico GDS).
- ✅ Servicio de IA con Python 3.11+ y FastAPI (inferencia de 8 capacidades ML/NLP).
- ✅ Frontend con React 19 + Vite 6 (componentes, dashboards, formularios, gráficas).
- ✅ Base de datos PostgreSQL con Prisma ORM (dos instancias independientes, una con pgvector).
- ✅ Arquitectura modular: Clean Architecture en `Servidor`, Arquitectura Hexagonal en `ServidorGDS`.
- ✅ Autenticación y autorización JWT con RBAC.
- ✅ API RESTful documentada con Swagger/OpenAPI.
- ✅ Comunicación en tiempo real con WebSockets (Socket.IO).
- ✅ Control de versiones con Git y CI/CD con GitHub Actions.

### 8.8.2. Validación de funcionalidades mínimas

<!-- COMPLETAR: Describir casos de prueba concretos implementados (qué valida cada suite de tests). -->

La plataforma incluye cobertura de pruebas en múltiples niveles:

- **Frontend**: pruebas unitarias con **Vitest** + Testing Library y pruebas de integración E2E con **Playwright** (carpeta `e2e/`).
- **ServidorGDS**: pruebas unitarias e integración con **Jest** en `src/__tests__/` y `test/`; pruebas basadas en propiedades con **fast-check** (módulo `pbt`).
- **ServicioIA**: pruebas con **pytest**; `conftest.py` provee fixtures de inyección de modelos ligeros para tests deterministas sin GPU.

### 8.8.3. Revisión de la arquitectura implementada

La estructura de monorepo facilita la revisión integral del sistema. Cada componente es evaluable de forma independiente mediante su propio servidor de desarrollo. El `docker-compose.yml` en la raíz permite levantar el stack completo (PostgreSQL+pgvector, Redis, ServicioIA, ServidorGDS, Frontend/Nginx) con un único comando `docker compose up --build` para revisión funcional integrada.

### 8.8.4. Evaluación de la integración de IA, multimedia y componentes gráficos

<!-- COMPLETAR: Documentar un flujo de caso de uso real del sistema GDS con datos de ejemplo. -->

La integración de IA se manifiesta en el siguiente flujo de procesamiento:

1. El **frontend** envía datos de entrada al `ServidorGDS` (texto de evidencias, métricas institucionales).
2. El `ServidorGDS` encola la tarea en **BullMQ** (Redis) para procesamiento asíncrono.
3. El **worker** ejecuta la pipeline: llama al `ServicioIA` → `POST /embeddings` → `POST /nlp` → `POST /clustering` → `POST /score-calibrado`.
4. Los resultados (vectores, scores, clusters) se persisten en **PostgreSQL+pgvector**.
5. El **frontend** consulta los resultados por REST y los visualiza en dashboards interactivos con **Recharts/Chart.js**.
6. Las actualizaciones en tiempo real se propagan al frontend mediante **WebSockets** (Socket.IO), sin necesidad de polling.

---

## 8.9. Cierre y proyección del proyecto

### 8.9.1. Síntesis de los lineamientos aplicados

<!-- COMPLETAR: Redactar un párrafo de cierre que evalúe el nivel de cumplimiento de cada lineamiento del capítulo en el contexto específico del sistema. -->

La **Plataforma CDPLP / Plataforma_GDS** integra de forma coherente los lineamientos de programación gráfica moderna: frontend React responsivo con componentes interactivos y animados, backends modulares con clara separación de responsabilidades, servicio de inteligencia artificial especializado en análisis semántico y scoring de riesgo, persistencia robusta en PostgreSQL, comunicación REST + WebSockets, seguridad JWT con RBAC y control de versiones con Git.

### 8.9.2. Relevancia del desarrollo con tecnologías emergentes

El proyecto emplea tecnologías de vanguardia que representan el estado del arte en desarrollo web full-stack:

- **React 19** con Concurrent Features y mejoras de rendimiento de renderizado.
- **NestJS 10** con WebSockets, procesamiento de colas y arquitectura modular empresarial.
- **FastAPI** con inferencia de modelos Transformer (Sentence-Transformers, spaCy, Torch) en Python 3.11+.
- **pgvector** para búsqueda semántica vectorial nativa en PostgreSQL (sin base de datos vectorial externa).
- **BullMQ** sobre Redis para orquestación de tareas asíncronas con reintentos y monitoreo.
- **Framer Motion** para animaciones de interfaz de nivel profesional.
- **Prisma ORM** con migraciones tipadas y generación de cliente seguro.

### 8.9.3. Proyección hacia mejora, escalabilidad e innovación futura

<!-- COMPLETAR: Priorizar las líneas de mejora según el contexto del colegio profesional y el sistema GDS. -->

Las líneas de evolución proyectadas para el sistema incluyen:

- **Escalado horizontal** de `ServidorGDS` y `ServicioIA` mediante orquestación con Kubernetes.
- **Integración de LLMs** (Large Language Models) en el `ServicioIA` para análisis conversacional y generación de reportes narrativos automáticos.
- **Aplicación móvil** complementaria para trabajo de campo (React Native), aprovechando la API REST existente sin cambios en el backend.
- **Monitoreo avanzado** con métricas Prometheus y dashboards Grafana sobre todos los servicios contenerizados.
- **CI/CD completo** mediante GitHub Actions: pipelines de lint, tests, build y despliegue automatizado en cada push a rama principal.
- **Internacionalización** (i18n) del frontend para soporte multiidioma.
