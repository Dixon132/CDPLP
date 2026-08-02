import axios from "axios"

export const getCatalogoRoles = async () => {
    const res = await axios.get('/api/permisos/catalogo-roles')
    return res.data
}

/** Roles activos, para el select de "asignar rol" en Usuarios. */
export const getCatalogoRolesActivos = async () => {
    const res = await axios.get('/api/permisos/catalogo-roles/activos')
    return res.data
}

export const createCatalogoRol = async (data) => {
    const res = await axios.post('/api/permisos/catalogo-roles', data)
    return res.data
}

export const updateCatalogoRol = async (id, data) => {
    const res = await axios.put(`/api/permisos/catalogo-roles/${id}`, data)
    return res.data
}

export const toggleEstadoCatalogoRol = async (id) => {
    const res = await axios.patch(`/api/permisos/catalogo-roles/${id}/estado`)
    return res.data
}
