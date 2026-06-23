import axios from "axios";

const BASE = "/api/postulaciones";

// ─── PÚBLICO ───────────────────────────────────────────────────

/** Verifica si el CI ya existe como colegiado o postulación activa */
export const verificarCI = async (ci) => {
    const res = await axios.get(`${BASE}/verificar/${ci}`);
    return res.data;
};

/** Obtiene configuración de pago (QR, datos bancarios) */
export const getConfigPago = async () => {
    const res = await axios.get(`${BASE}/config-pago`);
    return res.data;
};

/**
 * Envía la postulación como multipart/form-data
 * @param {FormData} formData - debe tener campos: carnet_identidad, nombre, apellido,
 *   correo, telefono, especialidades, documentos (múltiples), comprobante (uno)
 */
export const crearPostulacion = async (formData) => {
    const res = await axios.post(`${BASE}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
};

// ─── ADMIN ────────────────────────────────────────────────────

/** Lista postulaciones con filtros */
export const getPostulaciones = async ({ estado, page = 1, limit = 15, search = "" } = {}) => {
    const res = await axios.get(`${BASE}/admin`, { params: { estado, page, limit, search } });
    return res.data;
};

/** Obtiene detalle de una postulación */
export const getPostulacionById = async (id) => {
    const res = await axios.get(`${BASE}/admin/${id}`);
    return res.data;
};

/** Acepta una postulación → crea colegiado */
export const aceptarPostulacion = async (id) => {
    const res = await axios.patch(`${BASE}/admin/${id}/aceptar`);
    return res.data;
};

/** Rechaza una postulación → elimina archivos */
export const rechazarPostulacion = async (id, motivo = "") => {
    const res = await axios.patch(`${BASE}/admin/${id}/rechazar`, { motivo });
    return res.data;
};

/** Elimina definitivamente el registro */
export const eliminarPostulacion = async (id) => {
    const res = await axios.delete(`${BASE}/admin/${id}`);
    return res.data;
};

/** Obtiene config de pago (admin) */
export const getConfigPagoAdmin = async () => {
    const res = await axios.get(`${BASE}/admin/config-pago`);
    return res.data;
};

/** Guarda/actualiza config de pago (admin)
 * @param {Array<{clave:string, valor:string, descripcion?:string}>} items
 */
export const upsertConfigPago = async (items) => {
    const res = await axios.put(`${BASE}/admin/config-pago`, items);
    return res.data;
};

/** Sube imagen QR y actualiza en config_pago
 * @param {File} file - El archivo de imagen
 */
export const uploadQrConfig = async (file) => {
    const formData = new FormData();
    formData.append("qr", file);
    const res = await axios.post(`${BASE}/admin/upload-qr`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
};
