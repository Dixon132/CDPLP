import { Router } from 'express'
import { authMiddleware } from '../../../middlewares/auth'
import { getUsuarios, getUsuarioById, updateUsuarioById, desactivarUsuarioById, activarUsuarioById, getUsuariosFiltrados, getUsuariosSimples } from '../controllers/usuario'
import errorHandler from '../../../utils/error-handler'
import { Acciones, Modulos } from '../../../types/auditoria'

const usuarioRouter: Router = Router()

// Toda la gestión de usuarios es administrativa.
usuarioRouter.use(authMiddleware)

usuarioRouter.get('/', errorHandler(getUsuarios))
usuarioRouter.get('/simple', errorHandler(getUsuariosSimples))
// `/filtrar` debe declararse antes que `/:id`, si no `:id` lo captura.
usuarioRouter.get('/filtrar', errorHandler(getUsuariosFiltrados))
usuarioRouter.get('/:id', errorHandler(getUsuarioById))
usuarioRouter.put('/:id', errorHandler(updateUsuarioById, { modulo: Modulos.USUARIOS, accion: Acciones.MODIFICO }))
usuarioRouter.delete('/:id/desactivar', errorHandler(desactivarUsuarioById, { modulo: Modulos.USUARIOS, accion: Acciones.DESACTIVO }))
usuarioRouter.post('/:id/activar', errorHandler(activarUsuarioById, { modulo: Modulos.USUARIOS, accion: Acciones.ACTIVO }))

export default usuarioRouter
