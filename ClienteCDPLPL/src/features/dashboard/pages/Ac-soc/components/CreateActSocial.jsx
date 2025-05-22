import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import Step from '../../../../../components/Step';


const CreateActSocial = () => {
    const {
        register,
        handleSubmit,
        trigger,
        watch,
        formState: { errors }
    } = useForm();

    // Observa si el usuario elige Solicitud
    const origenIntervencion = watch('origen_intervencion');

    // Construye pasos dinámicamente
    const steps = useMemo(() => [
        <Step key="1">
            <label>Origen de intervención</label>
            <select
                {...register('origen_intervencion', { required: true })}
                className="border p-2 rounded"
            >
                <option value="">Selecciona...</option>
                <option value="Solicitud">Solicitud</option>
                <option value="Directa">Directa</option>
            </select>
            {errors.origen_intervencion && (
                <p className="text-red-500">Este campo es obligatorio</p>
            )}
        </Step>,

        // Paso condicional de solicitud
        ...(origenIntervencion === 'Solicitud'
            ? [
                <Step key="2-solicitud">
                    <h3>Datos de la Solicitud</h3>

                    <label>Solicitante</label>
                    <input
                        {...register('solicitante_nombre', { required: true })}
                        className="border p-2 rounded"
                    />
                    {errors.solicitante_nombre && (
                        <p className="text-red-500">Indica el solicitante</p>
                    )}

                    <label>Institución Origen</label>
                    <input
                        {...register('institucion_origen', { required: true })}
                        className="border p-2 rounded"
                    />
                    {errors.institucion_origen && (
                        <p className="text-red-500">Indica la institución de origen</p>
                    )}

                    <label>Contacto</label>
                    <input
                        {...register('contacto', { required: true })}
                        className="border p-2 rounded"
                    />
                    {errors.contacto && (
                        <p className="text-red-500">Indica un contacto</p>
                    )}

                    <label>Descripción</label>
                    <textarea
                        {...register('descripcion_solicitud', { required: true })}
                        className="border p-2 rounded"
                    />
                    {errors.descripcion_solicitud && (
                        <p className="text-red-500">Describe la solicitud</p>
                    )}

                </Step>
            ]
            : []),

        // Paso de actividad social
        <Step key="3-actividad">
            <h3>Datos de la Actividad Social</h3>

            <label>Nombre de la actividad</label>
            <input
                {...register('nombre_actividad', { required: true })}
                className="border p-2 rounded"
            />
            {errors.nombre_actividad && (
                <p className="text-red-500">Nombre obligatorio</p>
            )}

            <label>Descripción</label>
            <textarea
                {...register('descripcion_actividad')}
                className="border p-2 rounded"
            />

            <label>Ubicación</label>
            <input
                {...register('ubicacion', { required: true })}
                className="border p-2 rounded"
            />
            {errors.ubicacion && (
                <p className="text-red-500">Ubicación obligatoria</p>
            )}

            <label>Fecha inicio</label>
            <input
                type="date"
                {...register('fecha_inicio', { required: true })}
                className="border p-2 rounded"
            />
            {errors.fecha_inicio && (
                <p className="text-red-500">Fecha de inicio obligatoria</p>
            )}

            <label>Fecha fin</label>
            <input
                type="date"
                {...register('fecha_fin', { required: true })}
                className="border p-2 rounded"
            />
            {errors.fecha_fin && (
                <p className="text-red-500">Fecha de fin obligatoria</p>
            )}
        </Step>,

        // Paso de asignación de colegiados
        <Step key="4-asignacion">
            <h3>Asignar Colegiados</h3>
            <p>Selecciona uno o varios colegiados:</p>
            {/* Aquí podrías mapear un array de options desde props o API */}
            <label className="flex items-center gap-2">
                <input type="checkbox" {...register('colegiados_asignados')} value="1" />
                Colegiado 1
            </label>
            <label className="flex items-center gap-2">
                <input type="checkbox" {...register('colegiados_asignados')} value="2" />
                Colegiado 2
            </label>
            <label className="flex items-center gap-2">
                <input type="checkbox" {...register('colegiados_asignados')} value="3" />
                Colegiado 3
            </label>
        </Step>
    ], [origenIntervencion, errors]);

    // Campos para validación paso a paso
    const validationFields = useMemo(() => [
        ['origen_intervencion'],
        ...(origenIntervencion === 'Solicitud'
            ? [['solicitante_nombre', 'institucion_origen', 'contacto', 'descripcion_solicitud']]
            : []),
        ['nombre_actividad', 'ubicacion', 'fecha_inicio', 'fecha_fin'],
        ['colegiados_asignados'],
    ], [origenIntervencion]);

    const onSubmit = data => {
        // Aquí envías data al backend:
        // 1) Si origen Solicitud, crea solicitud y toma id
        // 2) Crea actividad con id_solicitud o null
        // 3) Crea asignaciones con array data.colegiados_asignados
        console.log('Datos finales:', data);
    };
    console.log(steps)
    return { steps, handleSubmit, onSubmit, trigger, validationFields };
};

export default CreateActSocial;