// Vista mostrada cuando una sesión válida no tiene un rol GDS autorizado.
// Mantiene al usuario dentro del layout propio de la Plataforma_GDS.
import { Link } from 'react-router-dom';

export default function GdsNoAutorizado() {
    return (
        <section className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold text-slate-800">Acceso no autorizado</h2>
            <p className="mt-2 text-slate-600">
                Tu cuenta no cuenta con un rol con permisos para esta sección de la
                Plataforma GDS.
            </p>
            <Link
                to="/gds"
                className="mt-6 inline-block rounded bg-cyan-600 px-4 py-2 text-sm text-white hover:bg-cyan-700"
            >
                Volver al panel
            </Link>
        </section>
    );
}
