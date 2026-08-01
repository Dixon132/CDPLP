/**
 * Fuente única de la navegación del dashboard.
 *
 * Antes cada rol tenía su propio array dentro de `Sidebar.jsx` mediante una
 * cadena de if/else. Ahora los módulos se declaran una sola vez con los roles
 * que pueden verlos, y los consumen el sidebar, la barra inferior móvil, el
 * buscador global y los breadcrumbs.
 *
 * Los `roles` de cada módulo se corresponden exactamente con los que ya tenía
 * el sidebar; esto no cambia permisos. La autorización real vive en
 * `RequireRole` (cliente) y en `authMiddleware` (servidor): esto es solo
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
                roles: ['PRESIDENTE', 'SECRETARIO', 'VICEPRESIDENTE'],
                subtitles: ['Invitados', 'Pasantes'],
                mobilePriority: 1,
            },
            {
                title: 'Postulaciones',
                path: '/dashboard/postulaciones',
                icon: 'ClipboardList',
                roles: ['PRESIDENTE', 'SECRETARIO', 'VICEPRESIDENTE'],
                mobilePriority: 5,
            },
            {
                title: 'Usuarios',
                path: '/dashboard/usuarios',
                icon: 'UserCog',
                roles: ['PRESIDENTE', 'VICEPRESIDENTE'],
                subtitles: ['Roles'],
                mobilePriority: 8,
            },
        ],
    },
    {
        id: 'actividades',
        label: 'Actividades',
        items: [
            {
                title: 'Actividades_Sociales',
                path: '/dashboard/actividades_sociales',
                icon: 'HeartHandshake',
                roles: ['PRESIDENTE', 'VICEPRESIDENTE', 'VOCAL', 'SECRETARIO_GENERAL'],
                subtitles: ['Convenios'],
                mobilePriority: 3,
            },
            {
                title: 'Actividades_Institucionales',
                path: '/dashboard/actividades_institucionales',
                icon: 'BookMarked',
                roles: ['PRESIDENTE', 'SECRETARIO', 'VICEPRESIDENTE', 'VOCAL', 'SECRETARIO_GENERAL'],
                mobilePriority: 4,
            },
            {
                title: 'Memorias',
                path: '/dashboard/memorias',
                icon: 'Library',
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
                roles: ['PRESIDENTE'],
                mobilePriority: 9,
            },
            {
                title: 'Ajustes',
                path: '/dashboard/ajustes',
                icon: 'Settings',
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

/** "Actividades_Sociales" → "Actividades Sociales" */
export const formatTitle = (title = '') =>
    title.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

/**
 * Grupos visibles para un rol, ya filtrados y sin grupos vacíos.
 * Un rol no definido (o ausente) no ve ningún módulo.
 */
export const getNavForRole = (rol) => {
    if (!rol || rol === 'NO_DEFINIDO') return [];
    return NAV_GROUPS
        .map((grupo) => ({
            ...grupo,
            items: grupo.items.filter((item) => item.roles.includes(rol)),
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
        roles: item.roles,
    }));

/** Lista plana de módulos visibles para un rol, incluidos los subtítulos de cada uno. */
export const getFlatNavForRole = (rol) =>
    getNavForRole(rol).flatMap((grupo) =>
        grupo.items.flatMap((item) => [
            { ...item, grupo: grupo.label },
            ...expandSubtitles(item).map((sub) => ({ ...sub, grupo: grupo.label })),
        ])
    );

/**
 * Los `max` módulos más relevantes del rol para la barra inferior en móvil.
 * El resto se muestra en la hoja "Más".
 */
export const getMobileNavForRole = (rol, max = 4) => {
    const planos = getFlatNavForRole(rol).filter((item) => !item.external);
    const ordenados = [...planos].sort(
        (a, b) => (a.mobilePriority ?? 99) - (b.mobilePriority ?? 99)
    );
    const principales = ordenados.slice(0, max);
    const rutasPrincipales = new Set(principales.map((i) => i.path));
    return {
        principales,
        resto: getNavForRole(rol)
            .map((grupo) => ({
                ...grupo,
                items: grupo.items
                    .flatMap((item) => [item, ...expandSubtitles(item)])
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
    usuarios: 'Usuarios',
    roles: 'Roles',
    pagos: 'Pagos',
    documentos: 'Documentos',
    actividades_sociales: 'Actividades Sociales',
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
