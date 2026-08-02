import { Link } from 'react-router-dom';
import { ShieldAlert, CalendarX, UserX, LogOut } from 'lucide-react';

/**
 * Pantallas de estado de sesión.
 *
 * `RequirePermiso` redirige a `/dashboard/roleNotDefined`, `/dashboard/roleExpired`
 * y `/dashboard/roleInactive`, pero esas rutas no existían y el usuario acababa
 * en el 404 genérico sin saber qué había pasado.
 */

const ESTADOS = {
    noDefinido: {
        icono: UserX,
        titulo: 'Tu cuenta aún no tiene un rol asignado',
        detalle:
            'Un administrador debe asignarte un cargo antes de que puedas usar el panel. Contacta con la secretaría del colegio.',
    },
    vencido: {
        icono: CalendarX,
        titulo: 'Tu cargo ya no está vigente',
        detalle:
            'El período de tu cargo terminó o aún no ha comenzado. Si crees que es un error, pide a un administrador que revise las fechas de tu rol.',
    },
    inactivo: {
        icono: ShieldAlert,
        titulo: 'Tu rol está inactivo',
        detalle:
            'Un administrador desactivó tu rol. Mientras siga así no podrás acceder a los módulos del panel.',
    },
};

export default function EstadoSesion({ tipo = 'noDefinido' }) {
    const { icono: Icono, titulo, detalle } = ESTADOS[tipo] ?? ESTADOS.noDefinido;

    const cerrarSesion = () => {
        localStorage.removeItem('token');
        window.location.assign('/auth/login');
    };

    return (
        <div className="flex min-h-full items-center justify-center p-6">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                    <Icono className="h-8 w-8" />
                </div>

                <h1 className="text-lg font-bold text-slate-800">{titulo}</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{detalle}</p>

                <div className="mt-7 flex flex-col gap-2">
                    <button
                        type="button"
                        onClick={cerrarSesion}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                    >
                        <LogOut size={15} /> Cerrar sesión
                    </button>
                    <Link
                        to="/"
                        className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                    >
                        Ir al sitio público
                    </Link>
                </div>
            </div>
        </div>
    );
}
