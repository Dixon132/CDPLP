// Formulario de creación de un `Analisis` (Req. 8.1, 8.2, 8.3, 8.4, 12.1, 29.2).
//
// Permite: nombre y descripción, selección MÚLTIPLE de instituciones, radio de
// análisis, configuración temporal (semanas, hasta 24) y la elección del
// `Escenario` desde la `Biblioteca_Escenarios` (predefinido/reutilizable) o uno
// personalizado en texto libre (con opción de guardarlo en la biblioteca).
//
// La estética enterprise (Tailwind) es coherente con el `GdsLayout`. Toda la
// lógica pura (validación y payload) vive en `../api/analisis.js` para poder
// probarla sin DOM.
import { useState } from 'react';
import {
    ANALISIS_ESTADO_INICIAL,
    SEMANAS_MIN,
    SEMANAS_MAX,
    TIPO_ESCENARIO,
    validarAnalisis,
} from '../api/analisis.js';

const inputClase =
    'w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500';

/**
 * @param {object} props
 * @param {Array} props.instituciones Lista de instituciones disponibles.
 * @param {Array} props.escenarios Lista de escenarios de la biblioteca.
 * @param {boolean} [props.escenariosDisponibles] Si la biblioteca viene del backend.
 * @param {(form:object)=>Promise<void>|void} props.onSubmit
 * @param {()=>void} props.onCancel
 * @param {boolean} [props.guardando]
 */
export function AnalisisForm({
    instituciones = [],
    escenarios = [],
    escenariosDisponibles = true,
    onSubmit,
    onCancel,
    guardando = false,
}) {
    const [form, setForm] = useState(() => ({ ...ANALISIS_ESTADO_INICIAL }));
    const [errores, setErrores] = useState({});

    const set = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

    const toggleInstitucion = (id) => {
        setForm((prev) => {
            const yaEsta = prev.institucionIds.includes(id);
            return {
                ...prev,
                institucionIds: yaEsta
                    ? prev.institucionIds.filter((x) => x !== id)
                    : [...prev.institucionIds, id],
            };
        });
    };

    const enviar = async (e) => {
        e.preventDefault();
        const errs = validarAnalisis(form);
        setErrores(errs);
        if (Object.keys(errs).length > 0) return;
        await onSubmit(form);
    };

    const esPersonalizado = form.tipo_escenario === TIPO_ESCENARIO.PERSONALIZADO;

    return (
        <form onSubmit={enviar} className="space-y-5" noValidate>
            <h3 className="text-lg font-semibold text-slate-800">Nuevo análisis</h3>

            <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Nombre</span>
                    <input
                        type="text"
                        className={inputClase}
                        value={form.nombre}
                        onChange={(e) => set('nombre', e.target.value)}
                        aria-label="Nombre del análisis"
                    />
                    {errores.nombre && (
                        <span className="mt-1 block text-xs text-red-600">{errores.nombre}</span>
                    )}
                </label>

                <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                        Radio de análisis: {form.radio_metros} m
                    </span>
                    <input
                        type="range"
                        min={100}
                        max={10000}
                        step={100}
                        value={form.radio_metros}
                        onChange={(e) => set('radio_metros', Number(e.target.value))}
                        className="w-full accent-cyan-600"
                        aria-label="Radio de análisis en metros"
                    />
                    {errores.radio_metros && (
                        <span className="mt-1 block text-xs text-red-600">{errores.radio_metros}</span>
                    )}
                </label>
            </div>

            <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Descripción</span>
                <textarea
                    rows={2}
                    className={inputClase}
                    value={form.descripcion}
                    onChange={(e) => set('descripcion', e.target.value)}
                    aria-label="Descripción del análisis"
                />
            </label>

            {/* Selección múltiple de instituciones (Req. 8.3) */}
            <fieldset>
                <legend className="mb-1 block text-sm font-medium text-slate-700">
                    Instituciones (selecciona una o más)
                </legend>
                {instituciones.length === 0 ? (
                    <p className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                        No hay instituciones disponibles. Crea instituciones antes de iniciar un análisis.
                    </p>
                ) : (
                    <div className="grid gap-2 rounded border border-slate-200 bg-white p-3 sm:grid-cols-2">
                        {instituciones.map((inst) => (
                            <label
                                key={inst.id ?? inst.nombre}
                                className="flex items-center gap-2 text-sm text-slate-700"
                            >
                                <input
                                    type="checkbox"
                                    className="accent-cyan-600"
                                    checked={form.institucionIds.includes(inst.id)}
                                    onChange={() => toggleInstitucion(inst.id)}
                                    disabled={!inst.id}
                                />
                                <span className="font-medium">{inst.nombre}</span>
                                {inst.categoria && (
                                    <span className="text-xs capitalize text-slate-400">
                                        · {inst.categoria}
                                    </span>
                                )}
                            </label>
                        ))}
                    </div>
                )}
                {errores.institucionIds && (
                    <span className="mt-1 block text-xs text-red-600">{errores.institucionIds}</span>
                )}
            </fieldset>

            {/* Configuración temporal (Req. 12.1: hasta 24 semanas) */}
            <label className="block max-w-xs">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                    Duración (semanas, máx. {SEMANAS_MAX})
                </span>
                <input
                    type="number"
                    min={SEMANAS_MIN}
                    max={SEMANAS_MAX}
                    step={1}
                    className={inputClase}
                    value={form.total_semanas}
                    onChange={(e) => set('total_semanas', Number(e.target.value))}
                    aria-label="Duración en semanas"
                />
                {errores.total_semanas && (
                    <span className="mt-1 block text-xs text-red-600">{errores.total_semanas}</span>
                )}
            </label>

            {/* Escenario: biblioteca o personalizado (Req. 8.2, 29.2) */}
            <fieldset className="rounded border border-slate-200 bg-white p-4">
                <legend className="px-1 text-sm font-medium text-slate-700">Escenario</legend>
                <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                            type="radio"
                            name="tipo_escenario"
                            className="accent-cyan-600"
                            checked={!esPersonalizado}
                            onChange={() => set('tipo_escenario', TIPO_ESCENARIO.BIBLIOTECA)}
                        />
                        Desde la biblioteca
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                            type="radio"
                            name="tipo_escenario"
                            className="accent-cyan-600"
                            checked={esPersonalizado}
                            onChange={() => set('tipo_escenario', TIPO_ESCENARIO.PERSONALIZADO)}
                        />
                        Personalizado
                    </label>
                </div>

                {!escenariosDisponibles && (
                    <p className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        Mostrando escenarios predefinidos sugeridos; la biblioteca del backend aún no está
                        disponible.
                    </p>
                )}

                {esPersonalizado ? (
                    <div className="mt-3 space-y-3">
                        <label className="block">
                            <span className="mb-1 block text-sm font-medium text-slate-700">
                                Descripción del escenario
                            </span>
                            <textarea
                                rows={3}
                                className={inputClase}
                                value={form.escenario_texto}
                                onChange={(e) => set('escenario_texto', e.target.value)}
                                aria-label="Escenario personalizado"
                                placeholder="Describe el contexto global de la simulación…"
                            />
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                                type="checkbox"
                                className="accent-cyan-600"
                                checked={form.guardar_en_biblioteca}
                                onChange={(e) => set('guardar_en_biblioteca', e.target.checked)}
                            />
                            Guardar este escenario en la biblioteca para reutilizarlo
                        </label>
                        {form.guardar_en_biblioteca && (
                            <label className="block max-w-sm">
                                <span className="mb-1 block text-sm font-medium text-slate-700">
                                    Nombre del escenario
                                </span>
                                <input
                                    type="text"
                                    className={inputClase}
                                    value={form.escenario_nombre}
                                    onChange={(e) => set('escenario_nombre', e.target.value)}
                                    aria-label="Nombre del escenario a guardar"
                                />
                                {errores.escenario_nombre && (
                                    <span className="mt-1 block text-xs text-red-600">
                                        {errores.escenario_nombre}
                                    </span>
                                )}
                            </label>
                        )}
                    </div>
                ) : (
                    <label className="mt-3 block max-w-md">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                            Escenario de la biblioteca
                        </span>
                        <select
                            className={inputClase}
                            value={form.escenario_id}
                            onChange={(e) => set('escenario_id', e.target.value)}
                            aria-label="Escenario de la biblioteca"
                        >
                            <option value="">Seleccione…</option>
                            {escenarios.map((esc) => (
                                <option key={esc.id} value={esc.id}>
                                    {esc.nombre}
                                </option>
                            ))}
                        </select>
                    </label>
                )}

                {errores.escenario && (
                    <span className="mt-2 block text-xs text-red-600">{errores.escenario}</span>
                )}
            </fieldset>

            <div className="flex justify-end gap-2 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={guardando}
                    className="rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-60"
                >
                    {guardando ? 'Creando…' : 'Crear análisis'}
                </button>
            </div>
        </form>
    );
}

export default AnalisisForm;
