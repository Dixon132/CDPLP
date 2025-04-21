import {Request, Response, Router} from 'express'
import { authMiddleware } from '../../../middlewares/auth'

const usuarioRouter:Router = Router()

usuarioRouter.get('/add:id', [authMiddleware],((req: Request, res: Response)=>{
    res.json({hola:'holaGET'})
}))
usuarioRouter.post('/get', (req: Request, res: Response)=>{
    res.json({hola:'holaPOST'})
})

export default usuarioRouter