import axios from "axios"

export const getAllProyectos = async({page=1,limit=15,search=''})=>{
    const res =  await axios('/api/proyectos/proyecto/getAll',{
        params: {page, limit, search}
    })
    return res.data
}