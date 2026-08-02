import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { SEGMENT_LABELS } from '../../navigation';

/**
 * Ruta de navegación derivada de la URL.
 *
 * Resuelve el "¿dónde estoy?" en submódulos como `/dashboard/colegiados/pagos/42`,
 * que antes no daban ninguna pista. Los segmentos numéricos (ids) se muestran
 * como `#42` y no son enlazables.
 */
export default function Breadcrumbs() {
    const { pathname } = useLocation();
    const segmentos = pathname.split('/').filter(Boolean);

    if (segmentos.length === 0) return null;

    const migas = segmentos.map((seg, i) => {
        const href = '/' + segmentos.slice(0, i + 1).join('/');
        const esId = /^\d+$/.test(seg);
        const siguienteEsId = /^\d+$/.test(segmentos[i + 1] ?? '');
        return {
            href,
            // Un segmento que solo es la "etiqueta" de un recurso con id (p. ej.
            // "perfil" en /actividades_sociales/perfil/42) no es una página
            // navegable por sí sola — sin el id cae en 404. Solo se enlazan los
            // segmentos que de verdad resuelven a una ruta propia.
            enlazable: !esId && !siguienteEsId,
            label: esId ? `#${seg}` : (SEGMENT_LABELS[seg] ?? seg.replace(/_/g, ' ')),
            ultimo: i === segmentos.length - 1,
        };
    });

    const actual = migas[migas.length - 1];

    return (
        <div className="min-w-0">
            {/* Rastro completo: solo desde md, para no apretar el móvil */}
            <nav aria-label="Ruta de navegación" className="hidden md:flex items-center gap-1 text-[11px]">
                {migas.map((m) => (
                    <span key={m.href} className="flex items-center gap-1 min-w-0">
                        {m.ultimo || !m.enlazable ? (
                            <span
                                className={`truncate ${m.ultimo ? 'font-semibold text-slate-700' : 'text-slate-400'}`}
                                aria-current={m.ultimo ? 'page' : undefined}
                            >
                                {m.label}
                            </span>
                        ) : (
                            <Link
                                to={m.href}
                                className="truncate text-slate-400 hover:text-slate-700 transition-colors"
                            >
                                {m.label}
                            </Link>
                        )}
                        {!m.ultimo && <ChevronRight size={11} className="shrink-0 text-slate-300" />}
                    </span>
                ))}
            </nav>

            {/* En móvil solo el título de la sección actual */}
            <h1 className="md:hidden truncate text-sm font-bold text-slate-800">{actual.label}</h1>
        </div>
    );
}
