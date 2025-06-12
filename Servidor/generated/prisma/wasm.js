
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 6.6.0
 * Query Engine version: f676762280b54cd07c770017ed3711ddde35f37a
 */
Prisma.prismaVersion = {
  client: "6.6.0",
  engine: "f676762280b54cd07c770017ed3711ddde35f37a"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.Actividades_institucionalesScalarFieldEnum = {
  id_actividad: 'id_actividad',
  nombre: 'nombre',
  descripcion: 'descripcion',
  tipo: 'tipo',
  fecha_programada: 'fecha_programada',
  id_responsable: 'id_responsable',
  archivo: 'archivo',
  costo: 'costo',
  estado: 'estado'
};

exports.Prisma.Asistencias_actividadScalarFieldEnum = {
  id_asistencia: 'id_asistencia',
  id_actividad: 'id_actividad',
  id_colegiado: 'id_colegiado'
};

exports.Prisma.Colegiados_registrados_actividad_institucionalScalarFieldEnum = {
  id_registro: 'id_registro',
  id_actividad: 'id_actividad',
  id_colegiado: 'id_colegiado',
  fecha_registro: 'fecha_registro',
  estado_registro: 'estado_registro',
  metodo_pago: 'metodo_pago',
  id_invitado: 'id_invitado',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.Actividades_socialesScalarFieldEnum = {
  id_actividad_social: 'id_actividad_social',
  nombre: 'nombre',
  descripcion: 'descripcion',
  ubicacion: 'ubicacion',
  motivo: 'motivo',
  id_convenio: 'id_convenio',
  fecha_inicio: 'fecha_inicio',
  fecha_fin: 'fecha_fin',
  estado: 'estado',
  tipo: 'tipo'
};

exports.Prisma.ConvenioScalarFieldEnum = {
  id_convenio: 'id_convenio',
  nombre: 'nombre',
  descripcion: 'descripcion',
  fecha_inicio: 'fecha_inicio',
  fecha_fin: 'fecha_fin',
  contacto: 'contacto',
  estado: 'estado'
};

exports.Prisma.CorrespondenciaScalarFieldEnum = {
  id_correspondencia: 'id_correspondencia',
  asunto: 'asunto',
  contenido: 'contenido',
  resumen: 'resumen',
  fecha_envio: 'fecha_envio',
  fecha_recibido: 'fecha_recibido',
  estado: 'estado',
  remitente: 'remitente',
  id_destinatario: 'id_destinatario',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ColegiadosScalarFieldEnum = {
  id_colegiado: 'id_colegiado',
  carnet_identidad: 'carnet_identidad',
  nombre: 'nombre',
  apellido: 'apellido',
  correo: 'correo',
  telefono: 'telefono',
  especialidades: 'especialidades',
  fecha_inscripcion: 'fecha_inscripcion',
  fecha_renovacion: 'fecha_renovacion',
  estado: 'estado'
};

exports.Prisma.Colegiados_asignados_socialScalarFieldEnum = {
  id_asignacion: 'id_asignacion',
  id_actividad_social: 'id_actividad_social',
  id_colegiado: 'id_colegiado',
  id_invitado: 'id_invitado'
};

exports.Prisma.Documentos_colegiadosScalarFieldEnum = {
  id_documento: 'id_documento',
  id_colegiado: 'id_colegiado',
  tipo_documento: 'tipo_documento',
  archivo: 'archivo',
  fecha_entrega: 'fecha_entrega',
  fecha_vencimiento: 'fecha_vencimiento',
  estado: 'estado'
};

exports.Prisma.Movimientos_financierosScalarFieldEnum = {
  id_movimiento: 'id_movimiento',
  id_presupuesto: 'id_presupuesto',
  fecha_movimiento: 'fecha_movimiento',
  tipo_movimiento: 'tipo_movimiento',
  categoria: 'categoria',
  descripcion: 'descripcion',
  monto: 'monto',
  id_origen: 'id_origen'
};

exports.Prisma.Origen_movimientoScalarFieldEnum = {
  id_origen: 'id_origen',
  tipo_origen: 'tipo_origen',
  id_pago_colegiado: 'id_pago_colegiado',
  id_registro_actividad_institucional: 'id_registro_actividad_institucional',
  monto: 'monto'
};

exports.Prisma.Pagos_colegiadosScalarFieldEnum = {
  id_pago: 'id_pago',
  id_colegiado: 'id_colegiado',
  concepto: 'concepto',
  fecha_pago: 'fecha_pago',
  monto: 'monto',
  estado_pago: 'estado_pago'
};

exports.Prisma.PresupuestosScalarFieldEnum = {
  id_presupuesto: 'id_presupuesto',
  nombre_presupuesto: 'nombre_presupuesto',
  descripcion: 'descripcion',
  monto_total: 'monto_total',
  fecha_asignacion: 'fecha_asignacion',
  saldo_restante: 'saldo_restante',
  estado: 'estado'
};

exports.Prisma.AuditoriaScalarFieldEnum = {
  id_auditoria: 'id_auditoria',
  id_usuario: 'id_usuario',
  accion: 'accion',
  modulo: 'modulo',
  descripcion: 'descripcion',
  fecha: 'fecha'
};

exports.Prisma.RolesScalarFieldEnum = {
  id_rol: 'id_rol',
  id_usuario: 'id_usuario',
  fecha_inicio: 'fecha_inicio',
  fecha_fin: 'fecha_fin',
  activo: 'activo',
  rol: 'rol'
};

exports.Prisma.UsuariosScalarFieldEnum = {
  id_usuario: 'id_usuario',
  nombre: 'nombre',
  apellido: 'apellido',
  correo: 'correo',
  contrase_a: 'contrase_a',
  telefono: 'telefono',
  direccion: 'direccion',
  fecha_registro: 'fecha_registro',
  estado: 'estado',
  fecha_actualizacion: 'fecha_actualizacion'
};

exports.Prisma.InvitadosScalarFieldEnum = {
  id_invitado: 'id_invitado',
  nombre: 'nombre',
  apellido: 'apellido',
  tipo: 'tipo',
  correo: 'correo',
  telefono: 'telefono'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.RolUsuario = exports.$Enums.RolUsuario = {
  SECRETARIO_GENERAL: 'SECRETARIO_GENERAL',
  PRESIDENTE: 'PRESIDENTE',
  VICEPRESIDENTE: 'VICEPRESIDENTE',
  VOCAL: 'VOCAL',
  SECRETARIO: 'SECRETARIO',
  TESORERO: 'TESORERO',
  NO_DEFINIDO: 'NO_DEFINIDO'
};

exports.Prisma.ModelName = {
  actividades_institucionales: 'actividades_institucionales',
  asistencias_actividad: 'asistencias_actividad',
  colegiados_registrados_actividad_institucional: 'colegiados_registrados_actividad_institucional',
  actividades_sociales: 'actividades_sociales',
  convenio: 'convenio',
  correspondencia: 'correspondencia',
  colegiados: 'colegiados',
  colegiados_asignados_social: 'colegiados_asignados_social',
  documentos_colegiados: 'documentos_colegiados',
  movimientos_financieros: 'movimientos_financieros',
  origen_movimiento: 'origen_movimiento',
  pagos_colegiados: 'pagos_colegiados',
  presupuestos: 'presupuestos',
  auditoria: 'auditoria',
  roles: 'roles',
  usuarios: 'usuarios',
  invitados: 'invitados'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }

        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
