// src/pages/dashboard/pages/ActividadesSociales/GenerarReporteActividadesSociales.jsx
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import {getActividadesSocialesMinimal,
    getActividadSocialDetailReport,
    getActividadesSocialesSummaryReport } from "../../../services/ac-sociales";

export default function GenerarReporteActividadesSociales() {
    // 1) Qué pestaña está activa: "resumen" o "detalle"
    const [tipoReporte, setTipoReporte] = useState("resumen");

    // 2) Estado para cargar la lista de actividades (mínimal)
    const [opcionesAct, setOpcionesAct] = useState([]);
    const [seleccionAct, setSeleccionAct] = useState("");

    // 3) React Hook Form para los dos subformularios
    const { register, handleSubmit, reset } = useForm({
        defaultValues: {
            // Para el resumen
            fecha_inicio: "",
            fecha_fin: "",
            // Para el detalle
            id_actividad_social: "",
        },
    });

    // 4) Cargar lista mínima de actividades sociales al montar
    useEffect(() => {
        const fetchActividades = async () => {
            try {
                const lista = await getActividadesSocialesMinimal();
                // lista = [ { id: 1, nombre: "Campaña Solidaria" }, … ]
                // Transformar a { value, label } no es obligatorio: aquí usaremos un select nativo
                setOpcionesAct(lista);
            } catch (err) {
                console.error("Error cargando lista actividades sociales:", err);
                setOpcionesAct([]);
            }
        };
        fetchActividades();
    }, []);

    // 5) Función para descargar el PDF de Resumen (entre fechas)
    const onSubmitResumen = async (data) => {
        try {
            // Sólo mandamos fechas si vienen no vacías
            const params = {};
            if (data.fecha_inicio) params.fecha_inicio = data.fecha_inicio;
            if (data.fecha_fin) params.fecha_fin = data.fecha_fin;

            const blob = await getActividadesSocialesSummaryReport(params);
            const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "resumen_actividades_sociales.pdf");
            document.body.appendChild(link);
            link.click();
            link.remove();

            // Opcional: si quieres limpiar el formulario después de descargarlo:
            // reset({ fecha_inicio: "", fecha_fin: "" });
        } catch (err) {
            console.error("Error generando resumen actividades sociales:", err);
            alert("Hubo un error generando el reporte resumen de actividades sociales.");
        }
    };

    // 6) Función para descargar el PDF Detallado (una sola actividad)
    const onSubmitDetalle = async (data) => {
        if (!data.id_actividad_social) {
            alert("Debes seleccionar una actividad social.");
            return;
        }
        try {
            const id = data.id_actividad_social;
            const blob = await getActividadSocialDetailReport(id);
            const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
            const link = document.createElement("a");
            link.href = url;

            // Buscamos el nombre en opcionesAct para nombrar el PDF
            const elegido = opcionesAct.find((a) => a.id === Number(id));
            const nombreLabel = elegido ? elegido.nombre.replace(/\s+/g, "_") : id;

            link.setAttribute("download", `detalle_actividad_social_${nombreLabel}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            // Opcional: limpiar el formulario:
            // reset({ id_actividad_social: "" });
        } catch (err) {
            console.error("Error generando detalle actividad social:", err);
            alert("Hubo un error generando el reporte detallado de la actividad social.");
        }
    };

    return (
        <div className="space-y-6 p-4 bg-white rounded shadow-lg max-w-xl mx-auto">
            <h2 className="text-xl font-semibold text-center mb-4">
                Generar Reporte de Actividades Sociales
            </h2>

            {/* Botones para cambiar entre “Resumen” y “Detalle” */}
            <div className="flex justify-center space-x-4">
                <button
                    onClick={() => {
                        setTipoReporte("resumen");
                        // Opcional: limpiar los campos de detalle
                        reset({ fecha_inicio: "", fecha_fin: "", id_actividad_social: "" });
                    }}
                    className={`px-4 py-2 rounded ${tipoReporte === "resumen"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-black hover:bg-gray-300"
                        }`}
                >
                    Resumen entre Fechas
                </button>
                <button
                    onClick={() => {
                        setTipoReporte("detalle");
                        // Opcional: limpiar los campos de resumen
                        reset({ fecha_inicio: "", fecha_fin: "", id_actividad_social: "" });
                    }}
                    className={`px-4 py-2 rounded ${tipoReporte === "detalle"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-black hover:bg-gray-300"
                        }`}
                >
                    Detalle por Actividad
                </button>
            </div>

            {/* Formulario “Resumen entre Fechas” */}
            {tipoReporte === "resumen" && (
                <form onSubmit={handleSubmit(onSubmitResumen)} className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block font-semibold">Fecha Inicio</label>
                            <input
                                type="date"
                                {...register("fecha_inicio")}
                                className="w-full border px-3 py-2 rounded"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold">Fecha Fin</label>
                            <input
                                type="date"
                                {...register("fecha_fin")}
                                className="w-full border px-3 py-2 rounded"
                            />
                        </div>
                    </div>
                    <div className="text-center pt-4">
                        <button
                            type="submit"
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                        >
                            Generar PDF Resumen
                        </button>
                    </div>
                </form>
            )}

            {/* Formulario “Detalle por Actividad” */}
            {tipoReporte === "detalle" && (
                <form onSubmit={handleSubmit(onSubmitDetalle)} className="space-y-4 pt-4">
                    <div>
                        <label className="block font-semibold mb-1">Seleccione una Actividad</label>
                        <select
                            {...register("id_actividad_social")}
                            className="w-full border px-3 py-2 rounded"
                            defaultValue=""
                        >
                            <option value="">-- Elige una actividad social --</option>
                            {opcionesAct.map((act) => (
                                <option key={act.id} value={act.id}>
                                    {act.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="text-center pt-4">
                        <button
                            type="submit"
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                        >
                            Generar PDF Detallado
                        </button>
                    </div>
                </form>
            )}

           
        </div>
    );
}
