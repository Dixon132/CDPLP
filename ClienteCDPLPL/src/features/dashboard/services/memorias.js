import axios from "axios";

const BASE_URL = "/api/memorias";

export const getAllMemorias = async () => {
    const res = await axios.get(BASE_URL);
    return res.data;
};

export const createMemoria = async (formData) => {
    const res = await axios.post(BASE_URL, formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    });
    return res.data;
};

export const updateMemoria = async (id, formData) => {
    const res = await axios.put(`${BASE_URL}/${id}`, formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    });
    return res.data;
};

export const deleteMemoria = async (id) => {
    const res = await axios.delete(`${BASE_URL}/${id}`);
    return res.data;
};
