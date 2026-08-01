import axios from "axios"

// Forma vacía segura para los listados: evita que un fallo de red reviente el
// destructuring en los contenedores.
const LISTA_VACIA = { data: [], total: 0, page: 1, totalPages: 1 }

export const getAllInvitados = async ({ page = 1, limit = 15, search = '', inactivos }) => {
    try {
        const response = await axios('/api/colegiados/invitados', {
            params: { page, limit, search, inactivos }
        })
        return response.data
    } catch (e) {
        console.error("Error al obtener invitados:", e)
        return LISTA_VACIA
    }
}

// Las mutaciones propagan el error: el contenedor necesita distinguir éxito de
// fallo para mostrar la alerta correcta.
export const createInvitado = async (data) => {
    const response = await axios.post('/api/colegiados/invitados', data)
    return response.data
}
export const updateInvitado = async (id, data) => {
    const response = await axios.put(`/api/colegiados/invitados/${id}`, data)
    return response.data
}
export const updateEstadoInvitado = async (id, estado) => {
    const response = await axios.patch(`/api/colegiados/invitados/${id}/estado`, { estado })
    return response.data
}
export const deleteInvitado = async (id) => {
    const response = await axios.delete(`/api/colegiados/invitados/${id}`)
    return response.data
}
export const getInvitadoById = async (id) => {
    const response = await axios(`/api/colegiados/invitados/${id}`)
    return response.data
}

export const getAllPagosInvitado = async (id) => {
    try {
        const response = await axios(`/api/colegiados/pagos-invitados/${id}`)
        return response.data
    } catch (e) {
        console.error("Error al obtener pagos de invitado:", e)
        return []
    }
}
export const createPagoInvitado = async (id, data) => {
    const response = await axios.post(`/api/colegiados/pagos-invitados/${id}`, data)
    return response.data
}
export const getPagoInvitadoById = async (id) => {
    const response = await axios(`/api/colegiados/pagos-invitados/getOne/${id}`)
    return response.data
}
export const updatePagoInvitado = async (id, data) => {
    const response = await axios.put(`/api/colegiados/pagos-invitados/update/${id}`, data)
    return response.data
}
export const verPagoInvitado = async (id) => {
    const response = await axios(`/api/colegiados/pagos-invitados/ver/${id}`)
    return response.data.url
}
