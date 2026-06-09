// Formulario de alta/edición de una `Institucion` con **React Hook Form + Zod**,
// selección de ubicación en mapa (Leaflet) y radio de influencia (Req. 7.1–7.5,
// 7.7). La UI usa primitivas estilo **Shadcn/UI + Tailwind**.
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
    CATEGORIAS_INSTITUCION,
    RADIO_METROS_DEFECTO,
    RADIO_METROS_MAX,
    RADIO_METROS_MIN,
    institucionSchema,
    type Institucion,
    type InstitucionFormValues,
} from '../api/institucionesApi';
import { InstitucionMapaSelector } from './InstitucionMapaSelector';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { Textarea } from './ui/textarea';

function valoresIniciales(inst: Institucion | null | undefined): InstitucionFormValues {
    return {
        nombre: inst?.nombre ?? '',
        categoria: (inst?.categoria ?? '') as InstitucionFormValues['categoria'],
        latitud: inst?.latitud ?? null,
        longitud: inst?.longitud ?? null,
        radio_metros: inst?.radio_metros ?? RADIO_METROS_DEFECTO,
        logo_url: inst?.logo_url ?? '',
        descripcion: inst?.descripcion ?? '',
    };
}

export interface InstitucionFormularioProps {
    institucion?: Institucion | null;
    onSubmit: (values: InstitucionFormValues) => void | Promise<void>;
    onCancel: () => void;
    guardando?: boolean;
}

export function InstitucionFormulario({
    institucion = null,
    onSubmit,
    onCancel,
    guardando = false,
}: InstitucionFormularioProps) {
    const editando = Boolean(institucion && institucion.id);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<InstitucionFormValues>({
        resolver: zodResolver(institucionSchema),
        defaultValues: valoresIniciales(institucion),
    });

    const latitud = watch('latitud');
    const longitud = watch('longitud');
    const radioMetros = watch('radio_metros');

    const seleccionarUbicacion = (lat: number, lng: number) => {
        setValue('latitud', lat, { shouldValidate: true, shouldDirty: true });
        setValue('longitud', lng, { shouldValidate: true, shouldDirty: true });
    };

    const enviar: SubmitHandler<InstitucionFormValues> = async (values) => {
        await onSubmit(values);
    };

    const tieneUbicacion = latitud !== null && longitud !== null;

    return (
        <form onSubmit={handleSubmit(enviar)} className="space-y-4" noValidate>
            <h3 className="text-lg font-semibold text-slate-800">
                {editando ? 'Editar institución' : 'Nueva institución'}
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                    <Label htmlFor="inst-nombre">Nombre</Label>
                    <Input id="inst-nombre" aria-label="Nombre" {...register('nombre')} />
                    {errors.nombre && (
                        <span className="block text-xs text-red-600">{errors.nombre.message}</span>
                    )}
                </div>

                <div className="space-y-1">
                    <Label htmlFor="inst-categoria">Categoría</Label>
                    <Select id="inst-categoria" aria-label="Categoría" {...register('categoria')}>
                        <option value="">Seleccione…</option>
                        {CATEGORIAS_INSTITUCION.map((c) => (
                            <option key={c} value={c}>
                                {c.charAt(0).toUpperCase() + c.slice(1)}
                            </option>
                        ))}
                    </Select>
                    {errors.categoria && (
                        <span className="block text-xs text-red-600">{errors.categoria.message}</span>
                    )}
                </div>
            </div>

            <div className="space-y-1">
                <Label htmlFor="inst-descripcion">Descripción</Label>
                <Textarea
                    id="inst-descripcion"
                    rows={3}
                    aria-label="Descripción"
                    {...register('descripcion')}
                />
            </div>

            <div className="space-y-1">
                <Label htmlFor="inst-logo">URL del logo (opcional)</Label>
                <Input
                    id="inst-logo"
                    aria-label="URL del logo"
                    placeholder="https://…"
                    {...register('logo_url')}
                />
                {errors.logo_url && (
                    <span className="block text-xs text-red-600">{errors.logo_url.message}</span>
                )}
            </div>

            <div>
                <Label>Ubicación geográfica y radio de influencia</Label>
                <p className="mb-2 mt-1 text-xs text-slate-500">
                    Haz clic en el mapa para fijar la ubicación. El círculo muestra el radio de
                    influencia.
                </p>
                <InstitucionMapaSelector
                    latitud={latitud}
                    longitud={longitud}
                    radioMetros={radioMetros}
                    onSelect={seleccionarUbicacion}
                />
                {errors.latitud && (
                    <span className="mt-1 block text-xs text-red-600">{errors.latitud.message}</span>
                )}
                {tieneUbicacion && (
                    <p className="mt-2 text-xs text-emerald-700">
                        📍 Lat: {Number(latitud).toFixed(6)}, Lng: {Number(longitud).toFixed(6)}
                    </p>
                )}
            </div>

            <div className="space-y-1">
                <Label htmlFor="inst-radio">Radio de influencia: {radioMetros} m</Label>
                <input
                    id="inst-radio"
                    type="range"
                    min={RADIO_METROS_MIN}
                    max={RADIO_METROS_MAX}
                    step={50}
                    className="w-full accent-cyan-600"
                    aria-label="Radio de influencia en metros"
                    {...register('radio_metros', { valueAsNumber: true })}
                />
                {errors.radio_metros && (
                    <span className="block text-xs text-red-600">{errors.radio_metros.message}</span>
                )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={guardando}>
                    {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear institución'}
                </Button>
            </div>
        </form>
    );
}

export default InstitucionFormulario;
