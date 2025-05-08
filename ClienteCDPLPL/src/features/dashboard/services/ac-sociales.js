import axios from "axios"

export const gelAllActividadesSociales = async ({ page, search }) => {
    const res = await axios('/api/ac-sociales/ac-social/')
    return res.data
}
export const createActividadSocial = async (data) => {
    const res = await axios.post('/api/actividades-sociales/actividad', data);
    return res.data;
  };