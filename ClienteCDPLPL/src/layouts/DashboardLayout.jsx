import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { useAxiosInterceptor } from '../hooks/useAxiosInterceptor';
import Sidebar from './components/dashboard/Sidebar';
import { HeaderDashboard } from './components/dashboard/HeaderDashboard';
import FooterDashboard from './components/dashboard/FooterDashboard';
import MobileNav from './components/dashboard/MobileNav';
import CommandPalette from './components/dashboard/CommandPalette';
import GlobalAlerts from '../features/dashboard/components/GlobalAlerts';
import { SessionProvider } from '../context/SessionProvider';
import { useAppearance, FUENTES } from '../context/AppearanceProvider';
import { crearTemaMui } from '../utils/theme';

const CLAVE_COLAPSO = 'sidebar_collapsed';

/**
 * Shell del dashboard.
 *
 * Responsive en dos tramos:
 *  - `< lg`: sin sidebar; la navegación vive en la barra inferior (`MobileNav`).
 *  - `>= lg`: sidebar visible y colapsable a iconos; la preferencia se recuerda.
 *
 * Aquí es donde el tema y la tipografía TOMAN EFECTO: el contenedor raíz lleva
 * la clase `dashboard-shell` y los atributos `data-theme`/`data-font`. El CSS
 * de `index.css` acota todos los selectores a esa clase, así que ninguna otra
 * parte de la app (landing, login, app de campo) recibe el tema.
 *
 * El mismo tema se aplica al `ThemeProvider` de MUI, para que los modales y
 * formularios MUI del dashboard cambien con la interfaz sin afectar al MUI que
 * pudiera montarse fuera.
 */
function DashboardShell() {
    const { tema, fuente } = useAppearance();

    const [colapsado, setColapsado] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem(CLAVE_COLAPSO) === 'true';
    });
    const [buscadorAbierto, setBuscadorAbierto] = useState(false);

    useAxiosInterceptor();

    const alternarSidebar = useCallback(() => {
        setColapsado((prev) => {
            const siguiente = !prev;
            localStorage.setItem(CLAVE_COLAPSO, String(siguiente));
            return siguiente;
        });
    }, []);

    // Atajo global del buscador: Ctrl/Cmd + K.
    useEffect(() => {
        const alTeclado = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setBuscadorAbierto((v) => !v);
            }
        };
        window.addEventListener('keydown', alTeclado);
        return () => window.removeEventListener('keydown', alTeclado);
    }, []);

    const temaMui = useMemo(() => {
        const familia = FUENTES.find((f) => f.id === fuente)?.familia ?? "'Inter', sans-serif";
        return crearTemaMui(tema, familia);
    }, [tema, fuente]);

    return (
        <ThemeProvider theme={temaMui}>
            <div
                className="dashboard-shell flex h-dvh overflow-hidden bg-slate-100"
                data-theme={tema}
                data-font={fuente}
            >
                <GlobalAlerts />

                {/* Sidebar: solo desde lg */}
                <div className="hidden lg:flex">
                    <Sidebar collapsed={colapsado} />
                </div>

                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <HeaderDashboard
                        collapsed={colapsado}
                        onToggleSidebar={alternarSidebar}
                        onOpenSearch={() => setBuscadorAbierto(true)}
                    />

                    {/* Único contenedor con scroll. El padding inferior deja sitio a
                        la barra de navegación móvil. */}
                    <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/50 pb-20 lg:pb-0">
                        <Outlet />
                    </main>

                    <FooterDashboard />
                </div>

                <MobileNav />

                <CommandPalette
                    abierto={buscadorAbierto}
                    onClose={() => setBuscadorAbierto(false)}
                />
            </div>
        </ThemeProvider>
    );
}

export const DashboardLayout = () => (
    <SessionProvider>
        <DashboardShell />
    </SessionProvider>
);
