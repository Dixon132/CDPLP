# Tasks: QA Platform Refactor — CDPLP

## Task 1: Limpieza de archivos inválidos

**Requirements:** REQ-002

### Steps

1. Eliminar `qa/test_cases/functional/unit/test_auth.py`
2. Eliminar `qa/test_cases/functional/unit/test_billing.py`
3. Eliminar `qa/test_cases/functional/unit/test_notifications.py`
4. Eliminar `qa/test_cases/functional/unit/test_reports.py`
5. Eliminar `qa/test_cases/functional/unit/test_users.py`
6. Eliminar `qa/test_cases/functional/regression/test_deprecated_endpoints.py`
7. Eliminar `qa/test_cases/functional/regression/test_old_bugs_fixed.py`
8. Eliminar `qa/test_cases/security/test_auth_security.py`
9. Eliminar `qa/test_cases/black_box/test_equivalence_partitioning.py`
10. Eliminar `qa/test_cases/quality/test_code_smells.py`
11. Eliminar `qa/test_cases/functional/smoke/test_server_up.py`
12. Eliminar `qa/test_cases/functional/acceptance/test_business_rules.py`
13. Eliminar `qa/test_cases/functional/sanity/test_core_api_responses.py`
14. Eliminar `qa/test_cases/functional/e2e/test_login_flow.py`
15. Eliminar `qa/test_cases/gray_box/test_fuzzing.py`
16. Eliminar `qa/test_cases/performance/test_load.py`
17. Eliminar `qa/test_cases/white_box/test_branch_coverage.py`
18. Eliminar `qa/test_cases/white_box/test_statement_coverage.py`
19. Eliminar `qa/runners/orchestrator.py` (importa módulos inexistentes)
20. Eliminar carpetas vacías: `qa/test_cases/functional/system/`, `qa/test_cases/functional/integration/` (se recrearán)

---

## Task 2: Configuración base — .env y conftest.py

**Requirements:** REQ-001

### Steps

1. Actualizar `qa/.env`: cambiar `TEST_USER_EMAIL=diegoalextorrez@gmail.com` y `TEST_USER_PASSWORD=12345678`
2. Reescribir `qa/test_cases/conftest.py` con:
   - `base_url` fixture → `http://localhost:3001`
   - `jwt_token` fixture → usa campo `contraseña` (con ñ), falla con error descriptivo si login no funciona
   - `api_client` fixture → `requests.Session` con `Authorization: <token>` (sin Bearer)
   - `admin_token` fixture → token del usuario QA admin creado por el pipeline
   - `catalog` fixture → carga `test_cases_catalog.json`
3. Actualizar `qa/config/settings.py`: cambiar `test_user_email` y `test_user_password` defaults

---

## Task 3: Catálogo de pruebas — test_cases_catalog.json

**Requirements:** REQ-016

### Steps

1. Reescribir `qa/test_cases_catalog.json` con 73 test cases distribuidos en las 12 categorías
2. Cada entrada tiene: `id`, `category`, `subcategory`, `method`, `endpoint`, `payload`, `expectedCode`, `description`, `requiresAuth`, `tags`
3. Categorías incluidas: Smoke (6), API (12), Integration (4), E2E (4), Equivalence Partitioning (8), Boundary Value (8), Authentication (7), Authorization (6), SQL Injection (5), XSS (5), Static Analysis (4), Coverage (4)
4. Los endpoints usan las rutas reales del backend: `/api/usuarios/auth/login`, `/api/colegiados/colegiado/`, etc.
5. Los payloads usan el campo `contraseña` (con ñ) donde corresponda

---

## Task 4: Smoke Testing — test_smoke.py

**Requirements:** REQ-003

### Steps

1. Crear `qa/test_cases/functional/smoke/test_smoke.py`
2. Implementar 6 tests reales marcados con `@pytest.mark.smoke`
3. Cada test usa `requests` contra `base_url` (fixture), registra evidencia completa
4. Tests: servidor vivo, DB conectada (signup), login funcional, Prisma operativo (GET colegiados), endpoint público (ac-sociales), módulo auditorías

---

## Task 5: API Testing — test_api_endpoints.py

**Requirements:** REQ-004

### Steps

1. Crear `qa/test_cases/functional/api/test_api_endpoints.py`
2. Implementar 12+ tests reales marcados con `@pytest.mark.api`
3. Cubrir módulos: auth (login ok, login fail, sin token), colegiados (listar, crear), pagos, correspondencia, actividades sociales, tesorería, auditorías
4. Cada test verifica status code exacto, body JSON válido, campos obligatorios presentes

---

## Task 6: Integration Testing — test_integration.py

**Requirements:** REQ-005

### Steps

1. Crear `qa/test_cases/functional/integration/test_integration.py`
2. Implementar 4 tests reales marcados con `@pytest.mark.integration`
3. INT-001: Flujo pago completo (crear colegiado → pago → verificar movimiento financiero)
4. INT-002: Flujo actividad institucional (crear → registrar colegiado → verificar)
5. INT-003: Flujo auditoría (acción → verificar en GET /auditorias/)
6. INT-004: Anulación de pago (crear → anular → verificar EGRESO)

---

## Task 7: End-to-End Testing — test_e2e_playwright.py

**Requirements:** REQ-006

### Steps

1. Crear `qa/test_cases/functional/e2e/test_e2e_playwright.py`
2. Implementar 4 tests con Playwright marcados con `@pytest.mark.e2e`
3. E2E-001: Login flow completo (navegar, llenar form, verificar redirección)
4. E2E-002: Logout flow
5. E2E-003: Acceso protegido sin token → redirección
6. E2E-004: Navegación sidebar
7. Cada test verifica si `localhost:5173` está disponible; si no, marca `SKIPPED`

---

## Task 8: Equivalence Partitioning — test_equivalence_partitioning.py

**Requirements:** REQ-007

### Steps

1. Crear `qa/test_cases/black_box/test_equivalence_partitioning.py` (reemplaza el roto)
2. Implementar 8 tests reales marcados con `@pytest.mark.black_box`
3. Particiones: email válido/inválido/vacío, contraseña vacía, monto positivo/negativo/cero/string
4. Cada test documenta la partición que representa en el docstring

---

## Task 9: Boundary Value Analysis — test_boundary_value.py

**Requirements:** REQ-008

### Steps

1. Crear `qa/test_cases/black_box/test_boundary_value.py`
2. Implementar 8 tests reales marcados con `@pytest.mark.black_box`
3. Límites: nombre 1 char / 100 chars / 101 chars, monto 0.01 / max Decimal(10,2) / overflow, carnet 20 chars / 21 chars
4. Cada test documenta el valor límite que prueba

---

## Task 10: Authentication Testing — test_authentication.py

**Requirements:** REQ-009

### Steps

1. Crear `qa/test_cases/security/test_authentication.py`
2. Implementar 7 tests reales marcados con `@pytest.mark.security`
3. Tests: sin header, token firma inválida, token expirado, userId inexistente, Bearer prefix (debe fallar), contraseña incorrecta, usuario inexistente
4. Generar tokens JWT inválidos usando `PyJWT` con el secret del .env

---

## Task 11: Authorization Testing — test_authorization.py

**Requirements:** REQ-010

### Steps

1. Crear `qa/test_cases/security/test_authorization.py`
2. Implementar 6 tests reales marcados con `@pytest.mark.security`
3. Tests: rol NO_DEFINIDO → 403, SECRETARIO en financiero → 403, TESORERO en usuarios → 403, PRESIDENTE → 200, documentos sin auth → 200 (xfail), ac-sociales sin auth → 200 (xfail)
4. Los tests que documentan bugs usan `@pytest.mark.xfail`

---

## Task 12: SQL Injection Testing — test_sql_injection.py

**Requirements:** REQ-011

### Steps

1. Crear `qa/test_cases/security/test_sql_injection.py`
2. Implementar 5 tests reales marcados con `@pytest.mark.security`
3. Payloads: `' OR '1'='1`, `'; DROP TABLE`, `" OR "1"="1"`, SQL en campo nombre, SQL en param :id
4. Verificar que el servidor no crashea después de cada inyección

---

## Task 13: XSS Testing — test_xss.py

**Requirements:** REQ-012

### Steps

1. Crear `qa/test_cases/security/test_xss.py`
2. Implementar 5 tests reales marcados con `@pytest.mark.security`
3. Payloads: `<script>alert('xss')</script>`, `<img src=x onerror=alert(1)>`, `javascript:alert(1)`, verificar Content-Type JSON
4. Verificar que los payloads se almacenan como string literal y no se ejecutan

---

## Task 14: Static Analysis — test_static_analysis.py

**Requirements:** REQ-013

### Steps

1. Crear `qa/test_cases/quality/test_static_analysis.py` (reemplaza el roto)
2. Implementar 4 tests reales marcados con `@pytest.mark.quality`
3. SA-001: flake8 sobre qa/ (excluyendo venv/), SA-002: radon cc, SA-003: radon mi, SA-004: bandit
4. Guardar output en `qa/evidence/logs/static_analysis_{timestamp}.txt`
5. Los tests NO fallan por code smells — solo documentan

---

## Task 15: Coverage Reporting — test_coverage.py

**Requirements:** REQ-014

### Steps

1. Crear `qa/test_cases/quality/test_coverage.py`
2. Implementar 4 tests reales marcados con `@pytest.mark.quality`
3. COV-001: coverage run sobre smoke tests, COV-002: coverage report texto, COV-003: coverage html, COV-004: coverage json
4. Verificar que los archivos de reporte se crean exitosamente

---

## Task 16: Gherkin BDD — Features y Steps

**Requirements:** REQ-015

### Steps

1. Crear `qa/gherkin/environment.py` con setup de base_url y token
2. Crear `qa/gherkin/features/auth.feature` con 3 escenarios en español
3. Crear `qa/gherkin/features/colegiados.feature` con 3 escenarios en español
4. Crear `qa/gherkin/steps/auth_steps.py` con implementación real usando `requests`
5. Crear `qa/gherkin/steps/colegiados_steps.py` con implementación real usando `requests`
6. Verificar que `behave qa/gherkin/` ejecuta sin errores de importación

---

## Task 17: Pipeline Manager — Integración de 12 categorías

**Requirements:** REQ-016

### Steps

1. Actualizar `qa/orchestrator/pipeline_manager.py`:
   - Corregir el campo `contraseña` en el seed del usuario QA admin
   - Agrupar test cases del catálogo por categoría antes de ejecutar
   - Manejar errores por categoría sin abortar el pipeline completo
   - Al finalizar, guardar resultados en `qa/reports/last_execution.json`
   - Emitir `by_category` en el summary del evento `done`
2. Crear `qa/runners/qa_runner.py` como runner unificado
3. Eliminar `qa/runners/orchestrator.py` (ya eliminado en Task 1)

---

## Task 18: FastAPI — Metrics endpoint real

**Requirements:** REQ-017

### Steps

1. Reescribir `qa/api/routes/metrics.py`:
   - `GET /metrics/overview` lee `reports/last_execution.json` y retorna datos reales
   - Incluye `_check_tools()` que verifica qué herramientas están instaladas
   - Si no hay ejecuciones, retorna `status: "NO_DATA"` con mensaje claro
2. Simplificar `qa/api/routes/executions.py` (eliminar import de `Orchestrator` roto)
3. Actualizar `qa/api/routes/tests.py` para listar test cases del catálogo JSON

---

## Task 19: Frontend — QALayout (quitar ruta rota)

**Requirements:** REQ-020

### Steps

1. Editar `ClienteCDPLPL/src/features/dashboard/pages/QA/QALayout.jsx`
2. Eliminar el item `{ id: 'history', label: 'Execution History', ... path: '/qa/history' }` del array `menuItems`
3. Verificar que el sidebar tiene exactamente 3 items: Dashboard, Test Catalog, Platform Settings

---

## Task 20: Frontend — QACatalog (12 categorías reales)

**Requirements:** REQ-018

### Steps

1. Reescribir el array `CATEGORIES` en `QACatalog.jsx` con exactamente las 12 categorías implementadas
2. Agrupar visualmente por: Funcional (4), Caja Negra (2), Seguridad (4), Calidad (2)
3. Cada categoría muestra sus tests reales con nombre, herramienta y descripción
4. El botón "Preparar Ejecución" genera un `exec_id` que incluye el ID de categoría
5. Eliminar las categorías no implementadas (Caja Blanca, Caja Gris, Rendimiento, Compatibilidad)

---

## Task 21: Frontend — QADashboard (datos reales)

**Requirements:** REQ-017

### Steps

1. Reescribir `QADashboard.jsx`:
   - `useEffect` que hace `fetch('http://localhost:8000/metrics/overview')`
   - Estado de loading con skeleton loader
   - Estado de error con mensaje "QA Engine offline"
   - Renderizar métricas reales: total, passed, failed, success_rate, by_category
   - Mostrar estado de herramientas desde el campo `tools` de la respuesta
2. Eliminar todos los valores hardcodeados (1,245 pruebas, 98.2%, etc.)

---

## Task 22: Frontend — QASettings (health check real)

**Requirements:** REQ-019

### Steps

1. Reescribir `QASettings.jsx`:
   - `useEffect` que hace health checks reales a localhost:8000, :3000, :5173
   - Cada servicio muestra ONLINE/OFFLINE/CHECKING basado en la respuesta real
   - Botón "Refrescar" que re-ejecuta los health checks
   - Los toggles de configuración mantienen estado local funcional
2. Eliminar los `StatusRow` hardcodeados con "ONLINE"
