import axios from "axios"

export const gelAllActividadesSociales = async ({ page, search, estado }) => {
    const res = await axios('/api/ac-sociales/ac-social/', {
        params: { page, search, estado }
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
//////////
export const deleteActividadSocial = async(id)=>{
    const res = await axios.delete(`/api/ac-sociales/ac-social/${id}`);
}
export const cambiarEstadoActividadSocial = async (id, estado) => {
    const res = await axios.post(`/api/ac-sociales/ac-social/${id}/updateEstado`, { estado });
    return res.data;
}
//ASIGNAR COLEGIADO

export const getColegiados = async () => {
    const res = await axios.get('/api/colegiados/colegiado/getSimple');
    return res.data;
}
export const asignarColegiado = async (data) => {
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

export const getPasantes = async ()=>{
    const res = await axios.get("/api/colegiados/pasantes/")
    return res.data.data
}
export const asignarPasante = async (data)=>{
    const res = await axios.post('/api/ac-sociales/ac-social/asignarPasante', data)
    return res.data
}
// ── Asignaciones ───────────────────────────────────────────────────────────
// Estas rutas se consumían con `fetch()` crudo desde los componentes, sin el
// header Authorization que inyecta axios. Al pasar el módulo a requerir sesión
// devolvían 401 y, como no se comprobaba `res.ok`, el cuerpo del error acababa
// pintado como si fueran datos (de ahí los "Invalid Date").
export const getAsignacionById = async (id) => {
    const res = await axios.get(`/api/ac-sociales/ac-social/asignacion/${id}`);
    return res.data;
}
export const updateMetaAsignacion = async (id, horas_meta) => {
    const res = await axios.patch(`/api/ac-sociales/ac-social/asignacion/${id}/meta`, { horas_meta });
    return res.data;
}
export const updateEstadoAsignacion = async (id, estado) => {
    const res = await axios.patch(`/api/ac-sociales/ac-social/asignacion/${id}/estado`, { estado });
    return res.data;
}
export const resetHorasAsignacion = async (id) => {
    const res = await axios.patch(`/api/ac-sociales/ac-social/asignacion/${id}/reset-horas`);
    return res.data;
}
