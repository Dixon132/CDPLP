# ===========================================================================
# ClienteCDPLPL — Frontend_GDS (React + Vite) servido por Nginx
#
# Imagen multi-stage:
#   1) builder -> instala dependencias y compila el bundle estatico de Vite.
#   2) runtime -> Nginx que sirve el SPA y actua como reverse proxy del
#                 ServidorGDS (HTTP `/api/gds` y WebSockets `/socket.io`).
#
# `VITE_GDS_API_URL` se inyecta en tiempo de BUILD (Vite congela las variables
# de entorno en el bundle). Por defecto apunta al origen del propio Nginx, de
# modo que el navegador consume el backend en mismo-origen via reverse proxy.
# ===========================================================================

# --- Etapa 1: build -------------------------------------------------------
FROM node:20.18.1-bookworm-slim AS builder

WORKDIR /app

# Origen base del backend GDS visible para el NAVEGADOR. Por defecto, el origen
# publico del Nginx de este contenedor (reverse proxy mismo-origen).
ARG VITE_GDS_API_URL=http://localhost:8080
ENV VITE_GDS_API_URL=${VITE_GDS_API_URL}

# Instala dependencias primero (capa cacheable).
COPY package.json package-lock.json ./
RUN npm ci

# Copia el resto del codigo y construye el bundle estatico.
COPY . .
RUN npm run build

# --- Etapa 2: runtime (Nginx) --------------------------------------------
FROM nginx:1.27.3-alpine AS runtime

# Configuracion del SPA + reverse proxy hacia el ServidorGDS.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Artefactos estaticos compilados por Vite.
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
