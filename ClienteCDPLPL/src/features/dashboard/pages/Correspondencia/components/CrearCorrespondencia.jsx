import { useForm } from "react-hook-form";
import { createCorrespondencia, usuariosCorrespondencia } from "../../../services/correspondencia";
import { useEffect, useState } from "react";

export default function CrearCorrespondencia({ onClose, onSuccess }) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    const [usuarios, setUsuarios] = useState([]);

    // Fecha máxima (hoy) para el campo fecha_envio
    const hoy = new Date().toISOString().split('T')[0];

    const onSubmit = async (data) => {
        const formData = new FormData();
        formData.append("asunto", data.asunto);
        formData.append("contenido", data.contenido[0]);
        formData.append("resumen", data.resumen);
        formData.append("fecha_envio", data.fecha_envio);
        formData.append("remitente", data.remitente);
        formData.append("id_destinatario", data.id_destinatario);
        formData.append("estado", data.estado);

        await createCorrespondencia(formData);
        alert("Correspondencia creada con éxito");
        if (onSuccess) onSuccess();
        if (onClose) onClose();
    };

    useEffect(() => {
        const fetchUsuarios = async () => {
            const usuarios = await usuariosCorrespondencia();
            setUsuarios(usuarios);
        };
        fetchUsuarios();
    }, []);

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Asunto */}
            <div>
                <label className="block font-semibold">Asunto</label>
                <input
                    {...register("asunto", { required: "Asunto es obligatorio" })}
                    className="w-full border px-4 py-2 rounded"
                />
                {errors.asunto && <p className="text-red-500">{errors.asunto.message}</p>}
            </div>

            {/* Contenido PDF */}
            <div>
                <label className="block font-semibold">Contenido (PDF)</label>
                <input
                    type="file"
                    accept="application/pdf"
                    {...register("contenido", { required: "El archivo PDF es obligatorio" })}
                />
                {errors.contenido && <p className="text-red-500">{errors.contenido.message}</p>}
            </div>

            {/* Resumen */}
            <div>
                <label className="block font-semibold">Resumen</label>
                <textarea
                    {...register("resumen")}
                    className="w-full border px-4 py-2 rounded"
                />
            </div>

            {/* Fecha de envío con validación de no futuro */}
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
                {errors.fecha_envio && <p className="text-red-500">{errors.fecha_envio.message}</p>}
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
                    {...register("id_destinatario", { required: "Destinatario obligatorio", valueAsNumber: true })}
                    className="w-full border px-4 py-2 rounded"
                >
                    <option value="">Selecciona un destinatario</option>
                    {usuarios.map(usuario => (
                        <option key={usuario.id_usuario} value={usuario.id_usuario}>
                            {usuario.nombre} {usuario.apellido}
                        </option>
                    ))}
                </select>
                {errors.id_destinatario && <p className="text-red-500">{errors.id_destinatario.message}</p>}
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
