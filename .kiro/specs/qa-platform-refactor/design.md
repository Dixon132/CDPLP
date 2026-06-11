# Design: QA Platform Refactor — CDPLP

## Overview

Este documento describe la arquitectura técnica completa del refactor de la plataforma QA. El diseño se basa en conservar el motor de orquestación existente (`pipeline_manager.py`) y el servidor de pruebas (`test_server.ts`) que ya funcionan, y construir sobre ellos los 12 runners reales, el catálogo JSON, los features Gherkin y las actualizaciones del frontend.

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND REACT (localhost:5173)               │
│  QALayout → QADashboard / QACatalog / QASettings / QAExecution  │
│                         ↕ WebSocket / HTTP                       │
└─────────────────────────────────────────────────────────────────┘
                              ↕ :8000
┌─────────────────────────────────────────────────────────────────┐
│                  FASTAPI QA ENGINE (localhost:8000)              │
│  /ws/{exec_id}  →  pipeline_manager.py  →  ExecutionEngine      │
│  /metrics/overview  →  lee last_execution.json                  │
│  /health  →  status check                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│              PIPELINE MANAGER (orchestrator)                     │
│  1. Crea DB efímera (asyncpg)                                   │
│  2. Prisma db push → esquema aplicado                           │
│  3. Seed usuario QA admin                                       │
│  4. Levanta test_server.ts en :3001                             │
│  5. Ejecuta 12 categorías via HTTP (httpx)                      │
│  6. Emite resultados via WebSocket                              │
│  7. Teardown DB efímera                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↕ :3001
┌─────────────────────────────────────────────────────────────────┐
│           TEST SERVER (discovery/test_server.ts)                 │
│  Express backend en puerto 3001                                  │
│  DATABASE_URL → cdplp_test_{exec_id} (DB efímera)               │
│  S3Client.prototype.send → stubbeado                            │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│              POSTGRESQL (localhost:5432)                         │
│  cdplp (producción)  |  cdplp_test_{exec_id} (efímera)         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Estructura de Carpetas Final

```
qa/
├── .env                          ← credenciales actualizadas
├── pytest.ini                    ← sin cambios
├── requirements.txt              ← sin cambios
├── test_cases_catalog.json       ← REESCRITO con 12 categorías reales
│
├── api/
│   ├── main.py                   ← sin cambios
│   └── routes/
│       ├── websocket.py          ← sin cambios
│       ├── executions.py         ← simplificado (eliminar Orchestrator roto)
│       ├── metrics.py            ← ACTUALIZADO: lee last_execution.json
│       └── tests.py              ← ACTUALIZADO: lista test cases del catálogo
│
├── config/
│   ├── settings.py               ← actualizar credenciales
│   └── database.py               ← sin cambios
│
├── core/
│   ├── base_runner.py            ← sin cambios
│   ├── evidence_manager.py       ← sin cambios
│   ├── execution_context.py      ← sin cambios
│   ├── metrics_engine.py         ← ACTUALIZADO: lee last_execution.json
│   └── registry.py               ← sin cambios
│
├── orchestrator/
│   ├── pipeline_manager.py       ← ACTUALIZADO: integra 12 categorías
│   └── db_sandbox.py             ← sin cambios
│
├── runners/
│   ├── base_http_runner.py       ← sin cambios
│   ├── qa_runner.py              ← NUEVO: runner unificado
│   ├── smoke_runner.py           ← ACTUALIZADO: corregir campo contraseña
│   ├── functional_runner.py      ← ACTUALIZADO
│   └── orchestrator.py           ← ELIMINADO (roto, reemplazado por qa_runner.py)
│
├── test_cases/
│   ├── conftest.py               ← ACTUALIZADO: contraseña, puerto 3001
│   │
│   ├── functional/
│   │   ├── smoke/
│   │   │   └── test_smoke.py     ← NUEVO (reemplaza test_server_up.py)
│   │   ├── api/
│   │   │   └── test_api_endpoints.py  ← NUEVO
│   │   ├── integration/
│   │   │   └── test_integration.py    ← NUEVO
│   │   └── e2e/
│   │       └── test_e2e_playwright.py ← NUEVO
│   │
│   ├── black_box/
│   │   ├── test_equivalence_partitioning.py  ← REESCRITO
│   │   └── test_boundary_value.py            ← NUEVO
│   │
│   ├── security/
│   │   ├── test_authentication.py   ← NUEVO
│   │   ├── test_authorization.py    ← NUEVO
│   │   ├── test_sql_injection.py    ← NUEVO
│   │   └── test_xss.py              ← NUEVO
│   │
│   └── quality/
│       ├── test_static_analysis.py  ← REESCRITO
│       └── test_coverage.py         ← NUEVO
│
├── gherkin/
│   ├── environment.py               ← NUEVO
│   ├── features/
│   │   ├── auth.feature             ← NUEVO
│   │   └── colegiados.feature       ← NUEVO
│   └── steps/
│       ├── auth_steps.py            ← NUEVO
│       └── colegiados_steps.py      ← NUEVO
│
├── evidence/
│   ├── logs/
│   ├── requests/
│   ├── responses/
│   ├── screenshots/
│   ├── traces/
│   └── videos/
│
└── reports/
    ├── last_execution.json          ← NUEVO: persiste resultados para el dashboard
    ├── coverage_html/
    └── pytest_report.json
```

---

## Componente 1: `test_cases_catalog.json` — Catálogo de 12 Categorías

El catálogo es el contrato entre el pipeline y los tests. Cada entrada define un caso de prueba ejecutable.

### Schema de cada entrada

```json
{
  "id": "SMOKE-001",
  "category": "Smoke",
  "subcategory": "HEALTH",
  "method": "GET",
  "endpoint": "/api/usuarios/auth/login",
  "payload": {},
  "expectedCode": 405,
  "description": "Verificar que el servidor responde (GET no permitido = servidor vivo)",
  "requiresAuth": false,
  "tags": ["smoke", "health"]
}
```

### Categorías y cantidad de casos

| # | Categoría | ID Prefix | Casos |
|---|-----------|-----------|-------|
| 1 | Smoke Testing | SMOKE | 6 |
| 2 | API Testing | API | 12 |
| 3 | Integration Testing | INT | 4 |
| 4 | End-to-End Testing | E2E | 4 |
| 5 | Equivalence Partitioning | EP | 8 |
| 6 | Boundary Value Analysis | BVA | 8 |
| 7 | Authentication Testing | AUTH-SEC | 7 |
| 8 | Authorization Testing | AUTHZ | 6 |
| 9 | SQL Injection Testing | SQLI | 5 |
| 10 | XSS Testing | XSS | 5 |
| 11 | Static Analysis | SA | 4 |
| 12 | Coverage Reporting | COV | 4 |
| **Total** | | | **73** |

---

## Componente 2: `conftest.py` — Fixtures Corregidos

### Cambios respecto al actual

```python
# ANTES (roto)
signup_payload = {
    "nombre": "QA",
    "apellido": "Test",
    "correo": unique_email,
    "contrasena": "password123"   # ← campo incorrecto
}

# DESPUÉS (correcto)
signup_payload = {
    "nombre": "QA",
    "apellido": "Test",
    "correo": unique_email,
    "contraseña": "password123"   # ← campo correcto con ñ
}
```

### Fixtures necesarios

```python
@pytest.fixture(scope="session")
def base_url() -> str:
    """Puerto 3001 — test server con DB efímera"""
    return "http://localhost:3001"

@pytest.fixture(scope="session")
def jwt_token(base_url) -> str:
    """Login real, falla con error descriptivo si no funciona"""

@pytest.fixture(scope="session")
def api_client(base_url, jwt_token) -> requests.Session:
    """Session con Authorization: <token> (sin Bearer)"""

@pytest.fixture(scope="session")
def admin_token(base_url) -> str:
    """Token del usuario QA admin creado por el pipeline seed"""

@pytest.fixture(scope="session")
def catalog() -> list:
    """Carga test_cases_catalog.json"""
```

---

## Componente 3: `pipeline_manager.py` — Cambios

### Cambio 1: Seed del usuario QA admin

```python
# Credenciales del usuario QA admin creado en la DB efímera
QA_ADMIN_EMAIL = "qa_admin@cdplp.test"
QA_ADMIN_PASSWORD = "QA_Admin_2026!"
QA_ADMIN_NOMBRE = "QA"
QA_ADMIN_APELLIDO = "Admin"
```

El pipeline hace signup + asignación de rol PRESIDENTE en la DB efímera. Esto garantiza que el token QA tenga acceso a todos los endpoints.

### Cambio 2: Guardar resultados en `last_execution.json`

Al finalizar el pipeline, guarda un resumen en `reports/last_execution.json`:

```json
{
  "exec_id": "SMOKE-1234",
  "timestamp": "2026-06-01T10:30:00Z",
  "duration_ms": 45000,
  "total": 73,
  "passed": 68,
  "failed": 5,
  "by_category": {
    "Smoke": { "total": 6, "passed": 6, "failed": 0 },
    "API": { "total": 12, "passed": 11, "failed": 1 },
    ...
  },
  "results": [ ...array completo de test_result... ]
}
```

### Cambio 3: Manejo de errores por categoría

```python
# En lugar de abortar todo el pipeline si una categoría falla:
for category_tests in grouped_by_category:
    try:
        await run_category(category_tests)
    except Exception as e:
        await emit("exec", prog, {"test_result": {
            "id": f"{category}-ERROR",
            "status": "FAILED",
            "error": str(e),
            ...
        }})
        continue  # Siguiente categoría
```

---

## Componente 4: `runners/qa_runner.py` — Runner Unificado

```python
class QARunner:
    """
    Runner unificado que ejecuta cualquier categoría de las 12.
    Recibe una lista de test cases del catálogo y los ejecuta via HTTP.
    """
    
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.token = token
        self.client = httpx.AsyncClient(base_url=base_url, timeout=15.0)
    
    async def run_test_case(self, tc: dict) -> dict:
        """Ejecuta un test case y retorna el resultado con evidencia completa"""
        # Retorna: id, category, method, endpoint, headers_sent,
        #          payload_sent, expectedCode, actualCode, responseBody,
        #          duration_ms, status (PASSED/FAILED), error
    
    async def run_category(self, test_cases: list, emit_fn) -> list:
        """Ejecuta todos los test cases de una categoría y emite resultados"""
```

---

## Componente 5: Gherkin — Estructura BDD

### `gherkin/features/auth.feature`

```gherkin
# language: es
Característica: Autenticación de usuarios
  Como usuario del sistema CDPLP
  Quiero poder iniciar sesión con mis credenciales
  Para acceder a las funcionalidades del sistema

  Escenario: Login exitoso con credenciales válidas
    Dado que tengo el correo "qa_admin@cdplp.test" y contraseña "QA_Admin_2026!"
    Cuando envío una petición POST a "/api/usuarios/auth/login"
    Entonces recibo un status code 200
    Y la respuesta contiene el campo "token"
    Y la respuesta contiene el campo "user"

  Escenario: Login fallido con contraseña incorrecta
    Dado que tengo el correo "qa_admin@cdplp.test" y contraseña "incorrecta"
    Cuando envío una petición POST a "/api/usuarios/auth/login"
    Entonces recibo un status code 401

  Escenario: Acceso a recurso protegido sin token
    Dado que no tengo token de autenticación
    Cuando envío una petición GET a "/api/colegiados/colegiado/"
    Entonces recibo un status code 401
```

### `gherkin/features/colegiados.feature`

```gherkin
# language: es
Característica: Gestión de colegiados
  Como usuario con rol PRESIDENTE
  Quiero gestionar el registro de colegiados
  Para mantener actualizado el padrón del colegio

  Escenario: Listar colegiados con autenticación válida
    Dado que estoy autenticado como usuario con rol PRESIDENTE
    Cuando envío una petición GET a "/api/colegiados/colegiado/"
    Entonces recibo un status code 200
    Y la respuesta es un array JSON

  Escenario: Crear colegiado con datos válidos
    Dado que estoy autenticado como usuario con rol PRESIDENTE
    Cuando envío una petición POST a "/api/colegiados/colegiado/" con datos válidos
    Entonces recibo un status code 200
    Y la respuesta contiene el campo "id_colegiado"

  Escenario: Listar colegiados sin autenticación
    Dado que no tengo token de autenticación
    Cuando envío una petición GET a "/api/colegiados/colegiado/"
    Entonces recibo un status code 401
```

### `gherkin/environment.py`

```python
import requests

BASE_URL = "http://localhost:3001"

def before_all(context):
    """Setup global: obtener token QA admin"""
    context.base_url = BASE_URL
    res = requests.post(f"{BASE_URL}/api/usuarios/auth/login", json={
        "correo": "qa_admin@cdplp.test",
        "contraseña": "QA_Admin_2026!"
    }, timeout=5)
    if res.status_code == 200:
        context.token = res.json().get("token")
    else:
        context.token = None

def before_scenario(context, scenario):
    context.response = None
    context.last_created_id = None
```

---

## Componente 6: Frontend — Cambios por archivo

### `QALayout.jsx`

**Cambio único:** Eliminar el item "Execution History" del array `menuItems`.

```jsx
// ANTES
const menuItems = [
    { id: 'dashboard', ... path: '/qa' },
    { id: 'catalog', ... path: '/qa/catalog' },
    { id: 'history', ... path: '/qa/history' },  // ← ELIMINAR
    { id: 'settings', ... path: '/qa/settings' },
];

// DESPUÉS
const menuItems = [
    { id: 'dashboard', ... path: '/qa' },
    { id: 'catalog', ... path: '/qa/catalog' },
    { id: 'settings', ... path: '/qa/settings' },
];
```

---

### `QACatalog.jsx`

**Cambio:** Reemplazar el array `CATEGORIES` hardcodeado con exactamente las 12 categorías reales. Eliminar: Caja Blanca, Caja Gris, Rendimiento, Compatibilidad.

```jsx
const CATEGORIES = [
  { id: 'SMOKE',    name: 'Smoke Testing',              group: 'Funcional',    tests: [...] },
  { id: 'API',      name: 'API Testing',                group: 'Funcional',    tests: [...] },
  { id: 'INT',      name: 'Integration Testing',        group: 'Funcional',    tests: [...] },
  { id: 'E2E',      name: 'End-to-End Testing',         group: 'Funcional',    tests: [...] },
  { id: 'EP',       name: 'Equivalence Partitioning',   group: 'Caja Negra',   tests: [...] },
  { id: 'BVA',      name: 'Boundary Value Analysis',    group: 'Caja Negra',   tests: [...] },
  { id: 'AUTH-SEC', name: 'Authentication Testing',     group: 'Seguridad',    tests: [...] },
  { id: 'AUTHZ',    name: 'Authorization Testing',      group: 'Seguridad',    tests: [...] },
  { id: 'SQLI',     name: 'SQL Injection Testing',      group: 'Seguridad',    tests: [...] },
  { id: 'XSS',      name: 'XSS Testing',                group: 'Seguridad',    tests: [...] },
  { id: 'SA',       name: 'Static Analysis',            group: 'Calidad',      tests: [...] },
  { id: 'COV',      name: 'Coverage Reporting',         group: 'Calidad',      tests: [...] },
];
```

---

### `QADashboard.jsx`

**Cambio:** Reemplazar todos los valores hardcodeados con llamadas reales al FastAPI.

```jsx
const QADashboard = () => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch('http://localhost:8000/metrics/overview')
            .then(r => r.json())
            .then(data => { setMetrics(data); setLoading(false); })
            .catch(() => { setError('QA Engine offline'); setLoading(false); });
    }, []);

    if (loading) return <SkeletonDashboard />;
    if (error) return <OfflineState message={error} />;
    // render con metrics reales
};
```

El endpoint `GET /metrics/overview` del FastAPI lee `reports/last_execution.json` y retorna:

```json
{
  "status": "HEALTHY",
  "last_execution": {
    "exec_id": "...",
    "timestamp": "...",
    "total": 73,
    "passed": 68,
    "failed": 5,
    "success_rate": 93.1,
    "duration_ms": 45000
  },
  "by_category": { ... },
  "tools": {
    "pytest": "ONLINE",
    "playwright": "READY",
    "behave": "READY",
    "bandit": "ONLINE"
  }
}
```

---

### `QASettings.jsx`

**Cambio:** Reemplazar los `StatusRow` hardcodeados con health checks reales.

```jsx
const QASettings = () => {
    const [services, setServices] = useState({
        fastapi: 'CHECKING',
        backend: 'CHECKING',
        frontend: 'CHECKING',
    });

    const checkHealth = async () => {
        // Verificar cada servicio con fetch + timeout
        const check = async (url) => {
            try {
                await fetch(url, { signal: AbortSignal.timeout(2000) });
                return 'ONLINE';
            } catch {
                return 'OFFLINE';
            }
        };
        setServices({
            fastapi: await check('http://localhost:8000/health'),
            backend: await check('http://localhost:3000/'),
            frontend: await check('http://localhost:5173/'),
        });
    };

    useEffect(() => { checkHealth(); }, []);
    // ...
};
```

---

## Componente 7: `api/routes/metrics.py` — Datos Reales

```python
import json
from pathlib import Path
from fastapi import APIRouter

router = APIRouter()
LAST_EXEC_FILE = Path(__file__).parent.parent.parent / "reports" / "last_execution.json"

@router.get("/overview")
async def get_overview():
    if not LAST_EXEC_FILE.exists():
        return {
            "status": "NO_DATA",
            "message": "No hay ejecuciones registradas aún",
            "last_execution": None,
            "by_category": {},
            "tools": _check_tools()
        }
    with open(LAST_EXEC_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    return {
        "status": "HEALTHY" if data.get("failed", 0) == 0 else "DEGRADED",
        "last_execution": {
            "exec_id": data["exec_id"],
            "timestamp": data["timestamp"],
            "total": data["total"],
            "passed": data["passed"],
            "failed": data["failed"],
            "success_rate": round(data["passed"] / data["total"] * 100, 1) if data["total"] > 0 else 0,
            "duration_ms": data["duration_ms"]
        },
        "by_category": data.get("by_category", {}),
        "tools": _check_tools()
    }

def _check_tools() -> dict:
    """Verifica qué herramientas están disponibles en el entorno"""
    import shutil
    return {
        "pytest": "ONLINE" if shutil.which("pytest") else "OFFLINE",
        "playwright": "READY" if shutil.which("playwright") else "OFFLINE",
        "behave": "READY" if shutil.which("behave") else "OFFLINE",
        "bandit": "ONLINE" if shutil.which("bandit") else "OFFLINE",
        "radon": "ONLINE" if shutil.which("radon") else "OFFLINE",
        "coverage": "ONLINE" if shutil.which("coverage") else "OFFLINE",
    }
```

---

## Orden de Implementación (Tasks)

El orden garantiza que cada paso es verificable antes de continuar:

1. **Limpieza** — Eliminar archivos inválidos
2. **Configuración** — Actualizar `.env` y `conftest.py`
3. **Catálogo** — Reescribir `test_cases_catalog.json`
4. **Runners Python** — Los 12 archivos de test (smoke → coverage)
5. **Gherkin** — Features + steps + environment
6. **Pipeline** — Actualizar `pipeline_manager.py`
7. **FastAPI metrics** — Actualizar `api/routes/metrics.py`
8. **Frontend** — QALayout → QACatalog → QADashboard → QASettings (en ese orden)

---

## Decisiones de Diseño

| Decisión | Alternativa descartada | Razón |
|----------|----------------------|-------|
| Gherkin con Behave (API-level) | Gherkin con Selenium | Selenium requiere frontend levantado; Behave con requests es más confiable en CI |
| `last_execution.json` como persistencia | SQLite / PostgreSQL QA | Simplicidad — el FastAPI ya tiene problemas de conexión a DB; un JSON es suficiente para el dashboard |
| Runner unificado `qa_runner.py` | Un runner por categoría | Reduce duplicación; el catálogo JSON ya diferencia categorías |
| Token sin "Bearer" | Estandarizar a Bearer | El backend Express ya está en producción con este comportamiento; cambiarlo rompería el frontend |
| E2E con Playwright (skip si frontend offline) | Siempre fallar si frontend offline | Los tests de E2E no deben bloquear el pipeline cuando el frontend no está levantado |
