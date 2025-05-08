import { Alert } from "@mui/material"
import axios from "axios"

export const getAllColegiados = async({page=1,limit=15,search=''})=>{
    const res =  await axios('/api/colegiados/colegiado/', {
        params: {page, limit, search}
    })
    return res.data
}
export const createColegiado = async(data)=>{
    const res = await axios.post('/api/colegiados/colegiado/',data)
    return console.log(res)
}
export const updateEstadoColegiado = async(id)=>{
    const res = await axios.put(`/api/colegiados/colegiado/${id}`,{
        estado: 'INACTIVO'
    })
    return alert('success')
}