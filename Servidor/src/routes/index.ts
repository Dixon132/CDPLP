import { Router } from 'express'
import usuariosRouter from '../modules/usuarios/routes'

import colegiadosRouter from '../modules/colegiados/routes'
import actividadesSocialesRouter from '../modules/actividad-social/routes'
import actividadesInstitucionalesRouter from '../modules/actividad-institucional/routes'
import correspondenciaRouter from '../modules/correspondencia/routes'
import financieroRouter from '../modules/financiero/routes'
import AuditoriasRoutes from '../modules/Auditorias/routes'
import gdsRouter from '../modules/gds/gds.routes'
import postulacionesRouter from '../modules/postulaciones/routes'
import permisosRouter from '../modules/permisos/routes'

const rootRouter: Router = Router()

rootRouter.use('/permisos', permisosRouter)

rootRouter.use('/usuarios', usuariosRouter)
rootRouter.use('/correspondencia', correspondenciaRouter)
rootRouter.use('/colegiados', colegiadosRouter)
rootRouter.use('/ac-sociales', actividadesSocialesRouter)
rootRouter.use('/ac-institucionales', actividadesInstitucionalesRouter)
rootRouter.use('/financiero', financieroRouter)
rootRouter.use('/auditorias', AuditoriasRoutes)

// Plataforma_GDS — montada bajo /api/gds (Req. 1.2, 25.1, 25.3), sin tocar el esquema ni las rutas del colegio
rootRouter.use('/gds', gdsRouter)

import memoriasRouter from '../modules/memorias/routes'
import especialidadesRouter from '../modules/especialidades/routes/especialidades'
import documentosRequeridosRouter from '../modules/documentos-requeridos/routes/documentos-requeridos'
import institucionesRouter from '../modules/instituciones/routes/index'
import vencimientosRouter from '../modules/vencimientos/routes'

// Postulaciones públicas y admin
rootRouter.use('/postulaciones', postulacionesRouter)
rootRouter.use('/memorias', memoriasRouter)

import notificacionesRouter, { dashboardRouter } from '../modules/notificaciones/routes'

rootRouter.use('/notificaciones', notificacionesRouter)
rootRouter.use('/dashboard', dashboardRouter)

// Entidades centralizadas
rootRouter.use('/especialidades', especialidadesRouter)
rootRouter.use('/documentos-requeridos', documentosRequeridosRouter)
rootRouter.use('/instituciones', institucionesRouter)
rootRouter.use('/vencimientos', vencimientosRouter)

export default rootRouter