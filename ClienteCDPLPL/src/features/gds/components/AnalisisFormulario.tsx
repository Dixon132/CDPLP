// Formulario de creación de un `Analisis` con **React Hook Form + Zod**
// (Req. 8.1–8.4, 12.1, 29.2, 29.3). La UI usa primitivas estilo
// **Shadcn/UI + Tailwind** de la feature `gds`.
//
// Permite: nombre y descripción, selección MÚLTIPLE de instituciones (Req. 8.3),
// radio de análisis, configuración temporal (semanas, hasta 24, Req. 12.1) y la
// elección del `Escenario` desde la `Biblioteca_Escenarios` (Req. 29.2) o uno
// personalizado en texto libre con opción de guardarlo (Req. 29.3). Toda la
// lógica pura (validación y payload) vive en `../api/analisisApi.ts`.
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
    SEMANAS_MIN,
    SEMANAS_MAX,
    SEMANAS_DEFECTO,
    RADIO_ANALISIS_DEFECTO,
    RADIO_ANALISIS_MIN,
    RADIO_ANALISIS_MAX,
    RADIO_ANALISIS_PASO,
    TIPO_ESCENARIO,
    analisisSchema,
    type AnalisisFormValues,
} from '../api/analisisApi';
import type { Escenario } from '../api/escenariosApi';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { Textarea } from './ui/textarea';

/** Institución seleccionable en el formulario (forma mínima requerida). */
export interface InstitucionOpcion {
    id: string | null;
    nombre: string;
    categoria?: string;
}

export interface AnalisisFormularioProps {
    instituciones: InstitucionOpcion[];
    escenarios: Escenario[];
    escenariosDisponibles?: boolean;
    onSubmit: (values: AnalisisFormValues) => void | Promise<void>;
    onCancel: () => void;
    guardando?: boolean;
}

const VALORES_INICIALES: AnalisisFormValues = {
    nombre: '',
    descripcion: '',
    institucionIds: [],
    radio_metros: RADIO_ANALISIS_DEFECTO,
    total_semanas: SEMANAS_DEFECTO,
    tipo_escenario: TIPO_ESCENARIO.BIBLIOTECA,
    escenario_id: '',
    escenario_texto: '',
    escenario_nombre: '',
    guardar_en_biblioteca: false,
};

export function AnalisisFormulario({
    instituciones,
    escenarios,
    escenariosDisponibles = true,
    onSubmit,
    onCancel,
    guardando = false,
}: AnalisisFormularioProps) {
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<AnalisisFormValues>({
        resolver: zodResolver(analisisSchema),
        defaultValues: VALORES_INICIALES,
    });

    const institucionIds = watch('institucionIds') ?? [];
    const radioMetros = watch('radio_metros');
    const tipoEscenario = watch('tipo_escenario');
    const guardarEnBiblioteca = watch('guardar_en_biblioteca');
    const esPersonalizado = tipoEscenario === TIPO_ESCENARIO.PERSONALIZADO;

    const toggleInstitucion = (id: string) => {
        const actuales = new Set(institucionIds);
        if (actuales.has(id)) actuales.delete(id);
        else actuales.add(id);
        setValue('institucionIds', [...actuales], {
            shouldValidate: true,
            shouldDirty: true,
        });
    };

    const enviar: SubmitHandler<AnalisisFormValues> = async (values) => {
        await onSubmit(values);
    };

    return (
        <form onSubmit={handleSubmit(enviar)} className="space-y-5" noValidate>
            <h3 className="text-lg font-semibold text-slate-800">Nuevo análisis</h3>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                    <Label htmlFor="ana-nombre">Nombre</Label>
                    <Input id="ana-nombre" aria-label="Nombre del análisis" {...register('nombre')} />
                    {errors.nombre && (
                        <span className="block text-xs text-red-600">{errors.nombre.message}</span>
                    )}
                </div>

                <div className="space-y-1">
                    <Label htmlFor="ana-radio">Radio de análisis: {radioMetros} m</Label>
                    <input
                        id="ana-radio"
                        type="range"
                        min={RADIO_ANALISIS_MIN}
                        max={RADIO_ANALISIS_MAX}
                        step={RADIO_ANALISIS_PASO}
                        className="w-full accent-cyan-600"
                        aria-label="Radio de análisis en metros"
                        {...register('radio_metros', { valueAsNumber: true })}
                    />
                    {errors.radio_metros && (
                        <span className="block text-xs text-red-600">
                            {errors.radio_metros.message}
                        </span>
                    )}
                </div>
            </div>

            <div className="space-y-1">
                <Label htmlFor="ana-descripcion">Descripción</Label>
                <Textarea
                    id="ana-descripcion"
                    rows={2}
                    aria-label="Descripción del análisis"
                    {...register('descripcion')}
                />
            </div>

            {/* Selección múltiple de instituciones (Req. 8.3, 8.4) */}
            <fieldset>
                <legend className="mb-1 block text-sm font-medium text-slate-700">
                    Instituciones (selecciona una o más)
                </legend>
                {instituciones.length === 0 ? (
                    <p className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                        No hay instituciones disponibles. Crea instituciones antes de iniciar un
                        análisis.
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
                                    checked={inst.id ? institucionIds.includes(inst.id) : false}
                                    onChange={() => inst.id && toggleInstitucion(inst.id)}
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
                {errors.institucionIds && (
                    <span className="mt-1 block text-xs text-red-600">
                        {errors.institucionIds.message}
                    </span>
                )}
            </fieldset>

            {/* Configuración temporal (Req. 12.1: hasta 24 semanas) */}
            <div className="max-w-xs space-y-1">
                <Label htmlFor="ana-semanas">Duración (semanas, máx. {SEMANAS_MAX})</Label>
                <Input
                    id="ana-semanas"
                    type="number"
                    min={SEMANAS_MIN}
                    max={SEMANAS_MAX}
                    step={1}
                    aria-label="Duración en semanas"
                    {...register('total_semanas', { valueAsNumber: true })}
                />
                {errors.total_semanas && (
                    <span className="block text-xs text-red-600">
                        {errors.total_semanas.message}
                    </span>
                )}
            </div>

            {/* Escenario: biblioteca o personalizado (Req. 8.2, 29.2, 29.3) */}
            <fieldset className="rounded border border-slate-200 bg-white p-4">
                <legend className="px-1 text-sm font-medium text-slate-700">Escenario</legend>
                <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                            type="radio"
                            className="accent-cyan-600"
                            value={TIPO_ESCENARIO.BIBLIOTECA}
                            {...register('tipo_escenario')}
                        />
                        Desde la biblioteca
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                            type="radio"
                            className="accent-cyan-600"
                            value={TIPO_ESCENARIO.PERSONALIZADO}
                            {...register('tipo_escenario')}
                        />
                        Personalizado
                    </label>
                </div>

                {!escenariosDisponibles && (
                    <p className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        Mostrando escenarios predefinidos sugeridos; la biblioteca del backend aún
                        no está disponible.
                    </p>
                )}

                {esPersonalizado ? (
                    <div className="mt-3 space-y-3">
                        <div className="space-y-1">
                            <Label htmlFor="ana-escenario-texto">Descripción del escenario</Label>
                            <Textarea
                                id="ana-escenario-texto"
                                rows={3}
                                aria-label="Escenario personalizado"
                                placeholder="Describe el contexto global de la simulación…"
                                {...register('escenario_texto')}
                            />
                            {errors.escenario_texto && (
                                <span className="block text-xs text-red-600">
                                    {errors.escenario_texto.message}
                                </span>
                            )}
                        </div>
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                                type="checkbox"
                                className="accent-cyan-600"
                                {...register('guardar_en_biblioteca')}
                            />
                            Guardar este escenario en la biblioteca para reutilizarlo
                        </label>
                        {guardarEnBiblioteca && (
                            <div className="max-w-sm space-y-1">
                                <Label htmlFor="ana-escenario-nombre">Nombre del escenario</Label>
                                <Input
                                    id="ana-escenario-nombre"
                                    aria-label="Nombre del escenario a guardar"
                                    {...register('escenario_nombre')}
                                />
                                {errors.escenario_nombre && (
                                    <span className="block text-xs text-red-600">
                                        {errors.escenario_nombre.message}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="mt-3 max-w-md space-y-1">
                        <Label htmlFor="ana-escenario-id">Escenario de la biblioteca</Label>
                        <Select
                            id="ana-escenario-id"
                            aria-label="Escenario de la biblioteca"
                            {...register('escenario_id')}
                        >
                            <option value="">Seleccione…</option>
                            {escenarios.map((esc) => (
                                <option key={esc.id ?? esc.nombre} value={esc.id ?? ''}>
                                    {esc.nombre}
                                </option>
                            ))}
                        </Select>
                        {errors.escenario_id && (
                            <span className="block text-xs text-red-600">
                                {errors.escenario_id.message}
                            </span>
                        )}
                    </div>
                )}
            </fieldset>

            <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={guardando}>
                    {guardando ? 'Creando…' : 'Crear análisis'}
                </Button>
            </div>
        </form>
    );
}

export default AnalisisFormulario;
