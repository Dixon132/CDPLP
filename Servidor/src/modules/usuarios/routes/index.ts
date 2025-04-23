import {Router} from 'express'
import usuarioRouter from './usuarios'
import authRouter from './auth'
import rolesRouter from './roles'
const usuariosRouter:Router = Router()

usuariosRouter.use('/usuario', usuarioRouter)
usuariosRouter.use('/auth',authRouter)
usuariosRouter.use('/roles', rolesRouter)
export default usuariosRouter