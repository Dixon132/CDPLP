import axios from "axios";

/**
 * Notificaciones del usuario actual.
 * El servidor decide qué ve cada quien según los módulos de su rol, y guarda el
 * estado de lectura por usuario: marcarla leída no la marca para los demás.
 */
export const getNotificaciones = async ({ limit = 20 } = {}) => {
    const res = await axios.get('/api/notificaciones', { params: { limit } });
    return res.data;
};

export const marcarNotificacionLeida = async (id) => {
    const res = await axios.post(`/api/notificaciones/${id}/leer`);
    return res.data;
};

export const marcarTodasLeidas = async () => {
    const res = await axios.post('/api/notificaciones/leer-todas');
    return res.data;
};

/** Resumen del panel de inicio. `periodo`: 'mes' | 'trimestre' | 'anio'. */
export const getResumenDashboard = async (periodo = 'mes') => {
    const res = await axios.get('/api/dashboard/resumen', { params: { periodo } });
    return res.data;
};
