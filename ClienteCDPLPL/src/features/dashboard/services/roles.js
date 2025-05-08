import axios from "axios";

export const getAllRoles = async ({ page = 1, limit = 15, search = '' }) => {
    const response = await axios.get('/api/usuarios/roles/', {
        params: { page, limit, search }
    });
    console.log(response)
    return response.data;
};

export const createRol = async (data) => {
    const response = await axios.post('/api/roles', data);
    return response.data;
};

export const desactivarRol = async (id) => {
    const response = await axios.put(`/api/roles/${id}/desactivar`);
    return response.data;
};

export const actualizarRol = async (id, data) => {
    const response = await axios.put(`/api/roles/${id}`, data);
    return response.data;
}; 