# Requirements: QA Platform Refactor — CDPLP

## Overview

La plataforma QA del sistema CDPLP necesita ser reconstruida desde cero sobre la infraestructura existente que sí funciona. El objetivo es implementar 12 categorías de prueba reales que ejecuten contra el backend en `localhost:3001`, produzcan evidencia verificable, y se visualicen en el dashboard QA del frontend React.

El motor de orquestación (`pipeline_manager.py`), el servidor de pruebas (`test_server.ts`) y la consola de ejecución (`QAExecution.jsx`) ya funcionan y se conservan. Todo lo demás se reescribe.

---

## Requirements

### REQ-001 — Credenciales y configuración de prueba

**User Story:** Como motor QA, necesito credenciales reales y configuración correcta para poder autenticarme contra el backend de prueba y ejecutar tests con un token JWT válido.

#### Acceptance Criteria

- [ ] El archivo `qa/.env` contiene `TEST_USER_EMAIL=diegoalextorrez@gmail.com` y `TEST_USER_PASSWORD=12345678`
- [ ] El `conftest.py` usa el campo `contraseña` (con ñ) en el body de signup/login, no `contrasena`
- [ ] El `conftest.py` apunta a `http://localhost:3001` (puerto del test server, no 3000)
- [ ] El token JWT se envía como `Authorization: <token>` sin prefijo "Bearer" (consistente con el backend)
- [ ] El fixture `jwt_token` retorna un token válido haciendo login real contra `localhost:3001`
- [ ] El fixture `api_client` es una `requests.Session` con el header `Authorization` configurado
- [ ] Si el login falla, el fixture lanza un error descriptivo en lugar de retornar `None` silenciosamente

---

### REQ-002 — Limpieza de archivos inválidos

**User Story:** Como desarrollador, necesito eliminar todos los archivos de test que no ejecutan pruebas reales para que el pipeline no reporte falsos positivos.

#### Acceptance Criteria

- [ ] Eliminados los siguientes archivos (placeholders / assert True / rutas incorrectas):
  - `test_cases/functional/unit/test_auth.py`
  - `test_cases/functional/unit/test_billing.py`
  - `test_cases/functional/unit/test_notifications.py`
  - `test_cases/functional/unit/test_reports.py`
  - `test_cases/functional/unit/test_users.py`
  - `test_cases/functional/regression/test_deprecated_endpoints.py`
  - `test_cases/functional/regression/test_old_bugs_fixed.py`
  - `test_cases/security/test_auth_security.py`
  - `test_cases/black_box/test_equivalence_partitioning.py`
  - `test_cases/quality/test_code_smells.py`
  - `test_cases/functional/smoke/test_server_up.py`
- [ ] No quedan archivos con `assert True`, `except: pass`, o rutas que apunten a puerto 3000

---

### REQ-003 — Smoke Testing (Categoría 1)

**User Story:** Como QA engineer, necesito verificar en menos de 10 segundos que todos los componentes críticos del sistema están operativos antes de ejecutar el resto del suite.

#### Acceptance Criteria

- [ ] `test_cases/functional/smoke/test_smoke.py` existe y contiene pruebas reales
- [ ] SMOKE-001: `GET /` en `localhost:3001` responde con status 200 o 404 (servidor vivo)
- [ ] SMOKE-002: `POST /api/usuarios/auth/signup` con datos únicos responde 200 o 409 (DB conectada)
- [ ] SMOKE-003: `POST /api/usuarios/auth/login` con credenciales reales responde 200 y contiene campo `token`
- [ ] SMOKE-004: `GET /api/colegiados/colegiado/` con token válido responde 200 (Prisma operativo)
- [ ] SMOKE-005: `GET /api/ac-sociales/ac-social/` sin auth responde 200 (endpoint público verificado)
- [ ] SMOKE-006: `GET /api/auditorias/` con token válido responde 200 (módulo auditorías operativo)
- [ ] Cada test registra: método, endpoint, status_code esperado, status_code real, duración en ms, resultado PASSED/FAILED
- [ ] Marcado con `@pytest.mark.smoke`

---

### REQ-004 — API Testing (Categoría 2)

**User Story:** Como QA engineer, necesito verificar que todos los endpoints REST del backend responden con los contratos JSON correctos, status codes esperados y headers apropiados.

#### Acceptance Criteria

- [ ] `test_cases/functional/api/test_api_endpoints.py` existe y contiene pruebas reales
- [ ] Cubre al menos los siguientes módulos: auth, usuarios, colegiados, pagos, correspondencia, actividades sociales, actividades institucionales, tesorería, auditorías
- [ ] Cada test verifica: status code exacto, que el body sea JSON válido, que los campos obligatorios estén presentes
- [ ] API-AUTH-001: Login exitoso retorna `{ user: {...}, token: string }`
- [ ] API-AUTH-002: Login con contraseña incorrecta retorna 401
- [ ] API-AUTH-003: Acceso sin token a endpoint protegido retorna 401
- [ ] API-COL-001: `GET /api/colegiados/colegiado/` con token retorna array
- [ ] API-COL-002: `POST /api/colegiados/colegiado/` con datos válidos retorna 200 con `id_colegiado`
- [ ] API-FIN-001: `GET /api/financiero/tesoreria/presupuestos` con token retorna array
- [ ] API-AUD-001: `GET /api/auditorias/` con token retorna array con campos `id_auditoria`, `accion`, `modulo`
- [ ] Marcado con `@pytest.mark.api`

---

### REQ-005 — Integration Testing (Categoría 3)

**User Story:** Como QA engineer, necesito verificar que los módulos del sistema interactúan correctamente entre sí, especialmente los flujos que involucran múltiples tablas de la base de datos.

#### Acceptance Criteria

- [ ] `test_cases/functional/integration/test_integration.py` existe y contiene pruebas reales
- [ ] INT-001: Flujo completo de pago — crear colegiado → crear pago → verificar que se creó un `movimiento_financiero` asociado
- [ ] INT-002: Flujo de actividad institucional — crear actividad → registrar colegiado → verificar registro en `colegiados_registrados_actividad_institucional`
- [ ] INT-003: Flujo de auditoría — ejecutar acción que genera auditoría → verificar que aparece en `GET /api/auditorias/`
- [ ] INT-004: Anulación de pago — crear pago → anular → verificar que se creó un movimiento de EGRESO de reversión
- [ ] Cada test limpia sus datos al finalizar (usa IDs creados en el test para hacer DELETE o verificar estado)
- [ ] Marcado con `@pytest.mark.integration`

---

### REQ-006 — End-to-End Testing (Categoría 4)

**User Story:** Como QA engineer, necesito verificar los flujos completos de usuario desde la interfaz web, incluyendo navegación, formularios y respuestas visuales.

#### Acceptance Criteria

- [ ] `test_cases/functional/e2e/test_e2e_playwright.py` existe con pruebas Playwright reales
- [ ] E2E-001: Flujo de login — navegar a `/auth/login`, ingresar credenciales, verificar redirección a `/dashboard`
- [ ] E2E-002: Flujo de logout — desde dashboard, hacer click en "Cerrar Sesión", verificar redirección a `/auth/login`
- [ ] E2E-003: Acceso a ruta protegida sin token — navegar directamente a `/dashboard`, verificar redirección a login
- [ ] E2E-004: Navegación del sidebar — verificar que los items del menú navegan a las rutas correctas
- [ ] Los tests de Playwright requieren que el frontend esté corriendo en `localhost:5173` (prerequisito documentado)
- [ ] Si el frontend no está disponible, los tests se marcan como `SKIPPED` con mensaje claro, no como `FAILED`
- [ ] Marcado con `@pytest.mark.e2e`

---

### REQ-007 — Equivalence Partitioning (Categoría 5)

**User Story:** Como QA engineer, necesito verificar que el sistema maneja correctamente las particiones de datos válidos e inválidos en los endpoints de entrada.

#### Acceptance Criteria

- [ ] `test_cases/black_box/test_equivalence_partitioning.py` existe y contiene pruebas reales (reemplaza el archivo roto)
- [ ] EP-001: Email válido en login → 200 o 401 (no 500)
- [ ] EP-002: Email con formato inválido (sin @) en login → 400 o 401
- [ ] EP-003: Email vacío en login → 400 o 401
- [ ] EP-004: Contraseña vacía en login → 400 o 401
- [ ] EP-005: Monto de pago positivo válido → 200
- [ ] EP-006: Monto de pago negativo → 400 o 422
- [ ] EP-007: Monto de pago cero → 400 o 422
- [ ] EP-008: Monto de pago como string → 400 o 422
- [ ] Cada test documenta la partición que representa (válida/inválida/límite)
- [ ] Marcado con `@pytest.mark.black_box`

---

### REQ-008 — Boundary Value Analysis (Categoría 6)

**User Story:** Como QA engineer, necesito verificar que el sistema maneja correctamente los valores en los límites extremos de los campos de entrada.

#### Acceptance Criteria

- [ ] `test_cases/black_box/test_boundary_value.py` existe y contiene pruebas reales
- [ ] BVA-001: Nombre de colegiado con 1 carácter → aceptado (200) o rechazado con mensaje claro (400)
- [ ] BVA-002: Nombre de colegiado con 100 caracteres (límite del schema) → aceptado (200)
- [ ] BVA-003: Nombre de colegiado con 101 caracteres (sobre el límite) → rechazado (400/422)
- [ ] BVA-004: Monto de pago con valor 0.01 (mínimo positivo) → aceptado
- [ ] BVA-005: Monto de pago con 10 dígitos enteros + 2 decimales (límite Decimal(10,2)) → aceptado
- [ ] BVA-006: Monto de pago con 11 dígitos enteros (sobre límite) → rechazado o truncado
- [ ] BVA-007: Carnet de identidad con 20 caracteres (límite VarChar(20)) → aceptado
- [ ] BVA-008: Carnet de identidad con 21 caracteres → rechazado (400/422)
- [ ] Marcado con `@pytest.mark.black_box`

---

### REQ-009 — Authentication Testing (Categoría 7)

**User Story:** Como QA engineer de seguridad, necesito verificar que el sistema de autenticación no puede ser bypasseado y que los tokens JWT son validados correctamente.

#### Acceptance Criteria

- [ ] `test_cases/security/test_authentication.py` existe y contiene pruebas reales
- [ ] AUTH-SEC-001: Request sin header `Authorization` a endpoint protegido → 401
- [ ] AUTH-SEC-002: Token JWT con firma inválida (modificado manualmente) → 401
- [ ] AUTH-SEC-003: Token JWT expirado (generado con `exp` en el pasado) → 401 con `errorCode: TOKEN_EXPIRED`
- [ ] AUTH-SEC-004: Token JWT con `userId` de usuario inexistente → 401
- [ ] AUTH-SEC-005: Header `Authorization: Bearer <token>` (con "Bearer") → 401 (el backend espera token crudo)
- [ ] AUTH-SEC-006: Login con contraseña incorrecta → 401, no 500
- [ ] AUTH-SEC-007: Login con usuario inexistente → 401, no revela si el usuario existe o no en el mensaje
- [ ] Marcado con `@pytest.mark.security`

---

### REQ-010 — Authorization Testing (Categoría 8)

**User Story:** Como QA engineer de seguridad, necesito verificar que los controles de roles funcionan correctamente y que un usuario no puede acceder a recursos de otro rol.

#### Acceptance Criteria

- [ ] `test_cases/security/test_authorization.py` existe y contiene pruebas reales
- [ ] AUTHZ-001: Usuario con rol `NO_DEFINIDO` accediendo a `GET /api/colegiados/colegiado/` → 403
- [ ] AUTHZ-002: Usuario con rol `SECRETARIO` accediendo a `GET /api/financiero/tesoreria/presupuestos` → 403
- [ ] AUTHZ-003: Usuario con rol `TESORERO` accediendo a `GET /api/usuarios/usuario/` con rolMiddleware → 403
- [ ] AUTHZ-004: Usuario con rol `PRESIDENTE` accediendo a todos los endpoints protegidos → 200
- [ ] AUTHZ-005: Endpoint `GET /api/colegiados/documentos/:id` sin auth → 200 (documenta el bug de falta de auth)
- [ ] AUTHZ-006: Todos los endpoints de `ac-sociales` sin auth → 200 (documenta el bug de falta de auth)
- [ ] Los tests que documentan bugs de seguridad se marcan con `@pytest.mark.xfail(reason="Known security gap: endpoint sin authMiddleware")`
- [ ] Marcado con `@pytest.mark.security`

---

### REQ-011 — SQL Injection Testing (Categoría 9)

**User Story:** Como QA engineer de seguridad, necesito verificar que el ORM Prisma protege correctamente contra inyecciones SQL en todos los campos de entrada.

#### Acceptance Criteria

- [ ] `test_cases/security/test_sql_injection.py` existe y contiene pruebas reales
- [ ] SQLI-001: `correo: "admin' OR '1'='1' --"` en login → 401 (no 200, no 500)
- [ ] SQLI-002: `correo: "'; DROP TABLE usuarios; --"` en login → 401 (no 500, tabla sigue existiendo)
- [ ] SQLI-003: `correo: "\" OR \"1\"=\"1\""` en login → 401
- [ ] SQLI-004: Payload SQL en campo `nombre` de colegiado → 200 (Prisma lo trata como string literal) o 400
- [ ] SQLI-005: Payload SQL en parámetro `:id` de URL → 400 o 404 (no 500)
- [ ] Después de cada test de inyección, verificar que el servidor sigue respondiendo (no crasheó)
- [ ] Marcado con `@pytest.mark.security`

---

### REQ-012 — XSS Testing (Categoría 10)

**User Story:** Como QA engineer de seguridad, necesito verificar que el sistema no almacena ni refleja scripts maliciosos en las respuestas de la API.

#### Acceptance Criteria

- [ ] `test_cases/security/test_xss.py` existe y contiene pruebas reales
- [ ] XSS-001: Crear colegiado con `nombre: "<script>alert('xss')</script>"` → 200 (Prisma lo almacena como string)
- [ ] XSS-002: Recuperar el colegiado creado → el campo `nombre` en la respuesta JSON contiene el string literal, no ejecuta script
- [ ] XSS-003: Crear correspondencia con `asunto: "<img src=x onerror=alert(1)>"` → almacenado como string literal
- [ ] XSS-004: Payload con `javascript:alert(1)` en campo URL → almacenado como string literal
- [ ] XSS-005: Verificar que los headers de respuesta incluyen `Content-Type: application/json` (no text/html)
- [ ] Nota documentada: La protección XSS real es responsabilidad del frontend (React escapa por defecto). La API es un canal JSON.
- [ ] Marcado con `@pytest.mark.security`

---

### REQ-013 — Static Analysis (Categoría 11)

**User Story:** Como QA engineer de calidad, necesito medir la calidad estática del código Python del módulo QA usando herramientas reales de análisis.

#### Acceptance Criteria

- [ ] `test_cases/quality/test_static_analysis.py` existe y contiene pruebas reales
- [ ] SA-001: Ejecutar `flake8` sobre `qa/` (excluyendo `venv/`) → retorna código 0 o 1 (no crashea), resultado documentado
- [ ] SA-002: Ejecutar `radon cc qa/orchestrator/ -s` → complejidad ciclomática promedio calculada y documentada
- [ ] SA-003: Ejecutar `radon mi qa/orchestrator/ -s` → índice de mantenibilidad calculado y documentado
- [ ] SA-004: Ejecutar `bandit -r qa/ --exclude qa/venv` → reporte de vulnerabilidades de seguridad en código Python
- [ ] Cada test guarda su output en `qa/evidence/logs/static_analysis_{timestamp}.txt`
- [ ] Los tests NO fallan si hay code smells — solo documentan y reportan los resultados
- [ ] Marcado con `@pytest.mark.quality`

---

### REQ-014 — Coverage Reporting (Categoría 12)

**User Story:** Como QA engineer de calidad, necesito generar un reporte de cobertura real que muestre qué porcentaje del código Python del QA está siendo ejercitado por los tests.

#### Acceptance Criteria

- [ ] `test_cases/quality/test_coverage.py` existe y contiene pruebas reales
- [ ] COV-001: Ejecutar `coverage run -m pytest test_cases/functional/smoke/ --tb=no -q` → genera `.coverage`
- [ ] COV-002: Ejecutar `coverage report` → genera reporte en texto con porcentaje total
- [ ] COV-003: Ejecutar `coverage html -d reports/coverage_html/` → genera reporte HTML navegable
- [ ] COV-004: El reporte JSON se guarda en `reports/coverage_report.json`
- [ ] El test verifica que el archivo de reporte fue creado exitosamente
- [ ] El test documenta el porcentaje de cobertura obtenido en el resultado
- [ ] Marcado con `@pytest.mark.quality`

---

### REQ-015 — Gherkin BDD con Behave (Flujos de negocio)

**User Story:** Como QA engineer, necesito especificar los flujos de negocio críticos en lenguaje Gherkin y ejecutarlos con Behave contra la API real.

#### Acceptance Criteria

- [ ] `gherkin/features/auth.feature` existe con escenarios BDD reales en español
- [ ] `gherkin/features/colegiados.feature` existe con escenarios BDD reales en español
- [ ] `gherkin/steps/auth_steps.py` implementa todos los steps de `auth.feature` con llamadas HTTP reales
- [ ] `gherkin/steps/colegiados_steps.py` implementa todos los steps de `colegiados.feature` con llamadas HTTP reales
- [ ] Escenario auth-1: "Login exitoso con credenciales válidas" → Given usuario con email y contraseña válidos, When hace POST a /login, Then recibe token JWT
- [ ] Escenario auth-2: "Login fallido con contraseña incorrecta" → Given usuario con contraseña incorrecta, When hace POST a /login, Then recibe 401
- [ ] Escenario col-1: "Crear colegiado exitosamente" → Given usuario autenticado con rol PRESIDENTE, When crea colegiado con datos válidos, Then el colegiado aparece en el listado
- [ ] Escenario col-2: "Listar colegiados sin autenticación" → Given usuario sin token, When solicita listado, Then recibe 401
- [ ] Los steps usan `requests` para llamadas HTTP, no mocks
- [ ] `gherkin/environment.py` configura la URL base y el token de sesión compartido entre steps

---

### REQ-016 — Integración de los 12 runners en el pipeline

**User Story:** Como motor QA, necesito que el `pipeline_manager.py` ejecute los 12 runners en orden y transmita cada resultado via WebSocket al frontend.

#### Acceptance Criteria

- [ ] `runners/qa_runner.py` existe como runner unificado que puede ejecutar cualquiera de las 12 categorías
- [ ] El `pipeline_manager.py` actualizado carga los test cases del catálogo JSON y los ejecuta por categoría
- [ ] El catálogo `test_cases_catalog.json` contiene casos de prueba para las 12 categorías con campos: `id`, `category`, `method`, `endpoint`, `payload`, `expectedCode`, `description`
- [ ] El pipeline emite eventos WebSocket con `stage`, `progress` y `test_result` para cada prueba ejecutada
- [ ] El pipeline maneja errores por categoría sin abortar el resto del suite
- [ ] Al finalizar, el pipeline emite `stage: "done"` con `summary: { total, passed, failed, by_category }`
- [ ] El campo `by_category` del summary desglosa resultados por cada una de las 12 categorías

---

### REQ-017 — Frontend QA: QADashboard con datos reales

**User Story:** Como usuario del dashboard QA, necesito ver métricas reales de la última ejecución, no datos hardcodeados.

#### Acceptance Criteria

- [ ] `QADashboard.jsx` hace `GET /metrics/overview` al FastAPI en `localhost:8000` al montar el componente
- [ ] Si el FastAPI no está disponible, muestra un estado "Sin datos — QA Engine offline" en lugar de datos falsos
- [ ] El endpoint `GET /metrics/overview` en FastAPI retorna datos reales de la última ejecución almacenada
- [ ] Los campos mostrados son: total de pruebas, pruebas pasadas, pruebas fallidas, tasa de éxito, última ejecución (timestamp real)
- [ ] Los datos de "Estado de Herramientas" (Pytest, Playwright, etc.) se obtienen de `GET /health` del FastAPI, no son hardcodeados
- [ ] Mientras carga, muestra un skeleton loader, no datos falsos

---

### REQ-018 — Frontend QA: QACatalog con las 12 categorías reales

**User Story:** Como usuario del dashboard QA, necesito ver exactamente las 12 categorías implementadas y poder lanzar ejecuciones reales desde el catálogo.

#### Acceptance Criteria

- [ ] `QACatalog.jsx` muestra exactamente las 12 categorías: Smoke, API, Integration, E2E, Equivalence Partitioning, Boundary Value, Authentication, Authorization, SQL Injection, XSS, Static Analysis, Coverage
- [ ] Cada categoría muestra sus tests reales (no inventados), con nombre, herramienta y descripción
- [ ] El botón "Preparar Ejecución" navega a `/qa/execution/<CATEGORY_ID>-<timestamp>`
- [ ] El `exec_id` generado incluye el ID de categoría para que el pipeline sepa qué suite ejecutar
- [ ] Se eliminan las categorías que no están implementadas (Caja Blanca, Caja Gris, Rendimiento, Compatibilidad)

---

### REQ-019 — Frontend QA: QASettings con health check real

**User Story:** Como usuario del dashboard QA, necesito ver el estado real de los servicios, no estados hardcodeados.

#### Acceptance Criteria

- [ ] `QASettings.jsx` hace `GET http://localhost:8000/health` para verificar el FastAPI
- [ ] `QASettings.jsx` hace `GET http://localhost:3000/` para verificar el backend principal
- [ ] `QASettings.jsx` hace `GET http://localhost:5173/` para verificar el frontend
- [ ] Cada servicio muestra "ONLINE" (verde) si responde, "OFFLINE" (rojo) si no responde, "CHECKING..." mientras verifica
- [ ] Los health checks se ejecutan al montar el componente y tienen un botón "Refrescar"
- [ ] Los toggles de configuración (Screenshots, Videos) tienen estado local funcional

---

### REQ-020 — Frontend QA: QALayout sin rutas rotas

**User Story:** Como usuario del dashboard QA, necesito que la navegación del sidebar no tenga items que lleven a páginas 404.

#### Acceptance Criteria

- [ ] `QALayout.jsx` elimina el item "Execution History" que apunta a `/qa/history` (ruta no implementada)
- [ ] El sidebar tiene exactamente 3 items: Dashboard (`/qa`), Test Catalog (`/qa/catalog`), Platform Settings (`/qa/settings`)
- [ ] El router en `router.jsx` no tiene ruta `/qa/history` registrada (o si se agrega, tiene un componente real)

---

## Constraints

1. **No modificar la lógica del backend** — Solo se pueden agregar endpoints de health check o métricas al FastAPI QA, nunca al backend Express
2. **No usar mocks** — Todas las pruebas deben ejecutar contra `localhost:3001` (test server con DB efímera)
3. **El pipeline_manager.py es el orquestador central** — Los runners Python se integran en él, no son sistemas paralelos
4. **Gherkin es API-level** — Los steps de Behave usan `requests`, no Selenium. Selenium es solo para E2E Playwright
5. **Evidencia obligatoria** — Cada test debe registrar request, response, status_code, duración y resultado
6. **Credenciales de prueba**: `diegoalextorrez@gmail.com` / `12345678` — el pipeline crea un usuario QA admin en la DB efímera, estas credenciales son para referencia de formato
7. **Campo contraseña con ñ** — El backend espera `contraseña` en el body JSON, no `contrasena`
8. **Token sin Bearer** — El header es `Authorization: <token>`, no `Authorization: Bearer <token>`
