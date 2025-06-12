// src/pages/dashboard/pages/Correspondencia/GenerarReporteCorrespondencia.jsx
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
    getAllUsuariosMinimal,
    getCorrespondenciaReport,
} from "../../../services/correspondencia";

export default function GenerarReporteCorrespondencia({ onClose }) {
    const [loadingDestinatarios, setLoadingDestinatarios] = useState(false);
    const [opcionesUsuarios, setOpcionesUsuarios] = useState([]);
    const [loading, setLoading] = useState(false);

    // React Hook Form
    const { register, handleSubmit, reset } = useForm({
        defaultValues: {
            fecha_envio_inicio: "",
            fecha_envio_fin: "",
            fecha_recibido_inicio: "",
            fecha_recibido_fin: "",
            asunto: "",
            resumen: "",
            id_destinatario: "",
        },
    });

    // Cargar lista de usuarios y mapearlos correctamente
    useEffect(() => {
        const fetchUsuarios = async () => {
            setLoadingDestinatarios(true);
            try {
                console.log("Cargando usuarios...");
                const listado = await getAllUsuariosMinimal();
                console.log("Usuarios recibidos:", listado);
                
                if (!listado || !Array.isArray(listado)) {
                    console.error("La respuesta no es un array válido:", listado);
                    return;
                }

                // El servicio getAllUsuariosMinimal ya devuelve { value, label }
                console.log("Usuarios recibidos:", listado);
                setOpcionesUsuarios(listado);
                
            } catch (err) {
                console.error("Error cargando usuarios minimal:", err);
                alert("Error al cargar la lista de usuarios");
            } finally {
                setLoadingDestinatarios(false);
            }
        };
        fetchUsuarios();
    }, []);

    // Función que se ejecuta al hacer submit del formulario
    const onSubmit = async (data) => {
        try {
            setLoading(true);
            console.log("Datos del formulario:", data);
            
            // Construir parámetros solo con valores no vacíos
            const params = {};
            
            if (data.fecha_envio_inicio) params.fecha_envio_inicio = data.fecha_envio_inicio;
            if (data.fecha_envio_fin) params.fecha_envio_fin = data.fecha_envio_fin;
            if (data.fecha_recibido_inicio) params.fecha_recibido_inicio = data.fecha_recibido_inicio;
            if (data.fecha_recibido_fin) params.fecha_recibido_fin = data.fecha_recibido_fin;
            if (data.asunto) params.asunto = data.asunto;
            if (data.resumen) params.resumen = data.resumen;
            if (data.id_destinatario) params.id_destinatario = Number(data.id_destinatario);
            
            
            
            const response = await getCorrespondenciaReport(params);
            
            
            // Verificar si la respuesta es un blob o necesita conversión
            let blob;
            if (response instanceof Blob) {
                blob = response;
            } else if (response.data && response.data instanceof Blob) {
                blob = response.data;
            } else if (response.data) {
                blob = new Blob([response.data], { type: "application/pdf" });
            } else {
                blob = new Blob([response], { type: "application/pdf" });
            }

            // Crear y descargar el archivo
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "reporte_correspondencia.pdf");
            document.body.appendChild(link);
            link.click();
            
            // Limpiar
            link.remove();
            window.URL.revokeObjectURL(url);
            
            console.log("Descarga completada");
            
        } catch (err) {
            console.error("Error generando reporte de correspondencia:", err);
            alert(`Error generando el reporte: ${err.message || 'Error desconocido'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 p-4 bg-white rounded shadow-lg max-w-xl mx-auto">
            <h2 className="text-xl font-semibold text-center mb-4">
                Generar Reporte de Correspondencia
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Filtro: Fecha Envío (inicio / fin) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block font-semibold mb-1">Fecha Envío (Inicio)</label>
                        <input
                            type="date"
                            {...register("fecha_envio_inicio")}
                            className="w-full border px-3 py-2 rounded"
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <label className="block font-semibold mb-1">Fecha Envío (Fin)</label>
                        <input
                            type="date"
                            {...register("fecha_envio_fin")}
                            className="w-full border px-3 py-2 rounded"
                            disabled={loading}
                        />
                    </div>
                </div>

                {/* Filtro: Fecha Recibido (inicio / fin) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block font-semibold mb-1">Fecha Recibido (Inicio)</label>
                        <input
                            type="date"
                            {...register("fecha_recibido_inicio")}
                            className="w-full border px-3 py-2 rounded"
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <label className="block font-semibold mb-1">Fecha Recibido (Fin)</label>
                        <input
                            type="date"
                            {...register("fecha_recibido_fin")}
                            className="w-full border px-3 py-2 rounded"
                            disabled={loading}
                        />
                    </div>
                </div>

                {/* Filtro: Asunto */}
                <div>
                    <label className="block font-semibold mb-1">Asunto (contiene)</label>
                    <input
                        type="text"
                        {...register("asunto")}
                        className="w-full border px-3 py-2 rounded"
                        placeholder="Filtrar por texto en el asunto"
                        disabled={loading}
                    />
                </div>

                {/* Filtro: Resumen */}
                <div>
                    <label className="block font-semibold mb-1">Resumen (contiene)</label>
                    <input
                        type="text"
                        {...register("resumen")}
                        className="w-full border px-3 py-2 rounded"
                        placeholder="Filtrar por texto en el resumen"
                        disabled={loading}
                    />
                </div>

                {/* Filtro: Destinatario (select nativo) */}
                <div>
                    <label className="block font-semibold mb-1">Destinatario</label>
                    {loadingDestinatarios ? (
                        <div className="w-full border px-3 py-2 rounded bg-gray-100">
                            Cargando opciones...
                        </div>
                    ) : (
                        <select
                            {...register("id_destinatario")}
                            className="w-full border px-3 py-2 rounded"
                            disabled={loading}
                            defaultValue=""
                        >
                            <option value="">-- Cualquiera --</option>
                            {opcionesUsuarios.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Botón de enviar */}
                <div className="text-center pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded ${
                            loading ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                    >
                        {loading ? "Generando..." : "Generar Reporte PDF"}
                    </button>
                </div>
            </form>

            {/* Botón Cerrar */}
            <div className="text-right">
                <button
                    onClick={onClose}
                    disabled={loading}
                    className={`mt-4 bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded ${
                        loading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                >
                    Cerrar
                </button>
            </div>
        </div>
    );
}