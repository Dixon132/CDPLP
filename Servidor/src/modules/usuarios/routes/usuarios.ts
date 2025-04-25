import {Request, Response, Router} from 'express'
import { authMiddleware } from '../../../middlewares/auth'
import { getUsuarios, getUsuarioById, updateUsuarioById,desactivarUsuarioById,activarUsuarioById,getUsuariosFiltrados } from '../controllers/usuario'
import errorHandler from '../../../utils/error-handler'

const usuarioRouter:Router = Router()

usuarioRouter.get('/', [authMiddleware],errorHandler(getUsuarios))
usuarioRouter.get('/:id', errorHandler(getUsuarioById))
usuarioRouter.put('/:id', errorHandler(updateUsuarioById))
usuarioRouter.delete('/:id/desactivar', errorHandler(desactivarUsuarioById))
usuarioRouter.post('/:id/activar', errorHandler(activarUsuarioById))
usuarioRouter.get('/filtrar', errorHandler(getUsuariosFiltrados))



export default usuarioRouter