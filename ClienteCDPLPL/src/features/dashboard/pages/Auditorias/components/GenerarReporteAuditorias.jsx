import React, { useState } from "react";
import { useForm } from "react-hook-form";

import { getAuditoriasReport } from "../../../services/auditorias";
import Alerts from "../../../components/Alerts";
import { MODULOS, ACCIONES } from "../constants";

export default function GenerarReporteAuditorias({ onClose }) {
    const [alert, setAlert] = useState(false);
    const [alertType, setAlertType] = useState("success");
    const [alertMessage, setAlertMessage] = useState("");

    const showError = (msg) => {
        setAlertType("error");
        setAlertMessage(msg);
        setAlert(true);
        setTimeout(() => setAlert(false), 3000);
    };

    const { register, handleSubmit } = useForm({
        defaultValues: {
            search: "",
            modulo: "",
            accion: "",
            fecha_desde: "",
            fecha_hasta: "",
        },
    });

    const onSubmit = async (data) => {
        try {
            const blob = await getAuditoriasReport({
                search: data.search,
                modulo: data.modulo,
                accion: data.accion,
                fechaDesde: data.fecha_desde,
                fechaHasta: data.fecha_hasta,
            });
            const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "informe_auditorias.pdf");
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("Error generando informe de auditorías:", err);
            showError("Hubo un error generando el informe de auditorías.");
        }
    };

    return (
        <div className="space-y-6 w-full mx-auto">
            <h2 className="text-xl font-semibold text-center mb-4">
                Generar Reporte de Auditorías
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div>
                    <label className="block font-semibold mb-1">Buscar (descripción o usuario)</label>
                    <input
                        type="text"
                        {...register("search")}
                        className="w-full border border-slate-200 bg-white px-3 py-2 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block font-semibold mb-1">Módulo</label>
                        <select
                            {...register("modulo")}
                            className="w-full border border-slate-200 bg-white px-3 py-2 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                            defaultValue=""
                        >
                            <option value="">Todos los módulos</option>
                            {MODULOS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block font-semibold mb-1">Acción</label>
                        <select
                            {...register("accion")}
                            className="w-full border border-slate-200 bg-white px-3 py-2 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                            defaultValue=""
                        >
                            <option value="">Todas las acciones</option>
                            {ACCIONES.map((a) => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block font-semibold mb-1">Fecha Desde</label>
                        <input
                            type="date"
                            {...register("fecha_desde")}
                            className="w-full border border-slate-200 bg-white px-3 py-2 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block font-semibold mb-1">Fecha Hasta</label>
                        <input
                            type="date"
                            {...register("fecha_hasta")}
                            className="w-full border border-slate-200 bg-white px-3 py-2 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                    </div>
                </div>

                <div className="text-center pt-4">
                    <button
                        type="submit"
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold uppercase tracking-widest text-[10px] px-4 py-2 rounded-xl shadow-sm transition-all"
                    >
                        Generar PDF
                    </button>
                </div>
            </form>

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
