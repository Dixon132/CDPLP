# Plan de implementación — Mejoras Dashboard CDPLP

## Visión general

Implementación incremental de los tres grupos de mejoras: bugs de UX (sin cambios de BD), nuevas entidades centralizadas (especialidades, documentos requeridos) y flujo completo de administración de postulaciones. Cada tarea construye sobre la anterior y termina con los componentes integrados al sistema existente.

---

## Tareas

- [x] 1. Correcciones de UX: ConfirmDeleteModal flexible y z-index de alertas
  - [x] 1.1 Agregar props opcionales al componente ConfirmDeleteModal
    - Abrir `ClienteCDPLPL/src/components/ConfirmDeleteModal.jsx`
    - Agregar props: `confirmLabel` (default `"Eliminar"`), `confirmIcon` (default `<Trash2/>`), `confirmColor` (default `"red"`)
    - Implementar mapa de colores: `red → bg-red-600`, `amber → bg-amber-500`, `emerald → bg-emerald-600`
    - Aplicar `colorMap[confirmColor]` en el botón de confirmación
    - _Requisitos: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 Escribir property test para ConfirmDeleteModal
    - **Propiedad 1: Renderizado correcto según props de ConfirmDeleteModal**
    - Para cualquier combinación de `confirmLabel` y `confirmColor` válidos, verificar que el botón muestra el label y clases correctas
    - Usar `fast-check` con `fc.constantFrom("red","amber","emerald")`
    - _Requisitos: 1.1, 1.2, 1.3_

  - [x] 1.3 Actualizar módulos que usan ConfirmDeleteModal para activar/desactivar
    - `Usuarios.jsx` y `Roles.jsx`: pasar `confirmColor="amber"` + `confirmIcon=<UserX/>` al desactivar, `confirmColor="emerald"` + `confirmIcon=<UserCheck/>` al activar
    - `Colegiados.jsx`, `Pasantes.jsx`: mismo patrón
    - `Ac_institucionales.jsx`: mismo patrón
    - Verificar que las acciones de eliminar siguen usando los defaults
    - _Requisitos: 1.5_

  - [x] 1.4 Corregir z-index del componente Alerts
    - Abrir el componente `Alerts.jsx` (buscar en `dashboard/components/`)
    - Agregar `z-[9999]` como clase Tailwind o `style={{ zIndex: 9999 }}` al contenedor raíz
    - _Requisitos: 2.1, 2.2_

- [x] 2. Eliminar doble alerta y `setTimeout` en formularios
  - [x] 2.1 Limpiar EditarCorrespondencia
    - Abrir `pages/Correspondencia/components/EditarCorrespondencia.jsx`
    - Quitar cualquier `setAlert`/`setError` de éxito interno posterior al submit
    - Reemplazar `setTimeout(() => onSuccess(), N)` por `onSuccess()` directo
    - _Requisitos: 3.1, 3.2, 3.3_

  - [x] 2.2 Limpiar CreateMemoria y EditMemoria
    - Mismo patrón en `pages/Memorias/components/CreateMemoria.jsx` y `EditMemoria.jsx`
    - _Requisitos: 3.1, 3.2, 3.3_

  - [x] 2.3 Limpiar EditActInstitucional y CreateActInstitucional
    - Mismo patrón en `pages/Ac-Inst/components/EditActInstitucional.jsx` y `CreateActInstitucional.jsx`
    - _Requisitos: 3.1, 3.2, 3.3_

  - [x] 2.4 Escribir property test para dispatch inmediato de onSuccess
    - **Propiedad 2: onSuccess se llama inmediatamente tras submit exitoso**
    - Usar fake timers de Vitest: avanzar 0ms y verificar que `onSuccess` ya fue invocado
    - Ejecutar contra cada formulario afectado
    - _Requisitos: 3.2_

- [x] 3. Checkpoint — Verificar que las correcciones de UX funcionan
  - Asegurarse de que todos los tests pasan. Preguntar al usuario si tiene dudas antes de continuar.

- [x] 4. Actividades Institucionales — estados y corrección 401
  - [x] 4.1 Actualizar estados en backend
    - Abrir `Servidor/src/modules/actividad-institucional/controllers/ac-institucional.ts`
    - Reemplazar validaciones/comparaciones de `ACTIVO`/`INACTIVO` por `EN_INSCRIPCION`, `EN_CURSO`, `TERMINADO`
    - Actualizar cualquier tipo TypeScript o enum relacionado
    - _Requisitos: 4.1_

  - [x] 4.2 Actualizar estados en frontend
    - `Ac_institucionales.jsx`: actualizar filtros y badges con los 3 nuevos estados
    - `CreateActInstitucional.jsx` y `EditActInstitucional.jsx`: actualizar selectores con `ESTADOS_ACTIVIDAD`
    - Implementar `PostulacionEstadoBadge` de colores: azul (EN_INSCRIPCION), verde (EN_CURSO), gris (TERMINADO)
    - _Requisitos: 4.1, 4.2, 4.3, 4.4_

  - [x] 4.3 Escribir property test para badge de actividades
    - **Propiedad 3: Badge de actividades institucionales siempre válido**
    - Para cualquier estado en `{EN_INSCRIPCION, EN_CURSO, TERMINADO}`, verificar label y clase correctos
    - _Requisitos: 4.1, 4.3_

  - [x] 4.4 Corregir autenticación en RegisterColegiadoInst
    - Abrir `pages/Ac-Inst/components/RegisterColegiadoInst.jsx`
    - Reemplazar `import axios from 'axios'` por la instancia configurada con interceptores
    - _Requisitos: 5.1_

- [x] 5. Reestilizar formularios de modificación
  - [x] 5.1 Reestilizar ModificarActividadSocial
    - Abrir `pages/Ac-soc/components/ModificarActividadSocial.jsx`
    - Implementar el mismo layout que ModificarColegiado: MUI `Box`, `TextField`, botones con mismo espaciado
    - _Requisitos: 6.1_

  - [x] 5.2 Reestilizar ModificarPasante con validaciones
    - Abrir `pages/Colegiados/Pasantes/Components/ModificarPasante.jsx`
    - Aplicar mismo estilo que ModificarColegiado
    - Agregar validaciones equivalentes a `CreatePasante`: campos requeridos, longitud mínima, formato de teléfono
    - _Requisitos: 6.2_

  - [x] 5.3 Reestilizar ModificarInvitado con validaciones
    - Localizar el componente de modificación de invitados en `pages/Colegiados/Invitados/`
    - Aplicar mismo estilo y validaciones equivalentes al form de creación
    - _Requisitos: 6.3_

- [x] 6. Ver comprobante desde historial de pagos y tesorería
  - [x] 6.1 Agregar botón Ver comprobante en VerDetallesPago
    - Abrir `pages/Colegiados/components/VerDetallesPago.jsx`
    - Si `pago.comprobante !== null`: mostrar botón "Ver comprobante"
    - Al hacer clic: `window.open(buildSupabaseUrl(pago.comprobante), '_blank')`
    - Función `buildSupabaseUrl(path)`: `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/bucket/${path}`
    - _Requisitos: 7.1, 7.2, 7.3_

  - [x] 6.2 Escribir property tests para visibilidad y construcción de URL
    - **Propiedad 4: Visibilidad de botón Ver comprobante según existencia del comprobante**
    - **Propiedad 5: Construcción correcta de URL de Supabase para comprobantes**
    - Para cualquier valor de `comprobante` (null vs string), verificar presencia/ausencia del botón
    - Para cualquier URL base y path, verificar que la URL resultante tiene el formato correcto
    - _Requisitos: 7.1, 7.2, 7.3_

- [x] 7. Checkpoint — Verificar correcciones de UX avanzadas
  - Asegurarse de que todos los tests pasan. Preguntar al usuario si tiene dudas.

- [x] 8. Migración Prisma — nuevos modelos y campo comprobante
  - [x] 8.1 Actualizar schema.prisma
    - Abrir `Servidor/prisma/schema.prisma`
    - Agregar modelo `especialidades` (id_especialidad, nombre unique, descripcion, activo, createdAt)
    - Agregar modelo `documentos_requeridos` (id_doc_req, nombre, descripcion, activo, es_opcional, orden, createdAt)
    - Agregar campo `comprobante String? @db.VarChar(300)` al modelo `movimientos_financieros`
    - _Requisitos: 9.1, 10.1, 8.1_

  - [x] 8.2 Correr migración
    - Ejecutar: `npx prisma migrate dev --name mejoras_dashboard` en `Servidor/`
    - Verificar que la migración se genera y aplica sin errores
    - _Requisitos: 9.1, 10.1, 8.1_

  - [x] 8.3 Crear seed de documentos_requeridos
    - Abrir o crear `Servidor/prisma/seed.ts`
    - Agregar seed de los 6 documentos: Carnet de Identidad, Título Profesional, Certificado de Antecedentes, Foto Carnet 3x4, Certificado de Nacimiento, Documento de Respaldo Adicional (opcional)
    - _Requisitos: 10.2_

- [x] 9. Backend — módulo especialidades
  - [x] 9.1 Crear controller de especialidades
    - Crear `Servidor/src/modules/especialidades/controllers/especialidades.ts`
    - Implementar: `getActivas`, `getAdmin`, `create`, `update`, `toggleEstado`
    - Validar nombre único en `create` (retornar 409 si ya existe)
    - _Requisitos: 9.1, 9.2_

  - [x] 9.2 Crear router de especialidades y registrar en rutas globales
    - Crear `Servidor/src/modules/especialidades/routes/especialidades.ts`
    - Montar: GET `/`, GET `/admin`, POST `/`, PUT `/:id`, PATCH `/:id/estado`
    - Registrar en `Servidor/src/routes/index.ts` bajo `/api/especialidades`
    - _Requisitos: 9.2_

- [x] 10. Backend — módulo documentos-requeridos
  - [x] 10.1 Crear controller de documentos-requeridos
    - Crear `Servidor/src/modules/documentos-requeridos/controllers/documentos-requeridos.ts`
    - Implementar: `getActivos` (ordenados por `orden`), `getAdmin`, `create`, `update`, `toggleEstado`
    - _Requisitos: 10.1, 10.3_

  - [x] 10.2 Crear router y registrar
    - Crear `Servidor/src/modules/documentos-requeridos/routes/documentos-requeridos.ts`
    - Registrar en `Servidor/src/routes/index.ts` bajo `/api/documentos-requeridos`
    - _Requisitos: 10.3_

- [x] 11. Backend — comprobante en movimientos financieros
  - [x] 11.1 Actualizar controller de movimientos financieros para soportar comprobante
    - Localizar el controller en `Servidor/src/modules/financiero/`
    - Agregar manejo de archivo con multer en la ruta de crear movimiento
    - Subir archivo a Supabase Storage en ruta `movimientos/{id_movimiento}/{filename}`
    - Guardar ruta en campo `comprobante` del registro
    - _Requisitos: 8.2, 8.3_

- [x] 12. Checkpoint — Verificar nuevos endpoints del backend
  - Asegurarse de que todos los endpoints responden correctamente con datos de prueba. Preguntar al usuario si tiene dudas.

- [x] 13. Frontend — servicios y componente EspecialidadesSelect
  - [x] 13.1 Crear servicio de especialidades
    - Crear `ClienteCDPLPL/src/features/dashboard/services/especialidades.js`
    - Implementar las 5 funciones usando la instancia axios con AuthInterceptor
    - _Requisitos: 9.2_

  - [x] 13.2 Crear servicio de documentos requeridos
    - Crear `ClienteCDPLPL/src/features/dashboard/services/documentosRequeridos.js`
    - Implementar las 5 funciones
    - _Requisitos: 10.3_

  - [ ] 13.3 Crear componente EspecialidadesSelect
    - Crear `ClienteCDPLPL/src/features/dashboard/components/EspecialidadesSelect.jsx`
    - Props: `value` (string[]), `onChange` (fn), `allowCreate` (bool)
    - Cargar lista desde `getAllEspecialidades()` al montar
    - Renderizar dropdown con búsqueda y chips de seleccionadas
    - Si `allowCreate=true`: botón "+ Nueva" con mini-form inline
    - _Requisitos: 9.4, 9.6_

  - [x] 13.4 Escribir property tests para EspecialidadesSelect y serialización
    - **Propiedad 6: Multi-select especialidades renderiza todas las opciones disponibles**
    - **Propiedad 7: Serialización de especialidades seleccionadas a string con comas**
    - Para cualquier lista de especialidades, verificar que todas están en el DOM
    - Para cualquier array seleccionado, verificar round-trip: `array → join → split → array`
    - _Requisitos: 9.4, 9.5_

- [x] 14. Frontend — integrar EspecialidadesSelect en formularios de colegiados y pasantes
  - [x] 14.1 Reemplazar campo de especialidades en CreateColegiado y ModificarColegiado
    - `pages/Colegiados/components/CreateColegiado.jsx`: reemplazar textarea/input libre por `<EspecialidadesSelect allowCreate />`
    - `pages/Colegiados/components/ModificarColegiado.jsx`: mismo cambio, inicializar `value` parseando el string existente con `split(", ")`
    - Al guardar: `.join(", ")` para serializar
    - _Requisitos: 9.4, 9.5_

  - [x] 14.2 Reemplazar campo de especialidades en CreatePasante y ModificarPasante
    - `pages/Colegiados/Pasantes/Components/CreatePasante.jsx`
    - `pages/Colegiados/Pasantes/Components/ModificarPasante.jsx`
    - Mismo patrón que 14.1
    - _Requisitos: 9.4, 9.5_

- [ ] 15. Frontend — CRUD especialidades y documentos en Ajustes
  - [ ] 15.1 Crear EspecialidadesCRUD component
    - Crear `pages/Ajustes/components/EspecialidadesCRUD.jsx`
    - Tabla con columnas: nombre, descripción, estado badge, acciones (editar, activar/desactivar)
    - Botón "Agregar especialidad" → modal de creación
    - Editar → modal de edición inline o modal separado
    - Activar/desactivar → ConfirmDeleteModal con props flexibles
    - _Requisitos: 9.3_

  - [x] 15.2 Crear DocumentosRequeridosCRUD component
    - Crear `pages/Ajustes/components/DocumentosRequeridosCRUD.jsx`
    - Tabla: nombre, descripción, es_opcional badge, orden, estado, acciones
    - CRUD completo con los mismos patrones
    - _Requisitos: 10.4_

  - [x] 15.3 Agregar ambas subsecciones a Ajustes.jsx
    - Abrir `pages/Ajustes/Ajustes.jsx`
    - Agregar tabs o secciones colapsables para "Especialidades" y "Documentos Requeridos"
    - Importar y montar `EspecialidadesCRUD` y `DocumentosRequeridosCRUD`
    - _Requisitos: 9.3, 10.4_

- [x] 16. Frontend — PostularPage Step3 dinámico y comprobante en tesorería
  - [x] 16.1 Cargar documentos requeridos dinámicamente en PostularPage
    - Abrir `ClienteCDPLPL/src/features/postulaciones/PostularPage.jsx`
    - En Step 3: reemplazar `DOCUMENT_SLOTS` hardcodeados por llamada a `getDocumentosRequeridos()`
    - Renderizar el formulario de carga de archivos de forma dinámica según la respuesta de la API
    - _Requisitos: 10.5_

  - [x] 16.2 Agregar campo de comprobante en el form de crear movimiento de tesorería
    - Localizar el formulario de crear movimiento en `pages/Tesoreria/components/`
    - Agregar `<input type="file" accept="image/*,.pdf" />` para el comprobante
    - Actualizar la llamada a la API para enviar el archivo como `FormData`
    - _Requisitos: 8.2_

  - [x] 16.3 Mostrar botón Ver comprobante en historial de tesorería
    - En la vista de historial/detalle de movimientos, mostrar botón "Ver comprobante" si `movimiento.comprobante !== null`
    - Misma lógica de construcción de URL que en VerDetallesPago (Propiedad 5)
    - _Requisitos: 8.4_

- [ ] 17. Checkpoint — Verificar integración frontend completa hasta aquí
  - Asegurarse de que todos los tests pasan y los módulos funcionan con datos reales. Preguntar al usuario si tiene dudas.

- [ ] 18. Backend — validación de documentos en crear postulación
  - [x] 18.1 Agregar validación dinámica al endpoint POST /api/postulaciones
    - Abrir `Servidor/src/modules/postulaciones/controllers/postulaciones.ts`
    - Consultar `documentos_requeridos` activos y no-opcionales
    - Comparar con los archivos subidos en `req.files`
    - Si faltan: retornar 400 con `{ error: "Documentos faltantes", faltantes: string[] }`
    - _Requisitos: 10.6, 10.7_

  - [ ] 18.2 Escribir property test para validación de documentos faltantes
    - **Propiedad 8: Validación de documentos faltantes cubre exactamente los requeridos**
    - Usar `fc.tuple(fc.array(fc.string()), fc.array(fc.string()))` para generar listas arbitrarias
    - Verificar que el validador identifica exactamente la diferencia (requeridos − subidos)
    - _Requisitos: 10.6, 10.7_

- [ ] 19. Backend — módulo admin de postulaciones
  - [ ] 19.1 Implementar función generarPIN4Digitos
    - En `postulaciones.ts` o utilidad compartida
    - Garantizar que el resultado es siempre una cadena de 4 dígitos (1000–9999)
    - _Requisitos: 12.1_

  - [ ] 19.2 Escribir property test para generarPIN4Digitos
    - **Propiedad 9: PIN generado siempre es una cadena de exactamente 4 dígitos numéricos**
    - Ejecutar la función 500+ veces, verificar longitud === 4, solo dígitos, valor entre 1000–9999
    - _Requisitos: 12.1_

  - [ ] 19.3 Implementar flujo de aceptar postulación
    - Endpoint: `PATCH /api/postulaciones/admin/:id/aceptar`
    - Implementar dentro de `prisma.$transaction`: crear colegiado, copiar docs en Supabase, crear documentos_colegiados, obtener monto de config_pago, crear pagos_colegiados, llamar registrarMovimientoPagoColegiatura, actualizar estado
    - Retornar `{ colegiado, pago, pin_temporal }`
    - _Requisitos: 12.1–12.7_

  - [ ] 19.4 Implementar flujo de rechazar postulación
    - Endpoint: `PATCH /api/postulaciones/admin/:id/rechazar`
    - Actualizar estado a `RECHAZADO`, guardar `motivo_rechazo`
    - No borrar archivos de Supabase
    - _Requisitos: 13.1, 13.2_

  - [ ] 19.5 Implementar eliminación definitiva de postulación
    - Endpoint: `DELETE /api/postulaciones/admin/:id`
    - Listar archivos en `postulaciones/{id}/` → eliminar cada uno de Supabase Storage
    - Eliminar registro de la BD
    - _Requisitos: 14.1, 14.2_

- [ ] 20. Frontend — módulo admin de postulaciones en dashboard
  - [ ] 20.1 Crear estructura de carpetas y componentes base
    - Crear `pages/Postulaciones/index.jsx` — esqueleto con tabla vacía
    - Crear `components/PostulacionEstadoBadge.jsx` con los 3 estados y sus colores
    - Crear `components/FiltrosPostulaciones.jsx` con filtro de estado y buscador
    - Crear `components/PostulacionDetalle.jsx` — modal vacío por ahora
    - _Requisitos: 11.1_

  - [ ] 20.2 Agregar ruta e ítem de menú
    - En `ClienteCDPLPL/src/features/dashboard/routes.jsx`: agregar ruta `/postulaciones` → `Postulaciones/index.jsx`
    - En el componente de menú lateral: agregar ítem "Postulaciones"
    - _Requisitos: 11.1_

  - [ ] 20.3 Implementar tabla de postulaciones con filtros y buscador
    - `index.jsx`: cargar postulaciones desde API, renderizar tabla con columnas nombre/CI/correo/estado/fecha/acciones
    - Conectar `FiltrosPostulaciones` para filtrar por estado
    - Conectar buscador para filtrar por nombre o CI
    - _Requisitos: 11.2, 11.3_

  - [ ] 20.4 Implementar acciones de tabla
    - "Ver detalle" → abrir `PostulacionDetalle` con datos de la postulación
    - "Aceptar" (EN_REVISION) → ConfirmActionModal → llamar endpoint aceptar → mostrar pin_temporal en modal de resultado
    - "Rechazar" (EN_REVISION) → modal con campo de motivo → llamar endpoint rechazar
    - "Cambiar a Aceptado" (RECHAZADO) → mismo flujo que "Aceptar"
    - "Eliminar definitivamente" → ConfirmDeleteModal de doble confirmación → llamar endpoint delete
    - _Requisitos: 11.4, 11.5_

  - [ ] 20.5 Implementar modal PostulacionDetalle
    - Mostrar datos personales del postulante
    - Lista de documentos con botón "Ver" que abre URL pública de Supabase
    - Enlace al comprobante de pago
    - Estado y motivo de rechazo si aplica
    - _Requisitos: 11.6_

- [ ] 21. Integrar EspecialidadesSelect en PostularPage Step3
  - Abrir `PostularPage.jsx`, localizar Step 3
  - Reemplazar campo de especialidades con `<EspecialidadesSelect value={...} onChange={...} />`
  - _Requisitos: 9.4_

- [ ] 22. Checkpoint final — Verificar flujo completo de postulaciones
  - Asegurarse de que todos los tests pasan (unit, property, integration). Ejecutar el seed de documentos_requeridos. Preguntar al usuario si tiene dudas antes de cerrar.

---

## Notas

- Tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido.
- Cada tarea referencia los requisitos específicos que implementa para trazabilidad.
- Los tests de propiedad usan **fast-check** con mínimo 100 iteraciones por propiedad.
- El tag de cada test de propiedad debe ser: `// Feature: mejoras-dashboard-cdplp, Property N: <texto>`
- Los archivos de Supabase no se borran al rechazar una postulación — solo al eliminar definitivamente.
- El `pin_temporal` solo se retorna en la respuesta de aceptar postulación; no se persiste en texto plano.
