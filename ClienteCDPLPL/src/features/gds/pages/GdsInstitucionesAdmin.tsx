// Pantalla de gestión (CRUD) de instituciones de la Plataforma_GDS (Req. 7),
// en TypeScript, dentro de la migración del feature `gds` a TS + Shadcn/UI.
//
// Ofrece el CRUD de instituciones conectado al backend autónomo `/api/gds`
// (tarea 20.1) mediante **TanStack Query** (`VITE_GDS_API_URL`). El formulario
// (React Hook Form + Zod) integra el selector de ubicación sobre mapa (Leaflet)
// y el radio de influencia. La vista DEGRADA CON ELEGANCIA: si el endpoint aún
// no está disponible, muestra un aviso informativo en vez de romperse.
import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { gdsQueryClient } from '../lib/queryClient';
import {
    useInstitucionesList,
    useCrearInstitucion,
    useActualizarInstitucion,
    useEliminarInstitucion,
} from '../hooks/useInstitucionesAdmin';
import type { Institucion, InstitucionFormValues } from '../api/institucionesApi';
import ConfirmDeleteModal from '../../../components/ConfirmDeleteModal';
import { InstitucionFormulario } from '../components/InstitucionFormulario';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

function mensajeError(error: unknown): string {
    if (error instanceof AxiosError) {
        const status = error.response?.status;
        if (status === 404 || error.code === 'ERR_NETWORK' || !error.response) {
            return 'El servicio de instituciones aún no está disponible. Podrás gestionarlas cuando el backend exponga el endpoint.';
        }
        const data = error.response?.data as { message?: string } | undefined;
        return data?.message ?? 'Ocurrió un error al comunicarse con el servicio.';
    }
    if (error instanceof Error) return error.message;
    return 'Ocurrió un error al comunicarse con el servicio.';
}

type Vista = 'lista' | 'form';

function GestionInstituciones() {
    const [vista, setVista] = useState<Vista>('lista');
    const [enEdicion, setEnEdicion] = useState<Institucion | null>(null);
    const [errorForm, setErrorForm] = useState('');
    const [institucionToDelete, setInstitucionToDelete] = useState<Institucion | null>(null);

    const listaQuery = useInstitucionesList();
    const crear = useCrearInstitucion();
    const actualizar = useActualizarInstitucion();
    const eliminar = useEliminarInstitucion();

    const instituciones = listaQuery.data ?? [];
    const guardando = crear.isPending || actualizar.isPending;

    const abrirNueva = () => {
        setEnEdicion(null);
        setErrorForm('');
        setVista('form');
    };

    const abrirEdicion = (inst: Institucion) => {
        setEnEdicion(inst);
        setErrorForm('');
        setVista('form');
    };

    const cancelar = () => {
        setVista('lista');
        setEnEdicion(null);
        setErrorForm('');
    };

    const guardar = async (form: InstitucionFormValues) => {
        setErrorForm('');
        try {
            if (enEdicion && enEdicion.id) {
                await actualizar.mutateAsync({ id: enEdicion.id, form });
            } else {
                await crear.mutateAsync(form);
            }
            setVista('lista');
            setEnEdicion(null);
        } catch (err) {
            setErrorForm(mensajeError(err));
        }
    };

    const borrar = (inst: Institucion) => {
        if (!inst.id) return;
        setInstitucionToDelete(inst);
    };

    const confirmarBorrado = async () => {
        if (!institucionToDelete?.id) return;
        try {
            await eliminar.mutateAsync(institucionToDelete.id);
            setInstitucionToDelete(null);
        } catch (err) {
            setErrorForm(mensajeError(err));
        }
    };

    return (
        <section className="mx-auto max-w-5xl">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold text-slate-800">Instituciones</h2>
                    <p className="mt-1 text-slate-600">
                        Gestión de instituciones educativas con geolocalización y radio de
                        influencia.
                    </p>
                </div>
                {vista === 'lista' && (
                    <Button onClick={abrirNueva}>+ Nueva institución</Button>
                )}
            </div>

            {listaQuery.isError && vista === 'lista' && (
                <div
                    role="status"
                    className="mt-4 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                >
                    {mensajeError(listaQuery.error)}
                </div>
            )}

            {eliminar.isError && (
                <div
                    role="alert"
                    className="mt-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                    {mensajeError(eliminar.error)}
                </div>
            )}

            {vista === 'form' ? (
                <Card className="mt-6 p-6">
                    {errorForm && (
                        <div
                            role="alert"
                            className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
                        >
                            {errorForm}
                        </div>
                    )}
                    <InstitucionFormulario
                        institucion={enEdicion}
                        onSubmit={guardar}
                        onCancel={cancelar}
                        guardando={guardando}
                    />
                </Card>
            ) : (
                <Card className="mt-6 overflow-hidden">
                    {listaQuery.isLoading ? (
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
                                        <td className="px-4 py-3 font-medium text-slate-800">
                                            {inst.nombre}
                                        </td>
                                        <td className="px-4 py-3 capitalize text-slate-600">
                                            {inst.categoria || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {inst.latitud !== null && inst.longitud !== null
                                                ? `${inst.latitud.toFixed(4)}, ${inst.longitud.toFixed(4)}`
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{inst.radio_metros}</td>
                                        <td className="px-4 py-3 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-cyan-700 hover:bg-cyan-50"
                                                onClick={() => abrirEdicion(inst)}
                                            >
                                                Editar
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="ml-1 text-red-600 hover:bg-red-50"
                                                onClick={() => borrar(inst)}
                                            >
                                                Eliminar
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </Card>
            )}
            <ConfirmDeleteModal
                isOpen={!!institucionToDelete}
                onClose={() => setInstitucionToDelete(null)}
                onConfirm={confirmarBorrado}
                title="Eliminar institucion"
                message={`Seguro que deseas eliminar ${institucionToDelete?.nombre || "esta institucion"}? Esta accion no se puede deshacer.`}
                waitSeconds={4}
            />
        </section>
    );
}

/**
 * Pantalla de gestión de instituciones. Monta el `QueryClientProvider` de la
 * feature para ser autosuficiente e independiente del árbol del dashboard del
 * colegio.
 */
export default function GdsInstitucionesAdmin() {
    return (
        <QueryClientProvider client={gdsQueryClient}>
            <GestionInstituciones />
        </QueryClientProvider>
    );
}
