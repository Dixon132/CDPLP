import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { 
    Handshake, 
    Calendar, 
    AlignLeft, 
    Activity, 
    CheckCircle2, 
    AlertCircle, 
    X,
    Save
} from 'lucide-react';
import { getConvenioById, updateConvenioById } from "../../../services/convenios";

export default function ModificarConvenio({ id, onClose, onSuccess }) {
    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm();

    const [loadingFetch, setLoadingFetch] = useState(true);
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const hoy = new Date().toISOString().split("T")[0];
    const fechaInicio = watch("fecha_inicio");

    // Cargar datos del convenio
    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await getConvenioById(id);
                reset({
                    nombre: res.nombre || "",
                    descripcion: res.descripcion || "",
                    fecha_inicio: res.fecha_inicio?.slice(0, 10) || "",
                    fecha_fin: res.fecha_fin?.slice(0, 10) || "",
                    estado: res.estado || "",
                });
                setLoadingFetch(false);
            } catch (error) {
                console.error("Error al obtener convenio:", error);
                setErrorMsg("No se pudo cargar la información del convenio.");
                setLoadingFetch(false);
            }
        };
        if (id) fetch();
    }, [id, reset]);

    const onSubmit = async (data) => {
        setLoadingSubmit(true);
        setErrorMsg("");
        
        try {
            await updateConvenioById(id, data);
            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (error) {
            console.error("Error al actualizar convenio:", error);
            setErrorMsg("Ocurrió un error al guardar los cambios.");
        } finally {
            setLoadingSubmit(false);
        }
    };

    if (loadingFetch) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-900 rounded-3xl border border-white/10">
                <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4"></div>
                <p className="text-purple-200 font-medium">Cargando convenio...</p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="relative z-10 p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl blur opacity-75 animate-pulse"></div>
                            <div className="relative p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-xl">
                                <Handshake className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-pink-200">
                                Editar Convenio
                            </h2>
                            <p className="text-gray-400 text-sm">Modifica los detalles de la alianza</p>
                        </div>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X className="w-6 h-6 text-gray-400 hover:text-white" />
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Campos Principales */}
                    <div className="grid grid-cols-1 gap-6">
                        {/* Nombre */}
                        <div className="relative z-10 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg">
                                    <AlignLeft className="w-4 h-4 text-purple-300" />
                                </div>
                                <label className="text-sm font-semibold text-white">Nombre del Convenio</label>
                            </div>
                            <input
                                type="text"
                                {...register("nombre", { required: "El nombre es obligatorio" })}
                                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                            />
                            {errors.nombre && (
                                <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {errors.nombre.message}
                                </p>
                            )}
                        </div>

                        {/* Descripción */}
                        <div className="relative z-10 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg">
                                    <AlignLeft className="w-4 h-4 text-purple-300" />
                                </div>
                                <label className="text-sm font-semibold text-white">Descripción (opcional)</label>
                            </div>
                            <textarea
                                {...register("descripcion")}
                                rows={3}
                                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all resize-none"
                            />
                        </div>
                    </div>

                    {/* Fechas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Fecha inicio */}
                        <div className="relative z-10 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg">
                                    <Calendar className="w-4 h-4 text-blue-300" />
                                </div>
                                <label className="text-sm font-semibold text-white">Fecha de Inicio</label>
                            </div>
                            <input
                                type="date"
                                {...register("fecha_inicio", {
                                    required: "La fecha de inicio es obligatoria",
                                    validate: (value) =>
                                        value >= hoy || "No puedes escoger una fecha pasada (a menos que ya estuviera guardada en el pasado)" // Se podría relajar si es edición
                                })}
                                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all [color-scheme:dark]"
                            />
                            {errors.fecha_inicio && (
                                <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {errors.fecha_inicio.message}
                                </p>
                            )}
                        </div>

                        {/* Fecha fin */}
                        <div className="relative z-10 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-lg">
                                    <Calendar className="w-4 h-4 text-pink-300" />
                                </div>
                                <label className="text-sm font-semibold text-white">Fecha de Fin (opcional)</label>
                            </div>
                            <input
                                type="date"
                                {...register("fecha_fin", {
                                    validate: (value) => {
                                        if (!value) return true;
                                        if (fechaInicio && value < fechaInicio)
                                            return "La fecha fin debe ser igual o posterior a la fecha inicio";
                                        return true;
                                    },
                                })}
                                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all [color-scheme:dark]"
                            />
                            {errors.fecha_fin && (
                                <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {errors.fecha_fin.message}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Estado */}
                    <div className="relative z-10 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg">
                                <Activity className="w-4 h-4 text-green-300" />
                            </div>
                            <label className="text-sm font-semibold text-white">Estado del Convenio</label>
                        </div>
                        <select
                            {...register("estado", { required: "El estado es obligatorio" })}
                            className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all appearance-none cursor-pointer"
                        >
                            <option value="ACTIVO" className="bg-slate-900">ACTIVO</option>
                            <option value="INACTIVO" className="bg-slate-900">INACTIVO</option>
                        </select>
                    </div>

                    {/* Error Banner */}
                    {errorMsg && (
                        <div className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-400/40 rounded-2xl text-red-200">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                            <p className="text-sm font-medium">{errorMsg}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl font-semibold text-white bg-white/10 hover:bg-white/20 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loadingSubmit}
                            className="group relative px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/40 transition-all overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                            {loadingSubmit ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
