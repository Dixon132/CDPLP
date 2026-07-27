import axios from 'axios';

export const getInstituciones = async () => {
    try {
        const response = await axios.get('/api/instituciones');
        return response.data;
    } catch (error) {
        console.error('Error fetching instituciones:', error);
        throw error;
    }
};

export const createInstitucion = async (data) => {
    try {
        const response = await axios.post('/api/instituciones', data);
        return response.data;
    } catch (error) {
        console.error('Error creating institucion:', error);
        throw error;
    }
};

export const updateInstitucion = async (id, data) => {
    try {
        const response = await axios.put(`/api/instituciones/${id}`, data);
        return response.data;
    } catch (error) {
        console.error('Error updating institucion:', error);
        throw error;
    }
};

export const deleteInstitucion = async (id) => {
    try {
        const response = await axios.delete(`/api/instituciones/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting institucion:', error);
        throw error;
    }
};
