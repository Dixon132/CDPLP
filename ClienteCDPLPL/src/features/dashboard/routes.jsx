import { Outlet } from "react-router-dom";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import PrincipalPage from "./pages/PrincipalPage";
import Usuarios from "./pages/Usuarios/Usuarios";
import Colegiados from "./pages/Colegiados/Colegiados";
import Ac_sociales from "./pages/Ac-soc/Ac_sociales";
import Ac_institucionales from "./pages/Ac-Inst/Ac_institucionales";

import Tesoreria from "./pages/Tesoreria/Tesoreria";
import Ajustes from "./pages/Ajustes/Ajustes";
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
import { RequireRole } from "../../layouts/components/dashboard/RequireRole";
import Pasantes from "./pages/Colegiados/Pasantes/Pasantes";
import Invitados from "./pages/Colegiados/invitados/Invitados";



export const dashboardRoutes = {
    path: '/dashboard',
    element: <DashboardLayout />,
    children: [
        {
            index: true,
            element: (
                <RequireRole allowedRoles={['PRESIDENTE', 'SECRETARIO_GENERAL']}>
                    <PrincipalPage />
                </RequireRole>
            )
        },
        {
            path: 'usuarios',
            element: (
                <RequireRole allowedRoles={['PRESIDENTE', 'VICEPRESIDENTE']}>
                    <Usuarios />
                </RequireRole>
            )
        },
        {
            path: 'invitados',
            element: (
                <RequireRole allowedRoles={['PRESIDENTE', 'VICEPRESIDENTE']}>
                    <Invitados />
                </RequireRole>
            )
        },
        {
            path: 'pasantes',
            element: (
                <RequireRole allowedRoles={['PRESIDENTE', 'VICEPRESIDENTE']}>
                    <Pasantes />
                </RequireRole>
            )
        },
        {
            path: 'colegiados',
            element: (
                <RequireRole allowedRoles={['PRESIDENTE', 'SECRETARIO', 'VICEPRESIDENTE']}>
                    <Colegiados />
                </RequireRole>
            ),
            children: [
                {
                    path: 'documentos/:id',
                    element: (
                        <RequireRole allowedRoles={['PRESIDENTE', 'SECRETARIO', 'VICEPRESIDENTE']}>
                            < Documentos />
                        </RequireRole>
                    )
                },
                {
                    path: 'pagos/:id',
                    element: (
                        <RequireRole allowedRoles={['PRESIDENTE', 'SECRETARIO', 'VICEPRESIDENTE']}>
                            <Pagos />
                        </RequireRole>
                    )
                }
            ]
        },
        {
            path: 'actividades_sociales',
            element: (
                <RequireRole allowedRoles={['PRESIDENTE', 'VICEPRESIDENTE', 'VOCAL', 'SECRETARIO_GENERAL']}>
                    <Ac_sociales />

                </RequireRole>
            )
        },
        {
            path: 'actividades_institucionales',
            element: (
                <RequireRole allowedRoles={['PRESIDENTE', 'SECRETARIO', 'VICEPRESIDENTE', 'VOCAL', 'SECRETARIO_GENERAL']}>
                    <Ac_institucionales />
                </RequireRole>)
        },
        {
            path: 'asistencias/:id',
            element: (

                <RequireRole allowedRoles={['PRESIDENTE', 'SECRETARIO', 'VICEPRESIDENTE', 'VOCAL', 'SECRETARIO_GENERAL']}>
                    <GestionAsistenciaInst />
                </RequireRole>
            )
        },
        {
            path: 'correspondencia',
            element: (
                <RequireRole allowedRoles={['PRESIDENTE', 'SECRETARIO', 'VICEPRESIDENTE', 'SECRETARIO_GENERAL']}>
                    <Correspondencia />
                </RequireRole>
            )
        },
        {
            path: 'buzon/:id',
            element: (
                <RequireRole allowedRoles={['PRESIDENTE', 'SECRETARIO', 'TESORERO', 'VICEPRESIDENTE', 'VOCAL', 'SECRETARIO_GENERAL']}>
                    <Contenido />
                </RequireRole>
            )
        },
        {
            path: 'buzon',
            element: (
                <RequireRole allowedRoles={['PRESIDENTE', 'SECRETARIO', 'TESORERO', 'VICEPRESIDENTE', 'VOCAL', 'SECRETARIO_GENERAL']}>
                    <BuzonCorrespondencia />
                </RequireRole>
            )
        },
        {
            path: 'convenios',
            element: (
                <RequireRole allowedRoles={['PRESIDENTE', 'SECRETARIO', 'TESORERO', 'VICEPRESIDENTE', 'VOCAL', 'SECRETARIO_GENERAL']}>
                    <Convenios />
                </RequireRole>
            )
        },
        {
            path: 'tesoreria',
            element: (
                <RequireRole allowedRoles={['PRESIDENTE', 'SECRETARIO', 'TESORERO', 'VICEPRESIDENTE', 'VOCAL', 'SECRETARIO_GENERAL']}>
                    <Tesoreria />
                </RequireRole>
            )
        },
        {
            path: 'tesoreria/movimientos/:id',
            element: (
                <RequireRole allowedRoles={['PRESIDENTE', 'SECRETARIO', 'TESORERO', 'VICEPRESIDENTE', 'VOCAL', 'SECRETARIO_GENERAL']}>
                    <MovimientosPorPresupuesto />,
                </RequireRole>
            )
        },
        {
            path: 'ajustes',
            element: (
                <RequireRole allowedRoles={['PRESIDENTE', 'SECRETARIO', 'TESORERO', 'VICEPRESIDENTE', 'VOCAL', 'SECRETARIO_GENERAL']}>
                    <Ajustes />
                </RequireRole>
            )
        },
        {
            path: 'notAuthorized',
            element: <NotAuthorized />
        },
        {
            path: 'roles',
            element: (
                <RequireRole allowedRoles={['PRESIDENTE', 'SECRETARIO', 'TESORERO', 'VICEPRESIDENTE', 'VOCAL', 'SECRETARIO_GENERAL']}>
                    <Roles />
                </RequireRole>
            )
        },
        {
            path: 'auditorias',
            element: (
                <RequireRole allowedRoles={['PRESIDENTE']}>
                    <Auditorias />
                </RequireRole>
            )
        }
    ]
}