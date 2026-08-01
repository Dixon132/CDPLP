/**
 * Pie del dashboard. Oculto por debajo de `lg` para no competir con la barra
 * de navegación inferior en móvil.
 */
export default function FooterDashboard() {
    const anio = new Date().getFullYear();

    return (
        <footer className="hidden shrink-0 border-t border-slate-200 bg-white px-6 py-3 lg:block">
            <div className="flex items-center justify-between gap-4 text-[11px] text-slate-400">
                <p className="font-medium">
                    <span className="font-bold uppercase tracking-wider text-slate-500">CDPLP</span>
                    <span className="mx-2 text-slate-300">·</span>
                    Colegio Departamental de Psicólogos de La Paz · {anio}
                </p>
                <p className="hidden font-medium uppercase tracking-widest sm:block">
                    Panel administrativo
                </p>
            </div>
        </footer>
    );
}
