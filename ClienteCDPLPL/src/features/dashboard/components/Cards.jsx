import React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

const colorMap = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
    red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
    indigo:
        "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400",
};
const StatCard = ({ title, value, change, positive, icon, color }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm transition-transform duration-300 hover:translate-y-[-4px] hover:shadow-md">
            <div className="flex justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {title}
                    </p>
                    <h3 className="text-2xl font-semibold text-gray-800 dark:text-white">
                        {value}
                    </h3>
                </div>
                <div
                    className={`h-10 w-10 rounded-full ${colorMap[color]} flex items-center justify-center`}
                >
                    {icon}
                </div>
            </div>
            <div className="mt-3 flex items-center">
                <span
                    className={`text-sm font-medium ${positive
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        } flex items-center`}
                >
                    {positive ? (
                        <ArrowUp size={16} className="mr-1" />
                    ) : (
                        <ArrowDown size={16} className="mr-1" />
                    )}
                    {change}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                    vs last period
                </span>
            </div>
        </div>
    );
};
export default StatCard;