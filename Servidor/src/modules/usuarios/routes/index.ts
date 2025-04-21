import {Router} from 'express'
import usuarioRouter from './usuarios'
import authRouter from './auth'

const usuariosRouter:Router = Router()

usuariosRouter.use('/usuario', usuarioRouter)
usuariosRouter.use('/auth',authRouter)

export default usuariosRouter