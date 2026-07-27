import axios from "axios";

export const getAllConvenios = async ({ page, search, estado }) =>
    axios.get("/api/ac-sociales/convenios", { params: { page, search, estado } }).then(r => r.data);

export const getConvenioById = (id) => axios.get(`/api/ac-sociales/convenios/${id}`).then(r => r.data);
export const createConvenio = (d) => axios.post("/api/ac-sociales/convenios", d);
export const updateConvenioById = (id, d) => axios.put(`/api/ac-sociales/convenios/${id}`, d);
export const cambiarEstadoConvenio = (id, estado) => axios.put(`/api/ac-sociales/convenios/cambiarEstado/${id}`, { estado }).then(r => r.data);
