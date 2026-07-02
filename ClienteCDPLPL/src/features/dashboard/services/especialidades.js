import axios from 'axios';

const BASE = '/api/especialidades';

export const getAllEspecialidades      = ()         => axios.get(BASE);
export const getAllEspecialidadesAdmin = ()         => axios.get(`${BASE}/admin`);
export const createEspecialidad       = (data)     => axios.post(BASE, data);
export const updateEspecialidad       = (id, data) => axios.put(`${BASE}/${id}`, data);
export const toggleEstadoEspecialidad = (id)       => axios.patch(`${BASE}/${id}/estado`);
