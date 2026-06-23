// Pantalla principal de la Plataforma_GDS (Req. 21), en TypeScript.
//
// Compone la visión general del sistema (21.1), los indicadores globales y sus
// históricos con Recharts (21.5), el resumen de análisis con sus estados de
// ejecución (21.3), un slider automático de instituciones (21.2) y el progreso
// en vivo por WebSockets (21.4), con transiciones suaves de Framer Motion.
// Aplica un bloqueo defensivo si la sesión no es válida/autorizada (21.6),
// complementando al guard de ruta `RequireGdsAuth`.
//
// Datos vía **TanStack Query** (`useResumenPanel`/`useInstituciones`) contra el
// backend autónomo (`VITE_GDS_API_URL`). Todas las llamadas DEGRADAN CON
// ELEGANCIA: si los endpoints o el WS Hub aún no están disponibles (tareas
// 21.x/24.x del backend), la pantalla se renderiza con estados informativos sin
// romperse. El `QueryClientProvider` se monta aquí para que la pantalla sea
// autosuficiente e independiente del árbol del dashboard del colegio.
import { useMemo } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { motion } from 'framer-motion';

import { gdsQueryClient } from '../lib/queryClient';
import {
    useResumenPanel,
    useInstituciones,
    RESUMEN_PANEL_VACIO,
} from '../hooks/usePanelData';
import { resumirEstados, ESTADO_META } from '../api/dashboard.js';
import { useProgresoEnVivo } from '../hooks/useProgresoEnVivo.js';
import { parseToken } from '../../../utils/parsejwt';
import { isSesionValida, type JwtPayload } from '../guards/session';
import IndicadoresGlobales from '../components/IndicadoresGlobales.jsx';
import InstitucionesSlider from '../components/InstitucionesSlider.jsx';
import EstadosEjecucion from '../components/EstadosEjecucion.jsx';
import ComoAnalizaIA from '../components/ComoAnalizaIA.jsx';

function BloqueoNoAutorizado() {
    return (
        <section className="mx-auto max-w-xl rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
            <h2 className="text-lg font-semibold text-amber-800">Acceso bloqueado</h2>
            <p className="mt-2 text-sm text-amber-700">
                Tu sesión no es válida o no cuenta con autorización para ver el panel
                principal de la Plataforma GDS.
            </p>
        </section>
    );
}

interface TarjetaResumenProps {
    titulo: string;
    valor: number | string;
    color?: string;
}

function TarjetaResumen({ titulo, valor, color }: TarjetaResumenProps) {
    return (
        <motion.article
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <p className="text-xs uppercase tracking-wide text-slate-400">{titulo}</p>
            <p className="mt-1 text-2xl font-semibold" style={color ? { color } : undefined}>
                {valor}
            </p>
        </motion.article>
    );
}

/**
 * Contenido del panel principal. Vive bajo el `QueryClientProvider` montado por
 * `GdsHome`, por lo que puede usar los hooks de datos de TanStack Query.
 */
function PanelPrincipal() {
    // Bloqueo defensivo (Req. 21.6): valida la sesión también a nivel de panel.
    const autorizado = useMemo(() => {
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) return false;
        return isSesionValida(parseToken(token) as JwtPayload | null, Date.now());
    }, []);

    const resumenQuery = useResumenPanel({ habilitado: autorizado });
    const institucionesQuery = useInstituciones({ habilitado: autorizado });
    const { estadoConexion, progresoPorAnalisis } = useProgresoEnVivo({ habilitado: autorizado });

    if (!autorizado) {
        return <BloqueoNoAutorizado />;
    }

    const panel = resumenQuery.data ?? RESUMEN_PANEL_VACIO;
    const instituciones = institucionesQuery.data ?? [];
    // El slider (componente JS) tipa `id` como `string | undefined` vía JSDoc;
    // normalizamos `null → undefined` para encajar con su contrato sin casts.
    const institucionesSlider = instituciones.map((inst) => ({
        ...inst,
        id: inst.id ?? undefined,
    }));
    const cargando = resumenQuery.isLoading || institucionesQuery.isLoading;

    const conteos = resumirEstados(panel.analisis) as Record<string, number>;
    const totalAnalisis = panel.analisis.length;

    return (
        <motion.div
            className="mx-auto max-w-6xl space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            {/* Información general y descripción del sistema (Req. 21.1) */}
            <section className="flex items-start gap-4">
                <img
                    src="/img/logo.png"
                    alt="Plataforma GDS"
                    className="h-14 w-14 flex-none rounded-lg object-contain"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                    }}
                />
                <div>
                    <h2 className="text-2xl font-semibold text-slate-800">Panel de la Plataforma GDS</h2>
                    <p className="mt-2 max-w-3xl text-slate-600">
                        Gemelo Digital Social de Comunidades Educativas. Esta plataforma simula y
                        analiza la evolución de tendencias de riesgo emocional a nivel colectivo,
                        de forma longitudinal y anonimizada, sobre comunidades digitales asociadas
                        a cada institución. Aquí tienes una visión general del estado del sistema.
                    </p>
                </div>
            </section>

            {/* Resumen de análisis por estado (Req. 21.1, 21.3) */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <TarjetaResumen titulo="Análisis totales" valor={totalAnalisis} />
                <TarjetaResumen
                    titulo="En curso"
                    valor={(conteos.EN_PROCESO ?? 0) + (conteos.EN_ACELERACION ?? 0)}
                    color={ESTADO_META.EN_PROCESO.color}
                />
                <TarjetaResumen
                    titulo="Completados"
                    valor={conteos.COMPLETADO ?? 0}
                    color={ESTADO_META.COMPLETADO.color}
                />
                <TarjetaResumen
                    titulo="Fallidos"
                    valor={conteos.FALLIDO ?? 0}
                    color={ESTADO_META.FALLIDO.color}
                />
            </section>

            {cargando && (
                <p className="text-sm text-slate-400" role="status">
                    Cargando datos del panel…
                </p>
            )}

            {/* Slider automático de instituciones (Req. 21.2) */}
            <InstitucionesSlider instituciones={institucionesSlider} />

            {/* Explicación de cómo la IA analiza las dimensiones de riesgo */}
            <ComoAnalizaIA />

            {/* Indicadores globales e históricos con Recharts (Req. 21.1, 21.5) */}
            <IndicadoresGlobales
                indicadores={panel.indicadores}
                historicos={panel.historicos}
                disponibleIndicadores={panel.disponible.indicadores}
                disponibleHistoricos={panel.disponible.historicos}
            />

            {/* Estados de ejecución + progreso en vivo por WS (Req. 21.3, 21.4) */}
            <EstadosEjecucion
                analisis={panel.analisis}
                progresoPorAnalisis={progresoPorAnalisis}
                estadoConexion={estadoConexion}
                disponible={panel.disponible.analisis}
            />
        </motion.div>
    );
}

/**
 * Pantalla principal. Monta el `QueryClientProvider` de la feature para que el
 * panel sea autosuficiente y luego renderiza su contenido.
 */
export default function GdsHome() {
    return (
        <QueryClientProvider client={gdsQueryClient}>
            <PanelPrincipal />
        </QueryClientProvider>
    );
}
