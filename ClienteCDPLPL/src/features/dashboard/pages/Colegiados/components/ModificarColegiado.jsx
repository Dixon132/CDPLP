import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { getColegiadoById, modificarColegiados } from "../../../services/colegiados";

const ModificarColegiado = ({ id, onClose }) => {
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm();

    // Fecha de hoy en formato YYYY-MM-DD
    const today = new Date().toISOString().split("T")[0];

    // Carga datos y formatea fechas para el input[type="date"]
    const getColegiado = async () => {
        try {
            const data = await getColegiadoById(id);
            const formatted = {
                ...data,
                fecha_inscripcion: data.fecha_inscripcion
                    ? data.fecha_inscripcion.split("T")[0]
                    : "",
                fecha_renovacion: data.fecha_renovacion
                    ? data.fecha_renovacion.split("T")[0]
                    : "",
            };
            reset(formatted);
        } catch (error) {
            console.error("Error al obtener el colegiado", error);
        }
    };

    useEffect(() => {
        getColegiado();
    }, [id]);

    const onSubmit = async (formData) => {
        try {
            await modificarColegiados(id, formData);
            onClose();
        } catch (error) {
            console.error("Error al modificar el colegiado", error);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
            {/* Carnet de Identidad */}
            <div>
                <label className="block mb-1">Carnet de Identidad</label>
                <input
                    type="text"
                    {...register("carnet_identidad", { required: "Campo obligatorio" })}
                    className="w-full border p-2 rounded"
                />
                {errors.carnet_identidad && (
                    <p className="text-red-500 mt-1">{errors.carnet_identidad.message}</p>
                )}
            </div>

            {/* Nombre */}
            <div>
                <label className="block mb-1">Nombre</label>
                <input
                    type="text"
                    {...register("nombre", { required: "Campo obligatorio" })}
                    className="w-full border p-2 rounded"
                />
                {errors.nombre && (
                    <p className="text-red-500 mt-1">{errors.nombre.message}</p>
                )}
            </div>

            {/* Apellido */}
            <div>
                <label className="block mb-1">Apellido</label>
                <input
                    type="text"
                    {...register("apellido", { required: "Campo obligatorio" })}
                    className="w-full border p-2 rounded"
                />
                {errors.apellido && (
                    <p className="text-red-500 mt-1">{errors.apellido.message}</p>
                )}
            </div>

            {/* Correo */}
            <div>
                <label className="block mb-1">Correo</label>
                <input
                    type="email"
                    {...register("correo", {
                        required: "Campo obligatorio",
                        pattern: {
                            value: /^[^@ ]+@[^@ ]+\.[^@ .]{2,}$/,
                            message: "Correo inválido",
                        },
                    })}
                    className="w-full border p-2 rounded"
                />
                {errors.correo && (
                    <p className="text-red-500 mt-1">{errors.correo.message}</p>
                )}
            </div>

            {/* Teléfono */}
            <div>
                <label className="block mb-1">Teléfono</label>
                <input
                    type="text"
                    {...register("telefono", {
                        required: "Campo obligatorio",
                        pattern: {
                            value: /^[0-9]+$/,
                            message: "Solo números",
                        },
                    })}
                    className="w-full border p-2 rounded"
                />
                {errors.telefono && (
                    <p className="text-red-500 mt-1">{errors.telefono.message}</p>
                )}
            </div>

            {/* Especialidades */}
            <div>
                <label className="block mb-1">Especialidades</label>
                <input
                    type="text"
                    {...register("especialidades", { required: "Campo obligatorio" })}
                    className="w-full border p-2 rounded"
                />
                {errors.especialidades && (
                    <p className="text-red-500 mt-1">{errors.especialidades.message}</p>
                )}
            </div>

            {/* Fecha de Inscripción */}
            <div>
                <label className="block mb-1">Fecha de Inscripción</label>
                <input
                    type="date"
                    {...register("fecha_inscripcion", {
                        required: "Campo obligatorio",
                        validate: (value) =>
                            value <= today || "No puede seleccionar una fecha futura",
                    })}
                    max={today}
                    className="w-full border p-2 rounded"
                />
                {errors.fecha_inscripcion && (
                    <p className="text-red-500 mt-1">{errors.fecha_inscripcion.message}</p>
                )}
            </div>

            {/* Fecha de Renovación */}
            <div>
                <label className="block mb-1">Fecha de Renovación</label>
                <input
                    type="date"
                    {...register("fecha_renovacion", {
                        required: "Campo obligatorio",
                        validate: (value) =>
                            value >= today || "No puede seleccionar una fecha pasada",
                    })}
                    min={today}
                    className="w-full border p-2 rounded"
                />
                {errors.fecha_renovacion && (
                    <p className="text-red-500 mt-1">{errors.fecha_renovacion.message}</p>
                )}
            </div>

            {/* Estado */}
            <div>
                <label className="block mb-1">Estado</label>
                <select
                    {...register("estado", { required: "Campo obligatorio" })}
                    className="w-full border p-2 rounded"
                >
                    <option value="">-- Seleccione --</option>
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="INACTIVO">INACTIVO</option>
                </select>
                {errors.estado && (
                    <p className="text-red-500 mt-1">{errors.estado.message}</p>
                )}
            </div>

            {/* Botón enviar */}
            <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded"
            >
                Guardar cambios
            </button>
        </form>
    );
};

export default ModificarColegiado;
