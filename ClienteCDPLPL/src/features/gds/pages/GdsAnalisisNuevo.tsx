// Pantalla de creación de un `Analisis` de la Plataforma_GDS (Req. 8), en
// TypeScript, dentro de la migración del feature `gds` a TS + Shadcn/UI.
//
// Carga las instituciones registradas (tarea 21.1) y los escenarios de la
// `Biblioteca_Escenarios` (Motor_Escenarios, tarea 21.2) mediante **TanStack
// Query** (`VITE_GDS_API_URL`), presenta el `AnalisisFormulario`
// (React Hook Form + Zod) y al enviar crea el análisis contra `/api/gds/analisis`.
//
// La vista DEGRADA CON ELEGANCIA: si faltan instituciones o la biblioteca aún no
// está disponible, lo informa sin romperse; si el alta falla, muestra un mensaje
// claro; al crear con éxito, anuncia el inicio del ciclo (semana 1) y vuelve al
// panel (Req. 8.5).
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { gdsQueryClient } from '../lib/queryClient';
import { useInstitucionesList } from '../hooks/useInstitucionesAdmin';
import { useEscenarios, useCrearAnalisis } from '../hooks/useAnalisisNuevo';
import type { AnalisisFormValues } from '../api/analisisApi';
import { AnalisisFormulario } from '../components/AnalisisFormulario';
import { Card } from '../components/ui/card';

function mensajeError(error: unknown): string {
    if (error instanceof AxiosError) {
        const status = error.response?.status;
        if (status === 404 || error.code === 'ERR_NETWORK' || !error.response) {
            return 'El servicio de análisis aún no está disponible. Podrás crear análisis cuando el backend exponga el endpoint.';
        }
        const data = error.response?.data as { message?: string } | undefined;
        return data?.message ?? 'Ocurrió un error al comunicarse con el servicio.';
    }
    if (error instanceof Error) return error.message;
    return 'Ocurrió un error al comunicarse con el servicio.';
}

function CrearAnalisis() {
    const navigate = useNavigate();
    const [errorForm, setErrorForm] = useState('');
    const [exito, setExito] = useState('');

    const institucionesQuery = useInstitucionesList();
    const escenariosQuery = useEscenarios();
    const crear = useCrearAnalisis();

    const instituciones = institucionesQuery.data ?? [];
    const escenarios = escenariosQuery.data?.escenarios ?? [];
    const escenariosDisponibles = escenariosQuery.data?.disponible ?? true;
    const cargando = institucionesQuery.isLoading || escenariosQuery.isLoading;

    const volver = () => navigate('/gds');

    const guardar = async (form: AnalisisFormValues) => {
        setErrorForm('');
        setExito('');
        try {
            await crear.mutateAsync(form);
            setExito(
                'Análisis creado correctamente. Se inició el ciclo inicial de simulación (semana 1).',
            );
        } catch (err) {
            setErrorForm(mensajeError(err));
        }
    };

    return (
        <section className="mx-auto max-w-3xl">
            <div>
                <h2 className="text-2xl font-semibold text-slate-800">Crear análisis</h2>
                <p className="mt-1 text-slate-600">
                    Configura un estudio longitudinal: instituciones, escenario y duración.
                </p>
            </div>

            {institucionesQuery.isError && (
                <div
                    role="status"
                    className="mt-4 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                >
                    No se pudieron cargar las instituciones. Verifica que existan y que el servicio
                    esté disponible.
                </div>
            )}

            {exito && (
                <div
                    role="status"
                    className="mt-4 rounded border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
                >
                    {exito}
                </div>
            )}

            <Card className="mt-6 p-6">
                {errorForm && (
                    <div
                        role="alert"
                        className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                        {errorForm}
                    </div>
                )}
                {cargando ? (
                    <p className="text-sm text-slate-500">Cargando datos del formulario…</p>
                ) : (
                    <AnalisisFormulario
                        instituciones={instituciones}
                        escenarios={escenarios}
                        escenariosDisponibles={escenariosDisponibles}
                        onSubmit={guardar}
                        onCancel={volver}
                        guardando={crear.isPending}
                    />
                )}
            </Card>
        </section>
    );
}

/**
 * Pantalla de creación de análisis. Monta el `QueryClientProvider` de la feature
 * para ser autosuficiente e independiente del árbol del dashboard del colegio.
 */
export default function GdsAnalisisNuevo() {
    return (
        <QueryClientProvider client={gdsQueryClient}>
            <CrearAnalisis />
        </QueryClientProvider>
    );
}
