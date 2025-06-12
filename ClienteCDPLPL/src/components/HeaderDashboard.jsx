import React, { useState } from 'react';
import { 
  Menu, 
  Bell, 
  Search, 
  Sun, 
  Moon,
  ChevronDown,
  Settings,
  User,
  LogOut,
  Shield
} from 'lucide-react';

export const HeaderDashboard = ({ onMenuClick }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  // Simulando notificaciones
  const notifications = [
    { id: 1, title: 'Nueva correspondencia', time: '2 min', type: 'info' },
    { id: 2, title: 'Reunión programada', time: '1 hora', type: 'warning' },
    { id: 3, title: 'Documento aprobado', time: '3 horas', type: 'success' }
  ];
  
  return (
    <header className=" bg-white/95 backdrop-blur-xl border-b border-slate-200/60 flex items-center h-16 px-6 sticky top-0 z-50 shadow-sm">
      {/* Gradiente de fondo */}
      <div className="absolute inset-0 bg-gradient-to-r from-white via-blue-50/30 to-indigo-50/20 -z-10" />
      
      {/* Menu Button */}
      <button 
        onClick={onMenuClick}
        className="group mr-4 p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white/80 hover:shadow-md focus:outline-none transition-all duration-200"
      >
        <Menu size={20} className="group-hover:scale-110 transition-transform duration-200" />
      </button>
      
      {/* Search Bar
      <div className="relative flex-grow max-w-md mr-6 hidden md:block">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search size={18} className="text-slate-400" />
        </div>
        <input 
          type="text" 
          placeholder="Buscar en el dashboard..." 
          className="block w-full pl-12 pr-4 py-2.5 bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-white transition-all duration-200 shadow-sm hover:shadow-md"
        />
      </div> */}
      
      {/* Right Side Actions */}
      <div className="flex items-center space-x-2">
        {/* Dark Mode Toggle */}
        {/* <button 
          onClick={toggleDarkMode}
          className="p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white/80 hover:shadow-md focus:outline-none transition-all duration-200 group"
        >
          <div className="relative">
            {isDarkMode ? (
              <Sun size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            ) : (
              <Moon size={18} className="group-hover:-rotate-12 transition-transform duration-300" />
            )}
          </div>
        </button> */}
        
        {/* Notifications */}
        <div className="relative">
          {/* <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white/80 hover:shadow-md focus:outline-none transition-all duration-200 group relative"
          >
            <Bell size={18} className="group-hover:animate-pulse" />
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center text-xs text-white font-bold shadow-lg">
              3
            </span>
          </button> */}

          {/* Dropdown de Notificaciones */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden z-50">
              <div className="p-4 border-b border-slate-200/60 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h3 className="font-semibold text-slate-900">Notificaciones</h3>
                <p className="text-sm text-slate-600">Tienes 3 notificaciones nuevas</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.map((notification) => (
                  <div key={notification.id} className="p-4 hover:bg-slate-50/80 border-b border-slate-100 last:border-b-0 transition-colors duration-200">
                    <div className="flex items-start space-x-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        notification.type === 'success' ? 'bg-green-500' :
                        notification.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{notification.title}</p>
                        <p className="text-xs text-slate-500">{notification.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-slate-50/80 border-t border-slate-200/60">
                <button className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Ver todas las notificaciones
                </button>
              </div>
            </div>
          )}
        </div>
        
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