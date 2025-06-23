// src/pages/dashboard/pages/ActividadesInstitucionales/GenerarReporteActividadesInst.jsx
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import {
    getActividadesInstMinimal, getActividadInstDetailReport,
    getActividadesInstSummaryReport,
} from "../../../services/ac-institucionales";

export default function GenerarReporteActividadesInst({ onClose }) {
    // 1) Controlar cuál “pestaña” está activa: "resumen" o "detalle"
    const [tipoReporte, setTipoReporte] = useState("resumen");

    // 2) Estado para la lista mínima de actividades institucionales
    const [opcionesInst, setOpcionesInst] = useState([]);
    const [loadingInst, setLoadingInst] = useState(false);

    // 3) React Hook Form
    const { register, handleSubmit, reset } = useForm({
        defaultValues: {
            fecha_inicio: "",
            fecha_fin: "",
            id_actividad: "",
        },
    });

    // 4) Al montar, traemos la lista mínima de actividades institucionales
    useEffect(() => {
        const fetchInsts = async () => {
            setLoadingInst(true);
            try {
                const lista = await getActividadesInstMinimal();
                // lista = [ { id: 1, nombre: "Congreso X" }, … ]
                setOpcionesInst(lista);
            } catch (err) {
                console.error("Error cargando lista actividades institucionales:", err);
                setOpcionesInst([]);
            } finally {
                setLoadingInst(false);
            }
        };
        fetchInsts();
    }, []);
    console.log(opcionesInst)
    // 5) Función para descargar Resumen entre Fechas
    const onSubmitResumen = async (data) => {
        try {
            const params = {};
            if (data.fecha_inicio) params.fecha_inicio = data.fecha_inicio;
            if (data.fecha_fin) params.fecha_fin = data.fecha_fin;

            const blob = await getActividadesInstSummaryReport(params);
            const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "resumen_actividades_institucionales.pdf");
            document.body.appendChild(link);
            link.click();
            link.remove();

            // Opcional: resetear el formulario
            // reset({ fecha_inicio: "", fecha_fin: "", id_actividad: "" });
        } catch (err) {
            console.error("Error generando resumen actividades inst:", err);
            alert("Hubo un error generando el resumen de actividades institucionales.");
        }
    };

    // 6) Función para descargar Detalle de 1 Actividad
    const onSubmitDetalle = async (data) => {
        if (!data.id_actividad) {
            alert("Debes seleccionar una actividad institucional.");
            return;
        }
        try {
            const id = data.id_actividad;
            const blob = await getActividadInstDetailReport(id);
            const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
            const link = document.createElement("a");
            link.href = url;

            // Buscar el nombre en opcionesInst para nombrar el PDF
            const elegido = opcionesInst.find((a) => a.id === Number(id));
            const nombreLabel = elegido ? elegido.nombre.replace(/\s+/g, "_") : id;

            link.setAttribute("download", `detalle_actividad_inst_${nombreLabel}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            // Opcional: reset({ fecha_inicio: "", fecha_fin: "", id_actividad: "" });
        } catch (err) {
            console.error("Error generando detalle actividad inst:", err);
            alert("Hubo un error generando el reporte detallado de actividad institucional.");
        }
    };

    return (
        <div className="space-y-6 p-4 bg-white rounded shadow-lg max-w-xl mx-auto">
            <h2 className="text-xl font-semibold text-center mb-4">
                Generar Reporte Actividades Institucionales
            </h2>

            {/* 7) Botones para cambiar entre “Resumen” y “Detalle” */}
            <div className="flex justify-center space-x-4">
                <button
                    onClick={() => {
                        setTipoReporte("resumen");
                        reset({ fecha_inicio: "", fecha_fin: "", id_actividad: "" });
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
                        reset({ fecha_inicio: "", fecha_fin: "", id_actividad: "" });
                    }}
                    className={`px-4 py-2 rounded ${tipoReporte === "detalle"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-black hover:bg-gray-300"
                        }`}
                >
                    Detalle por Actividad
                </button>
            </div>

            {/* 8) Formulario “Resumen entre Fechas” */}
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

            {/* 9) Formulario “Detalle por Actividad” */}
            {tipoReporte === "detalle" && (
                <form onSubmit={handleSubmit(onSubmitDetalle)} className="space-y-4 pt-4">
                    <div>
                        <label className="block font-semibold mb-1">Seleccione una Actividad</label>
                        <select
                            {...register("id_actividad")}
                            className="w-full border px-3 py-2 rounded"
                            disabled={loadingInst}
                            defaultValue=""
                        >
                            <option value="">-- Elige una actividad institucional --</option>

                            {opcionesInst.map((act) => (
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
                            Generar PDF Detalle
                        </button>
                    </div>
                </form>
            )}

            {/* Botón Cerrar */}
            <div className="text-right">
                <button
                    onClick={onClose}
                    className="mt-4 bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
                >
                    Cerrar
                </button>
            </div>
        </div>
    );
}
