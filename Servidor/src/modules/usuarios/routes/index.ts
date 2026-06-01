import {Router} from 'express'
import usuarioRouter from './usuarios'
import authRouter from './auth'
import rolesRouter from './roles'
import authCampoRouter from './auth-campo'

const usuariosRouter:Router = Router()

usuariosRouter.use('/usuario', usuarioRouter)
usuariosRouter.use('/auth', authRouter)
usuariosRouter.use('/auth/campo', authCampoRouter)
usuariosRouter.use('/roles', rolesRouter)
export default usuariosRouter