import React from "react";
import { Lock, MapPin } from "lucide-react";

const IRECConfig = ({ analysis, onUpdate }) => {
    const isEditable = analysis.status === "created";

    return (
        <div className="space-y-6">
            <div className="bg-[#f2f3f5] border border-[#eaeded] p-4 rounded">
                <h3 className="text-sm font-semibold text-[#16191f] mb-4 flex items-center gap-2">
                    {!isEditable && <Lock className="w-4 h-4 text-[#879196]" />}
                    Configuración del análisis
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-[#879196] uppercase mb-1">
                            Nombre
                        </label>
                        <p className="text-sm text-[#16191f]">{analysis.name}</p>
                    </div>

                    {analysis.description && (
                        <div>
                            <label className="block text-xs font-semibold text-[#879196] uppercase mb-1">
                                Descripción
                            </label>
                            <p className="text-sm text-[#16191f]">{analysis.description}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-[#879196] uppercase mb-2">
                            Instituciones ({analysis.institutions?.length || 0})
                        </label>
                        {analysis.institutions && analysis.institutions.length > 0 ? (
                            <div className="space-y-2">
                                {analysis.institutions.map(inst => (
                                    <div
                                        key={inst.id}
                                        className="flex items-center gap-2 p-2 bg-white border border-[#d5dbdb] rounded"
                                    >
                                        <MapPin className="w-4 h-4 text-[#ff9900]" />
                                        <div>
                                            <p className="text-sm font-medium text-[#16191f]">{inst.name}</p>
                                            <p className="text-xs text-[#879196]">{inst.acronym}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-[#879196]">Sin instituciones configuradas</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-[#879196] uppercase mb-1">
                                Radio de búsqueda
                            </label>
                            <p className="text-sm text-[#16191f]">{analysis.radius_km} km</p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-[#879196] uppercase mb-1">
                                Modo
                            </label>
                            <p className="text-sm text-[#16191f]">
                                {analysis.mode === "simulation" ? "Simulación" : "Real"}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-[#879196] uppercase mb-1">
                                Tipo de análisis
                            </label>
                            <p className="text-sm text-[#16191f]">
                                {analysis.analysis_type === "quick" ? "Rápido (solo NLP)" : "Completo (NLP + Visión + Comunidad)"}
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-[#879196] uppercase mb-1">
                                Plataformas
                            </label>
                            <p className="text-sm text-[#16191f]">
                                {analysis.platforms?.length || 0} seleccionadas
                            </p>
                        </div>
                    </div>

                    {analysis.date_range_start && analysis.date_range_end && (
                        <div>
                            <label className="block text-xs font-semibold text-[#879196] uppercase mb-1">
                                Rango de fechas
                            </label>
                            <p className="text-sm text-[#16191f]">
                                {analysis.date_range_start} → {analysis.date_range_end}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {!isEditable && (
                <div className="bg-[#f1f6fc] border border-[#d5dbdb] p-4 rounded flex gap-3">
                    <Lock className="w-5 h-5 text-[#0073bb] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[#545b64]">
                        La configuración está bloqueada porque el análisis ya ha sido ejecutado. 
                        Para cambiar la configuración, crea un nuevo análisis.
                    </p>
                </div>
            )}
        </div>
    );
};

export default IRECConfig;
