import api from "@/lib/axios";

export const getDocumentosRequeridos        = ()         => api.get("/documentos-requeridos");
export const getDocumentosRequeridosAdmin   = ()         => api.get("/documentos-requeridos/admin");
export const createDocumentoRequerido       = (data)     => api.post("/documentos-requeridos", data);
export const updateDocumentoRequerido       = (id, data) => api.put(`/documentos-requeridos/${id}`, data);
export const toggleEstadoDocumentoRequerido = (id)       => api.patch(`/documentos-requeridos/${id}/estado`);
