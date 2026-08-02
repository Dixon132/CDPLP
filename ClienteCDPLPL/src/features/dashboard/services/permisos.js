import axios from "axios"

/** Mapa {clave_recurso: 'SIN_ACCESO'|'OBSERVADOR'|'EDITOR'} del usuario logueado. */
export const getMisPermisos = async () => {
    const res = await axios.get('/api/permisos/mis-permisos')
    return res.data
}

/** Árbol completo de módulos/submódulos, para pintar la matriz de permisos. */
export const getArbolRecursos = async () => {
    const res = await axios.get('/api/permisos/recursos')
    return res.data
}

export const getMatrizPorRol = async (idRolCatalogo) => {
    const res = await axios.get(`/api/permisos/rol-permisos/${idRolCatalogo}`)
    return res.data
}

export const actualizarMatrizPorRol = async (idRolCatalogo, permisos) => {
    const res = await axios.put(`/api/permisos/rol-permisos/${idRolCatalogo}`, { permisos })
    return res.data
}

export const getPermisosDeUsuario = async (idUsuario) => {
    const res = await axios.get(`/api/permisos/usuarios/${idUsuario}`)
    return res.data
}

export const upsertOverridePermiso = async (idUsuario, id_recurso, nivel) => {
    const res = await axios.put(`/api/permisos/usuarios/${idUsuario}`, { id_recurso, nivel })
    return res.data
}

export const restablecerPermiso = async (idUsuario, idRecurso) => {
    const res = await axios.delete(`/api/permisos/usuarios/${idUsuario}/${idRecurso}`)
    return res.data
}
