import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
    getConvenios,
    getActividadSocialById,
    updateActividadSocial,
} from "../../../services/ac-sociales";

export default function ModificarActividadSocial({ id, onClose, onSuccess }) {
    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm();
    const [convenios, setConvenios] = useState([]);

    // Fecha mínima (hoy)
    const hoy = new Date().toISOString().split("T")[0];

    // Observar fecha_inicio para comparar en fecha_fin
    const fechaInicioValue = watch("fecha_inicio");

    useEffect(() => {
        const fetchData = async () => {
            const actividad = await getActividadSocialById(id);
            const conveniosData = await getConvenios();
            setConvenios(conveniosData);
            reset({
                ...actividad,
                fecha_inicio: actividad.fecha_inicio?.split("T")[0],
                fecha_fin: actividad.fecha_fin?.split("T")[0],
            });
        };
        fetchData();
    }, [id, reset]);

    const onSubmit = async (data) => {
        data.id_convenio = data.id_convenio ? parseInt(data.id_convenio) : null;
        await updateActividadSocial(id, data);
        alert("Actividad actualizada");
        if (onSuccess) onSuccess();
        if (onClose) onClose();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 max-w-xl mx-auto">
            {/* Nombre */}
            <div>
                <label className="block font-semibold">Nombre</label>
                <input
                    {...register("nombre", { required: "Nombre obligatorio" })}
                    className="w-full border px-4 py-2 rounded"
                />
                {errors.nombre && <p className="text-red-500">{errors.nombre.message}</p>}
            </div>

            {/* Descripción */}
            <div>
                <label className="block font-semibold">Descripción</label>
                <textarea
                    {...register("descripcion")}
                    className="w-full border px-4 py-2 rounded"
                />
            </div>

            {/* Ubicación */}
            <div>
                <label className="block font-semibold">Ubicación</label>
                <input
                    {...register("ubicacion")}
                    className="w-full border px-4 py-2 rounded"
                />
            </div>

            {/* Motivo */}
            <div>
                <label className="block font-semibold">Motivo</label>
                <input
                    {...register("motivo")}
                    className="w-full border px-4 py-2 rounded"
                />
            </div>

            {/* Convenio */}
            <div>
                <label className="block font-semibold">Convenio</label>
                <select
                    {...register("id_convenio")}
                    className="w-full border px-4 py-2 rounded"
                >
                    <option value="">Sin convenio</option>
                    {convenios.map((c) => (
                        <option key={c.id_convenio} value={c.id_convenio}>
                            {c.nombre}
                        </option>
                    ))}
                </select>
            </div>

            {/* Fecha Inicio */}
            <div>
                <label className="block font-semibold">Fecha Inicio</label>
                <input
                    type="date"
                    min={hoy}
                    {...register("fecha_inicio", {
                        required: "Fecha inicio obligatoria",
                        validate: (value) =>
                            value >= hoy || "No puedes escoger una fecha pasada",
                    })}
                    className="w-full border px-4 py-2 rounded"
                />
                {errors.fecha_inicio && (
                    <p className="text-red-500">{errors.fecha_inicio.message}</p>
                )}
            </div>

            {/* Fecha Fin */}
            <div>
                <label className="block font-semibold">Fecha Fin</label>
                <input
                    type="date"
                    min={hoy}
                    {...register("fecha_fin", {
                        validate: (value) => {
                            if (!value) return true;
                            if (value < hoy) return "No puedes escoger fechas pasadas";
                            if (fechaInicioValue && value < fechaInicioValue)
                                return "La fecha fin debe ser igual o posterior a la fecha inicio";
                            return true;
                        },
                    })}
                    className="w-full border px-4 py-2 rounded"
                />
                {errors.fecha_fin && (
                    <p className="text-red-500">{errors.fecha_fin.message}</p>
                )}
            </div>

            {/* Estado */}
            <div>
                <label className="block font-semibold">Estado</label>
                <select
                    {...register("estado", { required: "Estado obligatorio" })}
                    className="w-full border px-4 py-2 rounded"
                >
                    <option value="">Seleccione...</option>
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="INACTIVO">INACTIVO</option>
                </select>
                {errors.estado && <p className="text-red-500">{errors.estado.message}</p>}
            </div>

            {/* Tipo */}
            <div>
                <label className="block font-semibold">Tipo</label>
                <input
                    {...register("tipo", { required: "Tipo obligatorio" })}
                    className="w-full border px-4 py-2 rounded"
                />
                {errors.tipo && <p className="text-red-500">{errors.tipo.message}</p>}
            </div>

            <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
                Guardar cambios
            </button>
        </form>
    );
}