import axios from "axios";

/** `dominio`: 'colegiado' | 'documento' (opcional). `rango`: 'vencidos' | '7' | '15' | '30' | '60' | '90' | 'todos'. */
export const getVencimientos = async ({ dominio, rango } = {}) => {
    const res = await axios.get('/api/vencimientos', { params: { dominio, rango } });
    return res.data;
};

export const getResumenVencimientos = async () => {
    const res = await axios.get('/api/vencimientos/resumen');
    return res.data;
};
