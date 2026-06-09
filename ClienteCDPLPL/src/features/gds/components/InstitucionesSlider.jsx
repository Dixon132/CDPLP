// Slider automático de instituciones registradas (Req. 21.2).
//
// Avanza solo a través de las `Institucion` registradas con un intervalo
// configurable. Se pausa al pasar el cursor por encima y al perder visibilidad
// implícita (sin instituciones no renderiza el carrusel). El avance se detiene
// con un único elemento. No depende del backend: recibe la lista por props.
import { useEffect, useState, useRef, useCallback } from 'react';

function InicialesLogo({ nombre }) {
    const iniciales = String(nombre ?? '?')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p.charAt(0).toUpperCase())
        .join('') || '?';
    return (
        <div
            className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-100 text-lg font-semibold text-cyan-700"
            aria-hidden="true"
        >
            {iniciales}
        </div>
    );
}

/**
 * @param {object} props
 * @param {Array<{id?:string, nombre:string, categoria?:string, logo_url?:string}>} props.instituciones
 * @param {number} [props.intervaloMs=4000] Intervalo de auto-avance.
 */
export default function InstitucionesSlider({ instituciones = [], intervaloMs = 4000 }) {
    const total = instituciones.length;
    const [indice, setIndice] = useState(0);
    const [pausado, setPausado] = useState(false);
    const timerRef = useRef(null);

    const avanzar = useCallback(() => {
        setIndice((i) => (total > 0 ? (i + 1) % total : 0));
    }, [total]);

    const ir = useCallback((i) => {
        if (total > 0) setIndice(((i % total) + total) % total);
    }, [total]);

    // Mantener el índice dentro de rango si cambia la lista.
    useEffect(() => {
        setIndice((i) => (total > 0 ? i % total : 0));
    }, [total]);

    // Auto-avance: solo con más de un elemento y sin pausa.
    useEffect(() => {
        if (pausado || total <= 1 || intervaloMs <= 0) return undefined;
        timerRef.current = setInterval(avanzar, intervaloMs);
        return () => clearInterval(timerRef.current);
    }, [pausado, total, intervaloMs, avanzar]);

    if (total === 0) {
        return (
            <section
                className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center"
                aria-label="Instituciones registradas"
            >
                <h3 className="text-sm font-medium text-slate-700">Instituciones registradas</h3>
                <p className="mt-2 text-sm text-slate-400">
                    Aún no hay instituciones registradas.
                </p>
            </section>
        );
    }

    const actual = instituciones[indice] ?? instituciones[0];

    return (
        <section
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            aria-label="Instituciones registradas"
            aria-roledescription="carrusel"
            onMouseEnter={() => setPausado(true)}
            onMouseLeave={() => setPausado(false)}
        >
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Instituciones registradas</h3>
                <span className="text-xs text-slate-400">
                    {indice + 1} / {total}
                </span>
            </div>

            <div className="flex items-center gap-4">
                {actual.logo_url ? (
                    <img
                        src={actual.logo_url}
                        alt=""
                        className="h-16 w-16 rounded-full object-cover"
                    />
                ) : (
                    <InicialesLogo nombre={actual.nombre} />
                )}
                <div className="min-w-0">
                    <p className="truncate text-base font-medium text-slate-800">{actual.nombre}</p>
                    {actual.categoria && (
                        <p className="text-sm capitalize text-slate-500">{actual.categoria}</p>
                    )}
                </div>
            </div>

            {total > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2" role="tablist" aria-label="Seleccionar institución">
                    {instituciones.map((inst, i) => (
                        <button
                            key={inst.id ?? `${inst.nombre}-${i}`}
                            type="button"
                            role="tab"
                            aria-selected={i === indice}
                            aria-label={`Mostrar ${inst.nombre}`}
                            onClick={() => ir(i)}
                            className={`h-2.5 w-2.5 rounded-full transition-colors ${i === indice ? 'bg-cyan-600' : 'bg-slate-300 hover:bg-slate-400'
                                }`}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
