// src/features/dashboard/services/tesoreria.js
import axios from "axios";

const BASE_URL = "/api/financiero/tesoreria";

/** PRESUPUESTOS */
export const getAllPresupuestos = async ({ page = 1, search = "" }) => {
    const res = await axios.get(`${BASE_URL}/presupuestos?page=${page}&limit=15&search=${encodeURIComponent(search)}`);
    return res.data;
};
export const getPresupuestoById = async (id) => {
    const res = await axios.get(`${BASE_URL}/presupuestos/${id}`);
    return res.data;
};
export const createPresupuesto = async (payload) => {
    const res = await axios.post(`${BASE_URL}/presupuestos`, payload);
    return res.data;
};
export const updatePresupuesto = async (id, payload) => {
    const res = await axios.patch(`${BASE_URL}/presupuestos/${id}`, payload);
    return res.data;
};
export const deletePresupuesto = async (id) => {
    const res = await axios.delete(`${BASE_URL}/presupuestos/${id}`);
    return res.data;
};

/** MOVIMIENTOS */
export const getMovimientosByPresupuesto = async (id_presupuesto) => {
    const res = await axios.get(`${BASE_URL}/presupuestos/${id_presupuesto}/movimientos`);
    return res.data;
};
export const createMovimientoFinanciero = async (payload) => {
    const isFormData = payload instanceof FormData;
    const res = await axios.post(`${BASE_URL}/movimientos`, payload, {
        headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
    });
    return res.data;
};
export const updateMovimientoFinanciero = async (id, payload) => {
    const res = await axios.patch(`${BASE_URL}/movimientos/${id}`, payload);
    return res.data;
};
export const deleteMovimientoFinanciero = async (id) => {
    const res = await axios.delete(`${BASE_URL}/movimientos/${id}`);
    return res.data;
};

/** ANALYTICS — nuevos endpoints */
export const getPresupuestoAnalytics = async (id, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") query.append(k, v); });
    const res = await axios.get(`${BASE_URL}/presupuestos/${id}/analytics?${query.toString()}`);
    return res.data;
};

export const getMovimientosFiltrados = async (id, params = {}) => {
    try {
        const query = new URLSearchParams();
        if (params.page) query.append("page", params.page);
        if (params.limit) query.append("limit", params.limit);
        if (params.tipo) query.append("tipo", params.tipo);
        if (params.categoria) query.append("categoria", params.categoria);
        if (params.fecha_desde) query.append("fecha_desde", params.fecha_desde);
        if (params.fecha_hasta) query.append("fecha_hasta", params.fecha_hasta);
        if (params.search) query.append("search", params.search);
        if (params.sortOrder) query.append("sortOrder", params.sortOrder);

        const res = await axios.get(`${BASE_URL}/presupuestos/${id}/movimientos-filtrados?${query.toString()}`);
        return res.data;
    } catch (error) {
        throw error;
    }
};

export const getCategoriasByPresupuesto = async (id) => {
    const res = await axios.get(`${BASE_URL}/presupuestos/${id}/categorias`);
    return res.data;
};

/** REPORTES */
export const getPresupuestosSummaryReport = async (params) => {
    const res = await axios.get(`${BASE_URL}/report`, { params, responseType: "blob" });
    return res.data;
};
export const getPresupuestoDetailReport = async (id) => {
    const res = await axios.get(`${BASE_URL}/${id}/report`, { responseType: "blob" });
    return res.data;
};
export const getMovimientosSummaryReport = async (params) => {
    const res = await axios.get(`${BASE_URL}/report`, { params, responseType: "blob" });
    return res.data;
};