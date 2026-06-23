// Vista de trazabilidad de la Plataforma_GDS (Req. 22, 33.5), en TypeScript,
// dentro de la migración del feature `gds` a TS + Shadcn/UI + TanStack Query.
//
// Permite recorrer la evolución completa de un `Analisis`:
//  - Navegar semanas/meses/resultados y abrir su soporte (Req. 22.1).
//  - Ver la evolución temporal de cada dimensión del `Indice_Riesgo` por
//    `Comunidad_Digital` con Recharts (Req. 22.2).
//  - Al seleccionar un resultado/dimensión, mostrar explicación + evidencia que
//    lo sustenta, con la cadena de trazabilidad semana → institución → evidencia
//    (Req. 22.3, 22.5).
//  - Comparar la evolución de varias instituciones (gráfico) y por
//    `Zona_Geografica` (mapa Leaflet) dentro del mismo análisis (Req. 22.4, 33.5).
//  - Mostrar una vista parcial cuando la explicación o la evidencia no cargan
//    (Req. 22.6).
//  - Presentar siempre seudónimos anonimizados, nunca identificadores crudos
//    (Req. 23.5).
//
// Consume el backend autónomo (`ServidorGDS/`, módulos `audit`/`analysis`) vía
// `VITE_GDS_API_URL` con TanStack Query. La vista DEGRADA CON ELEGANCIA: ante la
// ausencia de datos muestra avisos informativos en vez de romperse.
import { useEffect, useMemo, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

import { gdsQueryClient } from '../lib/queryClient';
import {
    useAnalisisTrazabilidad,
    useComunidades,
    useEvolucionDimensiones,
    useResultadosSemanales,
    useSoporteResultado,
    useComparacionInstituciones,
    useCronologia,
} from '../hooks/useTrazabilidad';
import {
    agruparSemanasPorMes,
    dimensionMeta,
    mostrarSeudonimo,
    type Seleccion,
} from '../api/trazabilidadApi';
import { Card } from '../components/ui/card';
import { Select } from '../components/ui/select';
import { TrazabilidadEvolucionChart } from '../components/TrazabilidadEvolucionChart';
import { TrazabilidadComparacionChart } from '../components/TrazabilidadComparacionChart';
import { TrazabilidadZonaMapa } from '../components/TrazabilidadZonaMapa';
import { TrazabilidadSoportePanel } from '../components/TrazabilidadSoportePanel';
import { CronologiaTimeline } from '../components/CronologiaTimeline';
import PanelModoEjecucion from '../components/PanelModoEjecucion';
import PanelInfoAnalisis from '../components/PanelInfoAnalisis';

function Tarjeta({
    titulo,
    children,
    etiqueta,
}: {
    titulo?: string;
    children: React.ReactNode;
    etiqueta?: string;
}) {
    return (
        <Card className="p-4" aria-label={etiqueta ?? titulo}>
            {titulo && <h3 className="mb-3 text-sm font-semibold text-slate-700">{titulo}</h3>}
            {children}
        </Card>
    );
}

function VistaTrazabilidad() {
    const [analisisId, setAnalisisId] = useState('');
    const [institucionId, setInstitucionId] = useState('');
    const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
    const [comparar, setComparar] = useState(false);
    const [dimensionComparacion, setDimensionComparacion] = useState('');

    // 1. Análisis disponibles (degrada a []).
    const analisisQuery = useAnalisisTrazabilidad();
    const analisis = useMemo(() => analisisQuery.data ?? [], [analisisQuery.data]);

    // 2. Comunidades (instituciones) del análisis elegido.
    const comunidadesQuery = useComunidades(analisisId);
    const comunidades = useMemo(() => comunidadesQuery.data ?? [], [comunidadesQuery.data]);

    // 3. Evolución por dimensión + resultados de la institución elegida.
    const evolucionQuery = useEvolucionDimensiones(analisisId, institucionId);
    const series = useMemo(() => evolucionQuery.data ?? [], [evolucionQuery.data]);
    const resultadosQuery = useResultadosSemanales(analisisId, institucionId);
    const resultados = useMemo(() => resultadosQuery.data ?? [], [resultadosQuery.data]);

    // 3.b Cronología de contenido por semana de la institución elegida.
    const cronologiaQuery = useCronologia(analisisId, institucionId);
    const cronologia = useMemo(() => cronologiaQuery.data ?? [], [cronologiaQuery.data]);

    // 4. Soporte (explicación + evidencia) del resultado seleccionado.
    const soporteQuery = useSoporteResultado(seleccion);

    // 5. Comparación por institución (gráfico) + por zona (mapa).
    const comparacionQuery = useComparacionInstituciones(
        analisisId,
        comunidades,
        dimensionComparacion,
        { habilitado: comparar },
    );

    // Selecciona el primer análisis disponible cuando llega la lista.
    useEffect(() => {
        if (!analisisId && analisis.length > 0 && analisis[0].id) {
            setAnalisisId(String(analisis[0].id));
        }
    }, [analisis, analisisId]);

    // Al cambiar de análisis o de comunidades, fija la primera institución.
    useEffect(() => {
        setInstitucionId(comunidades.length > 0 ? comunidades[0].institucionId : '');
        setSeleccion(null);
    }, [comunidades]);

    // Mantiene una dimensión de comparación válida según la evolución cargada.
    useEffect(() => {
        if (series.length > 0) {
            setDimensionComparacion((d) => d || series[0].dimension);
        }
    }, [series]);

    const meses = useMemo(
        () => agruparSemanasPorMes(resultados.map((r) => r.semana)),
        [resultados],
    );

    const dimLabelComparacion = dimensionComparacion
        ? dimensionMeta(dimensionComparacion).label
        : '';

    const backendCaido =
        analisisQuery.isError || (analisis.length === 0 && !analisisQuery.isLoading);

    return (
        <section className="mx-auto max-w-6xl space-y-6">
            <div>
                <h2 className="text-2xl font-semibold text-slate-800">Trazabilidad del análisis</h2>
                <p className="mt-1 text-slate-600">
                    Recorre semanas y meses, revisa la evolución por dimensión del índice de riesgo y
                    abre la explicación y evidencia que sustenta cada conclusión. Compara la evolución
                    entre instituciones y por zona geográfica.
                </p>
            </div>

            {backendCaido && (
                <div
                    role="status"
                    className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                >
                    El servicio de análisis aún no está disponible. La vista se completará cuando el
                    backend exponga los datos de trazabilidad.
                </div>
            )}

            {/* Selectores de análisis e institución */}
            <Card className="p-4">
                <div className="flex flex-wrap items-end gap-4">
                    <label className="flex flex-col gap-1 text-sm text-slate-600">
                        Análisis
                        <Select
                            aria-label="Análisis"
                            value={analisisId}
                            onChange={(e) => setAnalisisId(e.target.value)}
                            className="min-w-56"
                        >
                            {analisis.length === 0 && <option value="">Sin análisis disponibles</option>}
                            {analisis.map((a) => (
                                <option key={a.id ?? a.nombre} value={a.id ?? ''}>
                                    {a.nombre}
                                </option>
                            ))}
                        </Select>
                    </label>

                    <label className="flex flex-col gap-1 text-sm text-slate-600">
                        Institución (comunidad)
                        <Select
                            aria-label="Institución (comunidad)"
                            value={institucionId}
                            onChange={(e) => setInstitucionId(e.target.value)}
                            className="min-w-56"
                        >
                            {comunidades.length === 0 && <option value="">Sin comunidades</option>}
                            {comunidades.map((c) => (
                                <option key={c.institucionId} value={c.institucionId}>
                                    {c.institucionNombre || mostrarSeudonimo(c.institucionId)}
                                </option>
                            ))}
                        </Select>
                    </label>

                    <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                            type="checkbox"
                            checked={comparar}
                            onChange={(e) => setComparar(e.target.checked)}
                        />
                        Comparar instituciones / zonas
                    </label>
                </div>
            </Card>

            {/* Control de ejecución / avance semanal (Req. 32) */}
            {analisisId && (
                <div className="grid gap-4 lg:grid-cols-2">
                    <PanelInfoAnalisis
                        analisisId={analisisId}
                        onEliminado={() => {
                            setAnalisisId('');
                            void analisisQuery.refetch();
                        }}
                    />
                    <PanelModoEjecucion
                        analisis={analisis.find((a) => a.id === analisisId) ?? {}}
                    />
                </div>
            )}

            {/* Evolución por dimensión (Req. 22.2) */}
            <Tarjeta
                titulo="Evolución temporal por dimensión del índice de riesgo"
                etiqueta="Evolución por dimensión"
            >
                <TrazabilidadEvolucionChart series={series} />
                {series.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {series.map((s) => (
                            <button
                                key={s.dimension}
                                type="button"
                                onClick={() =>
                                    setSeleccion({
                                        analisisId,
                                        institucionId,
                                        semana: s.datos[s.datos.length - 1]?.semana ?? 1,
                                        dimension: s.dimension,
                                    })
                                }
                                className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
                                style={{ borderColor: s.color }}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                )}
            </Tarjeta>

            {/* Cronología de contenido por semana (Req. 22, 34) */}
            {institucionId && (
                <Tarjeta
                    titulo="Cronología de contenido por semana"
                    etiqueta="Cronología de contenido"
                >
                    <CronologiaTimeline cronologia={cronologia} />
                </Tarjeta>
            )}

            {/* Comparación entre instituciones / zonas (Req. 22.4, 33.5) */}
            {comparar && (
                <Tarjeta titulo="Comparación entre instituciones y por zona" etiqueta="Comparación">
                    <label className="mb-3 flex items-center gap-2 text-sm text-slate-600">
                        Dimensión
                        <Select
                            aria-label="Dimensión a comparar"
                            value={dimensionComparacion}
                            onChange={(e) => setDimensionComparacion(e.target.value)}
                            className="min-w-44"
                        >
                            {series.length === 0 && <option value="">Sin dimensiones</option>}
                            {series.map((s) => (
                                <option key={s.dimension} value={s.dimension}>
                                    {s.label}
                                </option>
                            ))}
                        </Select>
                    </label>
                    <div className="grid gap-6 lg:grid-cols-2">
                        <div>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Evolución comparada
                            </h4>
                            <TrazabilidadComparacionChart
                                comparacion={
                                    comparacionQuery.data?.porInstitucion ?? { filas: [], series: [] }
                                }
                            />
                        </div>
                        <div>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Comparación por zona geográfica
                            </h4>
                            <TrazabilidadZonaMapa
                                puntos={comparacionQuery.data?.porZona ?? []}
                                dimensionLabel={dimLabelComparacion}
                            />
                        </div>
                    </div>
                </Tarjeta>
            )}

            {/* Navegación de semanas/meses + soporte (Req. 22.1, 22.3) */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Tarjeta titulo="Semanas y meses" etiqueta="Navegación de semanas y meses">
                    {meses.length === 0 ? (
                        <div
                            role="status"
                            className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                        >
                            Aún no hay resultados semanales para navegar. Aparecerán al procesar las
                            semanas del análisis.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {meses.map((m) => (
                                <div key={m.mes}>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Mes {m.mes}
                                    </p>
                                    <div className="mt-1 flex flex-wrap gap-2">
                                        {m.semanas.map((semana) => {
                                            const activo =
                                                seleccion?.semana === semana && !seleccion?.dimension;
                                            return (
                                                <button
                                                    key={semana}
                                                    type="button"
                                                    onClick={() =>
                                                        setSeleccion({ analisisId, institucionId, semana })
                                                    }
                                                    className={`rounded border px-3 py-1 text-sm ${
                                                        activo
                                                            ? 'border-cyan-600 bg-cyan-600 text-white'
                                                            : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    Semana {semana}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Tarjeta>

                <Tarjeta titulo="Explicación y evidencia" etiqueta="Explicación y evidencia">
                    <TrazabilidadSoportePanel
                        seleccion={seleccion}
                        soporte={soporteQuery.data}
                        cargando={soporteQuery.isLoading && Boolean(seleccion)}
                    />
                </Tarjeta>
            </div>

            {institucionId && (
                <p className="text-xs text-slate-400">
                    Comunidad seleccionada:{' '}
                    {comunidades.find((c) => c.institucionId === institucionId)?.institucionNombre ||
                        mostrarSeudonimo(institucionId)}{' '}
                    · Los identificadores se muestran como seudónimos anonimizados.
                </p>
            )}
        </section>
    );
}

/**
 * Pantalla de trazabilidad. Monta el `QueryClientProvider` de la feature para
 * ser autosuficiente e independiente del árbol del dashboard del colegio.
 */
export default function GdsTrazabilidad() {
    return (
        <QueryClientProvider client={gdsQueryClient}>
            <VistaTrazabilidad />
        </QueryClientProvider>
    );
}
