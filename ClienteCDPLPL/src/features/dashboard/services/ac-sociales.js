import axios from "axios"

export const gelAllActividadesSociales = async ({ page, search }) => {
    const res = await axios('/api/ac-sociales/ac-social/')
    return res.data
}