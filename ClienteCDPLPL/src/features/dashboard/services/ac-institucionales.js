// src/services/ac-institucionales.js
import axios from "axios";

const BASE_URL = "/api/ac-institucionales/ac-ins"; // Asegúrate de que esta ruta coincida con la que expongas en tu backend

/**
 * 1) Listar todas las actividades institucionales (paginación + búsqueda)
 *    Espera: GET /api/ac-institucionales?search=...&page=...
 *    Responde: { data: [actividades], total, page, totalPages }
 */
export const getAllActividadesInstitucionales = async ({ page = 1, search = "" }) => {
    const res = await axios.get(
        `${BASE_URL}?page=${page}&limit=15&search=${encodeURIComponent(search)}`
    );
    return res.data;
    // se asume: { data, total, page, totalPages }
};

/**
 * 2) Traer una actividad institucional por ID
 *    GET /api/ac-institucionales/:id
 */
export const getActividadInstitucionalById = async (id) => {
    const res = await axios.get(`${BASE_URL}/${id}`);
    return res.data; // objeto único de actividad institucional
};

/**
 * 3) Crear nueva actividad institucional
 *    POST /api/ac-institucionales
 *    body: { nombre, descripcion, tipo, fecha_programada, costo, estado }
 */
export const createActividadInstitucional = async (payload) => {
    const res = await axios.post(BASE_URL, payload);
    return res.data;
};

/**
 * 4) Actualizar actividad institucional (PUT o PATCH)
 *    PATCH /api/ac-institucionales/:id
 *    body: { nombre, descripcion, tipo, fecha_programada, costo, estado }
 */
export const updateActividadInstitucional = async (id, payload) => {
    const res = await axios.patch(`${BASE_URL}/${id}`, payload);
    return res.data;
};

/**
 * 5) Cambiar sólo el estado (ACTIVO <-> INACTIVO)
 *    PATCH /api/ac-institucionales/:id/estado
 *    body: { estado }
 */
export const updateEstadoActividadInstitucional = async (id, nuevoEstado) => {
    const res = await axios.patch(`${BASE_URL}/${id}/estado`, { estado: nuevoEstado });
    return res.data;
};

/**
 * 6) Traer todos los colegiados (para select)
 *    GET /api/colegiados
 */

/**
 * 7) Traer todos los invitados (para select)
 *    GET /api/invitados
 */

/**
 * 8) Registrar un colegiado/invitado en la actividad institucional
 *    POST /api/colegiados-registrados-actividad-institucional
 *    body: {
 *      id_actividad,
 *      id_colegiado?,      // o null
 *      id_invitado?,       // o null
 *      fecha_registro,     // si quieres pasar, o el backend le pone now()
 *      estado_registro,    // “REGISTRADO”, “PAGADO”, etc. (puedes adaptarlo)
 *      metodo_pago,        // e.g. “EFECTIVO” / “TRANSFERENCIA”
 *    }
 */
export const registerColegiadoInstitucional = async (payload) => {
    const res = await axios.post(`${BASE_URL}/registrarColegiado`,
        payload
    );
    console.log(payload)
    return res.data;
};

/**
 * 9) Traer todos los registros (colegiados + invitados) de una actividad institucional
 *    GET /api/colegiados-registrados-actividad-institucional/actividad/:id
 *    → Responde un array de objetos como:
 *    [
 *      {
 *        id_registro,
 *        id_actividad,
 *        id_colegiado,
 *        id_invitado,
 *        fecha_registro,
 *        estado_registro,
 *        metodo_pago,
 *        colegiados: { id_colegiado, nombre, apellido, especialidades, ... } | null,
 *        invitados: { id_invitado, nombre, apellido, tipo, ... } | null
 *      },
 *      …
 *    ]
 */
export const getRegistrosPorActividadInstitucional = async (id_actividad) => {
    const res = await axios.get(
        `${BASE_URL}/getRegistros/${id_actividad}`
    );
    return res.data;
};

export const getAsistenciasPorActividad = async (id_actividad) => {
    const res = await axios.get(`${BASE_URL}/getAsistencias/${id_actividad}`);
    return res.data;
};



export const createAsistenciaActividad = async (payload) => {
    const res = await axios.post(`${BASE_URL}/createAsistencia`, payload);
    console.log(res.data);
    return res.data;
};

export const deleteAsistenciaActividad = async (id_asistencia) => {
    const res = await axios.delete(`${BASE_URL}/deleteAsistencia/${id_asistencia}`);
    return res.data;
};

//REPORTES


export const getActividadesInstMinimal = async () => {
    const res = await axios.get("/api/ac-institucionales/ac-ins/lista-minimal");
    return res.data; // Array de objetos { id, nombre }
};

/**
 * getActividadInstDetailReport
 * GET /api/actividades-institucionales/:id/report
 * responseType: 'blob' para recibir PDF
 */
export const getActividadInstDetailReport = async (id) => {
    const res = await axios.get(`/api/ac-institucionales/ac-ins/${id}/report`, {
        responseType: "blob",
    });
    return res.data; // Blob PDF
};

/**
 * getActividadesInstSummaryReport
 * GET /api/actividades-institucionales/report?fecha_inicio=...&fecha_fin=...
 * responseType: 'blob' para recibir PDF
 */
export const getActividadesInstSummaryReport = async (params) => {
    const res = await axios.get("/api/ac-institucionales/ac-ins/report", {
        params,
        responseType: "blob",
    });
    return res.data; // Blob PDF
};