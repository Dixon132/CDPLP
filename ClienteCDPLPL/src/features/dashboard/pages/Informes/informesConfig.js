import { UsersRound, DollarSign, FolderDot, HeartHandshake, BookMarked, Shield } from 'lucide-react';

import GenerarReporteColegios from '../Colegiados/components/GenerarReporte';
import GenerarReporteTesoreria from '../Tesoreria/components/GenerarReporteTesoreria';
import GenerarReporteCorrespondencia from '../Correspondencia/components/GenerarReporteCorrespondencia';
import GenerarReporteActividadesSociales from '../Ac-soc/components/GenerarReporteActividadesSociales';
import GenerarReporteActividadesInst from '../Ac-Inst/components/GenerarReporteActividadesInst';
import GenerarReporteAuditorias from '../Auditorias/components/GenerarReporteAuditorias';

const TODOS = ['PRESIDENTE', 'VICEPRESIDENTE', 'SECRETARIO_GENERAL', 'SECRETARIO', 'TESORERO', 'VOCAL'];

/**
 * Catálogo de informes disponibles. Cada tarjeta del módulo Informes sale de
 * acá; el componente de generación (`Component`) es el mismo formulario que
 * antes vivía como botón "Generar Reporte" dentro de cada CRUD.
 */
export const INFORMES = [
    {
        id: 'tesoreria',
        titulo: 'Informes Financieros',
        descripcion: 'Estado presupuestario consolidado, ejecución de cada presupuesto por categoría, e ingresos/egresos del colegio.',
        icon: DollarSign,
        color: 'bg-violet-600',
        roles: TODOS,
        modalTitle: 'Generar Informe Financiero',
        Component: GenerarReporteTesoreria,
        featured: true,
    },
    {
        id: 'colegiados',
        titulo: 'Informe de Colegiados',
        descripcion: 'Estado de la membresía: activos e inactivos, distribución por especialidad, e historial individual (documentos, pagos y actividades).',
        icon: UsersRound,
        color: 'bg-sky-600',
        roles: ['PRESIDENTE', 'SECRETARIO', 'VICEPRESIDENTE'],
        modalTitle: 'Generar Informe de Colegiados',
        Component: GenerarReporteColegios,
    },
    {
        id: 'correspondencia',
        titulo: 'Informe de Correspondencia',
        descripcion: 'Correspondencia enviada y recibida, con conteo por estado y filtros por fecha, asunto o destinatario.',
        icon: FolderDot,
        color: 'bg-rose-600',
        roles: ['PRESIDENTE', 'SECRETARIO', 'VICEPRESIDENTE', 'SECRETARIO_GENERAL'],
        modalTitle: 'Generar Informe de Correspondencia',
        Component: GenerarReporteCorrespondencia,
    },
    {
        id: 'actividades_sociales',
        titulo: 'Informe de Actividades Sociales',
        descripcion: 'Participación de colegiados y pasantes en actividades sociales, en detalle por actividad o consolidado por período.',
        icon: HeartHandshake,
        color: 'bg-emerald-600',
        roles: ['PRESIDENTE', 'VICEPRESIDENTE', 'VOCAL', 'SECRETARIO_GENERAL'],
        modalTitle: 'Generar Informe de Actividades Sociales',
        Component: GenerarReporteActividadesSociales,
    },
    {
        id: 'actividades_institucionales',
        titulo: 'Informe de Actividades Institucionales',
        descripcion: 'Inscripciones y tasa de asistencia a actividades institucionales, en detalle por actividad o consolidado por período.',
        icon: BookMarked,
        color: 'bg-indigo-600',
        roles: ['PRESIDENTE', 'SECRETARIO', 'VICEPRESIDENTE', 'VOCAL', 'SECRETARIO_GENERAL'],
        modalTitle: 'Generar Informe de Actividades Institucionales',
        Component: GenerarReporteActividadesInst,
    },
    {
        id: 'auditorias',
        titulo: 'Informe de Auditorías',
        descripcion: 'Bitácora de acciones del sistema, filtrable por usuario, módulo, acción y período, con resumen de totales.',
        icon: Shield,
        color: 'bg-slate-800',
        roles: ['PRESIDENTE'],
        modalTitle: 'Generar Informe de Auditorías',
        Component: GenerarReporteAuditorias,
    },
];
