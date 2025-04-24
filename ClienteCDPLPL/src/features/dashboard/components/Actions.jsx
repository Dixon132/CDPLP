import React from 'react';


const colorMap = {
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30',
    red: 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30',
    gray: 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600',
    amber: 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30',
};

export const QuickAction = ({ title, icon, color }) => {
    return (
        <button
            className={`${colorMap[color]} flex flex-col items-center justify-center p-4 rounded-lg transition-colors duration-200`}
        >
            <div className="mb-2">{icon}</div>
            <span className="text-sm font-medium">{title}</span>
        </button>
    );
};