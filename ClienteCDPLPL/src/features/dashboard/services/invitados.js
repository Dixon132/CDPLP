import axios from "axios"

export const getAllInvitados = async ({page=1, limit=15, search='',inactivos}) => {
    try{
        const response = await axios('/api/colegiados/invitados',{
            params: { page, limit, search, inactivos }
        })
        return response.data
    }catch(e){
        console.error("Error al obtener usuarios:", e)
    }
}
export const createInvitado = async (data) => {
    try{
        const response = await axios.post('/api/colegiados/invitados', data)
        return response.data
    }catch(e){
        console.error("Error al crear invitado:", e)
    }
}
export const updateInvitado = async (id, data) => {
    try{
        await axios.put(`/api/colegiados/invitados/${id}`, data)
    }catch(e){

    }
}
export const updateEstadoInvitado = async (id, estado) => {
    try{
        await axios.patch(`/api/colegiados/invitados/${id}/estado`, { estado })
    }catch(e){
        throw e;
    }
}
export const deleteInvitado = async (id) => {
    try{
        await axios.delete(`/api/colegiados/invitados/${id}`)
    }catch(e){
        console.error("Error al eliminar invitado:", e)
    }
}
export const getInvitadoById = async (id) => {
    try{
        const response = await axios(`/api/colegiados/invitados/${id}`)
        return response.data
    }catch(e){

    }
}

export const getAllPagosInvitado = async (id) => {
    try{
        const response = await axios(`/api/colegiados/pagos-invitados/${id}`)
        return response.data
    }catch(e){
        console.error("Error al obtener pagos de invitado:", e)
    }
}
export const createPagoInvitado = async (id, data) => {
    try{
        const response = await axios.post(`/api/colegiados/pagos-invitados/${id}`, data)
        return response.data
    }catch(e){
        console.error("Error al crear pago de invitado:", e)
    }
}
export const getPagoInvitadoById = async (id) => {
    try{
        const response = await axios(`/api/colegiados/pagos-invitados/getOne/${id}`)
        return response.data
    }catch(e){
        console.error("Error al obtener pago de invitado:", e)
    }
}
export const updatePagoInvitado = async (id, data) => {
    try{
        await axios.put(`/api/colegiados/pagos-invitados/update/${id}`, data)
    }catch(e){
        console.error("Error al actualizar pago de invitado:", e)
    }
}
export const verPagoInvitado = async (id) => {
    try {
        const response = await axios(`/api/colegiados/pagos-invitados/ver/${id}`)
        return response.data.url
    } catch (e) {
        console.error("Error al obtener url de pago de invitado:", e)
    }
}