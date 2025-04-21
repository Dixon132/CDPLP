import {Router} from 'express'
import usuariosRouter from '../modules/usuarios/routes'

const rootRouter:Router = Router()

rootRouter.use('/usuarios', usuariosRouter)

export default rootRouter