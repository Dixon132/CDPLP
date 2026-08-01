import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Tema y tipografía del DASHBOARD.
 *
 * El provider NO toca `<html>`: el `DashboardLayout` lee `useAppearance()` y
 * aplica los `data-*` a su propio contenedor (`.dashboard-shell`). El CSS de
 * `index.css` acota los selectores a ese contenedor, así que el sitio público,
 * el login y la app de campo se ven siempre igual, sin importar el tema
 * elegido en el dashboard.
 *
 * La preferencia se guarda en localStorage. No hay parpadeo porque el shell
 * del dashboard aplica los atributos en el mismo render en el que se monta.
 */

const CLAVE = 'cdplp_apariencia';

export const TEMAS = [
    {
        id: 'claro',
        nombre: 'Claro',
        descripcion: 'El de siempre. Blanco, pizarra y acentos índigo.',
        muestras: ['#ffffff', '#f1f5f9', '#475569', '#4f46e5'],
    },
    {
        id: 'oscuro',
        nombre: 'Oscuro',
        descripcion: 'Azul pizarra profundo, sin negros puros. Descansa la vista de noche.',
        muestras: ['#151b26', '#222b3a', '#b4c0d1', '#a5b0ff'],
    },
    {
        id: 'durazno',
        nombre: 'Durazno',
        descripcion: 'Crema cálido y terracota suave. Amable sin dejar de ser serio.',
        muestras: ['#fffaf6', '#f9e6da', '#7d6255', '#c9583f'],
    },
];

export const FUENTES = [
    {
        id: 'moderna',
        nombre: 'Moderna',
        descripcion: 'Inter. Neutra y compacta, la actual.',
        familia: "'Inter', sans-serif",
    },
    {
        id: 'tecnica',
        nombre: 'Técnica',
        descripcion: 'Space Grotesk. Geométrica y angulosa, con aire de producto.',
        familia: "'Space Grotesk', sans-serif",
    },
    {
        id: 'redonda',
        nombre: 'Redonda',
        descripcion: 'Fraunces. Serif suave y curvilínea, cálida y con personalidad.',
        familia: "'Fraunces', serif",
    },
    {
        id: 'institucional',
        nombre: 'Institucional',
        descripcion: 'Libre Baskerville. Formal, de documento oficial.',
        familia: "'Libre Baskerville', serif",
    },
];

const IDS_TEMA = TEMAS.map((t) => t.id);
const IDS_FUENTE = FUENTES.map((f) => f.id);

const POR_DEFECTO = { tema: 'claro', fuente: 'moderna' };

const leerPreferencia = () => {
    if (typeof window === 'undefined') return POR_DEFECTO;
    try {
        const guardado = JSON.parse(localStorage.getItem(CLAVE) || '{}');
        return {
            tema: IDS_TEMA.includes(guardado.tema) ? guardado.tema : POR_DEFECTO.tema,
            fuente: IDS_FUENTE.includes(guardado.fuente) ? guardado.fuente : POR_DEFECTO.fuente,
        };
    } catch {
        return POR_DEFECTO;
    }
};

const AppearanceContext = createContext(null);

export function AppearanceProvider({ children }) {
    const [pref, setPref] = useState(leerPreferencia);

    // Solo persistencia: los atributos `data-theme` y `data-font` los aplica
    // el shell del dashboard sobre su propio contenedor, no en <html>.
    useEffect(() => {
        try {
            localStorage.setItem(CLAVE, JSON.stringify(pref));
        } catch {
            /* modo privado o cuota llena: la apariencia simplemente no persiste */
        }
    }, [pref]);

    // Si el usuario tiene la app abierta en dos pestañas, que ambas cambien.
    useEffect(() => {
        const alCambiarStorage = (e) => {
            if (e.key === CLAVE) setPref(leerPreferencia());
        };
        window.addEventListener('storage', alCambiarStorage);
        return () => window.removeEventListener('storage', alCambiarStorage);
    }, []);

    const setTema = useCallback(
        (tema) => IDS_TEMA.includes(tema) && setPref((p) => ({ ...p, tema })),
        []
    );
    const setFuente = useCallback(
        (fuente) => IDS_FUENTE.includes(fuente) && setPref((p) => ({ ...p, fuente })),
        []
    );

    /** Alterna claro ↔ oscuro sin perder el tema alternativo si está activo. */
    const alternarTema = useCallback(
        () => setPref((p) => ({ ...p, tema: p.tema === 'oscuro' ? 'claro' : 'oscuro' })),
        []
    );

    const valor = useMemo(
        () => ({
            tema: pref.tema,
            fuente: pref.fuente,
            temas: TEMAS,
            fuentes: FUENTES,
            setTema,
            setFuente,
            alternarTema,
            restablecer: () => setPref(POR_DEFECTO),
        }),
        [pref, setTema, setFuente, alternarTema]
    );

    return <AppearanceContext.Provider value={valor}>{children}</AppearanceContext.Provider>;
}

/**
 * Devuelve la apariencia. Fuera del provider (por ejemplo, un componente
 * renderizado aislado en un test) degrada a los valores por defecto en vez de
 * lanzar.
 */
export function useAppearance() {
    const ctx = useContext(AppearanceContext);
    if (ctx) return ctx;
    return {
        ...POR_DEFECTO,
        temas: TEMAS,
        fuentes: FUENTES,
        setTema: () => {},
        setFuente: () => {},
        alternarTema: () => {},
        restablecer: () => {},
    };
}
