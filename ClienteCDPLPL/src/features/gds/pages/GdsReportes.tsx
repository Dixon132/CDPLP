// Vista de reportes y exportación de la Plataforma_GDS (Req. 19), en TypeScript,
// dentro de la migración del feature `gds` a TS + Shadcn/UI + TanStack Query.
//
// Permite elegir un `Analisis`, listar sus `Reporte` por horizonte
// (semanal/mensual/trimestral/semestral/final), generar un reporte de un
// horizonte y exportar cada reporte en un formato descargable (PDF/Excel),
// consumiendo el backend autónomo (`ServidorGDS/`, módulo `reports`, tareas
// 23.1/23.2) vía `VITE_GDS_API_URL`. La vista DEGRADA CON ELEGANCIA: si el
// endpoint aún no está disponible, muestra un aviso informativo en vez de
// romperse.
import { useMemo, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { gdsQueryClient } from '../lib/queryClient';
import {
    useAnalisisDisponibles,
    useReportesList,
    useGenerarReporte,
    useExportarReporte,
} from '../hooks/useReportes';
import {
    HORIZONTES,
    HORIZONTE_META,
    agruparPorHorizonte,
    nombreArchivoReporte,
    type HorizonteReporte,
    type Reporte,
    type FormatoExportacion,
} from '../api/reportesApi';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Select } from '../components/ui/select';

function mensajeError(error: unknown): string {
    if (error instanceof AxiosError) {
        const status = error.response?.status;
        if (status === 404 || error.code === 'ERR_NETWORK' || !error.response) {
            return 'El servicio de reportes aún no está disponible. Podrás consultarlos y exportarlos cuando el backend exponga el endpoint.';
        }
        const data = error.response?.data as { message?: string } | undefined;
        return data?.message ?? 'Ocurrió un error al comunicarse con el servicio.';
    }
    if (error instanceof Error) return error.message;
    return 'Ocurrió un error al comunicarse con el servicio.';
}

/**
 * Dispara la descarga de un blob en el navegador creando un enlace temporal.
 * Aislado en una función para mantener la lógica pura (nombre de archivo) en el
 * cliente API y probable por unidad.
 */
function descargarBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = filename;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
}

type FiltroHorizonte = 'todos' | HorizonteReporte;

function VistaReportes() {
    const [analisisId, setAnalisisId] = useState('');
    const [filtro, setFiltro] = useState<FiltroHorizonte>('todos');
    const [horizonteGenerar, setHorizonteGenerar] = useState<HorizonteReporte>('semanal');
    const [exportandoKey, setExportandoKey] = useState<string | null>(null);
    const [aviso, setAviso] = useState('');

    const analisisQuery = useAnalisisDisponibles();
    const analisisList = analisisQuery.data ?? [];

    const reportesQuery = useReportesList(analisisId);
    const reportes = reportesQuery.data ?? [];

    const generar = useGenerarReporte(analisisId);
    const exportar = useExportarReporte();

    const grupos = useMemo(() => agruparPorHorizonte(reportes), [reportes]);
    const horizontesVisibles =
        filtro === 'todos' ? HORIZONTES : HORIZONTES.filter((h) => h === filtro);
    const hayReportes = reportes.length > 0;

    const onGenerar = async () => {
        if (!analisisId) return;
        setAviso('');
        try {
            await generar.mutateAsync({ horizonte: horizonteGenerar });
        } catch (err) {
            setAviso(mensajeError(err));
        }
    };

    const onExportar = async (reporte: Reporte, formato: FormatoExportacion) => {
        if (!reporte.id) return;
        const key = `${reporte.id}:${formato}`;
        setExportandoKey(key);
        setAviso('');
        try {
            const { blob, filename } = await exportar.mutateAsync({ id: reporte.id, formato });
            descargarBlob(blob, filename || nombreArchivoReporte(reporte, formato));
        } catch (err) {
            setAviso(mensajeError(err));
        } finally {
            setExportandoKey(null);
        }
    };

    return (
        <section className="mx-auto max-w-5xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-semibold text-slate-800">Reportes</h2>
                    <p className="mt-1 text-slate-600">
                        Reportes por horizonte temporal con explicaciones y evidencias. Genera y
                        exporta cada reporte en un formato descargable.
                    </p>
                </div>
            </div>

            <Card className="mt-6 p-4">
                <div className="flex flex-wrap items-end gap-4">
                    <label className="flex flex-col gap-1 text-sm text-slate-600">
                        Análisis
                        <Select
                            aria-label="Análisis"
                            value={analisisId}
                            onChange={(e) => {
                                setAnalisisId(e.target.value);
                                setAviso('');
                            }}
                            className="min-w-56"
                        >
                            <option value="">Selecciona un análisis…</option>
                            {analisisList.map((a) => (
                                <option key={a.id ?? a.nombre} value={a.id ?? ''}>
                                    {a.nombre || a.id}
                                </option>
                            ))}
                        </Select>
                    </label>

                    <label className="flex flex-col gap-1 text-sm text-slate-600">
                        Filtrar por horizonte
                        <Select
                            aria-label="Filtrar por horizonte"
                            value={filtro}
                            onChange={(e) => setFiltro(e.target.value as FiltroHorizonte)}
                            className="min-w-44"
                        >
                            <option value="todos">Todos</option>
                            {HORIZONTES.map((h) => (
                                <option key={h} value={h}>
                                    {HORIZONTE_META[h].label}
                                </option>
                            ))}
                        </Select>
                    </label>

                    <div className="ml-auto flex items-end gap-2">
                        <label className="flex flex-col gap-1 text-sm text-slate-600">
                            Generar
                            <Select
                                aria-label="Horizonte a generar"
                                value={horizonteGenerar}
                                onChange={(e) =>
                                    setHorizonteGenerar(e.target.value as HorizonteReporte)
                                }
                                className="min-w-40"
                                disabled={!analisisId}
                            >
                                {HORIZONTES.map((h) => (
                                    <option key={h} value={h}>
                                        {HORIZONTE_META[h].label}
                                    </option>
                                ))}
                            </Select>
                        </label>
                        <Button
                            onClick={onGenerar}
                            disabled={!analisisId || generar.isPending}
                        >
                            {generar.isPending ? 'Generando…' : 'Generar reporte'}
                        </Button>
                    </div>
                </div>
            </Card>

            {analisisQuery.isError && (
                <div
                    role="status"
                    className="mt-4 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                >
                    {mensajeError(analisisQuery.error)}
                </div>
            )}

            {aviso && (
                <div
                    role="alert"
                    className="mt-4 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                >
                    {aviso}
                </div>
            )}

            {reportesQuery.isError && analisisId && (
                <div
                    role="status"
                    className="mt-4 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                >
                    {mensajeError(reportesQuery.error)}
                </div>
            )}

            {!analisisId ? (
                <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
                    Selecciona un análisis para ver sus reportes por horizonte.
                </div>
            ) : reportesQuery.isLoading ? (
                <p className="mt-6 text-sm text-slate-500">Cargando reportes…</p>
            ) : !hayReportes ? (
                <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
                    No hay reportes disponibles todavía. Genera uno o espera a que se completen los
                    periodos de cada horizonte.
                </div>
            ) : (
                <div className="mt-6 space-y-6">
                    {horizontesVisibles.map((h) => {
                        const lista = grupos[h];
                        const meta = HORIZONTE_META[h];
                        return (
                            <Card key={h} className="overflow-hidden">
                                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                                    <span
                                        className="inline-block h-2.5 w-2.5 rounded-full"
                                        style={{ backgroundColor: meta.color }}
                                        aria-hidden="true"
                                    />
                                    <h3 className="text-sm font-semibold text-slate-700">
                                        {meta.label}
                                    </h3>
                                    <span className="ml-auto text-xs text-slate-500">
                                        {lista.length} {lista.length === 1 ? 'reporte' : 'reportes'}
                                    </span>
                                </div>
                                {lista.length === 0 ? (
                                    <p className="px-4 py-3 text-sm text-slate-400">
                                        Sin reportes en este horizonte.
                                    </p>
                                ) : (
                                    <table className="w-full text-left text-sm">
                                        <thead className="text-slate-600">
                                            <tr>
                                                <th className="px-4 py-2 font-medium">Título</th>
                                                <th className="px-4 py-2 font-medium">Periodo</th>
                                                <th className="px-4 py-2 font-medium">Institución</th>
                                                <th className="px-4 py-2 font-medium text-right">
                                                    Exportar
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {lista.map((r) => (
                                                <tr
                                                    key={r.id ?? `${h}-${r.titulo}`}
                                                    className="hover:bg-slate-50"
                                                >
                                                    <td className="px-4 py-2 font-medium text-slate-800">
                                                        {r.titulo}
                                                    </td>
                                                    <td className="px-4 py-2 text-slate-600">
                                                        {r.periodo || '—'}
                                                    </td>
                                                    <td className="px-4 py-2 text-slate-600">
                                                        {r.institucionNombre || 'Todas'}
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => onExportar(r, 'pdf')}
                                                            disabled={
                                                                !r.id ||
                                                                exportandoKey === `${r.id}:pdf`
                                                            }
                                                        >
                                                            {exportandoKey === `${r.id}:pdf`
                                                                ? 'PDF…'
                                                                : 'PDF'}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="ml-1"
                                                            onClick={() => onExportar(r, 'excel')}
                                                            disabled={
                                                                !r.id ||
                                                                exportandoKey === `${r.id}:excel`
                                                            }
                                                        >
                                                            {exportandoKey === `${r.id}:excel`
                                                                ? 'Excel…'
                                                                : 'Excel'}
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

/**
 * Pantalla de reportes. Monta el `QueryClientProvider` de la feature para ser
 * autosuficiente e independiente del árbol del dashboard del colegio.
 */
export default function GdsReportes() {
    return (
        <QueryClientProvider client={gdsQueryClient}>
            <VistaReportes />
        </QueryClientProvider>
    );
}
