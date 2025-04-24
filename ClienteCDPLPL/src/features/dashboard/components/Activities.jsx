import React from 'react';
import {
    User,
    Package,
    FileText,
    DollarSign,
    AlertCircle
} from 'lucide-react';

const activities = [
    {
        id: 1,
        description: 'John Smith created a new account',
        type: 'user',
        time: '3 min ago'
    },
    {
        id: 2,
        description: 'New order #1234 was placed',
        type: 'order',
        time: '27 min ago'
    },
    {
        id: 3,
        description: 'Invoice #5678 was generated',
        type: 'document',
        time: '1 hour ago'
    },
    {
        id: 4,
        description: 'Payment of $2,500 was received',
        type: 'payment',
        time: '3 hours ago'
    },
    {
        id: 5,
        description: 'Server warning: High CPU usage',
        type: 'alert',
        time: '5 hours ago'
    },
];

const iconMap = {
    user: <User size={16} className="text-blue-500" />,
    order: <Package size={16} className="text-green-500" />,
    document: <FileText size={16} className="text-amber-500" />,
    payment: <DollarSign size={16} className="text-indigo-500" />,
    alert: <AlertCircle size={16} className="text-red-500" />,
};

export const Activities = () => {
    return (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {activities.map((activity) => (
                <div key={activity.id} className="py-3 flex items-start">
                    <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mr-3 flex-shrink-0">
                        {iconMap[activity.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 dark:text-gray-200">{activity.description}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.time}</p>
                    </div>
                    <button className="ml-4 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex-shrink-0">
                        View
                    </button>
                </div>
            ))}

            <div className="pt-4">
                <button className="w-full py-2 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
                    View All Activity
                </button>
            </div>
        </div>
    );
};