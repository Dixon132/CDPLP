import { Router } from 'express'
import { authMiddleware } from '../../../middlewares/auth'
import requirePermiso from '../../../middlewares/requirePermiso'
import { getUsuarios, getUsuarioById, updateUsuarioById, desactivarUsuarioById, activarUsuarioById, getUsuariosFiltrados, getUsuariosSimples } from '../controllers/usuario'
import errorHandler from '../../../utils/error-handler'
import { Acciones, Modulos } from '../../../types/auditoria'

const usuarioRouter: Router = Router()

// Toda la gestión de usuarios es administrativa.
usuarioRouter.use(authMiddleware)

usuarioRouter.get('/', requirePermiso('usuarios', 'OBSERVADOR'), errorHandler(getUsuarios))
usuarioRouter.get('/simple', requirePermiso('usuarios', 'OBSERVADOR'), errorHandler(getUsuariosSimples))
// `/filtrar` debe declararse antes que `/:id`, si no `:id` lo captura.
usuarioRouter.get('/filtrar', requirePermiso('usuarios', 'OBSERVADOR'), errorHandler(getUsuariosFiltrados))
usuarioRouter.get('/:id', requirePermiso('usuarios', 'OBSERVADOR'), errorHandler(getUsuarioById))
usuarioRouter.put('/:id', requirePermiso('usuarios', 'EDITOR'), errorHandler(updateUsuarioById, { modulo: Modulos.USUARIOS, accion: Acciones.MODIFICO }))
usuarioRouter.delete('/:id/desactivar', requirePermiso('usuarios', 'EDITOR'), errorHandler(desactivarUsuarioById, { modulo: Modulos.USUARIOS, accion: Acciones.DESACTIVO }))
usuarioRouter.post('/:id/activar', requirePermiso('usuarios', 'EDITOR'), errorHandler(activarUsuarioById, { modulo: Modulos.USUARIOS, accion: Acciones.ACTIVO }))

export default usuarioRouter
