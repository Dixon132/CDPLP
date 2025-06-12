import { useForm } from "react-hook-form";
import { createActividadSocial, getConvenios } from "../../../services/ac-sociales";
import { useEffect, useState } from "react";

export default function CreateActSocial({ onClose, onSuccess }) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    const [convenios, setConvenios] = useState([]);
    const hoy = new Date().toISOString().split('T')[0];

    useEffect(() => {
        const fetchConvenios = async () => {
            const data = await getConvenios();
            setConvenios(data);
        };
        fetchConvenios();
    }, []);

    const onSubmit = async (data) => {
        console.log("Actividad Social creada:", data);
        await createActividadSocial(data);
        alert("Actividad Social creada");
        if (onSuccess) onSuccess();
        if (onClose) onClose();
    };

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
                    {convenios.map((conv) => (
                        <option key={conv.id_convenio} value={conv.id_convenio}>
                            {conv.nombre}
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
                        required: "Fecha de inicio obligatoria",
                        validate: value =>
                            value >= hoy || "No puedes escoger una fecha pasada",
                    })}
                    className="w-full border px-4 py-2 rounded"
                />
                {errors.fecha_inicio && <p className="text-red-500">{errors.fecha_inicio.message}</p>}
            </div>

            {/* Fecha Fin */}
            <div>
                <label className="block font-semibold">Fecha Fin</label>
                <input
                    type="date"
                    min={hoy}
                    {...register("fecha_fin", {
                        validate: value =>
                            !value || value >= hoy || "No puedes escoger una fecha pasada",
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
                Crear
            </button>
        </form>
    );
}
