# ===========================================================================
# ServidorGDS — Backend de orquestacion y API (NestJS + Prisma + BullMQ)
#
# Imagen multi-stage:
#   1) builder  -> instala dependencias, genera el cliente Prisma y compila TS.
#   2) runtime  -> imagen ligera de ejecucion que aplica las migraciones Prisma
#                  sobre la BD dedicada y arranca el servicio compilado.
#
# Variables de entorno esperadas en ejecucion (provistas por docker-compose):
#   DATABASE_URL, REDIS_URL, JWT_SECRET, SERVICIO_IA_URL, PORT, CORS_ORIGIN.
# ===========================================================================

# --- Etapa 1: build -------------------------------------------------------
FROM node:20.18.1-bookworm-slim AS builder

# Prisma necesita OpenSSL para descargar/usar sus motores nativos.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instala dependencias primero (capa cacheable). Se incluyen devDependencies
# porque la compilacion (nest build) y el cliente Prisma las requieren.
COPY package.json package-lock.json ./
RUN npm ci

# Copia el resto del codigo y construye.
COPY . .
RUN npx prisma generate \
    && npm run build

# --- Etapa 2: runtime -----------------------------------------------------
FROM node:20.18.1-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=4100

# OpenSSL en runtime para los motores de Prisma (migrate deploy + client).
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia artefactos desde la etapa de build. Se conserva el node_modules completo
# (incluye la CLI de Prisma) para poder aplicar `prisma migrate deploy` al
# arranque sobre la BD PostgreSQL+pgvector DEDICADA.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

EXPOSE 4100

# Aplica las migraciones (incluida la extension pgvector) y arranca el servicio.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
