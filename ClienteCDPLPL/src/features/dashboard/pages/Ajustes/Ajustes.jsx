import React from "react";
import Header from "../../components/Header";
import { Settings } from "lucide-react";
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
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-slate-200">
                <EspecialidadesCRUD />
            </div>

            {/* Instituciones */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-slate-200">
                <InstitucionesCRUD />
            </div>

            {/* Documentos Requeridos */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-slate-200">
                <DocumentosRequeridosCRUD />
            </div>

            {/* Configuración de Pagos */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-slate-200">
                <ConfiguracionPagos />
            </div>

            {/* Configuración Financiera (Enrutamiento) */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-slate-200">
                <ConfiguracionFinanciera />
            </div>
        </div>
    );
};

export default Ajustes;