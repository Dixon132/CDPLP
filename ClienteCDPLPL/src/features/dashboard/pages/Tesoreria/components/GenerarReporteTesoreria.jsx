// src/pages/dashboard/pages/Tesoreria/GenerarReporteTesoreria.jsx
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";


import {
    getAllPresupuestos, getPresupuestosSummaryReport,
    getPresupuestoDetailReport, getMovimientosSummaryReport
} from "../../../services/tesoreria";

// Componente principal
export default function GenerarReporteTesoreria({ onClose }) {
    // 1) Control general de “tabs”: 
    //    'presupuestos' o 'movimientos'
    const [tabPrincipal, setTabPrincipal] = useState("presupuestos");

    // 2) Sub‐tabs para “presupuestos”: 
    //    'resumenPres' o 'detallePres'
    const [tabPresupuestos, setTabPresupuestos] = useState("resumenPres");

    // 3) Estado para lista de presupuestos (para el select de detalle)
    const [listaPresupuestos, setListaPresupuestos] = useState([]);
    const [loadingPres, setLoadingPres] = useState(false);

    // React Hook Form para todos los formularios:
    const { register, handleSubmit, reset, watch } = useForm({
        defaultValues: {
            // Para resumen presupuestos:
            fecha_inicio_pres: "",
            fecha_fin_pres: "",
            // Para detalle presupuesto:
            id_presupuesto: "",
            // Para movimientos:
            fecha_inicio_mov: "",
            fecha_fin_mov: "",
        },
    });

    // 4) Cargar la lista de presupuestos (solo para el select de detalle)
    useEffect(() => {
        if (tabPrincipal === "presupuestos" && tabPresupuestos === "detallePres") {
            // Si cambiamos a “Detalle de Presupuesto”, traemos la lista mínima
            setLoadingPres(true);
            getAllPresupuestos({ page: 1, limit: 1000, search: "" }) // sin paginación para llenar el select
                .then((res) => {
                    // res.data = array de objetos con: { id_presupuesto, nombre_presupuesto, …, saldo_restante }
                    const minimal = res.data.map((p) => ({
                        id: p.id_presupuesto,
                        nombre: p.nombre_presupuesto || "",
                    }));
                    setListaPresupuestos(minimal);
                })
                .catch((err) => {
                    console.error("Error cargando lista presupuestos para reporte:", err);
                    setListaPresupuestos([]);
                })
                .finally(() => {
                    setLoadingPres(false);
                });
        }
    }, [tabPrincipal, tabPresupuestos]);

    // 5) Función para descargar PDF (común)
    const descargarPDF = (blob, filename) => {
        const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    // 6) onSubmit Resumen Presupuestos
    const onSubmitResumenPres = async (data) => {
        try {
            const params = {};
            if (data.fecha_inicio_pres) params.fecha_inicio = data.fecha_inicio_pres;
            if (data.fecha_fin_pres) params.fecha_fin = data.fecha_fin_pres;

            const blob = await getPresupuestosSummaryReport(params);
            descargarPDF(blob, "reporte_resumen_presupuestos.pdf");
            // reset para limpiar si lo deseas:
            // reset({ fecha_inicio_pres: "", fecha_fin_pres: "", id_presupuesto: "", fecha_inicio_mov: "", fecha_fin_mov: "" });
        } catch (err) {
            console.error("Error generando resumen presupuestos:", err);
            alert("Error generando reporte resumen de presupuestos.");
        }
    };

    // 7) onSubmit Detalle Presupuesto
    const onSubmitDetallePres = async (data) => {
        if (!data.id_presupuesto) {
            alert("Debes seleccionar un presupuesto.");
            return;
        }
        try {
            const id = data.id_presupuesto;
            const blob = await getPresupuestoDetailReport(id);
            const elegido = listaPresupuestos.find((p) => p.id === Number(id));
            const label = elegido ? elegido.nombre.replace(/\s+/g, "_") : id;
            descargarPDF(blob, `detalle_presupuesto_${label}.pdf`);
            // reset({ fecha_inicio_pres: "", fecha_fin_pres: "", id_presupuesto: "", fecha_inicio_mov: "", fecha_fin_mov: "" });
        } catch (err) {
            console.error("Error generando detalle presupuesto:", err);
            alert("Error generando reporte detallado de presupuesto.");
        }
    };

    // 8) onSubmit Resumen Movimientos
    const onSubmitResumenMov = async (data) => {
        try {
            const params = {};
            if (data.fecha_inicio_mov) params.fecha_inicio = data.fecha_inicio_mov;
            if (data.fecha_fin_mov) params.fecha_fin = data.fecha_fin_mov;

            const blob = await getMovimientosSummaryReport(params);
            descargarPDF(blob, "reporte_movimientos_financieros.pdf");
            // reset({ fecha_inicio_pres: "", fecha_fin_pres: "", id_presupuesto: "", fecha_inicio_mov: "", fecha_fin_mov: "" });
        } catch (err) {
            console.error("Error generando reporte movimientos:", err);
            alert("Error generando reporte de movimientos financieros.");
        }
    };

    return (
        <div className="p-4 bg-white rounded shadow-lg max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl font-semibold text-center">Generar Reporte Tesorería</h2>

            {/* Tab Principal */}
            <div className="flex justify-center space-x-4">
                <button
                    onClick={() => {
                        setTabPrincipal("presupuestos");
                        setTabPresupuestos("resumenPres");
                        reset({
                            fecha_inicio_pres: "",
                            fecha_fin_pres: "",
                            id_presupuesto: "",
                            fecha_inicio_mov: "",
                            fecha_fin_mov: "",
                        });
                    }}
                    className={`px-4 py-2 rounded ${tabPrincipal === "presupuestos"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-black hover:bg-gray-300"
                        }`}
                >
                    Presupuestos
                </button>
                <button
                    onClick={() => {
                        setTabPrincipal("movimientos");
                        reset({
                            fecha_inicio_pres: "",
                            fecha_fin_pres: "",
                            id_presupuesto: "",
                            fecha_inicio_mov: "",
                            fecha_fin_mov: "",
                        });
                    }}
                    className={`px-4 py-2 rounded ${tabPrincipal === "movimientos"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-black hover:bg-gray-300"
                        }`}
                >
                    Movimientos
                </button>
            </div>

            {/* ============================================
            1) REPORTES DE PRESUPUESTOS
         ============================================ */}
            {tabPrincipal === "presupuestos" && (
                <div className="space-y-4">
                    {/* Sub‐Tabs para Presupuestos */}
                    <div className="flex justify-center space-x-4 mb-4">
                        <button
                            onClick={() => {
                                setTabPresupuestos("resumenPres");
                                reset({
                                    fecha_inicio_pres: "",
                                    fecha_fin_pres: "",
                                    id_presupuesto: "",
                                    fecha_inicio_mov: "",
                                    fecha_fin_mov: "",
                                });
                            }}
                            className={`px-4 py-2 rounded ${tabPresupuestos === "resumenPres"
                                    ? "bg-green-600 text-white"
                                    : "bg-gray-200 text-black hover:bg-gray-300"
                                }`}
                        >
                            Resumen Presupuestos
                        </button>
                        <button
                            onClick={() => {
                                setTabPresupuestos("detallePres");
                                reset({
                                    fecha_inicio_pres: "",
                                    fecha_fin_pres: "",
                                    id_presupuesto: "",
                                    fecha_inicio_mov: "",
                                    fecha_fin_mov: "",
                                });
                            }}
                            className={`px-4 py-2 rounded ${tabPresupuestos === "detallePres"
                                    ? "bg-green-600 text-white"
                                    : "bg-gray-200 text-black hover:bg-gray-300"
                                }`}
                        >
                            Detalle Presupuesto
                        </button>
                    </div>

                    {/* 1.1) Form “Resumen Presupuestos” */}
                    {tabPresupuestos === "resumenPres" && (
                        <form
                            onSubmit={handleSubmit(onSubmitResumenPres)}
                            className="space-y-4 p-4 border rounded"
                        >
                            <h3 className="text-lg font-semibold">Resumen de Presupuestos entre Fechas</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-semibold">Fecha Inicio</label>
                                    <input
                                        type="date"
                                        {...register("fecha_inicio_pres")}
                                        className="w-full border px-3 py-2 rounded"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold">Fecha Fin</label>
                                    <input
                                        type="date"
                                        {...register("fecha_fin_pres")}
                                        className="w-full border px-3 py-2 rounded"
                                    />
                                </div>
                            </div>
                            <div className="text-center pt-4">
                                <button
                                    type="submit"
                                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                                >
                                    Generar PDF Resumen Presupuestos
                                </button>
                            </div>
                        </form>
                    )}

                    {/* 1.2) Form “Detalle Presupuesto” */}
                    {tabPresupuestos === "detallePres" && (
                        <form
                            onSubmit={handleSubmit(onSubmitDetallePres)}
                            className="space-y-4 p-4 border rounded"
                        >
                            <h3 className="text-lg font-semibold">Detalle de un Presupuesto</h3>
                            <div>
                                <label className="block font-semibold mb-1">Seleccione un Presupuesto</label>
                                <select
                                    {...register("id_presupuesto")}
                                    className="w-full border px-3 py-2 rounded"
                                    disabled={loadingPres}
                                    defaultValue=""
                                >
                                    <option value="">-- Elige un presupuesto --</option>
                                    {listaPresupuestos.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="text-center pt-4">
                                <button
                                    type="submit"
                                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                                >
                                    Generar PDF Detalle Presupuesto
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            {/* ============================================
            2) REPORTES DE MOVIMIENTOS FINANCIEROS
         ============================================ */}
            {tabPrincipal === "movimientos" && (
                <div className="space-y-4 p-4 border rounded">
                    <h3 className="text-lg font-semibold mb-2">Movimientos Financieros entre Fechas</h3>
                    <form onSubmit={handleSubmit(onSubmitResumenMov)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block font-semibold">Fecha Inicio</label>
                                <input
                                    type="date"
                                    {...register("fecha_inicio_mov")}
                                    className="w-full border px-3 py-2 rounded"
                                />
                            </div>
                            <div>
                                <label className="block font-semibold">Fecha Fin</label>
                                <input
                                    type="date"
                                    {...register("fecha_fin_mov")}
                                    className="w-full border px-3 py-2 rounded"
                                />
                            </div>
                        </div>
                        <div className="text-center pt-4">
                            <button
                                type="submit"
                                className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded"
                            >
                                Generar PDF Movimientos Financieros
                            </button>
                        </div>
                    </form>
                </div>
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
