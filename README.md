# Plataforma_GDS / CDPLP

Monorepo de la plataforma. Está compuesto por cuatro componentes que se ejecutan
de forma independiente, más una orquestación con Docker Compose para levantar todo
junto.

| Carpeta | Componente | Stack | Puerto por defecto |
|---|---|---|---|
| `ClienteCDPLPL/` | Frontend web | React 19 + Vite + Tailwind/MUI | `5173` (dev) |
| `Servidor/` | API REST del colegio | Node + Express 5 + Prisma (TypeScript) | `3000` |
| `ServidorGDS/` | Backend autónomo GDS | NestJS 10 + Prisma + BullMQ + WebSockets | `4100` |
| `ServicioIA/` | Cerebro analítico | Python 3.11+ + FastAPI | `8000` |

> El `ServicioIA` es un servicio interno: en producción no se expone públicamente,
> solo lo consume el `ServidorGDS` por HTTP.

---

## Requisitos previos

- **Node.js** 18+ y **npm** (para `ClienteCDPLPL`, `Servidor`, `ServidorGDS`)
- **Python** 3.11+ (para `ServicioIA`)
- **PostgreSQL** (el `ServidorGDS` requiere PostgreSQL con la extensión **pgvector**)
- **Redis** (usado por `ServidorGDS` para colas BullMQ y caché)
- **Docker** y **Docker Compose** (opcional, para levantar todo de una vez)

---

## ⚠️ Antes de empezar: variables de entorno

Cada componente trae un archivo `.env.example`. Hay que **copiarlo a `.env`** y
rellenarlo con valores reales. Los `.env` reales **no se versionan** (están en
`.gitignore`); no subas secretos al repositorio.

En Windows (cmd):

```cmd
copy .env.example .env
```

En PowerShell / Linux / macOS:

```bash
cp .env.example .env
```

---

## 1. ClienteCDPLPL (Frontend)

```cmd
cd ClienteCDPLPL
copy .env.example .env
npm install
npm run dev
```

Abre la URL que muestra Vite (por defecto `http://localhost:5173`).

Variables clave (`.env`):
- `VITE_API_URL` → URL del `Servidor` del colegio (ej. `http://localhost:3000`)
- `VITE_GDS_API_URL` → URL del `ServidorGDS` (ej. `http://localhost:4000` o `:4100`)

Otros scripts útiles:

```cmd
npm run build       :: build de producción
npm run preview     :: previsualizar el build
npm run lint        :: ESLint
npm run typecheck   :: chequeo de tipos
npm run test        :: tests unitarios (Vitest)
npm run test:e2e    :: tests E2E (Playwright)
```

---

## 2. Servidor (API REST del colegio)

```cmd
cd Servidor
copy .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
npm start
```

`npm start` ejecuta `nodemon` con `ts-node` sobre `src/index.ts`. Por defecto
escucha en `http://localhost:3000`.

Variables clave (`.env`):
- `DATABASE_URL` → conexión PostgreSQL
- `PORT` → puerto HTTP
- `JWT_SECRET` → secreto para firmar tokens
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET_NAME`, `AWS_REGION`
  → almacenamiento de archivos en S3

> Las credenciales de AWS son sensibles. Nunca las subas al repo y rótalas si se filtran.

---

## 3. ServidorGDS (Backend autónomo GDS)

Requiere **PostgreSQL + pgvector** y **Redis** corriendo (dedicados, independientes
de la base del colegio).

```cmd
cd ServidorGDS
copy .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

Por defecto escucha en `http://localhost:4100` y la documentación Swagger queda en
`http://localhost:4100/api/gds/docs`.

Variables clave (`.env`):
- `PORT` → puerto propio del servicio (ej. `4100`)
- `DATABASE_URL` → PostgreSQL + pgvector **dedicada** (no la del colegio)
- `REDIS_URL` → instancia de Redis propia
- `JWT_SECRET` → secreto JWT compartido con el `Servidor` del colegio
- `SERVICIO_IA_URL` → URL del `ServicioIA` (ej. `http://localhost:8000`)
- `CORS_ORIGIN` → origen del frontend (ej. `http://localhost:5173`)

Otros scripts útiles:

```cmd
npm run build        :: compilar
npm run start:prod   :: ejecutar el build
npm run test         :: tests (Jest)
npm run typecheck    :: chequeo de tipos
```

---

## 4. ServicioIA (FastAPI / Python)

```cmd
cd ServicioIA
copy .env.example .env
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt   :: solo para desarrollo/tests
uvicorn app.main:app --reload --port 8000
```

En PowerShell la activación del entorno es `.venv\Scripts\Activate.ps1`; en Linux/macOS
`source .venv/bin/activate`.

Por defecto la API queda en `http://localhost:8000` (documentación en `/docs`).

Variables clave (`.env`):
- `DATABASE_URL` → conexión PostgreSQL
- `MODEL_CACHE` → ruta de caché de modelos descargados
- `DEVICE` → `cpu` o `cuda`
- `LOG_LEVEL`, `SENTRY_DSN`, `ENVIRONMENT` → observabilidad

Tests:

```cmd
pytest
```

---

## Levantar todo con Docker Compose

En la raíz del repositorio:

```cmd
copy .env.example .env
docker compose up --build
```

Esto levanta `postgres` (con pgvector), `redis`, `servicio-ia`, `servidor-gds` y el
`frontend` (Nginx). Servicios publicados por defecto:

- Frontend: `http://localhost:8080`
- API GDS: `http://localhost:4100` (Swagger en `/api/gds/docs`)

El `servicio-ia` no se publica al host; solo es accesible en la red interna de
contenedores.

Variables de la raíz (`.env`) usadas por el compose:
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `JWT_SECRET`
- `FRONTEND_PORT`, `GDS_API_PORT`
- `CORS_ORIGIN`, `VITE_GDS_API_URL`
- `SERVICIO_IA_DEVICE` (`cpu` | `cuda`)

---

## Orden de arranque recomendado (sin Docker)

1. PostgreSQL (+ pgvector) y Redis
2. `ServicioIA` (puerto 8000)
3. `ServidorGDS` (puerto 4100)
4. `Servidor` del colegio (puerto 3000)
5. `ClienteCDPLPL` (puerto 5173)
