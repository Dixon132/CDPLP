/**
 * Fuente única de la navegación del dashboard.
 *
 * Antes cada rol tenía su propio array dentro de `Sidebar.jsx` mediante una
 * cadena de if/else. Ahora los módulos se declaran una sola vez y los
 * consumen el sidebar, la barra inferior móvil, el buscador global y los
 * breadcrumbs.
 *
 * Cada módulo lleva un `recurso` (clave del catálogo de permisos granulares
 * del backend): se muestra si `permisos[recurso] !== 'SIN_ACCESO'`. `roles`
 * se conserva solo como fallback legado para los pocos ítems sin `recurso`
 * propio (hoy, únicamente Plataforma_GDS, que vive fuera de este sistema de
 * permisos). La autorización real de las rutas vive en `RequirePermiso`
 * (cliente) y en `requirePermiso` (servidor): esto sigue siendo solo
 * presentación del menú.
 */

import {
    Home,
    UsersRound,
    ClipboardList,
    UserCog,
    HeartHandshake,
    BookMarked,
    Library,
    DollarSign,
    FolderDot,
    Inbox,
    Shield,
    Settings,
    Activity,
    LayoutGrid,
    FileBarChart2,
    CalendarClock,
} from 'lucide-react';

/**
 * Los módulos guardan el icono por nombre para que este archivo no dependa de
 * JSX y pueda importarse desde cualquier sitio (incluidos tests).
 */
export const ICONS = {
    Home,
    UsersRound,
    ClipboardList,
    UserCog,
    HeartHandshake,
    BookMarked,
    Library,
    DollarSign,
    FolderDot,
    Inbox,
    Shield,
    Settings,
    Activity,
    LayoutGrid,
    FileBarChart2,
    CalendarClock,
};

export const getIcon = (nombre) => ICONS[nombre] ?? LayoutGrid;

export const ROLES = [
    'PRESIDENTE',
    'VICEPRESIDENTE',
    'SECRETARIO_GENERAL',
    'SECRETARIO',
    'TESORERO',
    'VOCAL',
];

/** Todos los roles definidos (para módulos visibles por cualquiera). */
const TODOS = ROLES;

/**
 * Grupos de navegación. `mobilePriority` (menor = más prioritario) decide qué
 * cuatro módulos aparecen en la barra inferior en móvil; el resto va a la hoja
 * "Más".
 */
export const NAV_GROUPS = [
    {
        id: 'principal',
        label: 'Principal',
        items: [
            {
                title: 'Dashboard',
                path: '/dashboard',
                icon: 'Home',
                recurso: 'dashboard',
                roles: ['PRESIDENTE', 'SECRETARIO_GENERAL'],
                exact: true,
                mobilePriority: 0,
            },
        ],
    },
    {
        id: 'personas',
        label: 'Personas',
        items: [
            {
                title: 'Colegiados',
                path: '/dashboard/colegiados',
                icon: 'UsersRound',
                recurso: 'colegiados',
                roles: ['PRESIDENTE', 'SECRETARIO', 'VICEPRESIDENTE'],
                subtitles: ['Invitados', 'Pasantes'],
                mobilePriority: 1,
            },
            {
                title: 'Postulaciones',
                path: '/dashboard/postulaciones',
                icon: 'ClipboardList',
                recurso: 'colegiados.postulaciones',
                roles: ['PRESIDENTE', 'SECRETARIO', 'VICEPRESIDENTE'],
                mobilePriority: 5,
            },
            {
                title: 'Vencimientos',
                path: '/dashboard/vencimientos',
                icon: 'CalendarClock',
                recurso: 'colegiados',
                roles: ['PRESIDENTE', 'SECRETARIO', 'VICEPRESIDENTE'],
                mobilePriority: 13,
            },
            {
                title: 'Usuarios',
                path: '/dashboard/usuarios',
                icon: 'UserCog',
                recurso: 'usuarios',
                roles: ['PRESIDENTE', 'VICEPRESIDENTE'],
                subtitles: ['Roles', 'Permisos'],
                mobilePriority: 8,
            },
        ],
    },
    {
        id: 'actividades',
        label: 'Actividades',
        items: [
            {
                title: 'Actividades_Académicas',
                path: '/dashboard/actividades_sociales',
                icon: 'HeartHandshake',
                recurso: 'actividades_sociales',
                roles: ['PRESIDENTE', 'VICEPRESIDENTE', 'VOCAL', 'SECRETARIO_GENERAL'],
                subtitles: ['Convenios'],
                mobilePriority: 3,
            },
            {
                title: 'Actividades_Institucionales',
                path: '/dashboard/actividades_institucionales',
                icon: 'BookMarked',
                recurso: 'actividades_institucionales',
                roles: ['PRESIDENTE', 'SECRETARIO', 'VICEPRESIDENTE', 'VOCAL', 'SECRETARIO_GENERAL'],
                mobilePriority: 4,
            },
            {
                title: 'Memorias',
                path: '/dashboard/memorias',
                icon: 'Library',
                recurso: 'memorias',
                roles: ['PRESIDENTE', 'SECRETARIO', 'VICEPRESIDENTE', 'VOCAL', 'SECRETARIO_GENERAL'],
                mobilePriority: 7,
            },
        ],
    },
    {
        id: 'finanzas',
        label: 'Finanzas',
        items: [
            {
                title: 'Tesoreria',
                path: '/dashboard/tesoreria',
                icon: 'DollarSign',
                recurso: 'tesoreria',
                roles: TODOS,
                mobilePriority: 2,
            },
        ],
    },
    {
        id: 'informes',
        label: 'Informes',
        items: [
            {
                title: 'Informes',
                path: '/dashboard/informes',
                icon: 'FileBarChart2',
                recurso: 'informes',
                roles: TODOS,
                mobilePriority: 12,
            },
        ],
    },
    {
        id: 'comunicacion',
        label: 'Comunicación',
        items: [
            {
                title: 'Correspondencia',
                path: '/dashboard/correspondencia',
                icon: 'FolderDot',
                recurso: 'correspondencia',
                roles: ['PRESIDENTE', 'SECRETARIO', 'VICEPRESIDENTE', 'SECRETARIO_GENERAL'],
                subtitles: ['Buzon'],
                mobilePriority: 6,
            },
            {
                // TESORERO y VOCAL no entran a Correspondencia pero sí al Buzón.
                // Antes apuntaba a `/dashboard/Buzon` con mayúscula, que no
                // existe como ruta y caía en el 404.
                title: 'Buzon',
                path: '/dashboard/buzon',
                icon: 'Inbox',
                recurso: 'correspondencia.buzon',
                roles: ['TESORERO', 'VOCAL'],
                mobilePriority: 3,
            },
        ],
    },
    {
        id: 'sistema',
        label: 'Sistema',
        items: [
            {
                title: 'Auditorias',
                path: '/dashboard/auditorias',
                icon: 'Shield',
                recurso: 'auditorias',
                roles: ['PRESIDENTE'],
                mobilePriority: 9,
            },
            {
                title: 'Ajustes',
                path: '/dashboard/ajustes',
                icon: 'Settings',
                recurso: 'ajustes',
                roles: TODOS,
                mobilePriority: 10,
            },
            {
                // El título conserva el guion bajo a propósito: `formatTitle` lo
                // convierte en "Plataforma GDS", que es el nombre accesible que
                // verifica Sidebar.test.jsx.
                title: 'Plataforma_GDS',
                path: '/gds',
                icon: 'Activity',
                roles: TODOS,
                external: true,
                mobilePriority: 11,
            },
        ],
    },
];

/**
 * "Actividades_Académicas" → "Actividades Académicas"
 *
 * `\b\w` no es Unicode-aware: `\w` no incluye letras acentuadas, así que una
 * tilde a mitad de palabra (la "é" de "Académicas") rompe el límite `\b` y
 * termina poniendo mayúscula donde no toca ("AcadéMicas"). `(^|\s)\p{L}` con
 * el flag `u` sí reconoce cualquier letra Unicode.
 */
export const formatTitle = (title = '') =>
    title.replace(/_/g, ' ').replace(/(^|\s)\p{L}/gu, (l) => l.toUpperCase());

/**
 * Recurso del catálogo de permisos para cada subtítulo (submódulo) declarado
 * arriba. Los subtítulos siguen siendo strings simples en `NAV_GROUPS` (así
 * los renderiza `Sidebar.jsx` hoy); este mapa es solo para que el buscador y
 * la hoja "Más" del móvil puedan filtrarlos por permiso también.
 */
const RECURSO_POR_SUBTITULO = {
    Invitados: 'colegiados.invitados',
    Pasantes: 'colegiados.pasantes',
    Roles: 'usuarios.roles',
    Permisos: 'usuarios.permisos',
    Convenios: 'actividades_sociales.convenios',
    Buzon: 'correspondencia.buzon',
};

/** ¿El usuario puede al menos observar este ítem? Recurso nuevo -> permisos; sin recurso -> `roles` (legado, hoy solo GDS). */
const puedeVerItem = (item, rol, permisos) =>
    item.recurso ? (permisos?.[item.recurso] ?? 'SIN_ACCESO') !== 'SIN_ACCESO' : item.roles.includes(rol);

/**
 * Grupos visibles para un rol, ya filtrados y sin grupos vacíos.
 * Un rol no definido (o ausente) no ve ningún módulo. `permisos` es el mapa
 * `{clave_recurso: nivel}` resuelto por el backend (`useSession().permisos`).
 */
export const getNavForRole = (rol, permisos) => {
    if (!rol || rol === 'NO_DEFINIDO') return [];
    return NAV_GROUPS
        .map((grupo) => ({
            ...grupo,
            items: grupo.items.filter((item) => puedeVerItem(item, rol, permisos)),
        }))
        .filter((grupo) => grupo.items.length > 0);
};

/**
 * Deriva pseudo-items navegables a partir de los `subtitles` declarativos de
 * un módulo (p. ej. "Invitados" y "Pasantes" bajo Colegiados). El Sidebar de
 * escritorio ya los renderiza como enlaces reales (`/dashboard/${sub}`); esto
 * los hace visibles también para el buscador Ctrl+K y la hoja "Más" del móvil,
 * que antes solo veían el módulo padre y nunca sus subtítulos.
 */
const expandSubtitles = (item) =>
    (item.subtitles ?? []).map((sub) => ({
        title: sub,
        path: `/dashboard/${sub.toLowerCase()}`,
        icon: item.icon,
        recurso: RECURSO_POR_SUBTITULO[sub],
        roles: item.roles,
    }));

/** Lista plana de módulos visibles para un rol, incluidos los subtítulos de cada uno. */
export const getFlatNavForRole = (rol, permisos) =>
    getNavForRole(rol, permisos).flatMap((grupo) =>
        grupo.items.flatMap((item) => [
            { ...item, grupo: grupo.label },
            ...expandSubtitles(item)
                .filter((sub) => puedeVerItem(sub, rol, permisos))
                .map((sub) => ({ ...sub, grupo: grupo.label })),
        ])
    );

/**
 * Los `max` módulos más relevantes del rol para la barra inferior en móvil.
 * El resto se muestra en la hoja "Más".
 */
export const getMobileNavForRole = (rol, permisos, max = 4) => {
    const planos = getFlatNavForRole(rol, permisos).filter((item) => !item.external);
    const ordenados = [...planos].sort(
        (a, b) => (a.mobilePriority ?? 99) - (b.mobilePriority ?? 99)
    );
    const principales = ordenados.slice(0, max);
    const rutasPrincipales = new Set(principales.map((i) => i.path));
    return {
        principales,
        resto: getNavForRole(rol, permisos)
            .map((grupo) => ({
                ...grupo,
                items: grupo.items
                    .flatMap((item) => [item, ...expandSubtitles(item).filter((sub) => puedeVerItem(sub, rol, permisos))])
                    .filter((i) => !rutasPrincipales.has(i.path)),
            }))
            .filter((grupo) => grupo.items.length > 0),
    };
};

/**
 * Etiquetas de rutas que no son módulos de primer nivel, para los breadcrumbs.
 * Las claves son segmentos de URL.
 */
export const SEGMENT_LABELS = {
    dashboard: 'Inicio',
    colegiados: 'Colegiados',
    invitados: 'Invitados',
    pasantes: 'Pasantes',
    postulaciones: 'Postulaciones',
    vencimientos: 'Vencimientos',
    usuarios: 'Usuarios',
    roles: 'Roles',
    permisos: 'Roles y Permisos',
    pagos: 'Pagos',
    documentos: 'Documentos',
    actividades_sociales: 'Actividades Académicas',
    actividades_institucionales: 'Actividades Institucionales',
    convenios: 'Convenios',
    detalles: 'Detalle',
    perfil: 'Perfil',
    asistencias: 'Asistencias',
    memorias: 'Memorias',
    tesoreria: 'Tesorería',
    movimientos: 'Movimientos',
    correspondencia: 'Correspondencia',
    buzon: 'Buzón',
    auditorias: 'Auditorías',
    informes: 'Informes',
    ajustes: 'Ajustes',
    notAuthorized: 'Sin autorización',
    roleNotDefined: 'Rol no definido',
    roleExpired: 'Cargo vencido',
    roleInactive: 'Rol inactivo',
};
