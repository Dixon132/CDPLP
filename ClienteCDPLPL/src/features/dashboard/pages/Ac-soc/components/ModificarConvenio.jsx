import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
    getConvenioById,
    updateConvenioById,
} from "../../../services/convenios";

export default function ModificarConvenio({ id, onClose, onSuccess }) {
    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm();
    const [loading, setLoading] = useState(true);

    // Fecha mínima (hoy)
    const hoy = new Date().toISOString().split('T')[0];
    // Observar la fecha_inicio para validar fecha_fin
    const fechaInicio = watch('fecha_inicio');

    useEffect(() => {
        const fetch = async () => {
            const res = await getConvenioById(id);
            reset({
                nombre: res.nombre,
                descripcion: res.descripcion,
                fecha_inicio: res.fecha_inicio?.slice(0, 10),
                fecha_fin: res.fecha_fin?.slice(0, 10),
                estado: res.estado,
            });
            setLoading(false);
        };
        fetch();
    }, [id, reset]);

    const onSubmit = async (data) => {
        await updateConvenioById(id, data);
        alert("Convenio actualizado");
        if (onSuccess) onSuccess();
        if (onClose) onClose();
    };

    if (loading) return <p className="text-center p-4">Cargando…</p>;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
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

            {/* Fecha Inicio */}
            <div>
                <label className="block font-semibold">Fecha inicio</label>
                <input
                    type="date"
                    min={hoy}
                    {...register("fecha_inicio", {
                        required: "Fecha inicio requerida",
                        validate: value => value >= hoy || "No puedes escoger fechas pasadas",
                    })}
                    className="w-full border px-4 py-2 rounded"
                />
                {errors.fecha_inicio && <p className="text-red-500">{errors.fecha_inicio.message}</p>}
            </div>

            {/* Fecha Fin */}
            <div>
                <label className="block font-semibold">Fecha fin</label>
                <input
                    type="date"
                    min={hoy}
                    {...register("fecha_fin", {
                        validate: value => {
                            if (!value) return true;
                            if (value < hoy) return "No puedes escoger fechas pasadas";
                            if (fechaInicio && value < fechaInicio) return "La fecha fin debe ser igual o posterior a la fecha inicio";
                            return true;
                        }
                    })}
                    className="w-full border px-4 py-2 rounded"
                />
                {errors.fecha_fin && <p className="text-red-500">{errors.fecha_fin.message}</p>}
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

            <button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            >
                Guardar cambios
            </button>
        </form>
    );
}
