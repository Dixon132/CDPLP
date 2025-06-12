import axios from "axios"

export const getAllCorrespondencia = async ({page, search}) => {

    const res = await axios.get(`/api/correspondencia/crsp/`, {
        params:{page, search}
    })
    return res.data

}
export const createCorrespondencia = async (formData) => {
    return await axios.post("/api/correspondencia/crsp/", formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    });
};
export const getCorrespondenciaById = async (id) => {
    const res = await axios.get(`/api/correspondencia/crsp/getOne/${id}`)
    return res.data
}
export const updateCorrespondenciaById = async (id, data) => {
    const res = await axios.put(`/api/correspondencia/crsp/${id}`, data)
    return res.data
}
export const verCorrespondencia = async (id) => {
    const response = await axios.get(`/api/correspondencia/crsp/ver/${id}`);
    const url = response.data.url;
    window.open(url, "_blank");
}

export const usuariosCorrespondencia = async () => {
    const res = await axios.get(`/api/usuarios/usuario/simple`)
    return res.data
}
//BUZON 

export const getAllBuzon = async ({ page = 1, limit = 15, search = '', estado }) => {
    const res = await axios.get(`/api/correspondencia/crsp/getAll`, {
        params: { page, limit, search, estado }
    })

    return res.data
}
export const getContenidoBuzon = async (id) => {
    const res = await axios.get(`/api/correspondencia/crsp/getContenido/${id}`)
    return res.data
}
export const marcarVisto = async (id) => {
    const res = await axios.put(`/api/correspondencia/crsp/marcarVisto/${id}`)
    return res.data
}
export const eliminarCorrespondencia = async (id) => {
    const res = await axios.delete(`/api/correspondencia/crsp/eliminar/${id}`)
    return res.data
}

export const cambiarEstadoCorrespondencia = async (id, estado) => {
    const res = await axios.put(`/api/correspondencia/crsp/cambiarEstado/${id}`, { estado })
    return res.data
}


//REPORTES

export const getCorrespondenciaReport = async (params) => {
    const res = await axios.get("/api/correspondencia/crsp/report", {
        params,
        responseType: "blob",
    });
    return res.data; // Blob del PDF
};


export const getAllUsuariosMinimal = async () => {
  const res = await axios.get("/api/correspondencia/crsp/lista-minimal");
  const raw = Array.isArray(res.data) ? res.data : res.data.data ?? [];
  
  // Ahora mapea según lo que realmente envía el backend
  return raw.map((u) => ({
    value: u.id,              // 👈 Backend envía "id"
    label: u.nombreCompleto   // 👈 Backend envía "nombreCompleto"
  }));
};