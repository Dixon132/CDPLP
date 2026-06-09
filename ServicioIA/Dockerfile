# Servicio_IA — imagen de ejecución
FROM python:3.11.9-slim-bookworm

# Evita prompts y mejora el logging en contenedor
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    MODEL_CACHE=/models \
    DEVICE=cpu

WORKDIR /srv

# Dependencias del sistema necesarias para psycopg / compilación de wheels
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Instala dependencias primero para aprovechar la caché de capas
COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copia el código de la aplicación
COPY app ./app

# El servicio no se expone públicamente: escucha en la red interna de contenedores
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
