import axios from "axios";

const BASE_URL = "/api/financiero/config";

export const getPresupuestoActivo = async () => {
    const res = await axios.get(`${BASE_URL}/presupuesto-activo`);
    return res.data;
};

export const setPresupuestoActivo = async (id_presupuesto) => {
    const res = await axios.post(`${BASE_URL}/presupuesto-activo`, { id_presupuesto });
    return res.data;
};
