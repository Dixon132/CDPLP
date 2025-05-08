import { Outlet } from "react-router-dom";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import PrincipalPage from "./pages/PrincipalPage";
import Usuarios from "./pages/Usuarios/Usuarios";
import Colegiados from "./pages/Colegiados/Colegiados";
import Ac_sociales from "./pages/Ac-soc/Ac_sociales";
import Ac_institucionales from "./pages/Ac-Inst/Ac_institucionales";
import Proyecto from "./pages/Proyectos/Proyecto";
import Tesoreria from "./pages/Tesoreria/Tesoreria";
import Ajustes from "./pages/Ajustes/Ajustes";
import { RequireRole } from "../../components/RequireRole";
import NotAuthorized from "./pages/NotAuthorized";
import Roles from "./pages/Usuarios/Roles";


export const dashboardRoutes = {
    path: '/dashboard',
    element: <DashboardLayout/>,
    children: [
        {
            index: true,
            element: (
                <RequireRole allowedRoles={['PRESIDENTE']}>
                    <PrincipalPage/>
                </RequireRole>
            )
        },
        {
            path: 'usuarios',
            element: <RequireRole allowedRoles={['PRESIDENTE']}>
                    <Usuarios/>
                </RequireRole>
        },
        {
            path: 'colegiados',
            element: <Colegiados/>,
        },
        {
            path: 'actividades_sociales',
            element: <Ac_sociales/>
        },
        {
            path: 'actividades_institucionales',
            element: <Ac_institucionales/>
        },
        {
            path: 'proyectos',
            element: <Proyecto/>,
        },
        {
            path: 'tesoreria',
            element: <Tesoreria/>,
        },
        {
            path: 'ajustes',
            element: <Ajustes/>
        },
        {
            path: 'notAuthorized',
            element: <NotAuthorized/>
        },
        {
            path: 'roles',
            element: <Roles/>
        }
    ]
}