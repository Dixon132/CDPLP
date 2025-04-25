import axios from "axios"

export const getAllActiveUsuarios = async()=>{
    const usuarios = await axios('/api/usuarios/usuario')
    return usuarios
}