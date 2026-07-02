import React from "react";
import Header from "../../components/Header";
import { Settings, User, Bell, Shield, Key } from "lucide-react";
import EspecialidadesCRUD from "./components/EspecialidadesCRUD";
import DocumentosRequeridosCRUD from "./components/DocumentosRequeridosCRUD";

const Ajustes = () => {
    return (
        <div className="space-y-6 p-6 bg-slate-50/50 min-h-screen">
            {/* ✅ Header reutilizable */}
            <Header
                title="Ajustes del Sistema"
                icon={<Settings className="w-8 h-8" />}
                stats={[]}
                searchPlaceholder=""
                buttons={[]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cuenta */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                            <User className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Cuenta</h2>
                            <p className="text-sm text-slate-500 font-medium">Gestiona tu información personal.</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <button className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/50 transition-colors text-left group">
                            <div>
                                <h3 className="font-semibold text-slate-700 group-hover:text-indigo-700">Editar Perfil</h3>
                                <p className="text-xs text-slate-500">Actualizar foto, nombre y correo</p>
                            </div>
                            <Settings className="w-5 h-5 text-slate-400 group-hover:text-indigo-400" />
                        </button>
                    </div>
                </div>

                {/* Seguridad */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Seguridad</h2>
                            <p className="text-sm text-slate-500 font-medium">Contraseñas y autenticación.</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <button className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-emerald-100 hover:bg-emerald-50/50 transition-colors text-left group">
                            <div>
                                <h3 className="font-semibold text-slate-700 group-hover:text-emerald-700">Cambiar Contraseña</h3>
                                <p className="text-xs text-slate-500">Actualizar credenciales de acceso</p>
                            </div>
                            <Key className="w-5 h-5 text-slate-400 group-hover:text-emerald-400" />
                        </button>
                    </div>
                </div>

                {/* Notificaciones */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-slate-200 md:col-span-2">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                            <Bell className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Notificaciones</h2>
                            <p className="text-sm text-slate-500 font-medium">Configura las alertas que recibes.</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                            <div>
                                <h3 className="font-semibold text-slate-700">Alertas del Sistema</h3>
                                <p className="text-xs text-slate-500">Recibir avisos importantes en la plataforma</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" defaultChecked />
                                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                            </label>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                            <div>
                                <h3 className="font-semibold text-slate-700">Correos Electrónicos</h3>
                                <p className="text-xs text-slate-500">Notificaciones de pagos y reportes a tu email</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" />
                                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                            </label>
                        </div>
                    </div>
                </div>

            </div>

            {/* Especialidades */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-slate-200">
                <EspecialidadesCRUD />
            </div>

            {/* Documentos Requeridos */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-slate-200">
                <DocumentosRequeridosCRUD />
            </div>
        </div>
    );
};

export default Ajustes;