// Vista de reportes de la Plataforma_GDS (Req. 19): elige un análisis y, por
// cada horizonte (semanal/mensual/trimestral/semestral/final), muestra los
// reportes existentes y un botón "Generar" que SOLO se habilita cuando el
// análisis acumuló suficientes semanas para ese horizonte. Cada reporte se
// puede expandir (desglosado por institución) y exportar (PDF/Excel).
import { useMemo, useState, Fragment } from 'react';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { gdsQueryClient } from '../lib/queryClient';
import {
    useAnalisisDisponibles,
    useReportesList,
    useGenerarReporte,
    useExportarReporte,
} from '../hooks/useReportes';
import { getEstadoAnalisis } from '../api/analisisApi';
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
import DetalleReporte from '../components/DetalleReporte';

// Semanas mínimas acumuladas para habilitar la generación de cada horizonte.
const SEMANAS_MINIMAS: Record<HorizonteReporte, number> = {
    semanal: 1,
    mensual: 4,
    trimestral: 12,
    semestral: 24,
    final: 1, // se habilita cuando el análisis está completo (ver lógica abajo)
};

function mensajeError(error: unknown): string {
    if (error instanceof AxiosError) {
        const status = error.response?.status;
        if (status === 404 || error.code === 'ERR_NETWORK' || !error.response) {
            return 'El servicio de reportes aún no está disponible.';
        }
        const data = error.response?.data as { message?: string } | undefined;
        return data?.message ?? 'Ocurrió un error al comunicarse con el servicio.';
    }
    if (error instanceof Error) return error.message;
    return 'Ocurrió un error al comunicarse con el servicio.';
}

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

function VistaReportes() {
    const [analisisId, setAnalisisId] = useState('');
    const [exportandoKey, setExportandoKey] = useState<string | null>(null);
    const [aviso, setAviso] = useState('');
    const [expandido, setExpandido] = useState<string | null>(null);
    const [generandoH, setGenerandoH] = useState<HorizonteReporte | null>(null);

    const analisisQuery = useAnalisisDisponibles();
    const analisisList = analisisQuery.data ?? [];

    // Estado/progreso del análisis para saber qué horizontes habilitar.
    const estadoQuery = useQuery({
        queryKey: ['gds', 'analisis', 'estado', analisisId],
        queryFn: () => getEstadoAnalisis(analisisId),
        enabled: Boolean(analisisId),
    });
    const semanaActual = estadoQuery.data?.semanaActual ?? 0;
    const totalSemanas = estadoQuery.data?.semanasTotales ?? 0;
    const completo = totalSemanas > 0 && semanaActual >= totalSemanas;

    const reportesQuery = useReportesList(analisisId);
    const reportes = reportesQuery.data ?? [];
    const generar = useGenerarReporte(analisisId);
    const exportar = useExportarReporte();

    const grupos = useMemo(() => agruparPorHorizonte(reportes), [reportes]);

    function horizonteDisponible(h: HorizonteReporte): boolean {
        if (h === 'final') return completo;
        return semanaActual >= SEMANAS_MINIMAS[h];
    }

    const onGenerar = async (h: HorizonteReporte) => {
        if (!analisisId) return;
        setAviso('');
        setGenerandoH(h);
        try {
            await generar.mutateAsync({ horizonte: h });
        } catch (err) {
            setAviso(mensajeError(err));
        } finally {
            setGenerandoH(null);
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
            <div>
                <h2 className="text-2xl font-semibold text-slate-800">Reportes por horizonte</h2>
                <p className="mt-1 text-slate-600">
                    Reportes colectivos y explicativos, desglosados por institución. Cada horizonte
                    se habilita cuando el análisis acumula suficientes semanas; a mayor horizonte,
                    más completo y rico es el informe.
                </p>
            </div>

            <Card className="mt-6 p-4">
                <label className="flex flex-col gap-1 text-sm text-slate-600">
                    Análisis
                    <Select
                        aria-label="Análisis"
                        value={analisisId}
                        onChange={(e) => {
                            setAnalisisId(e.target.value);
                            setAviso('');
                            setExpandido(null);
                        }}
                        className="min-w-72"
                    >
                        <option value="">Selecciona un análisis…</option>
                        {analisisList.map((a) => (
                            <option key={a.id ?? a.nombre} value={a.id ?? ''}>
                                {a.nombre || a.id}
                            </option>
                        ))}
                    </Select>
                </label>
                {analisisId && estadoQuery.data && (
                    <p className="mt-2 text-xs text-slate-500">
                        Progreso: semana {semanaActual} de {totalSemanas}
                        {completo ? ' · análisis completo' : ''}
                    </p>
                )}
            </Card>

            {aviso && (
                <div role="alert" className="mt-4 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {aviso}
                </div>
            )}

            {!analisisId ? (
                <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
                    Selecciona un análisis para ver y generar sus reportes por horizonte.
                </div>
            ) : (
                <div className="mt-6 space-y-6">
                    {HORIZONTES.map((h) => {
                        const lista = grupos[h];
                        const meta = HORIZONTE_META[h];
                        const disponible = horizonteDisponible(h);
                        const minSem = SEMANAS_MINIMAS[h];
                        return (
                            <Card key={h} className="overflow-hidden">
                                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                                    <h3 className="text-sm font-semibold text-slate-700">{meta.label}</h3>
                                    <span className="text-xs text-slate-500">
                                        {lista.length} {lista.length === 1 ? 'reporte' : 'reportes'}
                                    </span>
                                    <div className="ml-auto">
                                        {disponible ? (
                                            <Button
                                                size="sm"
                                                onClick={() => onGenerar(h)}
                                                disabled={generandoH !== null}
                                            >
                                                {generandoH === h ? 'Generando…' : 'Generar'}
                                            </Button>
                                        ) : (
                                            <span className="text-xs text-slate-400">
                                                Disponible al llegar a{' '}
                                                {h === 'final' ? `la semana ${totalSemanas}` : `${minSem} semanas`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {lista.length === 0 ? (
                                    <p className="px-4 py-3 text-sm text-slate-400">
                                        Sin reportes en este horizonte.
                                        {disponible ? ' Pulsa "Generar" para crear uno.' : ''}
                                    </p>
                                ) : (
                                    <table className="w-full text-left text-sm">
                                        <thead className="text-slate-600">
                                            <tr>
                                                <th className="px-4 py-2 font-medium">Título</th>
                                                <th className="px-4 py-2 font-medium">Periodo</th>
                                                <th className="px-4 py-2 font-medium text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {lista.map((r) => (
                                                <Fragment key={r.id ?? `${h}-${r.titulo}`}>
                                                    <tr className="hover:bg-slate-50">
                                                        <td className="px-4 py-2 font-medium text-slate-800">{r.titulo}</td>
                                                        <td className="px-4 py-2 text-slate-600">{r.periodo || '—'}</td>
                                                        <td className="px-4 py-2 text-right">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    setExpandido((p) => (p === r.id ? null : r.id))
                                                                }
                                                            >
                                                                {expandido === r.id ? 'Ocultar' : 'Ver'}
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="ml-1"
                                                                onClick={() => onExportar(r, 'pdf')}
                                                                disabled={!r.id || exportandoKey === `${r.id}:pdf`}
                                                            >
                                                                {exportandoKey === `${r.id}:pdf` ? 'PDF…' : 'PDF'}
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="ml-1"
                                                                onClick={() => onExportar(r, 'excel')}
                                                                disabled={!r.id || exportandoKey === `${r.id}:excel`}
                                                            >
                                                                {exportandoKey === `${r.id}:excel` ? 'Excel…' : 'Excel'}
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                    {expandido === r.id && (
                                                        <tr>
                                                            <td colSpan={3} className="p-0">
                                                                <DetalleReporte reporte={r} />
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
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

export default function GdsReportes() {
    return (
        <QueryClientProvider client={gdsQueryClient}>
            <VistaReportes />
        </QueryClientProvider>
    );
}
