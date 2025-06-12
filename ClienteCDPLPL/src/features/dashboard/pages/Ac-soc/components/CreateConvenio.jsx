import { useForm } from "react-hook-form";
import { createConvenio } from "../../../services/convenios";
import { useState } from "react";

export default function CreateConvenio({ onClose, onSuccess }) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    // Fecha mínima (hoy) para los campos de fecha
    const hoy = new Date().toISOString().split('T')[0];

    const onSubmit = async (data) => {
        await createConvenio(data);
        alert("Convenio creado");
        if (onSuccess) onSuccess();
        if (onClose) onClose();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
            {/* Nombre */}
            <div>
                <label className="block font-semibold">Nombre</label>
                <input
                    {...register("nombre", { required: "Nombre es obligatorio" })}
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

            {/* Fecha inicio */}
            <div>
                <label className="block font-semibold">Fecha inicio</label>
                <input
                    type="date"
                    min={hoy}
                    {...register("fecha_inicio", {
                        required: "Fecha inicio requerida",
                        validate: value =>
                            value >= hoy || "No puedes escoger una fecha pasada",
                    })}
                    className="w-full border px-4 py-2 rounded"
                />
                {errors.fecha_inicio && <p className="text-red-500">{errors.fecha_inicio.message}</p>}
            </div>

            {/* Fecha fin */}
            <div>
                <label className="block font-semibold">Fecha fin</label>
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
                    {...register("estado", { required: "Estado es obligatorio" })}
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
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
                Crear
            </button>
        </form>
    );
}
