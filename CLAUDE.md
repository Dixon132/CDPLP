# CDPLP — guía para Claude Code

Sistema del Colegio Departamental de Profesionales de La Paz: dashboard administrativo + sitio público + plataforma GDS (gemelo digital social, módulo aparte).

## Estructura del repo

- **`ClienteCDPLPL/`** — React 19 + Vite + Tailwind v4. El frontend.
- **`Servidor/`** — Express 5 + Prisma 6 + PostgreSQL. El backend del colegio.
- **`ServidorGDS/`**, **`ServicioIA/`** — servicios de la Plataforma GDS. Independientes del colegio.
- **`ClienteCDPLPL/src/features/gds/`** y **`Servidor/src/modules/gds/`** — la Plataforma GDS vive dentro del mismo cliente/servidor pero es un dominio aparte.

**⚠️ No tocar nada de GDS a menos que se pida explícitamente.** Tiene su propio layout (`GdsLayout`), su propio auth, sus propias rutas bajo `/gds`. El `Sidebar.test.jsx` del dashboard verifica que exista un link a `/gds` pero nada más — no hay que mantener sincronizado nada más allá de eso.

## Stack

**Cliente:** React 19, Vite, Tailwind v4 (sin `tailwind.config.js`; los temas se definen con `@theme` y variables CSS en `src/index.css`), MUI (solo para formularios dentro de modales), react-hook-form, react-router-dom v7, lucide-react, framer-motion, axios, zustand, vitest.

**Servidor:** Express 5, Prisma 6, PostgreSQL, Zod, JWT (`jsonwebtoken`), bcrypt, Supabase Storage (subida de archivos), multer.

## Patrones de frontend ya establecidos

**Confirmar antes de guardar, no después.** Los formularios NO llaman a la API. Reciben `onSubmitForm(data)` y se lo entregan al padre; el padre abre `ConfirmActionModal` (crear/editar, ~2s) o `ConfirmDeleteModal` (destructivo, dos pasos ~2s+4s), y es el `callback` de la confirmación quien hace el `await` real. Así "Cancelar" cancela de verdad. Ver `ClienteCDPLPL/src/features/dashboard/pages/Colegiados/Pagos.jsx` como referencia.

**Contenedor de página estándar:**
```jsx
<div className="space-y-6 p-6 bg-slate-50/50 min-h-full">   {/* min-h-full, NO min-h-screen */}
  <Header .../>
  <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200 p-2 sm:p-4">
    <ResponsiveTable .../>
  </div>
</div>
```
`ResponsiveTable` (`src/features/dashboard/components/ResponsiveTable.jsx`) es el único componente de tabla — reemplazó a un `Table` viejo ya eliminado. Alterna tabla/tarjetas y persiste la preferencia con `storageKey`.

**Navegación:** fuente única en `ClienteCDPLPL/src/layouts/navigation.js` (`NAV_GROUPS`, `getNavForRole`, `getMobileNavForRole`). La consumen el sidebar, la barra móvil, el buscador Ctrl+K y los breadcrumbs. Cada ítem lleva un `recurso` (clave del catálogo de permisos granulares); un ítem se muestra si `permisos[recurso] !== 'SIN_ACCESO'`. La visibilidad de notificaciones por módulo (`Servidor/src/modules/notificaciones/services/index.ts`, `RECURSO_A_MODULO`) se deriva del mismo permiso efectivo — ya no hay una matriz aparte que mantener en sync a mano.

**Permisos granulares:** el rol de un usuario (`catalogo_roles`, dinámico) da una plantilla por defecto (`rol_permisos`) que un override individual (`usuario_permisos`) puede pisar sin tocar el rol. Middleware `requirePermiso(clave, nivel)` (`Servidor/src/middlewares/requirePermiso.ts`) en el backend, `RequirePermiso`/`<Can>`/`useSession().puedeEditar()` en el front. Gestión en `/dashboard/permisos`.

**Apariencia (tema + tipografía):** vive en `AppearanceProvider` (`src/context/`), persistido en `localStorage` bajo `cdplp_apariencia`. Los `data-theme`/`data-font` se aplican **solo** al contenedor `.dashboard-shell` en `DashboardLayout.jsx` — nunca a `<html>`, para que el sitio público y el login no hereden el tema. El puente a MUI está en `utils/theme.js` (`crearTemaMui`). Si tocas esto: la `font-family` hay que reaplicarla explícitamente en `.dashboard-shell` porque `body` ya la resuelve arriba y una variable redefinida en un descendiente no puede "revertir" una `font-family` ya heredada.

## Patrones de backend

**Estructura por módulo:** `Servidor/src/modules/<dominio>/{controllers,routes,schemas,services}`.

**Dos tipos de auth:** `authMiddleware` (dashboard, JWT `{userId, rol}`) y `authCampoMiddleware` (app de campo/PIN, JWT `{id, tipo}`). Rutas que sirven a ambos usan `authDashboardOCampo`. **Siempre usar los servicios de axios del cliente, nunca `fetch()` crudo** — `fetch()` no lleva el header `Authorization` que inyecta el interceptor global, y eso da 401 silenciosos que se confunden con "Invalid Date" u otros bugs de datos.

**Notificaciones:** una fila por hecho en `notificaciones` (no una por usuario). El estado de lectura vive aparte en `notificaciones_leidas`, con clave compuesta `(id_notificacion, id_usuario)`. Emitir con `emitirNotificacion()` en `Servidor/src/modules/notificaciones/services/index.ts`.

**Gotcha de Prisma/SQL:** `NOT: { campo: x }` excluye también las filas con `campo: null` (lógica ternaria SQL: `NULL = x` no es verdadero ni falso). Para "todo menos x, incluyendo los null", usar `OR: [{ campo: null }, { campo: { not: x } }]`.

**Migraciones:** la BD nunca fue *baselined* con Prisma, así que `npx prisma migrate deploy` falla con `P3005` ("schema not empty"). Aplicar el SQL de la migración directamente contra la BD cuando haga falta, y avisar al usuario antes de tocar la BD en la nube.

**Auditoría:** cada ruta mutadora (POST/PUT/PATCH/DELETE) que deba dejar rastro pasa un segundo argumento a `errorHandler` en su archivo de rutas: `errorHandler(controller, { modulo: Modulos.X, accion: Acciones.Y })` (tipos en `Servidor/src/types/auditoria.ts`). El wrapper (`Servidor/src/utils/error-handler.ts`) escribe la fila solo si `req.user` existe (sesión de dashboard — excluye rutas públicas como postulaciones y la app de campo con PIN, por decisión explícita: **la auditoría es solo de acciones dentro del dashboard**), el método es mutador y la respuesta fue exitosa. Si una ruta mutadora NO lleva ese segundo argumento, es una ausencia deliberada (visible a simple vista/grep), no un olvido. Para una descripción rica en vez de la genérica autogenerada, el controlador llama a `describir(res, "texto")` (`Servidor/src/utils/auditoria.ts`) antes de responder. Caso especial: `login()` en `usuarios/controllers/auth.ts` llama a `registrarAuditoria()` directamente porque en ese punto `req.user` todavía no existe.

## Verificación

- Cliente: `npx vite build` (desde `ClienteCDPLPL/`) y `npx vitest run`. Hay ~17 fallos preexistentes en `src/features/gds/**` (no relacionados, no los "arregles" de paso) — comparar contra esa base, no contra cero.
- Servidor: `npx tsc --noEmit` (desde `Servidor/`).
- Para probar endpoints reales sin dejar basura en la BD: envolver en `prismaClient.$transaction()` y terminar con un `throw ROLLBACK` (patrón usado varias veces en esta sesión) — ejecuta contra la BD real y revierte todo al final.

## Entorno (Windows)

- PowerShell bloquea `npx.ps1` por política de ejecución → usar `npx.cmd` o correr desde `cmd.exe`/Git Bash.
- Un `ts-node` huérfano corriendo en background puede tener bloqueado el `.dll` del motor de Prisma, haciendo fallar `prisma generate` con `EPERM`. Revisar procesos node vivos antes de asumir que es un bug de Prisma.
