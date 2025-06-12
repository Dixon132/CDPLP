import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
    getCorrespondenciaById,
    updateCorrespondenciaById,
    usuariosCorrespondencia,
} from "../../../services/correspondencia";

export default function EditarCorrespondencia({ id, onClose, onSuccess }) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm();
    const [loading, setLoading] = useState(true);
    const [usuarios, setUsuarios] = useState([]);

    // Fecha máxima (hoy) para los campos de fecha
    const hoy = new Date().toISOString().split('T')[0];

    useEffect(() => {
        const fetchData = async () => {
            const res = await getCorrespondenciaById(id);
            reset({
                asunto: res.asunto,
                contenido: res.contenido,
                resumen: res.resumen,
                fecha_envio: res.fecha_envio?.slice(0, 10),
                fecha_recibido: res.fecha_recibido?.slice(0, 10),
                remitente: res.remitente,
                id_destinatario: res.id_destinatario,
                estado: res.estado,
            });
            setLoading(false);
        };

        const fetchUsuarios = async () => {
            const lista = await usuariosCorrespondencia();
            setUsuarios(lista);
        };

        fetchUsuarios();
        fetchData();
    }, [id, reset]);

    const onSubmit = async (data) => {
        await updateCorrespondenciaById(id, data);
        alert("Correspondencia actualizada");
        if (onSuccess) onSuccess();
        if (onClose) onClose();
    };

    if (loading) return <p className="text-center">Cargando...</p>;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Asunto */}
            <div>
                <label className="block font-semibold">Asunto</label>
                <input
                    {...register("asunto", { required: "Asunto obligatorio" })}
                    className="w-full border px-4 py-2 rounded"
                />
                {errors.asunto && <p className="text-red-500">{errors.asunto.message}</p>}
            </div>

            {/* Resumen */}
            <div>
                <label className="block font-semibold">Resumen</label>
                <textarea
                    {...register("resumen")}
                    className="w-full border px-4 py-2 rounded"
                />
            </div>

            {/* Fecha de envío con validación */}
            <div>
                <label className="block font-semibold">Fecha de envío</label>
                <input
                    type="date"
                    max={hoy}
                    {...register("fecha_envio", {
                        required: "Fecha de envío requerida",
                        validate: value =>
                            value <= hoy || "No puedes escoger una fecha futura",
                    })}
                    className="w-full border px-4 py-2 rounded"
                />
                {errors.fecha_envio && (
                    <p className="text-red-500">{errors.fecha_envio.message}</p>
                )}
            </div>

            {/* Fecha de recepción (opcional, también sin futuro) */}
            <div>
                <label className="block font-semibold">Fecha de recibido</label>
                <input
                    type="date"
                    max={hoy}
                    {...register("fecha_recibido", {
                        validate: value =>
                            !value || value <= hoy || "No puedes escoger una fecha futura",
                    })}
                    className="w-full border px-4 py-2 rounded"
                />
                {errors.fecha_recibido && (
                    <p className="text-red-500">{errors.fecha_recibido.message}</p>
                )}
            </div>

            {/* Remitente */}
            <div>
                <label className="block font-semibold">Remitente</label>
                <input
                    {...register("remitente", { required: "Remitente obligatorio" })}
                    className="w-full border px-4 py-2 rounded"
                />
                {errors.remitente && <p className="text-red-500">{errors.remitente.message}</p>}
            </div>

            {/* Destinatario */}
            <div>
                <label className="block font-semibold">Destinatario</label>
                <select
                    {...register("id_destinatario", {
                        required: "Destinatario obligatorio",
                        valueAsNumber: true,
                    })}
                    className="w-full border px-4 py-2 rounded"
                >
                    <option value="">Selecciona un destinatario</option>
                    {usuarios.map(usuario => (
                        <option
                            key={usuario.id_usuario}
                            value={usuario.id_usuario}
                        >
                            {usuario.nombre} {usuario.apellido}
                        </option>
                    ))}
                </select>
                {errors.id_destinatario && (
                    <p className="text-red-500">{errors.id_destinatario.message}</p>
                )}
            </div>

            {/* Estado */}
            <div>
                <label className="block font-semibold">Estado</label>
                <select
                    {...register("estado", { required: "Estado requerido" })}
                    className="w-full border px-4 py-2 rounded"
                >
                    <option value="">Selecciona...</option>
                    <option value="RECIBIDO">RECIBIDO</option>
                    <option value="VISTO">VISTO</option>
                    <option value="A DISCUCION">A DISCUCION</option>
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="ARREGLADO">ARREGLADO</option>
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
