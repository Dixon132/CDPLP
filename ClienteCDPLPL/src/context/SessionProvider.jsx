import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseToken } from '../utils/parsejwt';
import { getMe } from '../features/dashboard/services/usuarios';
import { getMisPermisos } from '../features/dashboard/services/permisos';

const NIVEL_ORDEN = { SIN_ACCESO: 0, OBSERVADOR: 1, EDITOR: 2 };

/**
 * Sesión del usuario para todo el dashboard.
 *
 * El JWT solo trae `{ userId, rol: { rol, fecha_inicio, fecha_fin, activo }, exp }`,
 * sin nombre ni correo, así que el perfil se pide UNA vez a `/api/usuarios/auth/me`
 * y se cachea aquí. Antes el header mostraba datos escritos a mano.
 *
 * El contexto puede no existir (por ejemplo al renderizar el Sidebar aislado en
 * los tests). Por eso `useSession` degrada a leer el JWT directamente en lugar
 * de lanzar.
 */
const SessionContext = createContext(null);

const leerToken = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = parseToken(token);
    return payload ?? null;
};

export function SessionProvider({ children }) {
    const navigate = useNavigate();
    const [payload] = useState(leerToken);
    const [usuario, setUsuario] = useState(null);
    const [permisos, setPermisos] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [ahora, setAhora] = useState(() => Date.now());

    useEffect(() => {
        let cancelado = false;
        if (!payload) {
            setCargando(false);
            return undefined;
        }
        // `allSettled`, no `all`: un fallo puntual de /mis-permisos no debe tumbar
        // también el nombre/correo ya resuelto por /me (y viceversa). Si los
        // permisos no cargan, `permisos` queda `null` -> todo se resuelve a
        // SIN_ACCESO (fail-closed), nunca se abre acceso de más por un error de red.
        Promise.allSettled([getMe(), getMisPermisos()]).then(([resUsuario, resPermisos]) => {
            if (cancelado) return;
            if (resUsuario.status === 'fulfilled') setUsuario(resUsuario.value);
            else console.error('No se pudo cargar el usuario de la sesión:', resUsuario.reason);
            if (resPermisos.status === 'fulfilled') setPermisos(resPermisos.value);
            else console.error('No se pudieron cargar los permisos de la sesión:', resPermisos.reason);
            setCargando(false);
        });
        return () => { cancelado = true; };
    }, [payload]);

    // Reloj de baja frecuencia para el aviso de expiración: basta con un tick
    // por minuto, no hace falta re-renderizar cada segundo.
    useEffect(() => {
        const t = setInterval(() => setAhora(Date.now()), 60_000);
        return () => clearInterval(t);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        navigate('/auth/login', { replace: true });
    }, [navigate]);

    const valor = useMemo(() => {
        const rol = payload?.rol?.rol ?? '';
        const expMs = payload?.exp ? payload.exp * 1000 : null;
        const minutosRestantes = expMs ? Math.max(0, Math.round((expMs - ahora) / 60000)) : null;

        const nombreCompleto = usuario
            ? `${usuario.nombre ?? ''} ${usuario.apellido ?? ''}`.trim()
            : '';

        const iniciales = nombreCompleto
            ? nombreCompleto.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
            : (rol[0] ?? 'U');

        const mapaPermisos = permisos ?? {};
        const puedeVer = (clave) => (mapaPermisos[clave] ?? 'SIN_ACCESO') !== 'SIN_ACCESO';
        const puedeEditar = (clave) => (mapaPermisos[clave] ?? 'SIN_ACCESO') === 'EDITOR';
        const tieneNivel = (clave, nivelMinimo) =>
            NIVEL_ORDEN[mapaPermisos[clave] ?? 'SIN_ACCESO'] >= NIVEL_ORDEN[nivelMinimo];

        return {
            usuario,
            cargando,
            rol,
            nombreCompleto: nombreCompleto || 'Usuario',
            correo: usuario?.correo ?? '',
            iniciales,
            vigencia: payload?.rol
                ? { desde: payload.rol.fecha_inicio, hasta: payload.rol.fecha_fin, activo: payload.rol.activo }
                : null,
            minutosRestantes,
            porExpirar: minutosRestantes !== null && minutosRestantes <= 10,
            permisos: mapaPermisos,
            puedeVer,
            puedeEditar,
            tieneNivel,
            logout,
        };
    }, [payload, usuario, permisos, cargando, ahora, logout]);

    return <SessionContext.Provider value={valor}>{children}</SessionContext.Provider>;
}

/**
 * Devuelve la sesión. Si no hay provider (componente renderizado de forma
 * aislada), cae a leer el rol del JWT para no romper.
 */
export function useSession() {
    const ctx = useContext(SessionContext);
    const fallbackRol = ctx ? null : (leerToken()?.rol?.rol ?? '');
    if (ctx) return ctx;
    return {
        usuario: null,
        cargando: false,
        rol: fallbackRol,
        nombreCompleto: 'Usuario',
        correo: '',
        iniciales: fallbackRol?.[0] ?? 'U',
        vigencia: null,
        minutosRestantes: null,
        porExpirar: false,
        permisos: {},
        puedeVer: () => false,
        puedeEditar: () => false,
        tieneNivel: () => false,
        logout: () => {
            localStorage.removeItem('token');
            window.location.assign('/auth/login');
        },
    };
}
