import { Outlet } from "react-router-dom";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import PrincipalPage from "./pages/PrincipalPage";
import Usuarios from "./pages/Usuarios/Usuarios";
import Colegiados from "./pages/Colegiados/Colegiados";
import Vencimientos from "./pages/Vencimientos/Vencimientos";
import Ac_sociales from "./pages/Ac-soc/Ac_sociales";
import Ac_institucionales from "./pages/Ac-Inst/Ac_institucionales";

import Tesoreria from "./pages/Tesoreria/Tesoreria";
import Ajustes from "./pages/Ajustes/Ajustes";
import NotAuthorized from "./pages/NotAuthorized";
import EstadoSesion from "./pages/EstadoSesion";
import Roles from "./pages/Usuarios/Roles";
import PermisosAdmin from "./pages/Usuarios/Permisos/PermisosAdmin";
import Documentos from "./pages/Colegiados/Documentos";
import Pagos from "./pages/Colegiados/Pagos";
import Correspondencia from "./pages/Correspondencia/Correspondencia";
import Convenios from "./pages/Ac-soc/Convenios";
import BuzonCorrespondencia from "./pages/Correspondencia/Buzon";
import Contenido from "./pages/Correspondencia/Contenido";
import DetalleActividadInst from "./pages/Ac-Inst/DetalleActividadInst";
import MovimientosPorPresupuesto from "./pages/Tesoreria/MovimientosPorPresupuesto";
import Auditorias from "./pages/Auditorias/Auditorias";
import Informes from "./pages/Informes/Informes";
import Memorias from "./pages/Memorias/Memorias";
import { RequirePermiso } from "../../layouts/components/dashboard/RequirePermiso";
import Pasantes from "./pages/Colegiados/Pasantes/Pasantes";
import Invitados from "./pages/Colegiados/invitados/Invitados";
import PagosInvitado from "./pages/Colegiados/invitados/PagosInvitado";
// Módulo IREC anterior retirado del dashboard del colegio (Req. 1.3, 1.4, tarea 26.12).
// El componente fuente `./pages/Ia/IREC` permanece en disco; solo se desconecta de las rutas.
// import IRECDashboard from "./pages/Ia/IREC";
import { VerDetallesActividad } from "./pages/Ac-soc/components/VerDetallesActividad";
import { Perfil } from "./pages/Ac-soc/components/Perfil";
import PostulacionesAdmin from "./pages/Colegiados/Postulaciones/PostulacionesAdmin";



export const dashboardRoutes = {
    path: '/dashboard',
    element: <DashboardLayout />,
    children: [
        {
            index: true,
            element: (
                <RequirePermiso recurso="dashboard">
                    <PrincipalPage />
                </RequirePermiso>
            )
        },
        {
            path: 'usuarios',
            element: (
                <RequirePermiso recurso="usuarios">
                    <Usuarios />
                </RequirePermiso>
            )
        },
        {
            path: 'invitados',
            element: (
                <RequirePermiso recurso="colegiados.invitados">
                    <Invitados />
                </RequirePermiso>
            )
        },
        {
            path: 'invitados/pagos/:id',
            element: (
                <RequirePermiso recurso="colegiados.invitados">
                    <PagosInvitado />
                </RequirePermiso>
            )
        },
        {
            path: 'pasantes',
            element: (
                <RequirePermiso recurso="colegiados.pasantes">
                    <Pasantes />
                </RequirePermiso>
            )
        },
        {
            path: 'vencimientos',
            element: (
                <RequirePermiso recurso="colegiados">
                    <Vencimientos />
                </RequirePermiso>
            )
        },
        {
            path: 'colegiados',
            element: (
                <RequirePermiso recurso="colegiados">
                    <Colegiados />
                </RequirePermiso>
            ),
            children: [
                {
                    path: 'documentos/:id',
                    element: (
                        <RequirePermiso recurso="colegiados">
                            < Documentos />
                        </RequirePermiso>
                    )
                },
                {
                    path: 'pagos/:id',
                    element: (
                        <RequirePermiso recurso="colegiados">
                            <Pagos />
                        </RequirePermiso>
                    )
                }
            ]
        },
        {
            path: 'postulaciones',
            element: (
                <RequirePermiso recurso="colegiados.postulaciones">
                    <PostulacionesAdmin />
                </RequirePermiso>
            )
        },
        {
            path: 'actividades_sociales',
            element: (
                <RequirePermiso recurso="actividades_sociales">
                    <Ac_sociales />

                </RequirePermiso>
            )
        },
        {
            path: 'actividades_sociales/detalles/:id',
            element: (
                <RequirePermiso recurso="actividades_sociales">
                    <VerDetallesActividad />
                </RequirePermiso>
            )
        },
        {
            path: 'actividades_sociales/perfil/:id',
            element: (
                <RequirePermiso recurso="actividades_sociales">
                    <Perfil />
                </RequirePermiso>
            )
        },
        {
            path: 'actividades_institucionales',
            element: (
                <RequirePermiso recurso="actividades_institucionales">
                    <Ac_institucionales />
                </RequirePermiso>)
        },
        {
            path: 'actividades_institucionales/detalles/:id',
            element: (
                <RequirePermiso recurso="actividades_institucionales">
                    <DetalleActividadInst />
                </RequirePermiso>
            )
        },
        {
            path: 'memorias',
            element: (
                <RequirePermiso recurso="memorias">
                    <Memorias />
                </RequirePermiso>)
        },
        {
            path: 'correspondencia',
            element: (
                <RequirePermiso recurso="correspondencia">
                    <Correspondencia />
                </RequirePermiso>
            )
        },
        {
            path: 'buzon/:id',
            element: (
                <RequirePermiso recurso="correspondencia.buzon">
                    <Contenido />
                </RequirePermiso>
            )
        },
        {
            path: 'buzon',
            element: (
                <RequirePermiso recurso="correspondencia.buzon">
                    <BuzonCorrespondencia />
                </RequirePermiso>
            )
        },
        {
            path: 'convenios',
            element: (
                <RequirePermiso recurso="actividades_sociales.convenios">
                    <Convenios />
                </RequirePermiso>
            )
        },
        {
            path: 'tesoreria',
            element: (
                <RequirePermiso recurso="tesoreria">
                    <Tesoreria />
                </RequirePermiso>
            )
        },
        {
            path: 'tesoreria/movimientos/:id',
            element: (
                <RequirePermiso recurso="tesoreria">
                    <MovimientosPorPresupuesto />,
                </RequirePermiso>
            )
        },
        {
            path: 'ajustes',
            element: (
                <RequirePermiso recurso="ajustes">
                    <Ajustes />
                </RequirePermiso>
            )
        },
        {
            path: 'notAuthorized',
            element: <NotAuthorized />
        },
        // Destinos a los que redirige `RequirePermiso`. Antes no existían y caían
        // en el 404 genérico.
        {
            path: 'roleNotDefined',
            element: <EstadoSesion tipo="noDefinido" />
        },
        {
            path: 'roleExpired',
            element: <EstadoSesion tipo="vencido" />
        },
        {
            path: 'roleInactive',
            element: <EstadoSesion tipo="inactivo" />
        },
        {
            path: 'roles',
            element: (
                <RequirePermiso recurso="usuarios.roles">
                    <Roles />
                </RequirePermiso>
            )
        },
        {
            path: 'permisos',
            element: (
                <RequirePermiso recurso="usuarios.permisos">
                    <PermisosAdmin />
                </RequirePermiso>
            )
        },
        {
            path: 'auditorias',
            element: (
                <RequirePermiso recurso="auditorias">
                    <Auditorias />
                </RequirePermiso>
            )
        },
        {
            path: 'informes',
            element: (
                <RequirePermiso recurso="informes">
                    <Informes />
                </RequirePermiso>
            )
        },
        // Ruta 'modelo' (IRECDashboard) del módulo IREC anterior retirada del
        // dashboard del colegio (Req. 1.3, 1.4, tarea 26.12). Reversible: la fuente
        // del componente sigue en disco; solo se desconectó de las rutas.
    ]
}