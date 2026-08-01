import axios from 'axios';

export const getAuditorias = async ({ page = 1, limit = 20, search = '', modulo = '', accion = '', fechaDesde = '', fechaHasta = '' } = {}) => {
    const params = { page, limit };
    if (search) params.search = search;
    if (modulo) params.modulo = modulo;
    if (accion) params.accion = accion;
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;

    const response = await axios.get('/api/auditorias', { params });
    return response.data;
};

export const getAuditoriasReport = async ({ search = '', modulo = '', accion = '', fechaDesde = '', fechaHasta = '' } = {}) => {
    const params = {};
    if (search) params.search = search;
    if (modulo) params.modulo = modulo;
    if (accion) params.accion = accion;
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;

    const response = await axios.get('/api/auditorias/report', { params, responseType: 'blob' });
    return response.data;
};
