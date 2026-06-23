# Cómo ejecutar la Plataforma_GDS / CDPLP

Guía práctica y directa para levantar el proyecto en local. Para una descripción
más amplia de cada componente, ver `README.md`.

El monorepo tiene 4 componentes:

| Carpeta | Componente | Stack | Puerto |
|---|---|---|---|
| `ClienteCDPLPL/` | Frontend web | React 19 + Vite | `5173` (dev) |
| `Servidor/` | API del colegio | Express + Prisma | `3000` |
| `ServidorGDS/` | Backend autónomo GDS | NestJS + Prisma + BullMQ | `4100` |
| `ServicioIA/` | Análisis IA (NLP/emociones) | Python + FastAPI | `8000` |

**Orden de arranque recomendado:** 1) Docker (PostgreSQL+pgvector y Redis) → 2)
`ServicioIA` → 3) `ServidorGDS` → 4) `Servidor` → 5) `ClienteCDPLPL`.

> Los comandos están pensados para **Windows (cmd / PowerShell)**. En Linux/macOS
> reemplaza `copy` por `cp` y la activación del entorno Python por
> `source .venv/bin/activate`.

---

## 0. Infraestructura con Docker (PostgreSQL + pgvector y Redis)

El `ServidorGDS` y el `ServicioIA` necesitan **PostgreSQL con la extensión
pgvector** y **Redis**. La forma más simple es levantarlos como contenedores.

### PostgreSQL + pgvector (puerto 5433, base `gds_db`)

```cmd
docker run -d --name gds-postgres ^
  -e POSTGRES_USER=postgres ^
  -e POSTGRES_PASSWORD=admin123 ^
  -e POSTGRES_DB=gds_db ^
  -p 5433:5432 ^
  pgvector/pgvector:pg16
```

> En PowerShell, reemplaza el `^` de fin de línea por `` ` `` (backtick), o escribe
> todo el comando en una sola línea.

Habilita la extensión `vector` dentro de la base (una sola vez):

```cmd
docker exec -it gds-postgres psql -U postgres -d gds_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

Estos valores coinciden con el `DATABASE_URL` de `ServidorGDS/.env` y `ServicioIA/.env`:
`postgresql://postgres:admin123@localhost:5433/gds_db`.

### Redis (puerto 6379)

```cmd
docker run -d --name gds-redis -p 6379:6379 redis:7
```

Coincide con `REDIS_URL="redis://localhost:6379"` de `ServidorGDS/.env`.

### Gestionar los contenedores

```cmd
:: Arrancar (si ya existen, tras reiniciar el PC)
docker start gds-postgres gds-redis

:: Detener
docker stop gds-postgres gds-redis

:: Ver estado
docker ps -a

:: Eliminar (borra el contenedor; PostgreSQL pierde los datos si no usas volumen)
docker rm -f gds-postgres gds-redis
```

> Para conservar los datos de PostgreSQL entre recreaciones, añade un volumen al
> `docker run`: `-v gds_pgdata:/var/lib/postgresql/data`.

---

## 1. ServicioIA (FastAPI / Python)

```cmd
cd ServicioIA
copy .env.example .env
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- Documentación de la API: `http://localhost:8000/docs`
- En PowerShell la activación es `.venv\Scripts\Activate.ps1`.
- La primera ejecución descarga los modelos de NLP/emociones (puede tardar).

Tests (opcional):

```cmd
pytest
```

---

## 2. ServidorGDS (Backend autónomo GDS)

Requiere PostgreSQL+pgvector y Redis ya corriendo (paso 0).

```cmd
cd ServidorGDS
copy .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

- API: `http://localhost:4100`  ·  Swagger: `http://localhost:4100/api/gds/docs`
- `start:dev` recompila al guardar. Para ejecutar el build de producción:

```cmd
npm run build
npm run start:prod
```

> Tras CADA cambio de código que se compila a `dist/`, reinicia `start:prod`
> (el build a `dist/` no basta por sí solo si el proceso ya está corriendo).

---

## 3. Servidor (API del colegio)

```cmd
cd Servidor
copy .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
npm start
```

- API: `http://localhost:3000`
- Variables clave: `DATABASE_URL`, `PORT`, `JWT_SECRET` y credenciales AWS S3.

---

## 4. ClienteCDPLPL (Frontend)

```cmd
cd ClienteCDPLPL
copy .env.example .env
npm install
npm run dev
```

- App: la URL que imprime Vite (por defecto `http://localhost:5173`).
- Variables clave (`.env`): `VITE_API_URL` (Servidor del colegio) y
  `VITE_GDS_API_URL` (ServidorGDS, ej. `http://localhost:4100`).

---

## Alternativa: todo con Docker Compose

Desde la raíz del repositorio:

```cmd
copy .env.example .env
docker compose up --build
```

Levanta PostgreSQL+pgvector, Redis, `servicio-ia`, `servidor-gds` y el frontend
(Nginx). Frontend en `http://localhost:8080` y API GDS en `http://localhost:4100`.

---

## Notas de seguridad

- Los archivos `.env` reales **no se versionan** (`.gitignore`). Usa los
  `.env.example` como plantilla.
- No subas secretos al repositorio. Si una API key (OpenAI/Gemini) o credenciales
  AWS quedaron expuestas, **rótalas**.
