import { useState } from 'react';
import {
  Menu,
  ChevronDown,
  Settings,
  User,
  LogOut,
  Shield
} from 'lucide-react';

export const HeaderDashboard = ({ toggleSidebar }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  return (
    <header className=" bg-white/95 backdrop-blur-xl border-b border-slate-200/60 flex items-center h-16 px-6 sticky top-0 z-50 shadow-sm">
      {/* Gradiente de fondo */}
      <div className="absolute inset-0 bg-gradient-to-r from-white via-blue-50/30 to-indigo-50/20 -z-10" />
      {/* Menu Button */}
      <button
        onClick={toggleSidebar}
        className="group mr-4 p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white/80 hover:shadow-md focus:outline-none transition-all duration-200"
      >
        <Menu size={20} className="group-hover:scale-110 transition-transform duration-200" />
      </button>
      {/* Right Side Actions */}
      <div className="flex items-center space-x-2">
        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-3 p-2 pl-3 rounded-xl hover:bg-white/80 hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg group-hover:shadow-xl transition-shadow duration-200">
                DA
              </div>
              <div className="hidden md:block text-left">
                <span className="text-sm font-semibold text-slate-900 block">Diego Alex</span>
                <span className="text-xs text-slate-500 block">Administrador</span>
              </div>
              <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* User Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden z-50">
              <div className="p-4 border-b border-slate-200/60 bg-gradient-to-br from-slate-50 to-blue-50/30">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold">
                    DA
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Diego Alex</p>
                    <p className="text-sm text-slate-600">diego.alex@cdplp.com</p>
                    <div className="flex items-center mt-1">
                      <Shield size={12} className="text-green-600 mr-1" />
                      <span className="text-xs text-green-600 font-medium">Administrador</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="py-2">
                <button className="w-full flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-50/80 transition-colors duration-200">
                  <User size={16} className="mr-3 text-slate-500" />
                  Mi Perfil
                </button>
                <button className="w-full flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-50/80 transition-colors duration-200">
                  <Settings size={16} className="mr-3 text-slate-500" />
                  Configuración
                </button>
                <hr className="my-2 border-slate-200/60" />
                <button className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50/80 transition-colors duration-200">
                  <LogOut size={16} className="mr-3" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showUserMenu || showNotifications) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowUserMenu(false);
            setShowNotifications(false);
          }}
        />
      )}
    </header>
  );
};
