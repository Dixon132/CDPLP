import React from "react";
import Header from "../../components/Header";
import { Settings } from "lucide-react";
import Can from "../../../../components/Can";
import EspecialidadesCRUD from "./components/EspecialidadesCRUD";
import InstitucionesCRUD from "./components/InstitucionesCRUD";
import DocumentosRequeridosCRUD from "./components/DocumentosRequeridosCRUD";
import ConfiguracionPagos from "./components/ConfiguracionPagos";
import ConfiguracionFinanciera from "./components/ConfiguracionFinanciera";
import AparienciaSettings from "./components/AparienciaSettings";

const Ajustes = () => {
    return (
        <div className="space-y-6 p-6 bg-slate-50/50 min-h-full">
            {/* ✅ Header reutilizable */}
            <Header
                title="Ajustes del Sistema"
                icon={<Settings className="w-8 h-8" />}
                stats={[]}
                searchPlaceholder=""
                buttons={[]}
            />

            {/* Apariencia */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-slate-200">
                <AparienciaSettings />
            </div>

            {/* Especialidades */}
            <Can recurso="ajustes.especialidades" nivel="OBSERVADOR">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-slate-200">
                    <EspecialidadesCRUD />
                </div>
            </Can>

            {/* Instituciones */}
            <Can recurso="ajustes.instituciones" nivel="OBSERVADOR">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-slate-200">
                    <InstitucionesCRUD />
                </div>
            </Can>

            {/* Documentos Requeridos */}
            <Can recurso="ajustes.documentos_requeridos" nivel="OBSERVADOR">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-slate-200">
                    <DocumentosRequeridosCRUD />
                </div>
            </Can>

            {/* Configuración de Pagos */}
            <Can recurso="ajustes.pagos" nivel="OBSERVADOR">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-slate-200">
                    <ConfiguracionPagos />
                </div>
            </Can>

            {/* Configuración Financiera (Enrutamiento) */}
            <Can recurso="ajustes.financiero" nivel="OBSERVADOR">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-slate-200">
                    <ConfiguracionFinanciera />
                </div>
            </Can>
        </div>
    );
};

export default Ajustes;