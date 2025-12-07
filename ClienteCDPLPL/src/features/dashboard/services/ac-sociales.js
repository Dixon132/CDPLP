import axios from "axios"

export const gelAllActividadesSociales = async ({ page, search }) => {
    const res = await axios('/api/ac-sociales/ac-social/', {
        params: { page, search }
    })
    return res.data
}
export const createActividadSocial = async (data) => {
    const res = await axios.post('/api/ac-sociales/ac-social/create', data);
    return res.data;
};
export const getConvenios = async () => {
    const res = await axios.get('/api/ac-sociales/convenios/getSimple');
    return res.data;
}

//getActividadSocialById, updateActividadSocial
export const getActividadSocialById = async (id) => {
    const res = await axios.get(`/api/ac-sociales/ac-social/detalles/${id}`);
    return res.data;
}
export const updateActividadSocial = async (id, data) => {
    const res = await axios.put(`/api/ac-sociales/ac-social/update/${id}`, data);
    return res.data;
}
export const deleteActividadSocial = async(id)=>{
    console.log('elimino', id)
}
//ASIGNAR COLEGIADO

export const getColegiados = async () => {
    const res = await axios.get('/api/colegiados/colegiado/getSimple');
    return res.data;
}
export const asignarColegiado = async (data) => {
    console.log(data)
    const res = await axios.post('/api/ac-sociales/ac-social/asignarColegiado', data);
    return res.data;
}
export const getInvitados = async (id) => {
    const res = await axios.get('/api/colegiados/colegiado/getInvitados', {
        params: { id_actividad_social: id }
    });
    return res.data;
}

//REPORTES


export const getActividadesSocialesMinimal = async () => {
    const res = await axios.get("/api/ac-sociales/ac-social/lista-minimal");
    return res.data;
};

/**
 * Genera y descarga el PDF detallado de una actividad social dada su ID.
 * Retorna un Blob.
 */
export const getActividadSocialDetailReport = async (id) => {
    const res = await axios.get(`/api/ac-sociales/ac-social/${id}/report`, {
        responseType: "blob",
    });
    return res.data;
};

/**
 * Genera y descarga el PDF resumen de actividades sociales entre fechas.
 * params = { fecha_inicio: "2025-06-01", fecha_fin: "2025-06-15" }
 */
export const getActividadesSocialesSummaryReport = async (params) => {
    const res = await axios.get("/api/ac-sociales/ac-social/report", {
        params,
        responseType: "blob",
    });
    return res.data;
};