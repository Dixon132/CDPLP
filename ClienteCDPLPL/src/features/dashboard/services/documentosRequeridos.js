import axios from "axios";

export const getDocumentosRequeridos        = ()         => axios.get("/api/documentos-requeridos");
export const getDocumentosRequeridosAdmin   = ()         => axios.get("/api/documentos-requeridos/admin");
export const createDocumentoRequerido       = (data)     => axios.post("/api/documentos-requeridos", data);
export const updateDocumentoRequerido       = (id, data) => axios.put(`/api/documentos-requeridos/${id}`, data);
export const toggleEstadoDocumentoRequerido = (id)       => axios.patch(`/api/documentos-requeridos/${id}/estado`);
