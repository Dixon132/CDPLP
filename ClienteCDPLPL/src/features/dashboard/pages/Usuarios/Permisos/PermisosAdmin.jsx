import { useState } from "react";
import { ShieldCheck, Crown, Sliders, UserCog } from "lucide-react";
import Header from "../../../components/Header";
import CatalogoRolesTab from "./CatalogoRolesTab";
import PermisosPorRolTab from "./PermisosPorRolTab";
import PermisosPorUsuarioTab from "./PermisosPorUsuarioTab";

const TABS = [
    { id: "roles", label: "Roles", icon: Crown, Componente: CatalogoRolesTab },
    { id: "por-rol", label: "Permisos por rol", icon: Sliders, Componente: PermisosPorRolTab },
    { id: "por-usuario", label: "Permisos por usuario", icon: UserCog, Componente: PermisosPorUsuarioTab },
];

/**
 * Gestión de roles dinámicos y permisos granulares.
 *
 * Un usuario mantiene su rol de negocio (Presidente, Tesorero...) tal cual,
 * pero su acceso real a cada módulo/submódulo puede personalizarse acá sin
 * tocar el rol: "Permisos por rol" define la plantilla por defecto de cada
 * rol, y "Permisos por usuario" permite overridear esa plantilla para una
 * persona puntual (p. ej. quitarle edición en Financiero a una Presidenta
 * específica sin afectar al resto de presidentes ni al rol en sí).
 */
const PermisosAdmin = () => {
    const [tab, setTab] = useState("roles");
    const TabActiva = TABS.find((t) => t.id === tab)?.Componente ?? CatalogoRolesTab;

    return (
        <div className="space-y-6 p-6 bg-slate-50/50 min-h-full">
            <Header
                title="Roles y Permisos"
                icon={<ShieldCheck className="w-8 h-8" />}
                showSearch={false}
            />

            <div className="flex gap-2 border-b border-slate-200 px-1">
                {TABS.map((t) => {
                    const Icono = t.icon;
                    const activa = t.id === tab;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${activa ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                        >
                            <Icono className="w-4 h-4" /> {t.label}
                        </button>
                    );
                })}
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-6">
                <TabActiva />
            </div>
        </div>
    );
};

export default PermisosAdmin;
