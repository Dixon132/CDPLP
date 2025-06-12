// src/pages/dashboard/pages/Ac-institucionales/CreateActInstitucional.jsx
import React from "react";
import { useForm } from "react-hook-form";
import { createActividadInstitucional } from "../../../services/ac-institucionales";

export default function CreateActInstitucional({ onClose, onSuccess }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const onSubmit = async (formData) => {
    // Transformar fecha_programada a Date
    const payload = {
      nombre: formData.nombre,
      descripcion: formData.descripcion,
      tipo: formData.tipo,
      fecha_programada: formData.fecha_programada
        ? new Date(formData.fecha_programada)
        : null,
      costo: formData.costo ? parseFloat(formData.costo) : null,
      estado: formData.estado,
      // ignoramos id_responsable y archivo, según tu petición
    };

    try {
      await createActividadInstitucional(payload);
      alert("Actividad institucional creada correctamente");
      reset();
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err) {
      console.error(err);
      alert("Error al crear actividad institucional");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 p-4 max-w-lg mx-auto"
    >
      <div>
        <label className="block font-semibold">Nombre</label>
        <input
          {...register("nombre", { required: true })}
          className="w-full border px-4 py-2 rounded"
        />
        {errors.nombre && <p className="text-red-500">Nombre obligatorio</p>}
      </div>

      <div>
        <label className="block font-semibold">Descripción</label>
        <textarea
          {...register("descripcion")}
          className="w-full border px-4 py-2 rounded"
        />
      </div>

      <div>
        <label className="block font-semibold">Tipo</label>
        <input
          {...register("tipo", { required: true })}
          className="w-full border px-4 py-2 rounded"
        />
        {errors.tipo && <p className="text-red-500">Tipo obligatorio</p>}
      </div>

      <div>
        <label className="block font-semibold">Fecha Programada</label>
        <input
          type="date"
          {...register("fecha_programada", { required: true })}
          className="w-full border px-4 py-2 rounded"
        />
        {errors.fecha_programada && (
          <p className="text-red-500">Fecha programada obligatoria</p>
        )}
      </div>

      <div>
        <label className="block font-semibold">Costo (Bs.)</label>
        <input
          type="number"
          step="0.01"
          {...register("costo", { required: true })}
          className="w-full border px-4 py-2 rounded"
        />
        {errors.costo && <p className="text-red-500">Costo obligatorio</p>}
      </div>

      <div>
        <label className="block font-semibold">Estado</label>
        <select
          {...register("estado", { required: true })}
          className="w-full border px-4 py-2 rounded"
        >
          <option value="">Seleccione...</option>
          <option value="ACTIVO">ACTIVO</option>
          <option value="INACTIVO">INACTIVO</option>
        </select>
        {errors.estado && <p className="text-red-500">Estado obligatorio</p>}
      </div>

      <button
        type="submit"
        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
      >
        Crear
      </button>
    </form>
  );
}
