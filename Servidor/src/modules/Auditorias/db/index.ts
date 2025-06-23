import { Acciones, Modulos } from "../../../types/auditoria"
import prismaClient from "../../../utils/prismaClient"

const guardarRegistro = async (id: number, accion: Acciones, modulo: Modulos, descripcion: string) => {
    try {
        await prismaClient.auditoria.create({
            data: {
                id_usuario: id,
                accion,
                modulo,
                descripcion
            }
        })
    } catch {
        console.log('error al registrar auditoria')
    }
}
export default guardarRegistro