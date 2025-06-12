
Object.defineProperty(exports, "__esModule", { value: true });

const {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  getPrismaClient,
  sqltag,
  empty,
  join,
  raw,
  skip,
  Decimal,
  Debug,
  objectEnumValues,
  makeStrictEnum,
  Extensions,
  warnOnce,
  defineDmmfProperty,
  Public,
  getRuntime,
  createParam,
} = require('./runtime/library.js')


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

Prisma.PrismaClientKnownRequestError = PrismaClientKnownRequestError;
Prisma.PrismaClientUnknownRequestError = PrismaClientUnknownRequestError
Prisma.PrismaClientRustPanicError = PrismaClientRustPanicError
Prisma.PrismaClientInitializationError = PrismaClientInitializationError
Prisma.PrismaClientValidationError = PrismaClientValidationError
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = sqltag
Prisma.empty = empty
Prisma.join = join
Prisma.raw = raw
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = Extensions.getExtensionContext
Prisma.defineExtension = Extensions.defineExtension

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




  const path = require('path')

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
 * Create the Client
 */
const config = {
  "generator": {
    "name": "client",
    "provider": {
      "fromEnvVar": null,
      "value": "prisma-client-js"
    },
    "output": {
      "value": "D:\\VisualProyects\\RealProyects\\CDPLP\\Servidor\\generated\\prisma",
      "fromEnvVar": null
    },
    "config": {
      "engineType": "library"
    },
    "binaryTargets": [
      {
        "fromEnvVar": null,
        "value": "windows",
        "native": true
      }
    ],
    "previewFeatures": [],
    "sourceFilePath": "D:\\VisualProyects\\RealProyects\\CDPLP\\Servidor\\prisma\\schema.prisma",
    "isCustomOutput": true
  },
  "relativeEnvPaths": {
    "rootEnvPath": null,
    "schemaEnvPath": "../../.env"
  },
  "relativePath": "../../prisma",
  "clientVersion": "6.6.0",
  "engineVersion": "f676762280b54cd07c770017ed3711ddde35f37a",
  "datasourceNames": [
    "db"
  ],
  "activeProvider": "postgresql",
  "inlineDatasources": {
    "db": {
      "url": {
        "fromEnvVar": "DATABASE_URL",
        "value": "postgresql://diego:diego135@localhost:5432/cOL"
      }
    }
  },
  "inlineSchema": "generator client {\n  provider = \"prisma-client-js\"\n  output   = \"../generated/prisma\"\n}\n\ndatasource db {\n  provider = \"postgresql\"\n  url      = env(\"DATABASE_URL\")\n}\n\nmodel actividades_institucionales {\n  id_actividad                                   Int                                              @id @default(autoincrement())\n  nombre                                         String?                                          @db.VarChar(150)\n  descripcion                                    String?\n  tipo                                           String?                                          @db.VarChar(50)\n  fecha_programada                               DateTime?                                        @db.Date\n  id_responsable                                 Int?\n  archivo                                        String?\n  costo                                          Decimal?                                         @db.Decimal(10, 2)\n  estado                                         String?                                          @db.VarChar(50)\n  usuarios                                       usuarios?                                        @relation(fields: [id_responsable], references: [id_usuario], onDelete: NoAction, onUpdate: NoAction)\n  asistencias_actividad                          asistencias_actividad[]\n  colegiados_registrados_actividad_institucional colegiados_registrados_actividad_institucional[]\n}\n\nmodel asistencias_actividad {\n  id_asistencia               Int                          @id @default(autoincrement())\n  id_actividad                Int?\n  id_colegiado                Int?\n  actividades_institucionales actividades_institucionales? @relation(fields: [id_actividad], references: [id_actividad], onDelete: NoAction, onUpdate: NoAction)\n  colegiados                  colegiados?                  @relation(fields: [id_colegiado], references: [id_colegiado], onDelete: NoAction, onUpdate: NoAction)\n}\n\nmodel colegiados_registrados_actividad_institucional {\n  id_registro                 Int                          @id @default(autoincrement())\n  id_actividad                Int?\n  id_colegiado                Int?\n  fecha_registro              DateTime?                    @db.Date\n  estado_registro             String?                      @db.VarChar(50)\n  metodo_pago                 String?                      @db.VarChar(50)\n  id_invitado                 Int?\n  origen_movimiento           origen_movimiento[]\n  invitados                   invitados?                   @relation(fields: [id_invitado], references: [id_invitado], onDelete: NoAction, onUpdate: NoAction)\n  actividades_institucionales actividades_institucionales? @relation(fields: [id_actividad], references: [id_actividad], onDelete: NoAction, onUpdate: NoAction)\n  colegiados                  colegiados?                  @relation(fields: [id_colegiado], references: [id_colegiado], onDelete: NoAction, onUpdate: NoAction)\n  createdAt                   DateTime?                    @default(now()) @db.Date\n  updatedAt                   DateTime?                    @updatedAt @db.Date\n}\n\nmodel actividades_sociales {\n  id_actividad_social         Int                           @id @default(autoincrement())\n  nombre                      String?                       @db.VarChar(150)\n  descripcion                 String?\n  ubicacion                   String?                       @db.VarChar(200)\n  motivo                      String?\n  id_convenio                 Int?\n  fecha_inicio                DateTime?                     @db.Date\n  fecha_fin                   DateTime?                     @db.Date\n  estado                      String?                       @db.VarChar(30)\n  tipo                        String?                       @db.VarChar(50)\n  convenio                    convenio?                     @relation(fields: [id_convenio], references: [id_convenio], onDelete: NoAction, onUpdate: NoAction)\n  colegiados_asignados_social colegiados_asignados_social[]\n}\n\nmodel convenio {\n  id_convenio          Int                    @id @default(autoincrement())\n  nombre               String?                @db.VarChar(150)\n  descripcion          String?\n  fecha_inicio         DateTime?              @db.Date\n  fecha_fin            DateTime?              @db.Date\n  contacto             String?                @db.VarChar(100)\n  estado               String?                @db.VarChar(30)\n  actividades_sociales actividades_sociales[]\n}\n\nmodel correspondencia {\n  id_correspondencia Int       @id @default(autoincrement())\n  asunto             String?   @db.VarChar(200) //CARA\n  contenido          String? //URL\n  resumen            String? //PONER AHORA PERO IA FUTURO\n  fecha_envio        DateTime? @db.Date\n  fecha_recibido     DateTime? @db.Date //RECEPCIONAR ESTO\n  estado             String?   @db.VarChar(50) //CAMBIAR ESTO DINAMICAMENTE\n  remitente          String?   @db.VarChar(100)\n  id_destinatario    Int?\n  createdAt          DateTime? @default(now()) @db.Date\n  updatedAt          DateTime? @updatedAt @db.Date\n  destinatario       usuarios? @relation(\"destinatario\", fields: [id_destinatario], references: [id_usuario], onDelete: NoAction, onUpdate: NoAction)\n}\n\nmodel colegiados {\n  id_colegiado                                   Int                                              @id @default(autoincrement())\n  carnet_identidad                               String?                                          @unique @db.VarChar(20)\n  nombre                                         String?                                          @db.VarChar(100)\n  apellido                                       String?                                          @db.VarChar(100)\n  correo                                         String?                                          @db.VarChar(150)\n  telefono                                       String?                                          @db.VarChar(20)\n  especialidades                                 String?                                          @db.VarChar(200)\n  fecha_inscripcion                              DateTime?                                        @db.Date\n  fecha_renovacion                               DateTime?                                        @db.Date\n  estado                                         String?                                          @db.VarChar(20)\n  asistencias_actividad                          asistencias_actividad[]\n  colegiados_asignados_social                    colegiados_asignados_social[]\n  documentos_colegiados                          documentos_colegiados[]\n  pagos_colegiados                               pagos_colegiados[]\n  colegiados_registrados_actividad_institucional colegiados_registrados_actividad_institucional[]\n}\n\nmodel colegiados_asignados_social {\n  id_asignacion        Int                   @id @default(autoincrement())\n  id_actividad_social  Int?\n  id_colegiado         Int?\n  id_invitado          Int?\n  invitados            invitados?            @relation(fields: [id_invitado], references: [id_invitado], onDelete: NoAction, onUpdate: NoAction)\n  actividades_sociales actividades_sociales? @relation(fields: [id_actividad_social], references: [id_actividad_social], onDelete: NoAction, onUpdate: NoAction)\n  colegiados           colegiados?           @relation(fields: [id_colegiado], references: [id_colegiado], onDelete: NoAction, onUpdate: NoAction)\n}\n\nmodel documentos_colegiados {\n  id_documento      Int         @id @default(autoincrement())\n  id_colegiado      Int?\n  tipo_documento    String?\n  archivo           String?\n  fecha_entrega     DateTime?   @db.Date\n  fecha_vencimiento DateTime?   @db.Date\n  estado            String?     @db.VarChar(50)\n  colegiados        colegiados? @relation(fields: [id_colegiado], references: [id_colegiado], onDelete: NoAction, onUpdate: NoAction)\n}\n\nmodel movimientos_financieros {\n  id_movimiento    Int       @id @default(autoincrement())\n  id_presupuesto   Int?\n  fecha_movimiento DateTime? @db.Date\n  tipo_movimiento  String?   @db.VarChar(20)\n  categoria        String?   @db.VarChar(40)\n  descripcion      String?\n  monto            Decimal?  @db.Decimal(12, 2)\n  id_origen        Int?\n\n  origen_movimiento origen_movimiento? @relation(fields: [id_origen], references: [id_origen], onDelete: NoAction, onUpdate: NoAction)\n  presupuestos      presupuestos?      @relation(fields: [id_presupuesto], references: [id_presupuesto], onDelete: NoAction, onUpdate: NoAction)\n}\n\nmodel origen_movimiento {\n  id_origen                                      Int                                             @id @default(autoincrement())\n  tipo_origen                                    String?                                         @db.VarChar(50)\n  id_pago_colegiado                              Int?\n  id_registro_actividad_institucional            Int?\n  monto                                          Decimal?                                        @db.Decimal(12, 2)\n  movimientos_financieros                        movimientos_financieros[]\n  colegiados_registrados_actividad_institucional colegiados_registrados_actividad_institucional? @relation(fields: [id_registro_actividad_institucional], references: [id_registro], onDelete: NoAction, onUpdate: NoAction)\n  pagos_colegiados                               pagos_colegiados?                               @relation(fields: [id_pago_colegiado], references: [id_pago], onDelete: NoAction, onUpdate: NoAction)\n}\n\nmodel pagos_colegiados {\n  id_pago           Int                 @id @default(autoincrement())\n  id_colegiado      Int?\n  concepto          String?             @db.VarChar(100)\n  fecha_pago        DateTime?           @db.Date\n  monto             Decimal?            @db.Decimal(10, 2)\n  estado_pago       String?             @default(\"REALIZADO\") @db.VarChar(50)\n  origen_movimiento origen_movimiento[]\n  colegiados        colegiados?         @relation(fields: [id_colegiado], references: [id_colegiado], onDelete: NoAction, onUpdate: NoAction)\n}\n\nmodel presupuestos {\n  id_presupuesto          Int                       @id @default(autoincrement())\n  nombre_presupuesto      String?                   @db.VarChar(150)\n  descripcion             String?\n  monto_total             Decimal?                  @db.Decimal(12, 2)\n  fecha_asignacion        DateTime?                 @db.Date\n  saldo_restante          Decimal?                  @db.Decimal(12, 2)\n  estado                  String?                   @db.VarChar(50)\n  movimientos_financieros movimientos_financieros[]\n}\n\nmodel auditoria {\n  id_auditoria Int      @id @default(autoincrement())\n  id_usuario   Int\n  accion       String // \"CREÓ\", \"ELIMINÓ\", \"MODIFICÓ\", \"INICIÓ SESIÓN\", etc.\n  modulo       String // \"Pagos\", \"Actividades\", \"Usuarios\", \"Perfil\", etc. ✅ Más amigable que 'tabla'\n  descripcion  String // \"El usuario eliminó un pago de 100Bs para el colegiado Juan Pérez\"\n  fecha        DateTime @default(now())\n\n  usuario usuarios @relation(fields: [id_usuario], references: [id_usuario])\n}\n\nmodel roles {\n  id_rol       Int         @id @default(autoincrement())\n  id_usuario   Int?\n  fecha_inicio DateTime?   @db.Date\n  fecha_fin    DateTime?   @db.Date\n  activo       Boolean?    @default(true)\n  rol          RolUsuario?\n  usuarios     usuarios?   @relation(fields: [id_usuario], references: [id_usuario], onDelete: NoAction, onUpdate: NoAction)\n}\n\nmodel usuarios {\n  id_usuario                  Int                           @id @default(autoincrement())\n  nombre                      String?                       @db.VarChar(100)\n  apellido                    String?                       @db.VarChar(100)\n  correo                      String?                       @db.VarChar(150)\n  contrase_a                  String?                       @map(\"contraseña\") @db.VarChar(300)\n  telefono                    String?                       @db.VarChar(20)\n  direccion                   String?                       @db.VarChar(200)\n  fecha_registro              DateTime?                     @default(now()) @db.Date\n  estado                      String?                       @default(\"ACTIVO\") @db.VarChar(20)\n  fecha_actualizacion         DateTime?                     @updatedAt @db.Date\n  actividades_institucionales actividades_institucionales[]\n  roles                       roles[]\n  destinatario                correspondencia[]             @relation(\"destinatario\")\n  auditoria                   auditoria[]\n}\n\nenum RolUsuario {\n  SECRETARIO_GENERAL\n  PRESIDENTE\n  VICEPRESIDENTE\n  VOCAL\n  SECRETARIO\n  TESORERO\n  NO_DEFINIDO\n}\n\nmodel invitados {\n  id_invitado                                    Int                                              @id @default(autoincrement())\n  nombre                                         String\n  apellido                                       String\n  tipo                                           String? // estudiante, pasante, invitado externo\n  correo                                         String?\n  telefono                                       String?\n  colegiados_asignados_social                    colegiados_asignados_social[]\n  colegiados_registrados_actividad_institucional colegiados_registrados_actividad_institucional[]\n}\n",
  "inlineSchemaHash": "85fdc571e44f458156928daae267f7d78eb41a9c681b823d401e72522aedac5e",
  "copyEngine": true
}

const fs = require('fs')

config.dirname = __dirname
if (!fs.existsSync(path.join(__dirname, 'schema.prisma'))) {
  const alternativePaths = [
    "generated/prisma",
    "prisma",
  ]
  
  const alternativePath = alternativePaths.find((altPath) => {
    return fs.existsSync(path.join(process.cwd(), altPath, 'schema.prisma'))
  }) ?? alternativePaths[0]

  config.dirname = path.join(process.cwd(), alternativePath)
  config.isBundled = true
}

config.runtimeDataModel = JSON.parse("{\"models\":{\"actividades_institucionales\":{\"dbName\":null,\"schema\":null,\"fields\":[{\"name\":\"id_actividad\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"nativeType\":null,\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nombre\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"150\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"descripcion\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tipo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"50\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fecha_programada\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":[\"Date\",[]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"id_responsable\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"archivo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"costo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"nativeType\":[\"Decimal\",[\"10\",\"2\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"estado\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"50\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"usuarios\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"usuarios\",\"nativeType\":null,\"relationName\":\"actividades_institucionalesTousuarios\",\"relationFromFields\":[\"id_responsable\"],\"relationToFields\":[\"id_usuario\"],\"relationOnDelete\":\"NoAction\",\"relationOnUpdate\":\"NoAction\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"asistencias_actividad\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"asistencias_actividad\",\"nativeType\":null,\"relationName\":\"actividades_institucionalesToasistencias_actividad\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"colegiados_registrados_actividad_institucional\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"colegiados_registrados_actividad_institucional\",\"nativeType\":null,\"relationName\":\"actividades_institucionalesTocolegiados_registrados_actividad_institucional\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"asistencias_actividad\":{\"dbName\":null,\"schema\":null,\"fields\":[{\"name\":\"id_asistencia\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"nativeType\":null,\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"id_actividad\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"id_colegiado\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"actividades_institucionales\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"actividades_institucionales\",\"nativeType\":null,\"relationName\":\"actividades_institucionalesToasistencias_actividad\",\"relationFromFields\":[\"id_actividad\"],\"relationToFields\":[\"id_actividad\"],\"relationOnDelete\":\"NoAction\",\"relationOnUpdate\":\"NoAction\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"colegiados\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"colegiados\",\"nativeType\":null,\"relationName\":\"asistencias_actividadTocolegiados\",\"relationFromFields\":[\"id_colegiado\"],\"relationToFields\":[\"id_colegiado\"],\"relationOnDelete\":\"NoAction\",\"relationOnUpdate\":\"NoAction\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"colegiados_registrados_actividad_institucional\":{\"dbName\":null,\"schema\":null,\"fields\":[{\"name\":\"id_registro\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"nativeType\":null,\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"id_actividad\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"id_colegiado\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fecha_registro\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":[\"Date\",[]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"estado_registro\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"50\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"metodo_pago\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"50\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"id_invitado\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"origen_movimiento\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"origen_movimiento\",\"nativeType\":null,\"relationName\":\"colegiados_registrados_actividad_institucionalToorigen_movimiento\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"invitados\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"invitados\",\"nativeType\":null,\"relationName\":\"colegiados_registrados_actividad_institucionalToinvitados\",\"relationFromFields\":[\"id_invitado\"],\"relationToFields\":[\"id_invitado\"],\"relationOnDelete\":\"NoAction\",\"relationOnUpdate\":\"NoAction\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"actividades_institucionales\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"actividades_institucionales\",\"nativeType\":null,\"relationName\":\"actividades_institucionalesTocolegiados_registrados_actividad_institucional\",\"relationFromFields\":[\"id_actividad\"],\"relationToFields\":[\"id_actividad\"],\"relationOnDelete\":\"NoAction\",\"relationOnUpdate\":\"NoAction\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"colegiados\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"colegiados\",\"nativeType\":null,\"relationName\":\"colegiadosTocolegiados_registrados_actividad_institucional\",\"relationFromFields\":[\"id_colegiado\"],\"relationToFields\":[\"id_colegiado\"],\"relationOnDelete\":\"NoAction\",\"relationOnUpdate\":\"NoAction\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"nativeType\":[\"Date\",[]],\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":[\"Date\",[]],\"isGenerated\":false,\"isUpdatedAt\":true}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"actividades_sociales\":{\"dbName\":null,\"schema\":null,\"fields\":[{\"name\":\"id_actividad_social\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"nativeType\":null,\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nombre\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"150\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"descripcion\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"ubicacion\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"200\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"motivo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"id_convenio\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fecha_inicio\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":[\"Date\",[]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fecha_fin\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":[\"Date\",[]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"estado\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"30\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tipo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"50\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"convenio\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"convenio\",\"nativeType\":null,\"relationName\":\"actividades_socialesToconvenio\",\"relationFromFields\":[\"id_convenio\"],\"relationToFields\":[\"id_convenio\"],\"relationOnDelete\":\"NoAction\",\"relationOnUpdate\":\"NoAction\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"colegiados_asignados_social\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"colegiados_asignados_social\",\"nativeType\":null,\"relationName\":\"actividades_socialesTocolegiados_asignados_social\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"convenio\":{\"dbName\":null,\"schema\":null,\"fields\":[{\"name\":\"id_convenio\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"nativeType\":null,\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nombre\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"150\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"descripcion\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fecha_inicio\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":[\"Date\",[]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fecha_fin\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":[\"Date\",[]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"contacto\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"100\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"estado\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"30\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"actividades_sociales\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"actividades_sociales\",\"nativeType\":null,\"relationName\":\"actividades_socialesToconvenio\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"correspondencia\":{\"dbName\":null,\"schema\":null,\"fields\":[{\"name\":\"id_correspondencia\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"nativeType\":null,\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"asunto\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"200\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"contenido\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"resumen\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fecha_envio\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":[\"Date\",[]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fecha_recibido\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":[\"Date\",[]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"estado\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"50\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"remitente\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"100\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"id_destinatario\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"nativeType\":[\"Date\",[]],\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":[\"Date\",[]],\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"destinatario\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"usuarios\",\"nativeType\":null,\"relationName\":\"destinatario\",\"relationFromFields\":[\"id_destinatario\"],\"relationToFields\":[\"id_usuario\"],\"relationOnDelete\":\"NoAction\",\"relationOnUpdate\":\"NoAction\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"colegiados\":{\"dbName\":null,\"schema\":null,\"fields\":[{\"name\":\"id_colegiado\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"nativeType\":null,\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"carnet_identidad\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"20\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nombre\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"100\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"apellido\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"100\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"correo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"150\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"telefono\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"20\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"especialidades\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"200\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fecha_inscripcion\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":[\"Date\",[]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fecha_renovacion\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":[\"Date\",[]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"estado\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"20\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"asistencias_actividad\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"asistencias_actividad\",\"nativeType\":null,\"relationName\":\"asistencias_actividadTocolegiados\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"colegiados_asignados_social\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"colegiados_asignados_social\",\"nativeType\":null,\"relationName\":\"colegiadosTocolegiados_asignados_social\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"documentos_colegiados\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"documentos_colegiados\",\"nativeType\":null,\"relationName\":\"colegiadosTodocumentos_colegiados\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"pagos_colegiados\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"pagos_colegiados\",\"nativeType\":null,\"relationName\":\"colegiadosTopagos_colegiados\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"colegiados_registrados_actividad_institucional\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"colegiados_registrados_actividad_institucional\",\"nativeType\":null,\"relationName\":\"colegiadosTocolegiados_registrados_actividad_institucional\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"colegiados_asignados_social\":{\"dbName\":null,\"schema\":null,\"fields\":[{\"name\":\"id_asignacion\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"nativeType\":null,\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"id_actividad_social\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"id_colegiado\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"id_invitado\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"invitados\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"invitados\",\"nativeType\":null,\"relationName\":\"colegiados_asignados_socialToinvitados\",\"relationFromFields\":[\"id_invitado\"],\"relationToFields\":[\"id_invitado\"],\"relationOnDelete\":\"NoAction\",\"relationOnUpdate\":\"NoAction\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"actividades_sociales\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"actividades_sociales\",\"nativeType\":null,\"relationName\":\"actividades_socialesTocolegiados_asignados_social\",\"relationFromFields\":[\"id_actividad_social\"],\"relationToFields\":[\"id_actividad_social\"],\"relationOnDelete\":\"NoAction\",\"relationOnUpdate\":\"NoAction\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"colegiados\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"colegiados\",\"nativeType\":null,\"relationName\":\"colegiadosTocolegiados_asignados_social\",\"relationFromFields\":[\"id_colegiado\"],\"relationToFields\":[\"id_colegiado\"],\"relationOnDelete\":\"NoAction\",\"relationOnUpdate\":\"NoAction\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"documentos_colegiados\":{\"dbName\":null,\"schema\":null,\"fields\":[{\"name\":\"id_documento\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"nativeType\":null,\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"id_colegiado\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tipo_documento\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"archivo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fecha_entrega\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":[\"Date\",[]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fecha_vencimiento\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":[\"Date\",[]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"estado\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"50\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"colegiados\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"colegiados\",\"nativeType\":null,\"relationName\":\"colegiadosTodocumentos_colegiados\",\"relationFromFields\":[\"id_colegiado\"],\"relationToFields\":[\"id_colegiado\"],\"relationOnDelete\":\"NoAction\",\"relationOnUpdate\":\"NoAction\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"movimientos_financieros\":{\"dbName\":null,\"schema\":null,\"fields\":[{\"name\":\"id_movimiento\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"nativeType\":null,\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"id_presupuesto\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fecha_movimiento\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":[\"Date\",[]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tipo_movimiento\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"20\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"categoria\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"40\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"descripcion\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"monto\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"nativeType\":[\"Decimal\",[\"12\",\"2\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"id_origen\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"origen_movimiento\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"origen_movimiento\",\"nativeType\":null,\"relationName\":\"movimientos_financierosToorigen_movimiento\",\"relationFromFields\":[\"id_origen\"],\"relationToFields\":[\"id_origen\"],\"relationOnDelete\":\"NoAction\",\"relationOnUpdate\":\"NoAction\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"presupuestos\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"presupuestos\",\"nativeType\":null,\"relationName\":\"movimientos_financierosTopresupuestos\",\"relationFromFields\":[\"id_presupuesto\"],\"relationToFields\":[\"id_presupuesto\"],\"relationOnDelete\":\"NoAction\",\"relationOnUpdate\":\"NoAction\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"origen_movimiento\":{\"dbName\":null,\"schema\":null,\"fields\":[{\"name\":\"id_origen\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"nativeType\":null,\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tipo_origen\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"50\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"id_pago_colegiado\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"id_registro_actividad_institucional\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"monto\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"nativeType\":[\"Decimal\",[\"12\",\"2\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"movimientos_financieros\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"movimientos_financieros\",\"nativeType\":null,\"relationName\":\"movimientos_financierosToorigen_movimiento\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"colegiados_registrados_actividad_institucional\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"colegiados_registrados_actividad_institucional\",\"nativeType\":null,\"relationName\":\"colegiados_registrados_actividad_institucionalToorigen_movimiento\",\"relationFromFields\":[\"id_registro_actividad_institucional\"],\"relationToFields\":[\"id_registro\"],\"relationOnDelete\":\"NoAction\",\"relationOnUpdate\":\"NoAction\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"pagos_colegiados\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"pagos_colegiados\",\"nativeType\":null,\"relationName\":\"origen_movimientoTopagos_colegiados\",\"relationFromFields\":[\"id_pago_colegiado\"],\"relationToFields\":[\"id_pago\"],\"relationOnDelete\":\"NoAction\",\"relationOnUpdate\":\"NoAction\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"pagos_colegiados\":{\"dbName\":null,\"schema\":null,\"fields\":[{\"name\":\"id_pago\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"nativeType\":null,\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"id_colegiado\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"concepto\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"100\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fecha_pago\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":[\"Date\",[]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"monto\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"nativeType\":[\"Decimal\",[\"10\",\"2\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"estado_pago\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"50\"]],\"default\":\"REALIZADO\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"origen_movimiento\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"origen_movimiento\",\"nativeType\":null,\"relationName\":\"origen_movimientoTopagos_colegiados\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"colegiados\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"colegiados\",\"nativeType\":null,\"relationName\":\"colegiadosTopagos_colegiados\",\"relationFromFields\":[\"id_colegiado\"],\"relationToFields\":[\"id_colegiado\"],\"relationOnDelete\":\"NoAction\",\"relationOnUpdate\":\"NoAction\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"presupuestos\":{\"dbName\":null,\"schema\":null,\"fields\":[{\"name\":\"id_presupuesto\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"nativeType\":null,\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nombre_presupuesto\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"150\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"descripcion\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"monto_total\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"nativeType\":[\"Decimal\",[\"12\",\"2\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fecha_asignacion\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":[\"Date\",[]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"saldo_restante\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"nativeType\":[\"Decimal\",[\"12\",\"2\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"estado\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"50\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"movimientos_financieros\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"movimientos_financieros\",\"nativeType\":null,\"relationName\":\"movimientos_financierosTopresupuestos\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"auditoria\":{\"dbName\":null,\"schema\":null,\"fields\":[{\"name\":\"id_auditoria\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"nativeType\":null,\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"id_usuario\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"accion\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"modulo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"descripcion\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fecha\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"nativeType\":null,\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"usuario\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"usuarios\",\"nativeType\":null,\"relationName\":\"auditoriaTousuarios\",\"relationFromFields\":[\"id_usuario\"],\"relationToFields\":[\"id_usuario\"],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"roles\":{\"dbName\":null,\"schema\":null,\"fields\":[{\"name\":\"id_rol\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"nativeType\":null,\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"id_usuario\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fecha_inicio\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":[\"Date\",[]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fecha_fin\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":[\"Date\",[]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"activo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"nativeType\":null,\"default\":true,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"rol\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"RolUsuario\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"usuarios\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"usuarios\",\"nativeType\":null,\"relationName\":\"rolesTousuarios\",\"relationFromFields\":[\"id_usuario\"],\"relationToFields\":[\"id_usuario\"],\"relationOnDelete\":\"NoAction\",\"relationOnUpdate\":\"NoAction\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"usuarios\":{\"dbName\":null,\"schema\":null,\"fields\":[{\"name\":\"id_usuario\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"nativeType\":null,\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nombre\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"100\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"apellido\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"100\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"correo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"150\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"contrase_a\",\"dbName\":\"contraseña\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"300\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"telefono\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"20\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"direccion\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"200\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fecha_registro\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"nativeType\":[\"Date\",[]],\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"estado\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"20\"]],\"default\":\"ACTIVO\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fecha_actualizacion\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":[\"Date\",[]],\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"actividades_institucionales\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"actividades_institucionales\",\"nativeType\":null,\"relationName\":\"actividades_institucionalesTousuarios\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"roles\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"roles\",\"nativeType\":null,\"relationName\":\"rolesTousuarios\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"destinatario\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"correspondencia\",\"nativeType\":null,\"relationName\":\"destinatario\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"auditoria\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"auditoria\",\"nativeType\":null,\"relationName\":\"auditoriaTousuarios\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"invitados\":{\"dbName\":null,\"schema\":null,\"fields\":[{\"name\":\"id_invitado\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"nativeType\":null,\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nombre\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"apellido\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tipo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"correo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"telefono\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"colegiados_asignados_social\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"colegiados_asignados_social\",\"nativeType\":null,\"relationName\":\"colegiados_asignados_socialToinvitados\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"colegiados_registrados_actividad_institucional\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"colegiados_registrados_actividad_institucional\",\"nativeType\":null,\"relationName\":\"colegiados_registrados_actividad_institucionalToinvitados\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false}},\"enums\":{\"RolUsuario\":{\"values\":[{\"name\":\"SECRETARIO_GENERAL\",\"dbName\":null},{\"name\":\"PRESIDENTE\",\"dbName\":null},{\"name\":\"VICEPRESIDENTE\",\"dbName\":null},{\"name\":\"VOCAL\",\"dbName\":null},{\"name\":\"SECRETARIO\",\"dbName\":null},{\"name\":\"TESORERO\",\"dbName\":null},{\"name\":\"NO_DEFINIDO\",\"dbName\":null}],\"dbName\":null}},\"types\":{}}")
defineDmmfProperty(exports.Prisma, config.runtimeDataModel)
config.engineWasm = undefined
config.compilerWasm = undefined


const { warnEnvConflicts } = require('./runtime/library.js')

warnEnvConflicts({
    rootEnvPath: config.relativeEnvPaths.rootEnvPath && path.resolve(config.dirname, config.relativeEnvPaths.rootEnvPath),
    schemaEnvPath: config.relativeEnvPaths.schemaEnvPath && path.resolve(config.dirname, config.relativeEnvPaths.schemaEnvPath)
})

const PrismaClient = getPrismaClient(config)
exports.PrismaClient = PrismaClient
Object.assign(exports, Prisma)

// file annotations for bundling tools to include these files
path.join(__dirname, "query_engine-windows.dll.node");
path.join(process.cwd(), "generated/prisma/query_engine-windows.dll.node")
// file annotations for bundling tools to include these files
path.join(__dirname, "schema.prisma");
path.join(process.cwd(), "generated/prisma/schema.prisma")
