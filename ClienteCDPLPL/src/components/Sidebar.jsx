import React from 'react';
import { 
  Home, 
  BarChart2, 
  Users, 
  Settings, 
  Calendar, 
  MessageSquare, 
  HelpCircle, 
  LogOut, 
  DollarSign,
  HeartHandshake,
  BookMarked,
  UsersRound,
  FolderDot,
  UserCog
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Sidebar = ({collapsed}) => {
  const mainNavItems = [
    { title: 'Dashboard', icon: <Home size={20} />, active: true },
    { title: 'Usuarios', icon: <UserCog size={20} /> },
    { title: 'Colegiados', icon: <UsersRound size={20} /> },
    { title: 'Proyectos', icon: <FolderDot  size={20} /> },
    { title: 'Actividades_Sociales', icon: <HeartHandshake  size={20} /> },
    { title: 'Actividades_Institucionales', icon: <BookMarked  size={20} /> },
    { title: 'Tesoreria', icon: <DollarSign  size={20} /> },
  ];
  
  const secondaryNavItems = [
    { title: 'Ajustes', icon: <Settings size={20} /> },
    { title: 'Cerrar Sesion', icon: <LogOut size={20} /> },
  ];
  return (
    <aside 
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out flex-shrink-0 h-screen `}
    >
      <div className="h-16 flex items-center justify-center border-b border-gray-200 dark:border-gray-700">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-start px-4'}`}>
          {/* <div className="h-8 w-8 rounded-md bg-blue-600 flex items-center justify-center">
            <BarChart2 size={18} className="text-white" />
          </div> */}
          {!collapsed && (
            <span className="ml-2 text-lg font-semibold text-gray-800 dark:text-white">CDPLP</span>
          )}
        </div>
      </div>
      
      <div className="py-4">
        <nav>
          <ul>
            {mainNavItems.map((item, index) => (
              <li key={index} className="mb-1">
                <Link
                
                  to={`${item.title==='Dashboard' ? '/dashboard' : `${'/dashboard/'+item.title.toLowerCase()}`}`}
                  className={`
                    ${item.active ? 'bg-blue-50 text-blue-600 dark:bg-gray-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
                    flex items-center py-3 ${collapsed ? 'justify-center px-2' : 'px-4'}
                    rounded-md mx-2 transition-colors duration-200
                    `}
                    >
                
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span className="ml-3">{item.title}</span>}
                
                    </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-4">
          <nav>
            <ul>
              {secondaryNavItems.map((item, index) => (
                <li key={index} className="mb-1">
                  <Link
                    to={`${item.title==='Ajustes' ? '/dashboard/ajustes' : `/auth/login`}`}
                    href="#" 
                    className={`
                      text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700
                      flex items-center py-3 ${collapsed ? 'justify-center px-2' : 'px-4'}
                      rounded-md mx-2 transition-colors duration-200
                    `}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!collapsed && <span className="ml-3">{item.title}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </aside>
  );

};

export default Sidebar;
