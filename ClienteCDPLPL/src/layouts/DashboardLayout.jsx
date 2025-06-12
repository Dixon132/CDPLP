import React, { useState } from 'react';
import { HeaderDashboard } from '../components/HeaderDashboard';
import { Outlet, useLocation } from 'react-router-dom';
import { useAxiosInterceptor } from '../hooks/useAxiosInterceptor';
import Sidebar from '../features/dashboard/components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';

export const DashboardLayout = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const location = useLocation();
    
    useAxiosInterceptor();
    
    const toggleSidebar = () => {
        setSidebarCollapsed(!sidebarCollapsed);
    };

    // Variantes de animación para el contenido principal
    const pageVariants = {
        initial: {
            opacity: 0,
            y: 8
        },
        in: {
            opacity: 1,
            y: 0
        },
        out: {
            opacity: 0,
            y: -8
        }
    };

    // Configuración de transición
    const pageTransition = {
        type: "tween",
        ease: [0.4, 0, 0.2, 1],
        duration: 0.2
    };

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar con animación */}
            <motion.div
                initial={false}
                animate={{
                    width: sidebarCollapsed ? 64 : 256,
                }}
                transition={{
                    duration: 0.3,
                    ease: "easeInOut"
                }}
                className="flex-shrink-0"
            >
                <Sidebar 
                    collapsed={sidebarCollapsed} 
                    toggleSidebar={toggleSidebar} 
                />
            </motion.div>

            {/* Contenido principal */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <HeaderDashboard />
                
                {/* Contenido con animación */}
                <main className="flex-1 overflow-hidden relative">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial="initial"
                            animate="in"
                            exit="out"
                            variants={pageVariants}
                            transition={pageTransition}
                            className="h-full overflow-auto p-6"
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </main>

                {/* Footer */}
                <footer className="bg-white border-t px-6 py-3">
                    <p className="text-sm text-gray-500">
                        © 2025 dashboard
                    </p>
                </footer>
            </div>
        </div>
    );
};