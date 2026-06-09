import { Router } from 'express'
import usuariosRouter from '../modules/usuarios/routes'

import colegiadosRouter from '../modules/colegiados/routes'
import actividadesSocialesRouter from '../modules/actividad-social/routes'
import actividadesInstitucionalesRouter from '../modules/actividad-institucional/routes'
import correspondenciaRouter from '../modules/correspondencia/routes'
import financieroRouter from '../modules/financiero/routes'
import AuditoriasRoutes from '../modules/Auditorias/routes'
import gdsRouter from '../modules/gds/gds.routes'

const rootRouter: Router = Router()

rootRouter.use('/usuarios', usuariosRouter)
rootRouter.use('/correspondencia', correspondenciaRouter)
rootRouter.use('/colegiados', colegiadosRouter)
rootRouter.use('/ac-sociales', actividadesSocialesRouter)
rootRouter.use('/ac-institucionales', actividadesInstitucionalesRouter)
rootRouter.use('/financiero', financieroRouter)
rootRouter.use('/auditorias', AuditoriasRoutes)

// Plataforma_GDS — montada bajo /api/gds (Req. 1.2, 25.1, 25.3), sin tocar el esquema ni las rutas del colegio
rootRouter.use('/gds', gdsRouter)


export default rootRouter