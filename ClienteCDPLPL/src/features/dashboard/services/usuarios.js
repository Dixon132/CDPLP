import axios from "axios"

export const getAllActiveUsuarios = async({page = 1, limit = 15, search = ''})=>{
    const res = await axios('/api/usuarios/usuario',{
        params: {page, limit, search}
    })
    return res.data
}
export const desactivarUsuarios = async(id)=>{
    const request = await axios.delete(`/api/usuarios/usuario/${id}/desactivar`)
    return alert('exito')
}
export const createUsuario = async(data)=>{
    const res = axios('/api/usuarios/auth/signup')

}