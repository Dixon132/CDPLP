import axios from "axios"

export const getAllPasantes = async () => {
    try{
        const response = await axios('/api/colegiados/pasantes')
        return response.data
    }catch(e){
        console.error("Error al obtener pasantes:", e)
    }
}
export const createPasante = async (data) => {
    try{
        const response = await axios.post('/api/colegiados/pasantes', data)
        return response.data
    }catch(e){
        console.error("Error al crear pasante:", e)
    }
}
export const modificarPasantes = async (id, data) => {
    try{

    }catch(e){
        
    }
}
export const updateEstadoPasante = async (id, estado) => {
    
}

export const deletePasante = async (id) => {
    try{

    }catch(e){
        
    }
}