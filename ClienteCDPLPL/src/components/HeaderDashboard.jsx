import React, { useState } from 'react';
import { 
  Menu, 
  Bell, 
  Search, 
  Sun, 
  Moon,
  ChevronDown
} from 'lucide-react';


export const HeaderDashboard = ({ onMenuClick }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };
  
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center h-16 px-4 sticky top-0 z-10">
      <button 
        onClick={onMenuClick}
        className="mr-4 p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
      >
        <Menu size={20} />
      </button>
      
      {/* <div className="relative flex-grow max-w-md mr-4 hidden md:block">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-gray-400" />
        </div>
        <input 
          type="text" 
          placeholder="Search..." 
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div> */}
      
      <div className="flex items-center ml-auto">
        {/* <button className="ml-2 p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none relative">
          <Bell size={20} />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
        </button> */}
        
        {/* <button 
          onClick={toggleDarkMode}
          className="ml-2 p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button> */}
        
        <div className="ml-4 relative flex items-center">
          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
            DA
          </div>
          <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 hidden md:block">Diego Alex</span>
          <ChevronDown size={16} className="ml-1 text-gray-500 dark:text-gray-400 hidden md:block" />
        </div>
      </div>
    </header>
  );
};