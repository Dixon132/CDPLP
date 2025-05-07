import axios from "axios"

export const getAllColegiados = async({page=1,limit=15,search=''})=>{
    const res =  await axios('/api/colegiados/colegiado/', {
        params: {page, limit, search}
    })
    return res.data
}