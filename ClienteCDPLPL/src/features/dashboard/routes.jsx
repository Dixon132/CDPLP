import { Outlet } from "react-router-dom";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import PrincipalPage from "./pages/PrincipalPage";
import Usuarios from "./pages/Usuarios/Usuarios";
import Colegiados from "./pages/Colegiados/Colegiados";
import Ac_sociales from "./pages/Ac-soc/Ac_sociales";
import Ac_institucionales from "./pages/Ac-Inst/Ac_institucionales";

import Tesoreria from "./pages/Tesoreria/Tesoreria";
import Ajustes from "./pages/Ajustes/Ajustes";
import { RequireRole } from "../../components/RequireRole";
import NotAuthorized from "./pages/NotAuthorized";
import Roles from "./pages/Usuarios/Roles";
import Documentos from "./pages/Colegiados/Documentos";
import Pagos from "./pages/Colegiados/Pagos";
import Correspondencia from "./pages/Correspondencia/Correspondencia";
import Convenios from "./pages/Ac-soc/Convenios";
import BuzonCorrespondencia from "./pages/Correspondencia/Buzon";
import Contenido from "./pages/Correspondencia/Contenido";
import GestionAsistenciaInst from "./pages/Ac-Inst/components/GestionAsistenciaInst";
import MovimientosPorPresupuesto from "./pages/Tesoreria/MovimientosPorPresupuesto";
import Auditorias from "./pages/Auditorias/Auditorias";



export const dashboardRoutes = {
    path: '/dashboard',
    element: <DashboardLayout />,
    children: [
        {
            index: true,
            element: (
                <RequireRole allowedRoles={['PRESIDENTE']}>
                    <PrincipalPage />
                </RequireRole>
            )
        },
        {
            path: 'usuarios',
            element: <RequireRole allowedRoles={['PRESIDENTE']}>
                <Usuarios />
            </RequireRole>
        },
        {
            path: 'colegiados',
            element: <Colegiados />,
            children: [
                {
                    path: 'documentos/:id',
                    element: <Documentos />
                },
                {
                    path: 'pagos/:id',
                    element: <Pagos />
                }
            ]
        },
        {
            path: 'actividades_sociales',
            element: <Ac_sociales />
        },
        {
            path: 'actividades_institucionales',
            element: <Ac_institucionales />
        },
        {
            path: 'asistencias/:id',
            element: <GestionAsistenciaInst />
        },
        {
            path: 'correspondencia',
            element: <Correspondencia />,
        },
        {
            path: 'buzon/:id',
            element: <Contenido />
        },
        {
            path: 'buzon',
            element: <BuzonCorrespondencia />
        },
        {
            path: 'convenios',
            element: <Convenios />
        },
        {
            path: 'tesoreria',
            element: <Tesoreria />,
        },
        {
            path: 'tesoreria/movimientos/:id',
            element: <MovimientosPorPresupuesto />,
        },
        {
            path: 'ajustes',
            element: <Ajustes />
        },
        {
            path: 'notAuthorized',
            element: <NotAuthorized />
        },
        {
            path: 'roles',
            element: <Roles />
        },
        {
            path: 'auditorias',
            element: <Auditorias />
        }
    ]
}