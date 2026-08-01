import { Check, Palette, Type, RotateCcw } from 'lucide-react';
import { useAppearance } from '../../../../../context/AppearanceProvider';

/**
 * Selector de tema y tipografía.
 *
 * La preferencia es por navegador (localStorage), no por cuenta: cada persona
 * ajusta cómo ve el panel en su equipo.
 */
export default function AparienciaSettings() {
    const { tema, fuente, temas, fuentes, setTema, setFuente, restablecer } = useAppearance();

    return (
        <div className="space-y-8">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Palette className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Apariencia</h2>
                        <p className="text-sm text-slate-500 font-medium">
                            Se guarda en este navegador y se aplica a todo el sistema.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={restablecer}
                    className="shrink-0 flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                    <RotateCcw size={13} /> Restablecer
                </button>
            </div>

            {/* ── Temas ── */}
            <section>
                <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Tema
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {temas.map((t) => {
                        const activo = t.id === tema;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setTema(t.id)}
                                aria-pressed={activo}
                                className={`group relative rounded-2xl border p-4 text-left transition-all ${activo
                                    ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                                    : 'border-slate-200 hover:border-slate-300'}`}
                            >
                                {activo && (
                                    <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                                        <Check size={12} strokeWidth={3} />
                                    </span>
                                )}

                                {/* Muestra de colores del tema */}
                                <div className="mb-3 flex gap-1.5" aria-hidden="true">
                                    {t.muestras.map((c, i) => (
                                        <span
                                            key={i}
                                            className="h-8 w-8 rounded-lg border border-black/10"
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>

                                <p className="text-sm font-bold text-slate-800">{t.nombre}</p>
                                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                                    {t.descripcion}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* ── Tipografías ── */}
            <section>
                <h3 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    <Type size={12} /> Tipografía
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {fuentes.map((f) => {
                        const activo = f.id === fuente;
                        return (
                            <button
                                key={f.id}
                                type="button"
                                onClick={() => setFuente(f.id)}
                                aria-pressed={activo}
                                className={`relative rounded-2xl border p-4 text-left transition-all ${activo
                                    ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                                    : 'border-slate-200 hover:border-slate-300'}`}
                            >
                                {activo && (
                                    <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                                        <Check size={12} strokeWidth={3} />
                                    </span>
                                )}

                                {/* Previsualización en la fuente real */}
                                <p
                                    className="mb-1 text-2xl text-slate-800"
                                    style={{ fontFamily: f.familia }}
                                >
                                    Colegio Aa
                                </p>
                                <p className="text-sm font-bold text-slate-800">{f.nombre}</p>
                                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                                    {f.descripcion}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
