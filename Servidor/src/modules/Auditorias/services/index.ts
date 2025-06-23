import { Acciones, Modulos } from "../../../types/auditoria"
import guardarRegistro from "../db"

const registrarAuditoria = async (id: number, accion: Acciones, modulo: Modulos, descripcion: string) => {
    try {
        await guardarRegistro(id, accion, modulo, descripcion)
    } catch {
        console.log('error al ejecutar funcion de registro')
    }
}
export default registrarAuditoria