import { Alert } from "@mui/material"
import axios from "axios"

export const getAllColegiados = async ({ page = 1, limit = 15, search = '', inactivos }) => {
    const res = await axios('/api/colegiados/colegiado/', {
        params: { page, limit, search, inactivos }
    })
    return res.data
}
export const createColegiado = async (data) => {
    const res = await axios.post('/api/colegiados/colegiado/', data)
    return console.log(res)
}
export const updateEstadoColegiado = async (id, estado) => {
    const res = await axios.put(`/api/colegiados/colegiado/${id}`, {
        estado
    })
    return alert('success')
}
export const modificarColegiados = async (id, data) => {
    const res = await axios.put(`/api/colegiados/colegiado/update/${id}`, data)
    return alert('exito modfiicado')
}
export const getColegiadoById = async (id) => {
    const res = await axios(`/api/colegiados/colegiado/getOne/${id}`)
    return res.data
}



//SERVICES DE DOCUMENTOS DEL COLEGIADO

export const getAlldocs = async (id) => {
    const res = await axios.get(`/api/colegiados/documentos/${id}`)
    return res.data
}
export const verDocumento = async (id) => {
    const response = await axios.get(`/api/colegiados/documentos/ver/${id}`);
    const url = response.data.url;

    // Abre el PDF en una nueva pestaña
    window.open(url, "_blank");
};
export const getDocById = async (id, tipo) => {
    const res = await axios.get(`/api/colegiados/documentos/getOne/${id}`, {
        params: { tipo_documento: tipo }
    })
    return res.data
}
export const getEspecificDoc = async (id) => {
    const res = await axios.get(`/api/colegiados/documentos/especifico/${id}`)
    return res.data
}
export const updateDoc = async (id, data) => {
    const res = await axios.put(`/api/colegiados/documentos/update/${id}`, data)
    return alert('Documento actualizado con éxito')
}


export const getAllPagos = async (id) => {
    const res = await axios(`/api/colegiados/pagos/${id}`)
    return res.data
}
export const createPago = async (id, data) => {
    const res = await axios.post(`/api/colegiados/pagos/${id}`, data)
    return alert('success')
}
export const getPagoById = async (id_pago) => {
    const res = await axios.get(`/api/colegiados/pagos/getOne/${id_pago}`)
    return res.data
}
export const updatePago = async (id_pago, data) => {
    const res = await axios.put(`/api/colegiados/pagos/update/${id_pago}`, data)
    return alert('Pago actualizado correctamente')
}


//REPORTES


export const getColegiadosReportSummary = async () => {
    // responseType: 'blob' para recibir un PDF
    const res = await axios.get("/api/colegiados/colegiado/report/summary", {
        responseType: "blob",
    });
    return res.data; // Blob con datos del PDF
};

// 2) Reporte Individual de un colegiado
export const getColegiadoReportDetail = async (id) => {
    const res = await axios.get(`/api/colegiados/colegiado/${id}/report`, {
        responseType: "blob",
    });
    return res.data; // Blob con datos del PDF
};