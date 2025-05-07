import axios from "axios"

export const getAllActividadesInstitucionales = async ({ page, search }) => {
    const res = await axios('/api/ac-institucionales/ac-ins/')
    return res.data
}