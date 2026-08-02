import { PrismaClient, RolUsuario } from '../generated/prisma';

const prisma = new PrismaClient();

/**
 * Migra el sistema de un rol fijo por usuario a permisos granulares:
 * 1) crea el catálogo de roles dinámico a partir del enum RolUsuario actual,
 * 2) migra el histórico de `roles.rol` a `roles.id_rol_catalogo`,
 * 3) siembra el árbol de recursos (módulos/submódulos del dashboard),
 * 4) siembra `rol_permisos` reproduciendo exactamente los `allowedRoles` que
 *    hoy tiene cada ruta en `ClienteCDPLPL/src/features/dashboard/routes.jsx`,
 *    para que el día del despliegue nadie pierda ni gane acceso.
 * Idempotente: se puede volver a correr sin duplicar ni perder datos.
 */

const ROLES_NEGOCIO = [
  'PRESIDENTE',
  'VICEPRESIDENTE',
  'SECRETARIO_GENERAL',
  'SECRETARIO',
  'TESORERO',
  'VOCAL',
] as const;

const CATALOGO_ROLES: { nombre: RolUsuario; es_sistema: boolean }[] = [
  ...ROLES_NEGOCIO.map((nombre) => ({ nombre: nombre as RolUsuario, es_sistema: false })),
  { nombre: 'NO_DEFINIDO' as RolUsuario, es_sistema: true },
];

const RECURSOS: { clave: string; nombre: string; padre?: string; orden: number }[] = [
  { clave: 'dashboard', nombre: 'Dashboard principal', orden: 1 },
  { clave: 'colegiados', nombre: 'Colegiados', orden: 2 },
  { clave: 'colegiados.invitados', nombre: 'Invitados', padre: 'colegiados', orden: 1 },
  { clave: 'colegiados.pasantes', nombre: 'Pasantes', padre: 'colegiados', orden: 2 },
  { clave: 'colegiados.postulaciones', nombre: 'Postulaciones', padre: 'colegiados', orden: 3 },
  { clave: 'usuarios', nombre: 'Usuarios', orden: 3 },
  { clave: 'usuarios.roles', nombre: 'Asignación de Roles', padre: 'usuarios', orden: 1 },
  { clave: 'usuarios.permisos', nombre: 'Roles y Permisos', padre: 'usuarios', orden: 2 },
  { clave: 'actividades_sociales', nombre: 'Actividades Sociales', orden: 4 },
  { clave: 'actividades_sociales.convenios', nombre: 'Convenios', padre: 'actividades_sociales', orden: 1 },
  { clave: 'actividades_institucionales', nombre: 'Actividades Institucionales', orden: 5 },
  { clave: 'memorias', nombre: 'Memorias', orden: 6 },
  { clave: 'tesoreria', nombre: 'Tesorería', orden: 7 },
  { clave: 'informes', nombre: 'Informes', orden: 8 },
  { clave: 'correspondencia', nombre: 'Correspondencia', orden: 9 },
  { clave: 'correspondencia.buzon', nombre: 'Buzón', padre: 'correspondencia', orden: 1 },
  { clave: 'auditorias', nombre: 'Auditorías', orden: 10 },
  { clave: 'ajustes', nombre: 'Ajustes', orden: 11 },
  { clave: 'ajustes.especialidades', nombre: 'Especialidades', padre: 'ajustes', orden: 1 },
  { clave: 'ajustes.instituciones', nombre: 'Instituciones', padre: 'ajustes', orden: 2 },
  { clave: 'ajustes.documentos_requeridos', nombre: 'Documentos Requeridos', padre: 'ajustes', orden: 3 },
  { clave: 'ajustes.pagos', nombre: 'Configuración de Pagos', padre: 'ajustes', orden: 4 },
  { clave: 'ajustes.financiero', nombre: 'Configuración Financiera', padre: 'ajustes', orden: 5 },
];

const TODOS = ROLES_NEGOCIO;

/** Recurso -> roles que hoy tienen EDITOR (verificado línea por línea contra `routes.jsx`). */
const MATRIZ_EDITOR: Record<string, readonly string[]> = {
  dashboard: ['PRESIDENTE', 'SECRETARIO_GENERAL'],
  colegiados: ['PRESIDENTE', 'VICEPRESIDENTE', 'SECRETARIO'],
  'colegiados.invitados': ['PRESIDENTE', 'VICEPRESIDENTE'],
  'colegiados.pasantes': ['PRESIDENTE', 'VICEPRESIDENTE'],
  'colegiados.postulaciones': ['PRESIDENTE', 'VICEPRESIDENTE', 'SECRETARIO'],
  usuarios: ['PRESIDENTE', 'VICEPRESIDENTE'],
  'usuarios.roles': TODOS,
  'usuarios.permisos': ['PRESIDENTE', 'VICEPRESIDENTE'],
  actividades_sociales: ['PRESIDENTE', 'VICEPRESIDENTE', 'SECRETARIO_GENERAL', 'VOCAL'],
  'actividades_sociales.convenios': TODOS,
  actividades_institucionales: ['PRESIDENTE', 'VICEPRESIDENTE', 'SECRETARIO_GENERAL', 'SECRETARIO', 'VOCAL'],
  memorias: ['PRESIDENTE', 'VICEPRESIDENTE', 'SECRETARIO_GENERAL', 'SECRETARIO', 'VOCAL'],
  tesoreria: TODOS,
  informes: TODOS,
  correspondencia: ['PRESIDENTE', 'VICEPRESIDENTE', 'SECRETARIO_GENERAL', 'SECRETARIO'],
  'correspondencia.buzon': TODOS,
  auditorias: ['PRESIDENTE'],
  ajustes: TODOS,
  'ajustes.especialidades': TODOS,
  'ajustes.instituciones': TODOS,
  'ajustes.documentos_requeridos': TODOS,
  'ajustes.pagos': TODOS,
  'ajustes.financiero': TODOS,
};

async function seedCatalogoRoles() {
  const mapa = new Map<string, number>();
  for (const rol of CATALOGO_ROLES) {
    const row = await prisma.catalogo_roles.upsert({
      where: { nombre: rol.nombre },
      update: { es_sistema: rol.es_sistema },
      create: { nombre: rol.nombre, es_sistema: rol.es_sistema },
    });
    mapa.set(rol.nombre, row.id_rol_catalogo);
    console.log(`  catalogo_roles: ${rol.nombre} -> id ${row.id_rol_catalogo}`);
  }
  return mapa;
}

async function migrarRolesHistoricos(mapa: Map<string, number>) {
  for (const [nombre, id_rol_catalogo] of mapa) {
    const { count } = await prisma.roles.updateMany({
      where: { rol: nombre as RolUsuario },
      data: { id_rol_catalogo },
    });
    if (count > 0) {
      console.log(`  roles: ${count} fila(s) con rol=${nombre} -> id_rol_catalogo=${id_rol_catalogo}`);
    }
  }

  const huerfanas = await prisma.roles.count({
    where: { rol: { not: null }, id_rol_catalogo: null },
  });
  if (huerfanas > 0) {
    throw new Error(
      `Quedaron ${huerfanas} fila(s) de "roles" sin migrar a catalogo_roles. Abortando seed antes de sembrar permisos.`
    );
  }
}

async function seedRecursos() {
  const mapa = new Map<string, number>();
  // Los recursos sin padre van primero para poder resolver id_padre de los hijos.
  const ordenados = [...RECURSOS].sort((a, b) => (a.padre ? 1 : 0) - (b.padre ? 1 : 0));
  for (const r of ordenados) {
    const id_padre = r.padre ? mapa.get(r.padre) ?? null : null;
    const row = await prisma.recursos.upsert({
      where: { clave: r.clave },
      update: { nombre: r.nombre, id_padre, orden: r.orden },
      create: { clave: r.clave, nombre: r.nombre, id_padre, orden: r.orden },
    });
    mapa.set(r.clave, row.id_recurso);
    console.log(`  recursos: ${r.clave} -> id ${row.id_recurso}`);
  }
  return mapa;
}

async function seedRolPermisos(rolesMapa: Map<string, number>, recursosMapa: Map<string, number>) {
  for (const [clave, idRecurso] of recursosMapa) {
    const editores = new Set(MATRIZ_EDITOR[clave] ?? []);
    for (const rolNombre of ROLES_NEGOCIO) {
      const idRolCatalogo = rolesMapa.get(rolNombre)!;
      const nivel = editores.has(rolNombre) ? 'EDITOR' : 'SIN_ACCESO';
      await prisma.rol_permisos.upsert({
        where: { id_rol_catalogo_id_recurso: { id_rol_catalogo: idRolCatalogo, id_recurso: idRecurso } },
        update: { nivel },
        create: { id_rol_catalogo: idRolCatalogo, id_recurso: idRecurso, nivel },
      });
    }
    console.log(`  rol_permisos: ${clave} sembrado (${editores.size} rol(es) con EDITOR)`);
  }
}

async function main() {
  console.log('Iniciando seed de permisos granulares...');

  console.log('Paso A: catálogo de roles');
  const rolesMapa = await seedCatalogoRoles();

  console.log('Paso B/C: migrar histórico de roles.rol -> roles.id_rol_catalogo');
  await migrarRolesHistoricos(rolesMapa);

  console.log('Paso D: árbol de recursos');
  const recursosMapa = await seedRecursos();

  console.log('Paso E: rol_permisos (mapeo cero-regresión desde routes.jsx)');
  await seedRolPermisos(rolesMapa, recursosMapa);

  console.log('Seed de permisos granulares completado.');
}

main()
  .catch((e) => {
    console.error('Error durante el seed de permisos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
