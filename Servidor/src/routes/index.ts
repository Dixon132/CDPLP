import {Router} from 'express'
import usuariosRouter from '../modules/usuarios/routes'
import proyectosRouter from '../modules/proyectos/routes'
import colegiadosRouter from '../modules/colegiados/routes'
import actividadesSocialesRouter from '../modules/actividad-social/routes'
import actividadesInstitucionalesRouter from '../modules/actividad-institucional/routes'

const rootRouter:Router = Router()

rootRouter.use('/usuarios', usuariosRouter)
rootRouter.use('/proyectos', proyectosRouter)
rootRouter.use('/colegiados', colegiadosRouter)
rootRouter.use('/ac-sociales', actividadesSocialesRouter)
rootRouter.use('/ac-institucionales', actividadesInstitucionalesRouter)

export default rootRouter