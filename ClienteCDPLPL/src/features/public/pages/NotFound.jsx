import { Link, useLocation } from 'react-router-dom';

export default function NotFound() {
    // Este 404 es el catch-all global (fuera de DashboardLayout): si el enlace
    // roto viene de dentro del dashboard, "volver" debe llevar al dashboard, no
    // a la landing pública — antes siempre mandaba a "/" sin importar de dónde
    // viniera el usuario.
    const { pathname } = useLocation();
    const enDashboard = pathname.startsWith('/dashboard');

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white text-black font-sans">
            <h1 className="text-[15vw] leading-none font-black tracking-tighter uppercase mb-4">404</h1>
            <p className="text-xl font-bold tracking-widest uppercase text-gray-500 mb-10">Página no encontrada</p>
            <Link
                to={enDashboard ? '/dashboard' : '/'}
                className="border border-black px-10 py-4 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition duration-300"
            >
                {enDashboard ? 'Volver al Panel' : 'Volver al Inicio'}
            </Link>
        </div>
    );
}
