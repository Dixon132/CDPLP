// Vista de gestión de instituciones de la Plataforma_GDS (Req. 7.7).
//
// Ofrece el CRUD de instituciones conectado al backend autónomo `/api/gds`
// (vía `gdsApiClient`, URL base `VITE_GDS_API_URL`). El formulario integra el
// selector de ubicación sobre mapa (Leaflet) y el radio de influencia.
//
// Los endpoints del backend se implementan en la tarea 21.x; mientras tanto la
// vista degrada de forma controlada: si el listado falla, muestra un aviso y un
// estado vacío en vez de romperse.
import { useCallback, useEffect, useState } from 'react';
import { InstitucionForm } from '../components/InstitucionForm.jsx';
import {
    listInstituciones,
    createInstitucion,
    updateInstitucion,
    deleteInstitucion,
} from '../api/instituciones.js';

function mensajeError(error) {
    const status = error?.response?.status;
    if (status === 404 || error?.code === 'ERR_NETWORK' || !error?.response) {
        return 'El servicio de instituciones aún no está disponible. Podrás gestionarlas cuando el backend exponga el endpoint.';
    }
    return error?.response?.data?.message ?? 'Ocurrió un error al comunicarse con el servicio.';
}

export default function GdsInstituciones() {
    const [instituciones, setInstituciones] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [aviso, setAviso] = useState('');
    const [error, setError] = useState('');
    const [vista, setVista] = useState('lista'); // 'lista' | 'form'
    const [enEdicion, setEnEdicion] = useState(null);
    const [guardando, setGuardando] = useState(false);

    const cargar = useCallback(async () => {
        setCargando(true);
        setAviso('');
        try {
            const data = await listInstituciones();
            setInstituciones(data);
        } catch (err) {
            setInstituciones([]);
            setAviso(mensajeError(err));
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const abrirNueva = () => {
        setEnEdicion(null);
        setError('');
        setVista('form');
    };

    const abrirEdicion = (inst) => {
        setEnEdicion(inst);
        setError('');
        setVista('form');
    };

    const cancelar = () => {
        setVista('lista');
        setEnEdicion(null);
        setError('');
    };

    const guardar = async (form) => {
        setGuardando(true);
        setError('');
        try {
            if (enEdicion && enEdicion.id) {
                await updateInstitucion(enEdicion.id, form);
            } else {
                await createInstitucion(form);
            }
            await cargar();
            setVista('lista');
            setEnEdicion(null);
        } catch (err) {
            setError(mensajeError(err));
        } finally {
            setGuardando(false);
        }
    };

    const eliminar = async (inst) => {
        if (!inst?.id) return;
        // eslint-disable-next-line no-alert
        if (!window.confirm(`¿Eliminar la institución "${inst.nombre}"?`)) return;
        try {
            await deleteInstitucion(inst.id);
            await cargar();
        } catch (err) {
            setAviso(mensajeError(err));
        }
    };

    return (
        <section className="mx-auto max-w-5xl">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold text-slate-800">Instituciones</h2>
                    <p className="mt-1 text-slate-600">
                        Gestión de instituciones educativas con geolocalización y radio de influencia.
                    </p>
                </div>
                {vista === 'lista' && (
                    <button
                        type="button"
                        onClick={abrirNueva}
                        className="rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
                    >
                        + Nueva institución
                    </button>
                )}
            </div>

            {aviso && (
                <div
                    role="status"
                    className="mt-4 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                >
                    {aviso}
                </div>
            )}

            {vista === 'form' ? (
                <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                    {error && (
                        <div
                            role="alert"
                            className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
                        >
                            {error}
                        </div>
                    )}
                    <InstitucionForm
                        institucion={enEdicion}
                        onSubmit={guardar}
                        onCancel={cancelar}
                        guardando={guardando}
                    />
                </div>
            ) : (
                <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                    {cargando ? (
                        <p className="p-6 text-sm text-slate-500">Cargando instituciones…</p>
                    ) : instituciones.length === 0 ? (
                        <p className="p-6 text-sm text-slate-500">
                            No hay instituciones registradas todavía.
                        </p>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Nombre</th>
                                    <th className="px-4 py-3 font-medium">Categoría</th>
                                    <th className="px-4 py-3 font-medium">Ubicación</th>
                                    <th className="px-4 py-3 font-medium">Radio (m)</th>
                                    <th className="px-4 py-3 font-medium text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {instituciones.map((inst) => (
                                    <tr key={inst.id ?? inst.nombre} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium text-slate-800">{inst.nombre}</td>
                                        <td className="px-4 py-3 capitalize text-slate-600">{inst.categoria}</td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {inst.latitud !== null && inst.longitud !== null
                                                ? `${Number(inst.latitud).toFixed(4)}, ${Number(inst.longitud).toFixed(4)}`
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{inst.radio_metros}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => abrirEdicion(inst)}
                                                className="rounded px-2 py-1 text-xs font-medium text-cyan-700 hover:bg-cyan-50"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => eliminar(inst)}
                                                className="ml-1 rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </section>
    );
}
