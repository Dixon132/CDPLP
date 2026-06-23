// Sección explicativa del panel principal: cómo la IA analiza las dimensiones
// de riesgo emocional. Es contenido informativo (no consume red) que traduce a
// lenguaje entendible la lógica real del motor: el Servicio_IA detecta emociones
// por publicación y las agrega en señales que se mapean a 8 dimensiones de
// riesgo COLECTIVO (nunca diagnóstico individual).

const DIMENSIONES = [
    {
        nombre: 'Estrés académico',
        color: '#ef4444',
        detecta: 'Carga y presión en torno a exámenes, tareas y plazos.',
        pistas: 'Alta intensidad emocional acompañada de un tono negativo.',
    },
    {
        nombre: 'Ansiedad colectiva',
        color: '#f59e0b',
        detecta: 'Nerviosismo e incertidumbre compartida en la comunidad.',
        pistas: 'Predominio de emociones de miedo y sorpresa.',
    },
    {
        nombre: 'Conflicto social',
        color: '#a855f7',
        detecta: 'Fricción, discusiones y enfrentamientos entre el grupo.',
        pistas: 'Tensión derivada de enojo y desagrado en las conversaciones.',
    },
    {
        nombre: 'Bullying',
        color: '#dc2626',
        detecta: 'Hostigamiento dirigido y persistente hacia otros.',
        pistas: 'Tono muy negativo y agresivo a la vez (negatividad fuerte combinada con tensión).',
    },
    {
        nombre: 'Aislamiento',
        color: '#14b8a6',
        detecta: 'Desconexión, poca cohesión y baja participación.',
        pistas: 'Discurso disperso o fragmentado junto a un tono negativo.',
    },
    {
        nombre: 'Agotamiento',
        color: '#0ea5e9',
        detecta: 'Cansancio emocional sostenido en el tiempo.',
        pistas: 'Negatividad persistente y ausencia de entusiasmo.',
    },
    {
        nombre: 'Violencia verbal',
        color: '#db2777',
        detecta: 'Agresividad explícita y mensajes hostiles.',
        pistas: 'Enojo con alta activación (mensajes muy intensos).',
    },
    {
        nombre: 'Desmotivación',
        color: '#64748b',
        detecta: 'Desinterés, desánimo y apatía general.',
        pistas: 'Falta de entusiasmo acompañada de un tono negativo.',
    },
];

export default function ComoAnalizaIA() {
    return (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-slate-800">¿Cómo analiza la IA el riesgo emocional?</h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                Por cada semana, el sistema genera contenido sintético de la comunidad (publicaciones,
                comentarios e imágenes), lo <strong>anonimiza</strong> y descarta el ruido con un{' '}
                <strong>filtro de relevancia</strong>. El contenido útil pasa por un{' '}
                <strong>modelo de emociones</strong> que reconoce 7 estados —enojo, alegría, tristeza, miedo,
                sorpresa, desagrado y neutralidad—. A partir de la mezcla de esas emociones en{' '}
                <strong>toda la comunidad</strong>, calcula señales (negatividad, tensión, incertidumbre,
                entusiasmo y dispersión del discurso) y las traduce a <strong>8 dimensiones de riesgo</strong>{' '}
                en una escala de 0 a 100. Una capa de aprendizaje automático calibra el puntaje y genera una
                explicación con su evidencia.
            </p>
            <p className="mt-2 max-w-3xl text-xs text-slate-400">
                Importante: el análisis es siempre <strong>colectivo</strong> (de la comunidad), nunca un
                diagnóstico de personas individuales.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {DIMENSIONES.map((d) => (
                    <div
                        key={d.nombre}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                        style={{ borderTop: `3px solid ${d.color}` }}
                    >
                        <p className="text-sm font-semibold" style={{ color: d.color }}>
                            {d.nombre}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">{d.detecta}</p>
                        <p className="mt-2 text-[11px] text-slate-400">
                            <span className="font-semibold uppercase tracking-wide">Pistas:</span> {d.pistas}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}
