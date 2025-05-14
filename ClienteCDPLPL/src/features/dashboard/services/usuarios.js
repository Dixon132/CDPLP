import axios from "axios"

export const getAllActiveUsuarios = async({page = 1, limit = 15, search = '', inactivos})=>{
    const res = await axios('/api/usuarios/usuario',{
        params: {page, limit, search, inactivos}
    })
    return res.data
}
export const desactivarUsuarios = async(id)=>{
    const request = await axios.delete(`/api/usuarios/usuario/${id}/desactivar`)
    return alert('exito')
}
export const ActivarUsuarios = async(id)=>{
    const request = await axios.post(`/api/usuarios/usuario/${id}/activar`)
    return alert('exito')
}
export const createUsuario = async(data)=>{
    const res =await axios.post('/api/usuarios/auth/signup',data)
    return res.data
}
export const ModificarUsuario = async(id, data)=>{
    const res = await axios.put(`/api/usuarios/usuario/${id}`,data)
}
export const getUserById = async(id)=>{
    const res =await axios.get(`/api/usuarios/usuario/${id}`)
    return res.data
}
