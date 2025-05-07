import React, { useState } from 'react';

import { HeaderDashboard } from '../components/HeaderDashboard';
import { Outlet } from 'react-router-dom';
import { useAxiosInterceptor } from '../hooks/useAxiosInterceptor';
import Sidebar from '../features/dashboard/components/Sidebar';
export const DashboardLayout= () => {
    
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const toggleSidebar = () => {
        setSidebarCollapsed(!sidebarCollapsed);
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-white">
            <Sidebar collapsed={sidebarCollapsed} />

            <div className="flex flex-col flex-1 overflow-hidden">
                <HeaderDashboard onMenuClick={toggleSidebar} />

                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    <div className="max-w-7xl mx-auto">
                        <Outlet/>
                    </div>
                </main>

                <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 px-6">
                    <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                        © 2025 dasboard 
                    </div>
                </footer>
            </div>
        </div>
    );
};