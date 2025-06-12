// src/pages/dashboard/pages/Tesoreria/MovimientoForm.jsx
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
    createMovimientoFinanciero,
    getMovimientosByPresupuesto,
    updateMovimientoFinanciero,
} from "../../../services/tesoreria";

export default function MovimientoForm({
    presupuestoId,
    movimientoId = null,
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

    // Si movimientoId está definido, cargamos datos del movimiento para editar
    useEffect(() => {
        if (movimientoId) {
            const fetchData = async () => {
                setLoading(true);
                // Como no tenemos un endpoint que devuelva “un solo movimiento”,
                // obtenemos todos los movimientos y filtramos por ID:
                const allMovs = await getMovimientosByPresupuesto(presupuestoId);
                const mov = allMovs.find((m) => m.id_movimiento === movimientoId);
                if (mov) {
                    reset({
                        tipo_movimiento: mov.tipo_movimiento,
                        categoria: mov.categoria,
                        descripcion: mov.descripcion,
                        monto: mov.monto?.toString() ?? "",
                        fecha_movimiento: mov.fecha_movimiento
                            ? mov.fecha_movimiento.split("T")[0]
                            : "",
                    });
                }
                setLoading(false);
            };
            fetchData();
        }
    }, [movimientoId, presupuestoId, reset]);

    const onSubmit = async (formData) => {
        setLoading(true);
        const payload = {
            id_presupuesto: presupuestoId,
            tipo_movimiento: formData.tipo_movimiento,
            categoria: formData.categoria,
            descripcion: formData.descripcion,
            monto: parseFloat(formData.monto),
            fecha_movimiento: formData.fecha_movimiento
                ? new Date(formData.fecha_movimiento)
                : null,
        };

        try {
            if (movimientoId) {
                await updateMovimientoFinanciero(movimientoId, payload);
                alert("Movimiento actualizado");
            } else {
                await createMovimientoFinanciero(payload);
                alert("Movimiento creado");
            }
            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (err) {
            console.error(err);
            alert("Error al guardar movimiento");
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
                <label className="block font-semibold">Tipo de Movimiento</label>
                <select
                    {...register("tipo_movimiento", { required: true })}
                    className="w-full border px-4 py-2 rounded"
                    disabled={loading}
                >
                    <option value="">Seleccione...</option>
                    <option value="INGRESO">INGRESO</option>
                    <option value="EGRESO">EGRESO</option>
                </select>
                {errors.tipo_movimiento && (
                    <p className="text-red-500">Campo obligatorio</p>
                )}
            </div>

            <div>
                <label className="block font-semibold">Categoría</label>
                <input
                    {...register("categoria", { required: true })}
                    className="w-full border px-4 py-2 rounded"
                    disabled={loading}
                />
                {errors.categoria && (
                    <p className="text-red-500">Campo obligatorio</p>
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
                <label className="block font-semibold">Monto (Bs.)</label>
                <input
                    type="number"
                    step="0.01"
                    {...register("monto", { required: true })}
                    className="w-full border px-4 py-2 rounded"
                    disabled={loading}
                />
                {errors.monto && <p className="text-red-500">Campo obligatorio</p>}
            </div>

            <div>
                <label className="block font-semibold">Fecha Movimiento</label>
                <input
                    type="date"
                    {...register("fecha_movimiento", { required: true })}
                    className="w-full border px-4 py-2 rounded"
                    disabled={loading}
                />
                {errors.fecha_movimiento && (
                    <p className="text-red-500">Campo obligatorio</p>
                )}
            </div>

            <button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                disabled={loading}
            >
                {movimientoId ? "Guardar Cambios" : "Crear Movimiento"}
            </button>
        </form>
    );
}
