// src/services/tesoreria.js
import axios from "axios";

const BASE_URL = "/api/financiero/tesoreria";

/**
 * PRESUPUESTOS
 */

// 1) Listar presupuestos (paginación + búsqueda)
export const getAllPresupuestos = async ({ page = 1, search = "" }) => {
    const res = await axios.get(
        `${BASE_URL}/presupuestos?page=${page}&limit=15&search=${encodeURIComponent(search)}`
    );
    return res.data; // { data: [presupuestos], total, page, totalPages }
};

// 2) Obtener un presupuesto por ID (incluye movimientos y saldo_restante)
export const getPresupuestoById = async (id) => {
    const res = await axios.get(`${BASE_URL}/presupuestos/${id}`);
    return res.data; // { id_presupuesto, nombre_presupuesto, ..., monto_total, saldo_restante, movimientos: [...] }
};

// 3) Crear un presupuesto
export const createPresupuesto = async (payload) => {
    const res = await axios.post(`${BASE_URL}/presupuestos`, payload);
    return res.data;
};

// 4) Actualizar un presupuesto
export const updatePresupuesto = async (id, payload) => {
    const res = await axios.patch(`${BASE_URL}/presupuestos/${id}`, payload);
    return res.data;
};

// 5) Eliminar un presupuesto
export const deletePresupuesto = async (id) => {
    const res = await axios.delete(`${BASE_URL}/presupuestos/${id}`);
    return res.data;
};

/**
 * MOVIMIENTOS FINANCIEROS
 */

// 6) Listar movimientos de un presupuesto
export const getMovimientosByPresupuesto = async (id_presupuesto) => {
    const res = await axios.get(`${BASE_URL}/presupuestos/${id_presupuesto}/movimientos`);
    return res.data; // array de movimientos
};

// 7) Crear un movimiento financiero
export const createMovimientoFinanciero = async (payload) => {
    // payload: { id_presupuesto, tipo_movimiento, categoria, descripcion, monto, fecha_movimiento }
    const res = await axios.post(`${BASE_URL}/movimientos`, payload);
    return res.data;
};

// 8) Actualizar un movimiento financiero
export const updateMovimientoFinanciero = async (id, payload) => {
    const res = await axios.patch(`${BASE_URL}/movimientos/${id}`, payload);
    return res.data;
};

// 9) Eliminar un movimiento financiero
export const deleteMovimientoFinanciero = async (id) => {
    const res = await axios.delete(`${BASE_URL}/movimientos/${id}`);
    return res.data;
};







//REPORTES


export const getPresupuestosSummaryReport = async (params) => {
    const res = await axios.get("/api/financiero/tesoreria/report", {
        params,
        responseType: "blob",
    });
    return res.data;
};

/**
 * getPresupuestoDetailReport(id)
 *   GET /api/presupuestos/:id/report
 */
export const getPresupuestoDetailReport = async (id) => {
    const res = await axios.get(`/api/financiero/tesoreria/${id}/report`, {
        responseType: "blob",
    });
    return res.data;
};
export const getMovimientosSummaryReport = async (params) => {
    const res = await axios.get("/api/financiero/tesoreria/report", {
        params,
        responseType: "blob",
    });
    return res.data;
};