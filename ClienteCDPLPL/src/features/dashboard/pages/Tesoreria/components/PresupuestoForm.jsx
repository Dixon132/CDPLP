// src/pages/dashboard/pages/Tesoreria/PresupuestoForm.jsx
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
    createPresupuesto,
    getPresupuestoById,
    updatePresupuesto,
} from "../../../services/tesoreria";

export default function PresupuestoForm({
    presupuestoId = null,
    onClose,
    onSuccess,
}) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm();

    const [loading, setLoading] = useState(false);

    // Si presupuestoId viene definido, estamos en “Editar”, así que cargamos datos
    useEffect(() => {
        if (presupuestoId) {
            const fetchData = async () => {
                setLoading(true);
                const data = await getPresupuestoById(presupuestoId);
                // Llenamos el formulario (aunque getPresupuestoById devuelve también movimientos, nos quedamos con los campos del presupuesto)
                reset({
                    nombre_presupuesto: data.nombre_presupuesto ?? "",
                    descripcion: data.descripcion ?? "",
                    monto_total: data.monto_total?.toString() ?? "",
                    fecha_asignacion: data.fecha_asignacion
                        ? data.fecha_asignacion.split("T")[0]
                        : "",
                    estado: data.estado ?? "",
                });
                setLoading(false);
            };
            fetchData();
        }
    }, [presupuestoId, reset]);

    const onSubmit = async (formData) => {
        setLoading(true);

        const payload = {
            nombre_presupuesto: formData.nombre_presupuesto,
            descripcion: formData.descripcion,
            monto_total: parseFloat(formData.monto_total),
            fecha_asignacion: formData.fecha_asignacion
                ? new Date(formData.fecha_asignacion)
                : null,
            estado: formData.estado,
        };

        try {
            if (presupuestoId) {
                await updatePresupuesto(presupuestoId, payload);
                alert("Presupuesto actualizado correctamente");
            } else {
                await createPresupuesto(payload);
                alert("Presupuesto creado correctamente");
            }
            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (err) {
            console.error(err);
            alert("Error al guardar el presupuesto");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 p-4 max-w-lg mx-auto"
        >
            <div>
                <label className="block font-semibold">Nombre Presupuesto</label>
                <input
                    {...register("nombre_presupuesto", { required: true })}
                    className="w-full border px-4 py-2 rounded"
                    disabled={loading}
                />
                {errors.nombre_presupuesto && (
                    <p className="text-red-500">Este campo es obligatorio</p>
                )}
            </div>

            <div>
                <label className="block font-semibold">Descripción</label>
                <textarea
                    {...register("descripcion")}
                    className="w-full border px-4 py-2 rounded"
                    disabled={loading}
                />
            </div>

            <div>
                <label className="block font-semibold">Monto Total</label>
                <input
                    type="number"
                    step="0.01"
                    {...register("monto_total", { required: true })}
                    className="w-full border px-4 py-2 rounded"
                    disabled={loading}
                />
                {errors.monto_total && (
                    <p className="text-red-500">Este campo es obligatorio</p>
                )}
            </div>

            <div>
                <label className="block font-semibold">Fecha Asignación</label>
                <input
                    type="date"
                    {...register("fecha_asignacion", { required: true })}
                    className="w-full border px-4 py-2 rounded"
                    disabled={loading}
                />
                {errors.fecha_asignacion && (
                    <p className="text-red-500">Este campo es obligatorio</p>
                )}
            </div>

            <div>
                <label className="block font-semibold">Estado</label>
                <select
                    {...register("estado", { required: true })}
                    className="w-full border px-4 py-2 rounded"
                    disabled={loading}
                >
                    <option value="">Seleccione...</option>
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="INACTIVO">INACTIVO</option>
                </select>
                {errors.estado && (
                    <p className="text-red-500">Este campo es obligatorio</p>
                )}
            </div>

            <button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                disabled={loading}
            >
                {presupuestoId ? "Guardar Cambios" : "Crear Presupuesto"}
            </button>
        </form>
    );
}
