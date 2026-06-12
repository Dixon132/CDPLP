// src/pages/dashboard/pages/ActividadesInstitucionales/GenerarReporteActividadesInst.jsx
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import {
    getActividadesInstMinimal, getActividadInstDetailReport,
    getActividadesInstSummaryReport,
} from "../../../services/ac-institucionales";
import Alerts from "../../../components/Alerts";

export default function GenerarReporteActividadesInst({ onClose }) {
    const [alert, setAlert] = useState(false);
    const [alertType, setAlertType] = useState("success");
    const [alertMessage, setAlertMessage] = useState("");

    const showSuccess = (msg) => {
        setAlertType("success");
        setAlertMessage(msg);
        setAlert(true);
        setTimeout(() => setAlert(false), 3000);
    };

    const showError = (msg) => {
        setAlertType("error");
        setAlertMessage(msg);
        setAlert(true);
        setTimeout(() => setAlert(false), 3000);
    };

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
            showError("Hubo un error generando el resumen de actividades institucionales.");
        }
    };

    // 6) Función para descargar Detalle de 1 Actividad
    const onSubmitDetalle = async (data) => {
        if (!data.id_actividad) {
            showError("Debes seleccionar una actividad institucional.");
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
            showError("Hubo un error generando el reporte detallado de actividad institucional.");
        }
    };

    return (
        <div className="space-y-6 w-full mx-auto">
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
                        ? "bg-slate-800 text-white font-bold uppercase tracking-widest text-[10px] shadow-sm"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold uppercase tracking-widest text-[10px] shadow-sm"
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
                        ? "bg-slate-800 text-white font-bold uppercase tracking-widest text-[10px] shadow-sm"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold uppercase tracking-widest text-[10px] shadow-sm"
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
                                className="w-full border border-slate-200 bg-white px-3 py-2 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold">Fecha Fin</label>
                            <input
                                type="date"
                                {...register("fecha_fin")}
                                className="w-full border border-slate-200 bg-white px-3 py-2 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                            />
                        </div>
                    </div>
                    <div className="text-center pt-4">
                        <button
                            type="submit"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold uppercase tracking-widest text-[10px] px-4 py-2 rounded-xl shadow-sm transition-all"
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
                            className="w-full border border-slate-200 bg-white px-3 py-2 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
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
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold uppercase tracking-widest text-[10px] px-4 py-2 rounded-xl shadow-sm transition-all"
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
                    className="mt-4 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold uppercase tracking-widest text-[10px] px-4 py-2 rounded-xl shadow-sm transition-all"
                >
                    Cerrar
                </button>
            </div>
            <Alerts type={alertType} message={alertMessage} show={alert} onClose={() => setAlert(false)} />
        </div>
    );
}

