import axios from "axios"

// Forma vacía segura para los listados: evita que un fallo de red reviente el
// destructuring en los contenedores.
const LISTA_VACIA = { data: [], total: 0, page: 1, totalPages: 1 }

export const getAllPasantes = async ({ page = 1, limit = 15, search = '', inactivos }) => {
    try {
        const response = await axios('/api/colegiados/pasantes', {
            params: { page, limit, search, inactivos }
        })
        return response.data
    } catch (e) {
        console.error("Error al obtener pasantes:", e)
        return LISTA_VACIA
    }
}

// Las mutaciones propagan el error: el contenedor necesita distinguir éxito de
// fallo para mostrar la alerta correcta.
export const createPasante = async (data) => {
    const response = await axios.post('/api/colegiados/pasantes', data)
    return response.data
}
export const getPasanteById = async (id) => {
    const response = await axios(`/api/colegiados/pasantes/${id}`)
    return response.data
}
export const modificarPasante = async (id, data) => {
    const response = await axios.put(`/api/colegiados/pasantes/${id}`, data)
    return response.data
}
export const updateEstadoPasante = async (id, estado) => {
    const response = await axios.put(`/api/colegiados/pasantes/estado/${id}`, { estado })
    return response.data
}
export const deletePasante = async (id) => {
    const response = await axios.delete(`/api/colegiados/pasantes/${id}`)
    return response.data
}
