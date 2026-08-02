import { useSession } from '../context/SessionProvider';

/**
 * Gating declarativo de UI por permiso: si el usuario no tiene al menos
 * `nivel` sobre `recurso`, no renderiza nada (ni siquiera oculto en el DOM).
 * Para arrays imperativos (p. ej. `actions` de `ResponsiveTable`) usar
 * `puedeVer`/`puedeEditar` de `useSession()` directo en vez de este componente.
 */
export function Can({ recurso, nivel = 'EDITOR', children, fallback = null }) {
    const { tieneNivel } = useSession();
    return tieneNivel(recurso, nivel) ? children : fallback;
}

export default Can;
