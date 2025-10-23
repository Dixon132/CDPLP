import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAxiosInterceptor } from '../hooks/useAxiosInterceptor';
import { motion } from 'framer-motion';
import Sidebar from './components/dashboard/Sidebar';
import { HeaderDashboard } from './components/dashboard/HeaderDashboard';

export const DashboardLayout = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useAxiosInterceptor();

    const toggleSidebar = () => {
        setSidebarCollapsed(!sidebarCollapsed);
    };

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            {/* Sidebar “fijo” y ocupando toda la altura */}
            <Sidebar
                collapsed={sidebarCollapsed}
            />
            {/* Contenido principal con scroll propio */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header (siempre fijo arriba) */}
                <HeaderDashboard toggleSidebar={toggleSidebar} />
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
                <footer className=" px-6 py-3">
                    <p className="text-sm text-gray-500">© 2025 dashboard</p>
                </footer>
            </div>
        </div>
    );
};