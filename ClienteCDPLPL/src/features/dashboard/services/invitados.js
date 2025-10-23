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