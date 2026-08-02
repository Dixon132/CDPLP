import axios from "axios"

export const getAllActiveUsuarios = async({page = 1, limit = 15, search = '', inactivos})=>{
    const res = await axios('/api/usuarios/usuario',{
        params: {page, limit, search, inactivos}
    })
    return res.data
}
export const desactivarUsuarios = async(id)=>{
    const request = await axios.delete(`/api/usuarios/usuario/${id}/desactivar`)
}
export const ActivarUsuarios = async(id)=>{
    const request = await axios.post(`/api/usuarios/usuario/${id}/activar`)
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

/** Lista liviana de usuarios activos {id_usuario, nombre, apellido}, para selects. */
export const getUsuariosSimples = async()=>{
    const res = await axios.get('/api/usuarios/usuario/simple')
    return res.data
}

/**
 * Usuario de la sesión actual (nombre, correo, teléfono...).
 * El JWT solo lleva `userId` y el rol, por eso hace falta este viaje.
 * OJO: la ruta es POST, no GET.
 */
export const getMe = async()=>{
    const res = await axios.post('/api/usuarios/auth/me')
    return res.data
}

