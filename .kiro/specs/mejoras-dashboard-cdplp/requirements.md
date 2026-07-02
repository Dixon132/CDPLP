# Requerimientos — Mejoras Dashboard CDPLP

## Introducción

Conjunto de mejoras para el sistema de gestión del Colegio Departamental de Profesionales de La Paz (CDPLP). Cubre corrección de bugs de UX, nuevas tablas con gestión centralizada, y el flujo completo de administración de postulaciones.

**Stack técnico:**
- Frontend: React + Vite + Tailwind + MUI (`ClienteCDPLPL/src/features/dashboard`)
- Backend: Express + Prisma + TypeScript (`Servidor/src/modules`)
- Storage: Supabase Storage (buckets públicos)
- Base de datos: PostgreSQL vía Prisma

---

## Glosario

- **Dashboard**: Panel de administración del CDPLP accesible solo para usuarios autenticados.
- **ConfirmDeleteModal**: Componente React reutilizable que muestra un diálogo de confirmación antes de ejecutar una acción destructiva o de cambio de estado.
- **ConfirmActionModal**: Componente React para confirmar acciones no destructivas (ej. guardar cambios).
- **Colegiado**: Profesional inscrito y activo en el colegio.
- **Pasante**: Profesional en proceso de pasantía, gestionado en el sistema.
- **Invitado**: Participante externo registrado en el sistema.
- **Postulacion**: Solicitud de ingreso al colegio presentada por un profesional externo.
- **Especialidad**: Área profesional de un colegiado o pasante, gestionada como entidad centralizada.
- **DocumentoRequerido**: Documento que debe presentar un postulante; gestionado dinámicamente desde la BD.
- **MovimientoFinanciero**: Registro de ingreso o egreso en el módulo de tesorería.
- **Supabase_Storage**: Servicio de almacenamiento de archivos utilizado para documentos y comprobantes.
- **PIN_Acceso**: Código de 4 dígitos generado al aceptar una postulación, entregado al nuevo colegiado.
- **Sistema**: El sistema de gestión CDPLP en su conjunto (frontend + backend).
- **Validator**: Lógica de validación en el backend que verifica integridad de datos antes de persistirlos.
- **AuthInterceptor**: Instancia de axios configurada con interceptores que adjuntan el token de autenticación a cada petición.

---

## Requisitos

---

### Requisito 1: Modal de confirmación con etiquetas y colores flexibles

**User Story:** Como administrador, quiero que el modal de confirmación refleje la acción real que voy a ejecutar (activar, desactivar o eliminar), para evitar confusión al operar sobre registros.

#### Criterios de aceptación

1. THE Sistema SHALL aceptar las props opcionales `confirmLabel` (string), `confirmIcon` (ReactNode) y `confirmColor` ("red" | "amber" | "emerald") en el componente ConfirmDeleteModal.
2. WHEN `confirmColor` es "emerald", THE ConfirmDeleteModal SHALL renderizar el botón de confirmación con estilos verdes.
3. WHEN `confirmColor` es "amber", THE ConfirmDeleteModal SHALL renderizar el botón de confirmación con estilos ámbar.
4. WHEN no se pasan las props opcionales, THE ConfirmDeleteModal SHALL usar "Eliminar", el ícono Trash2 y color rojo como valores predeterminados.
5. THE Sistema SHALL aplicar las props flexibles en los módulos de Usuarios, Roles, Colegiados, Pasantes, Invitados, Actividades Institucionales y Tesorería para las acciones de activar y desactivar.

---

### Requisito 2: Z-index del componente de alertas

**User Story:** Como usuario del dashboard, quiero que las alertas del sistema siempre sean visibles por encima de los modales, para no perder notificaciones de éxito o error.

#### Criterios de aceptación

1. THE Sistema SHALL renderizar el componente Alerts con un z-index de 9999.
2. WHEN un modal está abierto con overlay borroso, THE Alerts SHALL aparecer por encima del overlay.

---

### Requisito 3: Eliminación de doble alerta y retrasos artificiales en formularios

**User Story:** Como usuario, quiero recibir una única notificación al completar una acción, sin retrasos innecesarios, para tener una experiencia de uso fluida.

#### Criterios de aceptación

1. WHEN un formulario llama a `onSuccess()`, THE Sistema SHALL emitir únicamente el feedback gestionado por la página padre, sin mostrar alertas internas adicionales dentro del formulario.
2. THE Sistema SHALL llamar a `onSuccess()` de forma inmediata, sin envolver la llamada en un `setTimeout`.
3. THE Sistema SHALL aplicar esta corrección en los componentes: EditarCorrespondencia, CreateMemoria, EditMemoria, EditActInstitucional y CreateActInstitucional.

---

### Requisito 4: Estados del ciclo de vida de Actividades Institucionales

**User Story:** Como administrador, quiero que los estados de una actividad institucional representen su ciclo de vida real, para gestionar correctamente la inscripción, ejecución y cierre.

#### Criterios de aceptación

1. THE Sistema SHALL manejar únicamente los estados `EN_INSCRIPCION`, `EN_CURSO` y `TERMINADO` para las actividades institucionales, tanto en frontend como en backend.
2. WHEN se crea una actividad institucional, THE Sistema SHALL ofrecer los tres estados válidos en el selector del formulario.
3. WHEN se muestra el estado de una actividad, THE Sistema SHALL renderizar el badge correspondiente a `EN_INSCRIPCION`, `EN_CURSO` o `TERMINADO`.
4. THE Sistema SHALL actualizar los filtros de búsqueda para usar los tres nuevos estados.

---

### Requisito 5: Corrección de autenticación al registrar participante en actividad institucional

**User Story:** Como administrador, quiero poder registrar un colegiado en una actividad institucional sin recibir un error 401, para completar el registro correctamente.

#### Criterios de aceptación

1. WHEN el componente RegisterColegiadoInst realiza una petición al backend, THE Sistema SHALL usar la instancia de axios configurada con AuthInterceptor en lugar de axios directamente.
2. IF la petición de registro de colegiado en actividad institucional no incluye el token de autenticación, THEN THE Validator SHALL retornar un error 401.

---

### Requisito 6: Consistencia visual de formularios de modificación

**User Story:** Como usuario del dashboard, quiero que todos los formularios de modificación tengan el mismo estilo visual, para tener una experiencia de uso coherente.

#### Criterios de aceptación

1. THE Sistema SHALL implementar ModificarActividadSocial usando el mismo patrón de layout que ModificarColegiado: MUI Box/TextField, mismos botones y espaciado.
2. THE Sistema SHALL implementar ModificarPasante con el mismo estilo visual que ModificarColegiado y con validaciones equivalentes a las del formulario de creación de pasante.
3. THE Sistema SHALL implementar ModificarInvitado con el mismo estilo visual que ModificarColegiado y con validaciones equivalentes a las del formulario de creación de invitado.

---

### Requisito 7: Ver comprobante desde el historial de pagos

**User Story:** Como administrador, quiero poder ver el comprobante de pago desde el detalle de un pago en el historial, para verificar comprobantes sin salir del sistema.

#### Criterios de aceptación

1. WHEN `pago.comprobante` no es null en VerDetallesPago, THE Sistema SHALL mostrar un botón "Ver comprobante".
2. WHEN el usuario hace clic en "Ver comprobante", THE Sistema SHALL abrir la URL pública de Supabase_Storage del comprobante en una pestaña nueva del navegador.
3. THE Sistema SHALL construir la URL del comprobante a partir de la variable de entorno `VITE_SUPABASE_URL`.

---

### Requisito 8: Comprobante en movimientos financieros de tesorería

**User Story:** Como tesorero, quiero poder adjuntar un comprobante al registrar un movimiento financiero y verlo desde el historial, para mantener respaldo documental de cada transacción.

#### Criterios de aceptación

1. THE Sistema SHALL incluir el campo `comprobante` (String opcional) en el modelo `movimientos_financieros` de la base de datos.
2. WHEN se crea un movimiento financiero, THE Sistema SHALL ofrecer un campo de carga de archivo que acepte formatos image/* y .pdf.
3. WHEN se guarda un movimiento con archivo adjunto, THE Sistema SHALL subir el archivo a Supabase_Storage y guardar la ruta en el campo `comprobante`.
4. WHEN `movimiento.comprobante` no es null en el historial de tesorería, THE Sistema SHALL mostrar un botón "Ver comprobante" que abra la URL pública en pestaña nueva.

---

### Requisito 9: Gestión centralizada de especialidades

**User Story:** Como administrador, quiero gestionar un catálogo de especialidades desde el panel de ajustes, para evitar inconsistencias por texto libre y facilitar la selección en formularios.

#### Criterios de aceptación

1. THE Sistema SHALL persistir las especialidades en la tabla `especialidades` con los campos: `id_especialidad`, `nombre` (único), `descripcion`, `activo`, `createdAt`.
2. THE Sistema SHALL exponer los endpoints: GET `/api/especialidades` (activas), GET `/api/especialidades/admin` (todas), POST `/api/especialidades`, PUT `/api/especialidades/:id`, PATCH `/api/especialidades/:id/estado`.
3. WHEN se accede a Ajustes, THE Sistema SHALL mostrar una subsección "Especialidades" con tabla CRUD que permita crear, editar, activar y desactivar especialidades.
4. WHEN se llena un formulario de colegiado, pasante o postulante (Step 3), THE Sistema SHALL reemplazar el campo de texto libre de especialidades con un componente multi-select que cargue datos desde GET `/api/especialidades`.
5. WHEN el usuario selecciona especialidades en el multi-select, THE Sistema SHALL guardar el valor como string separado por comas para mantener compatibilidad con el campo existente en la base de datos.
6. WHERE la opción `allowCreate` está habilitada en EspecialidadesSelect, THE Sistema SHALL mostrar un botón "+ Nueva" que permita crear una especialidad nueva de forma inline.

---

### Requisito 10: Gestión dinámica de documentos requeridos para postulaciones

**User Story:** Como administrador, quiero gestionar dinámicamente los documentos requeridos para una postulación desde el panel de ajustes, para poder agregar o desactivar documentos sin modificar el código.

#### Criterios de aceptación

1. THE Sistema SHALL persistir los documentos requeridos en la tabla `documentos_requeridos` con los campos: `id_doc_req`, `nombre`, `descripcion`, `activo`, `es_opcional`, `orden`, `createdAt`.
2. THE Sistema SHALL incluir un seed inicial con los 6 documentos equivalentes a los `DOCUMENT_SLOTS` actuales del frontend.
3. THE Sistema SHALL exponer los endpoints: GET `/api/documentos-requeridos` (activos, ordenados), GET `/api/documentos-requeridos/admin` (todos), POST, PUT `/:id`, PATCH `/:id/estado`.
4. WHEN se accede a Ajustes, THE Sistema SHALL mostrar una subsección "Documentos Requeridos" con tabla CRUD completa.
5. WHEN se carga el Step 3 de PostularPage, THE Sistema SHALL obtener la lista de documentos desde GET `/api/documentos-requeridos` en lugar de usar `DOCUMENT_SLOTS` hardcodeados.
6. WHEN se crea una postulación, THE Validator SHALL verificar que todos los documentos activos no-opcionales estén presentes en los archivos subidos.
7. IF faltan documentos obligatorios al crear una postulación, THEN THE Validator SHALL retornar HTTP 400 con la lista de nombres de documentos faltantes.

---

### Requisito 11: Módulo de administración de postulaciones en el dashboard

**User Story:** Como administrador, quiero gestionar las postulaciones desde el dashboard, para revisar, aceptar o rechazar solicitudes de ingreso sin acceder directamente a la base de datos.

#### Criterios de aceptación

1. THE Sistema SHALL incluir una ruta `/dashboard/postulaciones` con ítem visible en el menú lateral del dashboard.
2. WHEN se accede a `/dashboard/postulaciones`, THE Sistema SHALL mostrar una tabla con las columnas: nombre, CI, correo, estado badge, fecha, acciones.
3. THE Sistema SHALL ofrecer filtro por estado (EN_REVISION, ACEPTADO, RECHAZADO) y buscador por nombre o CI.
4. WHEN la postulación está en estado EN_REVISION, THE Sistema SHALL mostrar las acciones "Ver detalle", "Aceptar" y "Rechazar".
5. WHEN la postulación está en estado RECHAZADO, THE Sistema SHALL mostrar las acciones "Ver detalle", "Cambiar a Aceptado" y "Eliminar definitivamente".
6. WHEN el administrador hace clic en "Ver detalle", THE Sistema SHALL abrir un modal con datos personales, lista de documentos con botón Ver, enlace al comprobante de pago, estado y motivo de rechazo si aplica.

---

### Requisito 12: Flujo de aceptar postulación

**User Story:** Como administrador, quiero aceptar una postulación para que el sistema cree automáticamente el registro de colegiado, migre los documentos y registre el pago inicial.

#### Criterios de aceptación

1. WHEN el administrador acepta una postulación, THE Sistema SHALL crear un registro de colegiado con los datos de la postulación, `fecha_inscripcion` = hoy, `fecha_renovacion` = hoy + 1 año, `estado` = ACTIVO, y un `pin_acceso` de 4 dígitos aleatorios.
2. WHEN se acepta una postulación, THE Sistema SHALL copiar cada documento de `postulaciones/{id}/` a `colegiados/{folderUser}/` en Supabase_Storage y crear los registros `documentos_colegiados` correspondientes.
3. WHEN se acepta una postulación, THE Sistema SHALL crear un registro en `pagos_colegiados` con el monto obtenido de `config_pago` (clave `monto_inicial`), concepto `'Pago de inscripción - postulación aceptada'`, fecha = hoy, estado = REALIZADO.
4. WHEN se acepta una postulación, THE Sistema SHALL registrar el pago en tesorería mediante `registrarMovimientoPagoColegiatura`.
5. WHEN se acepta una postulación, THE Sistema SHALL actualizar el estado de la postulación a `ACEPTADO`.
6. WHEN la aceptación es exitosa, THE Sistema SHALL retornar el objeto `{ colegiado, pago, pin_temporal }` donde `pin_temporal` se incluye solo en esa respuesta.
7. THE Sistema SHALL ejecutar todos los pasos de aceptación dentro de una transacción de Prisma para garantizar atomicidad.

---

### Requisito 13: Flujo de rechazar postulación

**User Story:** Como administrador, quiero rechazar una postulación indicando el motivo, para comunicar al postulante las razones del rechazo y poder revertir la decisión si es necesario.

#### Criterios de aceptación

1. WHEN el administrador rechaza una postulación, THE Sistema SHALL actualizar el estado a `RECHAZADO` y guardar el motivo de rechazo proporcionado.
2. WHEN se rechaza una postulación, THE Sistema SHALL conservar todos los archivos en `postulaciones/{id}/` en Supabase_Storage sin borrarlos.
3. WHEN la postulación está en estado RECHAZADO, THE Sistema SHALL habilitar la opción "Cambiar a Aceptado" que ejecuta el flujo completo de aceptación.

---

### Requisito 14: Eliminación definitiva de postulación

**User Story:** Como administrador, quiero eliminar definitivamente una postulación rechazada, incluyendo sus archivos, para liberar espacio y limpiar registros inválidos.

#### Criterios de aceptación

1. WHEN el administrador elimina definitivamente una postulación, THE Sistema SHALL listar y eliminar todos los archivos del directorio `postulaciones/{id}/` en Supabase_Storage.
2. WHEN el administrador elimina definitivamente una postulación, THE Sistema SHALL eliminar el registro de la base de datos.
3. THE Sistema SHALL requerir doble confirmación en el frontend (ConfirmDeleteModal con 2 pasos) antes de ejecutar la eliminación definitiva.
