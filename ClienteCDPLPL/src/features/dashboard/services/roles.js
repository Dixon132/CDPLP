import axios from "axios";

export const getAllRoles = async ({ page = 1, limit = 15, search = '', inactivos }) => {
    const response = await axios.get('/api/usuarios/roles/', {
        params: { page, limit, search, inactivos }
    });
    console.log(response)
    return response.data;
};


export const estadoRol = async (id, estado) => {
    const response = await axios.put(`/api/usuarios/roles/${id}`,{
        estado
    });
    return response.data;
};

export const actualizarRol = async (id, data) => {
    const response = await axios.put(`/api/usuarios/roles/update/${id}`, data);
}; 

