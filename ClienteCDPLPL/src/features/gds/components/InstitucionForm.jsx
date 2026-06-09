// Formulario de alta/edición de una `Institucion` con selección de ubicación en
// mapa (Leaflet) y radio de influencia (Req. 7.1–7.5, 7.7).
//
// Estética enterprise (Tailwind) coherente con el `GdsLayout`. La validación
// pura vive en `../api/instituciones.js` para poder probarla sin DOM.
import { useState } from 'react';
import { InstitucionMapPicker } from './InstitucionMapPicker.jsx';
import {
    CATEGORIAS_INSTITUCION,
    RADIO_METROS_DEFECTO,
    validarInstitucion,
} from '../api/instituciones.js';

const ESTADO_INICIAL = {
    nombre: '',
    categoria: '',
    latitud: null,
    longitud: null,
    radio_metros: RADIO_METROS_DEFECTO,
    logo_url: '',
    descripcion: '',
};

function estadoDesde(inst) {
    if (!inst) return { ...ESTADO_INICIAL };
    return {
        nombre: inst.nombre ?? '',
        categoria: inst.categoria ?? '',
        latitud: inst.latitud ?? null,
        longitud: inst.longitud ?? null,
        radio_metros: inst.radio_metros ?? RADIO_METROS_DEFECTO,
        logo_url: inst.logo_url ?? '',
        descripcion: inst.descripcion ?? '',
    };
}

const inputClase =
    'w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500';

/**
 * @param {object} props
 * @param {object|null} [props.institucion] Institución a editar (null = alta).
 * @param {(form:object)=>Promise<void>|void} props.onSubmit
 * @param {()=>void} props.onCancel
 * @param {boolean} [props.guardando]
 */
export function InstitucionForm({ institucion = null, onSubmit, onCancel, guardando = false }) {
    const [form, setForm] = useState(() => estadoDesde(institucion));
    const [errores, setErrores] = useState({});

    const editando = Boolean(institucion && institucion.id);

    const set = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

    const seleccionarUbicacion = (lat, lng) => {
        setForm((prev) => ({ ...prev, latitud: lat, longitud: lng }));
    };

    const enviar = async (e) => {
        e.preventDefault();
        const errs = validarInstitucion(form);
        setErrores(errs);
        if (Object.keys(errs).length > 0) return;
        await onSubmit(form);
    };

    return (
        <form onSubmit={enviar} className="space-y-4" noValidate>
            <h3 className="text-lg font-semibold text-slate-800">
                {editando ? 'Editar institución' : 'Nueva institución'}
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Nombre</span>
                    <input
                        type="text"
                        className={inputClase}
                        value={form.nombre}
                        onChange={(e) => set('nombre', e.target.value)}
                        aria-label="Nombre"
                    />
                    {errores.nombre && <span className="mt-1 block text-xs text-red-600">{errores.nombre}</span>}
                </label>

                <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Categoría</span>
                    <select
                        className={inputClase}
                        value={form.categoria}
                        onChange={(e) => set('categoria', e.target.value)}
                        aria-label="Categoría"
                    >
                        <option value="">Seleccione…</option>
                        {CATEGORIAS_INSTITUCION.map((c) => (
                            <option key={c} value={c}>
                                {c.charAt(0).toUpperCase() + c.slice(1)}
                            </option>
                        ))}
                    </select>
                    {errores.categoria && (
                        <span className="mt-1 block text-xs text-red-600">{errores.categoria}</span>
                    )}
                </label>
            </div>

            <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Descripción</span>
                <textarea
                    rows={3}
                    className={inputClase}
                    value={form.descripcion}
                    onChange={(e) => set('descripcion', e.target.value)}
                    aria-label="Descripción"
                />
            </label>

            <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">URL del logo (opcional)</span>
                <input
                    type="text"
                    className={inputClase}
                    value={form.logo_url}
                    onChange={(e) => set('logo_url', e.target.value)}
                    aria-label="URL del logo"
                    placeholder="https://…"
                />
            </label>

            <div>
                <span className="mb-1 block text-sm font-medium text-slate-700">
                    Ubicación geográfica y radio de influencia
                </span>
                <p className="mb-2 text-xs text-slate-500">
                    Haz clic en el mapa para fijar la ubicación. El círculo muestra el radio de influencia.
                </p>
                <InstitucionMapPicker
                    latitud={form.latitud}
                    longitud={form.longitud}
                    radioMetros={form.radio_metros}
                    onSelect={seleccionarUbicacion}
                />
                {errores.ubicacion && (
                    <span className="mt-1 block text-xs text-red-600">{errores.ubicacion}</span>
                )}
                {form.latitud !== null && form.longitud !== null && (
                    <p className="mt-2 text-xs text-emerald-700">
                        📍 Lat: {Number(form.latitud).toFixed(6)}, Lng: {Number(form.longitud).toFixed(6)}
                    </p>
                )}
            </div>

            <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                    Radio de influencia: {form.radio_metros} m
                </span>
                <input
                    type="range"
                    min={50}
                    max={5000}
                    step={50}
                    value={form.radio_metros}
                    onChange={(e) => set('radio_metros', Number(e.target.value))}
                    className="w-full accent-cyan-600"
                    aria-label="Radio de influencia en metros"
                />
                {errores.radio_metros && (
                    <span className="mt-1 block text-xs text-red-600">{errores.radio_metros}</span>
                )}
            </label>

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
                    {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear institución'}
                </button>
            </div>
        </form>
    );
}

export default InstitucionForm;
