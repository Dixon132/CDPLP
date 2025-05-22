// src/components/FilterForm.jsx
import { useForm, Controller } from 'react-hook-form';
import { useState } from 'react';



const FilterForm = () => {
    const { handleSubmit, control } = useForm();

    const onSubmit = data => {
        const qs = Object.entries(data)
            .filter(([_, v]) => v != null && v !== '')
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');
        // Abrimos el PDF en nueva pestaña
        window.open(`/api/colegiados/colegiado/report?${qs}`, '_blank');
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 max-w-md mx-auto space-y-4">
            {/* Búsqueda libre */}
            <div>
                <label className="block mb-1">Buscar (nombre, carnet, etc.)</label>
                <Controller
                    name="search"
                    control={control}
                    defaultValue=""
                    render={({ field }) => (
                        <input {...field} type="text" className="border p-2 rounded w-full" />
                    )}
                />
            </div>

            {/* Estado */}
            <div>
                <label className="block mb-1">Estado</label>
                <Controller
                    name="estado"
                    control={control}
                    defaultValue=""
                    render={({ field }) => (
                        <select {...field} className="border p-2 rounded w-full">
                            <option value="">— Todos —</option>
                            <option value="ACTIVO">ACTIVO</option>
                            <option value="INACTIVO">INACTIVO</option>
                        </select>
                    )}
                />
            </div>

            {/* Fecha inscripción desde */}
            <div>
                <label className="block mb-1">Inscripción desde</label>
                <Controller
                    name="fecha_inscripcion_ini"
                    control={control}
                    defaultValue=""
                    render={({ field }) => (
                        <input {...field} type="date" className="border p-2 rounded w-full" />
                    )}
                />
            </div>

            {/* Fecha inscripción hasta */}
            <div>
                <label className="block mb-1">Inscripción hasta</label>
                <Controller
                    name="fecha_inscripcion_fin"
                    control={control}
                    defaultValue=""
                    render={({ field }) => (
                        <input {...field} type="date" className="border p-2 rounded w-full" />
                    )}
                />
            </div>

            <button
                type="submit"
                className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
                Generar PDF Colegiados
            </button>
        </form>
    );
}


export default FilterForm