# Diseño Técnico — Mejoras Dashboard CDPLP

## Visión general

Este documento cubre el diseño técnico de las mejoras al sistema de gestión del CDPLP: corrección de bugs de UX, incorporación de nuevas entidades gestionadas centralmente (especialidades, documentos requeridos) y el flujo completo de administración de postulaciones en el dashboard.

---

## Arquitectura general (sin cambios estructurales)

```
ClienteCDPLPL (React + Vite + Tailwind + MUI)
      |
      | axios + AuthInterceptor
      v
Servidor (Express + TypeScript + Prisma)
      |
      +-- PostgreSQL (via Prisma ORM)
      +-- Supabase Storage (archivos / documentos)
```

- Toda comunicación frontend→backend usa la instancia de axios con interceptores de autenticación.
- El backend valida autenticación en middleware antes de ejecutar lógica de negocio.
- Los archivos se almacenan en Supabase Storage en buckets públicos y se referencia la ruta relativa en la BD.

---

## Cambios en el schema de Prisma

### Nuevo modelo: `especialidades`

```prisma
model especialidades {
  id_especialidad Int      @id @default(autoincrement())
  nombre          String   @unique @db.VarChar(150)
  descripcion     String?  @db.Text
  activo          Boolean  @default(true)
  createdAt       DateTime @default(now())
}
```

### Nuevo modelo: `documentos_requeridos`

```prisma
model documentos_requeridos {
  id_doc_req  Int      @id @default(autoincrement())
  nombre      String   @db.VarChar(150)
  descripcion String?  @db.Text
  activo      Boolean  @default(true)
  es_opcional Boolean  @default(false)
  orden       Int      @default(0)
  createdAt   DateTime @default(now())
}
```

### Campo nuevo en `movimientos_financieros`

```prisma
// Agregar al modelo existente movimientos_financieros:
comprobante String? @db.VarChar(300)
```

### Migración

Ejecutar una única migración con nombre descriptivo:
```bash
npx prisma migrate dev --name mejoras_dashboard
```

---

## Componentes y módulos

### Componente: `ConfirmDeleteModal` (modificado)

**Ubicación:** `ClienteCDPLPL/src/components/ConfirmDeleteModal.jsx`

**Props actuales** (sin cambios): `isOpen`, `onClose`, `onConfirm`, `message`.

**Props nuevas opcionales:**

| Prop | Tipo | Default |
|------|------|---------|
| `confirmLabel` | `string` | `"Eliminar"` |
| `confirmIcon` | `ReactNode` | `<Trash2 />` |
| `confirmColor` | `"red" \| "amber" \| "emerald"` | `"red"` |

**Lógica de color:**

```js
const colorMap = {
  red:     "bg-red-600 hover:bg-red-700 text-white",
  amber:   "bg-amber-500 hover:bg-amber-600 text-white",
  emerald: "bg-emerald-600 hover:bg-emerald-700 text-white",
}
```

El botón de confirmación aplica `colorMap[confirmColor]`. Si `confirmColor` no está en el mapa, usa `"red"` como fallback.

**Uso en módulos:**
- Activar → `confirmLabel="Activar"`, `confirmIcon=<UserCheck/>`, `confirmColor="emerald"`
- Desactivar → `confirmLabel="Desactivar"`, `confirmIcon=<UserX/>`, `confirmColor="amber"`
- Eliminar → defaults (sin cambios)

---

### Componente: `Alerts` (modificado)

**Cambio:** Agregar `style={{ zIndex: 9999 }}` o clase Tailwind `z-[9999]` al contenedor raíz.

---

### Corrección de formularios (REQ-3)

**Patrón incorrecto a eliminar en todos los forms afectados:**

```js
// ❌ Antes
const handleSubmit = async () => {
  await api.save(data)
  setAlert({ type: "success", msg: "Guardado" })   // ← quitar
  setTimeout(() => onSuccess(), 2000)               // ← quitar
}

// ✅ Después
const handleSubmit = async () => {
  await api.save(data)
  onSuccess()   // inmediato, sin setTimeout, sin alerta interna
}
```

**Componentes afectados:**
- `EditarCorrespondencia.jsx`
- `CreateMemoria.jsx` / `EditMemoria.jsx`
- `EditActInstitucional.jsx` / `CreateActInstitucional.jsx`

---

### Actividades Institucionales — estados

**Enum de estados válidos:**

```ts
// Backend (TypeScript)
type EstadoActividad = "EN_INSCRIPCION" | "EN_CURSO" | "TERMINADO"

// Frontend
const ESTADOS_ACTIVIDAD = [
  { value: "EN_INSCRIPCION", label: "En Inscripción" },
  { value: "EN_CURSO",       label: "En Curso" },
  { value: "TERMINADO",      label: "Terminado" },
]
```

**Badge de color:**

| Estado | Color (Tailwind) |
|--------|-----------------|
| EN_INSCRIPCION | `bg-blue-100 text-blue-800` |
| EN_CURSO | `bg-green-100 text-green-800` |
| TERMINADO | `bg-gray-100 text-gray-700` |

---

### Módulo backend: `especialidades`

**Ruta:** `Servidor/src/modules/especialidades/`

```
especialidades/
  controllers/
    especialidades.ts    ← CRUD handlers
  routes/
    especialidades.ts    ← router Express
```

**Endpoints:**

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/especialidades` | No | Lista activas (para selectores) |
| GET | `/api/especialidades/admin` | Sí | Lista todas (CRUD admin) |
| POST | `/api/especialidades` | Sí | Crear especialidad |
| PUT | `/api/especialidades/:id` | Sí | Actualizar especialidad |
| PATCH | `/api/especialidades/:id/estado` | Sí | Toggle activo/inactivo |

---

### Módulo backend: `documentos-requeridos`

**Ruta:** `Servidor/src/modules/documentos-requeridos/`

```
documentos-requeridos/
  controllers/
    documentos-requeridos.ts
  routes/
    documentos-requeridos.ts
```

**Endpoints:**

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/documentos-requeridos` | No | Activos, ordenados por `orden` |
| GET | `/api/documentos-requeridos/admin` | Sí | Todos |
| POST | `/api/documentos-requeridos` | Sí | Crear |
| PUT | `/api/documentos-requeridos/:id` | Sí | Actualizar |
| PATCH | `/api/documentos-requeridos/:id/estado` | Sí | Toggle activo |

**Seed inicial** (`Servidor/prisma/seed.ts`):

```ts
const docsIniciales = [
  { nombre: "Carnet de Identidad",          es_opcional: false, orden: 1 },
  { nombre: "Título Profesional",            es_opcional: false, orden: 2 },
  { nombre: "Certificado de Antecedentes",  es_opcional: false, orden: 3 },
  { nombre: "Foto Carnet 3x4",              es_opcional: false, orden: 4 },
  { nombre: "Certificado de Nacimiento",    es_opcional: false, orden: 5 },
  { nombre: "Documento de Respaldo Adicional", es_opcional: true, orden: 6 },
]
```

---

### Componente: `EspecialidadesSelect`

**Ubicación:** `ClienteCDPLPL/src/features/dashboard/components/EspecialidadesSelect.jsx`

**Props:**

| Prop | Tipo | Descripción |
|------|------|-------------|
| `value` | `string[]` | Array de nombres de especialidades seleccionadas |
| `onChange` | `(selected: string[]) => void` | Callback al cambiar selección |
| `allowCreate` | `boolean` | Muestra botón "+ Nueva" para crear inline |

**Comportamiento:**
1. Al montar, carga lista desde `GET /api/especialidades`.
2. Renderiza chips para cada seleccionada con botón "×" para quitar.
3. Dropdown con búsqueda filtra opciones disponibles.
4. Si `allowCreate=true`: botón "+ Nueva" abre mini-form inline (input nombre + botón guardar) que llama a `POST /api/especialidades` y refresca la lista.
5. Al submit del formulario padre, el caller convierte `value` (array) a string con coma: `value.join(", ")`.

---

### Servicios frontend nuevos

**`dashboard/services/especialidades.js`**

```js
import api from "@/lib/axios"   // instancia con AuthInterceptor

export const getAllEspecialidades      = ()        => api.get("/especialidades")
export const getAllEspecialidadesAdmin = ()        => api.get("/especialidades/admin")
export const createEspecialidad       = (data)    => api.post("/especialidades", data)
export const updateEspecialidad       = (id, data)=> api.put(`/especialidades/${id}`, data)
export const toggleEstadoEspecialidad = (id)      => api.patch(`/especialidades/${id}/estado`)
```

**`dashboard/services/documentosRequeridos.js`**

```js
export const getDocumentosRequeridos       = ()        => api.get("/documentos-requeridos")
export const getDocumentosRequeridosAdmin  = ()        => api.get("/documentos-requeridos/admin")
export const createDocumentoRequerido      = (data)    => api.post("/documentos-requeridos", data)
export const updateDocumentoRequerido      = (id, data)=> api.put(`/documentos-requeridos/${id}`, data)
export const toggleEstadoDocumentoRequerido= (id)      => api.patch(`/documentos-requeridos/${id}/estado`)
```

---

### Módulo admin de postulaciones (frontend)

**Estructura de carpetas:**

```
dashboard/pages/Postulaciones/
  index.jsx                          ← página principal (tabla + filtros + acciones)
  components/
    PostulacionDetalle.jsx           ← modal de detalle
    PostulacionEstadoBadge.jsx       ← badge reutilizable de estado
    FiltrosPostulaciones.jsx         ← filtros de búsqueda y estado
```

**Ruta en router:** `/dashboard/postulaciones`
**Ítem en menú lateral:** "Postulaciones" (con ícono apropiado)

**PostulacionEstadoBadge:**

| Estado | Color |
|--------|-------|
| EN_REVISION | `bg-yellow-100 text-yellow-800` |
| ACEPTADO | `bg-green-100 text-green-800` |
| RECHAZADO | `bg-red-100 text-red-800` |

---

### Flujo de aceptar postulación (backend)

**Endpoint:** `PATCH /api/postulaciones/admin/:id/aceptar`

**Pseudocódigo dentro de transacción Prisma:**

```ts
prisma.$transaction(async (tx) => {
  // 1. Leer postulación
  const postulacion = await tx.postulaciones.findUniqueOrThrow({ where: { id } })

  // 2. Generar PIN 4 dígitos
  const pin = generarPIN4Digitos()   // ver función más abajo

  // 3. Calcular fechas
  const hoy = new Date()
  const renovacion = addYears(hoy, 1)

  // 4. Crear colegiado
  const colegiado = await tx.colegiados.create({
    data: { ...datosPostulacion, fecha_inscripcion: hoy, fecha_renovacion: renovacion,
            estado: "ACTIVO", pin_acceso: pin }
  })

  // 5. Construir folderUser
  const folderUser = generarFolderUser(colegiado)

  // 6. Migrar documentos en Supabase + crear registros documentos_colegiados
  for (const doc of postulacion.documentos) {
    await supabase.storage.from(BUCKET).copy(doc.ruta_src, `colegiados/${folderUser}/${doc.nombre}`)
    await tx.documentos_colegiados.create({ data: { id_colegiado: colegiado.id, ...doc } })
  }

  // 7. Obtener monto_inicial de config_pago
  const config = await tx.config_pago.findFirst({ where: { clave: "monto_inicial" } })

  // 8. Crear pago
  const pago = await tx.pagos_colegiados.create({ data: {
    id_colegiado: colegiado.id_colegiado,
    concepto: "Pago de inscripción - postulación aceptada",
    monto: config.valor,
    fecha_pago: hoy,
    estado_pago: "REALIZADO",
    comprobante: `colegiados/${folderUser}/comprobante_inscripcion.${ext}`
  }})

  // 9. Registrar en tesorería
  await registrarMovimientoPagoColegiatura(tx, pago)

  // 10. Actualizar estado postulación
  await tx.postulaciones.update({ where: { id }, data: { estado: "ACEPTADO" } })

  return { colegiado, pago, pin_temporal: pin }
})
```

**Función `generarPIN4Digitos`:**
```ts
function generarPIN4Digitos(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}
```

Garantías: siempre retorna exactamente 4 dígitos, nunca inferior a 1000 ni superior a 9999.

---

### Estructura de archivos en Supabase Storage

```
postulaciones/{id_postulacion}/{tipo_doc}.{ext}     ← mientras EN_REVISION o RECHAZADO
colegiados/{folderUser}/{tipo_doc}.{ext}            ← después de aceptar
colegiados/{folderUser}/comprobante_inscripcion.ext ← comprobante movido al aceptar
comprobantes/{folderUser}/{filename}                ← pagos_colegiados
movimientos/{id_movimiento}/{filename}              ← movimientos_financieros
```

---

### Validación de documentos requeridos (backend)

Al recibir `POST /api/postulaciones`:

```ts
const requeridos = await prisma.documentos_requeridos.findMany({
  where: { activo: true, es_opcional: false }
})

const nombresSubidos = req.files.map(f => f.fieldname)  // o nombre normalizado
const faltantes = requeridos
  .filter(doc => !nombresSubidos.includes(normalizarNombre(doc.nombre)))
  .map(doc => doc.nombre)

if (faltantes.length > 0) {
  return res.status(400).json({ error: "Documentos faltantes", faltantes })
}
```

---

## Modelos de datos (resumen)

### Datos de entrada/salida clave

**Crear especialidad:**
```ts
{ nombre: string, descripcion?: string }
→ especialidades
```

**Aceptar postulación — respuesta:**
```ts
{
  colegiado: Colegiado,
  pago: PagoColegiado,
  pin_temporal: string  // 4 dígitos, incluido solo en esta respuesta
}
```

**Error documentos faltantes:**
```ts
{
  error: "Documentos faltantes",
  faltantes: string[]  // nombres de los documentos que faltan
}
```

---

## Propiedades de corrección

*Una propiedad es una característica o comportamiento que debe ser verdadero en todas las ejecuciones válidas del sistema — esencialmente, una declaración formal sobre lo que el sistema debe hacer. Las propiedades sirven como puente entre especificaciones legibles por humanos y garantías de corrección verificables automáticamente.*

### Propiedad 1: Renderizado correcto según props de ConfirmDeleteModal

*Para cualquier* combinación de `confirmLabel`, `confirmIcon` y `confirmColor` válidos pasados al ConfirmDeleteModal, el botón de confirmación renderizado debe mostrar el label, icono y clases CSS correspondientes al color especificado.

**Valida: Requisitos 1.1, 1.2, 1.3**

---

### Propiedad 2: onSuccess se llama inmediatamente tras submit exitoso

*Para cualquier* formulario afectado (EditarCorrespondencia, CreateMemoria, EditMemoria, EditActInstitucional, CreateActInstitucional), cuando el submit es exitoso, `onSuccess()` debe ser invocado en el mismo ciclo de ejecución sin pasar por ningún `setTimeout`.

**Valida: Requisito 3.2**

---

### Propiedad 3: Badge de actividades institucionales siempre válido

*Para cualquier* valor de estado en `{EN_INSCRIPCION, EN_CURSO, TERMINADO}`, el componente badge debe renderizar un elemento con el label y clase de color correctos. Para cualquier valor fuera de ese conjunto, el badge debe renderizar un fallback sin lanzar error.

**Valida: Requisito 4.1, 4.3**

---

### Propiedad 4: Visibilidad de botón Ver comprobante según existencia del comprobante

*Para cualquier* objeto pago o movimiento financiero, si `comprobante` es no-null, el componente de detalle debe renderizar el botón "Ver comprobante"; si `comprobante` es null, el botón no debe aparecer.

**Valida: Requisitos 7.1, 8.4**

---

### Propiedad 5: Construcción correcta de URL de Supabase para comprobantes

*Para cualquier* ruta de comprobante almacenada en la BD y cualquier valor de `VITE_SUPABASE_URL`, la URL construida para abrir en pestaña nueva debe ser `{VITE_SUPABASE_URL}/storage/v1/object/public/{bucket}/{ruta}` y nunca una cadena vacía o `undefined`.

**Valida: Requisitos 7.2, 7.3**

---

### Propiedad 6: Multi-select especialidades renderiza todas las opciones disponibles

*Para cualquier* lista de especialidades retornada por la API, el componente EspecialidadesSelect debe renderizar exactamente tantas opciones como especialidades activas existan, sin omitir ni duplicar ninguna.

**Valida: Requisito 9.4**

---

### Propiedad 7: Serialización de especialidades seleccionadas a string con comas

*Para cualquier* array no vacío de nombres de especialidades seleccionadas, el valor serializado debe ser exactamente los nombres unidos por `", "` (coma-espacio), sin trailing comma, sin espacios extra al inicio o al final, y el array original debe poder reconstruirse haciendo `split(", ")`.

**Valida: Requisito 9.5**

---

### Propiedad 8: Validación de documentos faltantes cubre exactamente los requeridos

*Para cualquier* combinación de documentos activos no-opcionales definidos en la BD y cualquier subconjunto de documentos subidos, el validador debe identificar correctamente todos y solo los documentos requeridos que no están en los subidos, sin falsos positivos ni falsos negativos.

**Valida: Requisitos 10.6, 10.7**

---

### Propiedad 9: PIN generado siempre es una cadena de exactamente 4 dígitos numéricos

*Para cualquier* llamada a `generarPIN4Digitos()`, el resultado debe ser una cadena que:
- tenga exactamente 4 caracteres,
- esté compuesta únicamente por dígitos `[0-9]`,
- sea numéricamente mayor o igual a 1000 y menor o igual a 9999.

**Valida: Requisito 12.1**

---

## Manejo de errores

| Escenario | Código HTTP | Respuesta |
|-----------|-------------|-----------|
| Documentos faltantes en postulación | 400 | `{ error: "Documentos faltantes", faltantes: string[] }` |
| Petición sin token de autenticación | 401 | `{ error: "No autorizado" }` |
| Recurso no encontrado (id inválido) | 404 | `{ error: "Recurso no encontrado" }` |
| Error en transacción Prisma al aceptar | 500 | `{ error: "Error interno al procesar postulación" }` |
| Error al subir archivo a Supabase | 500 | `{ error: "Error al subir archivo" }` |
| Nombre de especialidad duplicado | 409 | `{ error: "La especialidad ya existe" }` |

Todos los errores de validación deben retornar mensajes legibles por el usuario, no stack traces.

---

## Estrategia de testing

### Unit / Property tests (Vitest + fast-check)

Se usa **fast-check** como librería de property-based testing. Cada propiedad definida en este documento se implementa como un test de `fc.assert(fc.property(...))` con mínimo 100 iteraciones.

**Tests de propiedad a implementar:**

- **Propiedad 1:** `fc.record({ confirmLabel: fc.string(), confirmColor: fc.constantFrom("red","amber","emerald") })` → verificar que el botón renderizado tiene el label y clase correctos.
- **Propiedad 2:** `fc.record(formData)` → verificar que `onSuccess` se llama en el mismo tick usando timers falsos de Vitest.
- **Propiedad 3:** `fc.constantFrom("EN_INSCRIPCION","EN_CURSO","TERMINADO")` → badge siempre válido.
- **Propiedad 4:** `fc.option(fc.string(), { nil: null })` → presencia/ausencia del botón según valor.
- **Propiedad 5:** `fc.tuple(fc.webUrl(), fc.string())` → URL construida correctamente.
- **Propiedad 6:** `fc.array(fc.record({ nombre: fc.string(), activo: fc.constant(true) }))` → todas las opciones renderizadas.
- **Propiedad 7:** `fc.array(fc.string(), { minLength: 1 })` → serialización y round-trip correcto.
- **Propiedad 8:** `fc.tuple(fc.array(fc.string()), fc.array(fc.string()))` → validador identifica exactamente los faltantes.
- **Propiedad 9:** llamadas repetidas → siempre 4 dígitos numéricos.

### Integration tests

- Endpoints de especialidades y documentos-requeridos: CRUD completo con BD de test.
- Flujo de aceptar/rechazar/eliminar postulación: con mocks de Supabase Storage.
- Validación de documentos en POST /api/postulaciones.
- Upload de comprobante en movimientos financieros.

### Smoke tests

- Verificar que los campos `comprobante` en `movimientos_financieros`, tabla `especialidades` y tabla `documentos_requeridos` existen en el schema de Prisma después de la migración.

### Tag format para property tests

```
// Feature: mejoras-dashboard-cdplp, Property N: <texto de la propiedad>
```
