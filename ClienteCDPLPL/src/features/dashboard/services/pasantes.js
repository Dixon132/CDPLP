import axios from "axios"

export const getAllPasantes = async ({page=1, limit=15, search='',inactivos}) => {
    try{
        const response = await axios('/api/colegiados/pasantes',{
            params: {page, limit, search, inactivos}
        })
        return response.data
    }catch(e){
        console.error("Error al obtener pasantes:", e)
    }
}
export const createPasante = async (data) => {
    try{
        const response = await axios.post('/api/colegiados/pasantes', data)
        return response
    }catch(e){
        console.error("Error al crear pasante:", e)
    }
}
export const getPasanteById = async (id)=>{
    try{
        const response = await axios(`/api/colegiados/pasantes/${id}`)
        return response.data
    }catch(e){
        console.error("Error al obtener pasante:", e)
    }
}
export const modificarPasante = async (id, data) => {
    try{
        const response = await axios.put(`/api/colegiados/pasantes/${id}`,data)
    }catch(e){
        console.error('Error al actulizar el pasante', e)
    }
}
export const updateEstadoPasante = async (id, estado) => {
    try{
        const response = await axios.put(`/api/colegiados/pasantes/estado/${id}`,{
            estado
        })
        return response.data
    }catch(e){
        console.error('Error al actualizar el estado del pasante', e)
    }
}

export const deletePasante = async (id) => {
    try{
        axios.delete(`/api/colegiados/pasantes/${id}`)
    }catch(e){
        console.error("Error al eliminar pasantes",(e))
    }
}