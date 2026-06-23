# ServidorGDS — Endpoints API

Base URL: `http://localhost:4100/api/gds`

Documentación Swagger interactiva: `http://localhost:4100/api/gds/docs`

---

## Health

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Liveness del ServidorGDS |

---

## Dashboard (Panel Principal)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/dashboard/resumen` | Resumen agregado: indicadores, históricos y análisis |
| GET | `/indicadores/globales` | Indicadores globales del sistema |
| GET | `/indicadores/historicos` | Serie histórica de indicadores |

---

## Instituciones (CRUD)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/instituciones` | Lista todas las instituciones educativas |
| POST | `/instituciones` | Crea una institución geolocalizada |
| GET | `/instituciones/:id` | Recupera una institución por id |
| PUT | `/instituciones/:id` | Edita una institución |
| DELETE | `/instituciones/:id` | Elimina (rechaza si está referenciada) |
| GET | `/instituciones/:id/restricciones` | Restricciones de eliminación |

**Body POST/PUT (CrearInstitucionDto):**
```json
{
  "nombre": "Universidad Mayor de San Andres",
  "categoria": "universidad|colegio|instituto|escuela",
  "latitud": -16.5,
  "longitud": -68.15,
  "radioMetros": 1500,
  "logoUrl": "https://...",
  "descripcion": "..."
}
```

---

## Escenarios (Biblioteca)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/escenarios` | Lista escenarios disponibles |
| POST | `/escenarios` | Crea un escenario personalizado (v1) |
| POST | `/escenarios/seed` | Siembra idempotente de predefinidos |
| GET | `/escenarios/:id` | Recupera un escenario por id |
| PUT | `/escenarios/:id` | Edita (crea nueva versión sin mutar la anterior) |

---

## Análisis (Estudios Longitudinales)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/analisis` | Lista todos los análisis |
| POST | `/analisis` | Crea un análisis (fija escenario, crea comunidades, dispara semana 1) |
| GET | `/analisis/:id` | Recupera un análisis por id |
| DELETE | `/analisis/:id` | Elimina en cascada |
| GET | `/analisis/:id/comunidades` | Comunidades (instituciones + zona) del análisis |

**Body POST (CrearAnalisisDto):**
```json
{
  "nombre": "Tendencias UMSA 2025",
  "institucionIds": ["inst-1", "inst-2"],
  "radioAnalisis": 1500,
  "semanasTotales": 12,
  "escenarioId": "esc-xxx",
  "modoEjecucion": "MANUAL|AUTOMATICO|TIEMPO_REAL"
}
```
> `escenarioId` y `personalizado` son excluyentes.

---

## Trazabilidad (Evolución / Resultados / Evidencias)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/analisis/:id/instituciones/:iId/evolucion` | Evolución temporal por dimensión |
| GET | `/analisis/:id/instituciones/:iId/resultados` | Resultados semanales navegables |
| GET | `/analisis/:id/instituciones/:iId/semanas/:s/explicacion` | Explicación de un indicador |
| GET | `/analisis/:id/instituciones/:iId/semanas/:s/evidencias` | Evidencias que respaldan |

> Estos endpoints devuelven datos vacíos hasta que el ciclo de simulación procese semanas.

---

## Ejecución (Control de Avance Semanal)

| Método | Ruta | Descripción |
|--------|------|-------------|
| PUT | `/analisis/:id/modo` | Seleccionar modo (Manual/Automático/Tiempo Real) |
| POST | `/analisis/:id/avanzar` | Avanzar según el modo |
| POST | `/analisis/:id/pausar` | Pausar ejecución continua |
| POST | `/analisis/:id/reanudar` | Reanudar desde la semana pendiente |

**Body PUT modo (SeleccionarModoDto):**
```json
{
  "modo": "MANUAL|AUTOMATICO|TIEMPO_REAL",
  "intervaloTiempoRealMs": 60000
}
```

---

## Reportes

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/analisis/:analisisId/reportes` | Lista reportes de un análisis |
| POST | `/analisis/:analisisId/reportes` | Genera un reporte por horizonte |
| GET | `/reportes/:id` | Recupera un reporte por id |
| GET | `/reportes/:id/export/pdf` | Descarga PDF |
| GET | `/reportes/:id/export/excel` | Descarga Excel |

**Body POST (GenerarReporteDto):**
```json
{
  "horizonte": "SEMANAL|MENSUAL|TRIMESTRAL|SEMESTRAL|FINAL",
  "periodo": 1,
  "institucionId": "inst-1"
}
```

---

## Notas de Configuración

Para que la simulación genere datos reales al avanzar semanas, se necesita:

1. **GEMINI_API_KEY** en `.env` — El proveedor de generación de contenido sintético usa Gemini (Google AI). Sin la key, la generación falla (degradación controlada).
2. **ServicioIA** corriendo (puerto 8000) — Para embeddings y NLP. Sin él, la memoria semántica degrada a vacía.
3. **Redis** corriendo (puerto 6379) — Para BullMQ (cola de trabajos). ✅ Ya configurado.
4. **PostgreSQL + pgvector** — Base de datos dedicada. ✅ Ya configurado.
