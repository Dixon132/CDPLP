// src/pages/dashboard/pages/Ac-institucionales/GestionAsistenciaInst.jsx
import React, { useEffect, useState } from "react";
import {
    getRegistrosPorActividadInstitucional,
    getAsistenciasPorActividad,
    createAsistenciaActividad,
    deleteAsistenciaActividad,
} from "../../../services/ac-institucionales";

export default function GestionAsistenciaInst({ id, onClose }) {
    const [registros, setRegistros] = useState([]);     // Inscritos (colegiados + invitados)
    const [asistencias, setAsistencias] = useState([]); // Colegiados que asistieron
    const [loading, setLoading] = useState(true);

    // 1) Traer inscritos y asistencias; en caso de venir envuelto en { data: [...] }, extraemos el array
    const fetchData = async () => {
        setLoading(true);

        const rawRegs = await getRegistrosPorActividadInstitucional(id);
        console.log("rawRegs:", rawRegs);
        // Si rawRegs no es un array (p.ej. { data: [...] }), tomamos rawRegs.data
        const regs = Array.isArray(rawRegs) ? rawRegs : rawRegs.data;
        console.log("regs (extraído):", regs);

        const rawAsis = await getAsistenciasPorActividad(id);
        console.log("rawAsis:", rawAsis);
        const asis = Array.isArray(rawAsis) ? rawAsis : rawAsis.data;
        console.log("asis (extraído):", asis);

        setRegistros(regs);
        setAsistencias(asis);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    console.log("Estado final de registros:", registros);
    console.log("Estado final de asistencias:", asistencias);

    // 2) Saber si un colegiado ya asistió
    const hasAssisted = (id_colegiado) => {
        return asistencias.some((a) => a.id_colegiado === id_colegiado);
    };

    // 3) Encontrar id_asistencia para desmarcar
    const findAsistenciaId = (id_colegiado) => {
        const found = asistencias.find((a) => a.id_colegiado === id_colegiado);
        return found ? found.id_asistencia : null;
    };

    // 4) Toggle: si existe, DELETE; si no existe, POST
    const toggleAsistencia = async (id_colegiado) => {
        const existingId = findAsistenciaId(id_colegiado);
        if (existingId) {
            await deleteAsistenciaActividad(existingId);
        } else {
            await createAsistenciaActividad({
                id_actividad: id,
                id_colegiado: id_colegiado,
            });
        }
        await fetchData();
    };

    if (loading) {
        return <p className="p-4 text-center">Cargando datos...</p>;
    }

    // 5) Filtramos sólo aquellos registros que tengan id_colegiado ≠ null
    const registrosColegiados = registros.filter((r) => r.id_colegiado !== null);
    console.log("registrosColegiados tras filtrar:", registrosColegiados);

    return (
        <div className="p-4">
            <h2 className="text-lg font-semibold mb-3">Lista de Colegiados Inscritos</h2>

            {registrosColegiados.length === 0 ? (
                <p className="text-gray-500">No hay colegiados inscritos.</p>
            ) : (
                // 6) Contenedor con scroll si la tabla es muy alta
                <div className="overflow-auto max-h-[60vh] border rounded-lg">
                    <table className="min-w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border px-3 py-1 text-black">Nombre Completo</th>
                                <th className="border px-3 py-1 text-black">Estado Registro</th>
                                <th className="border px-3 py-1 text-black">Asistió</th>
                                <th className="border px-3 py-1 text-black">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registrosColegiados.map((reg) => {
                                console.log("Registro completo (dentro de map):", reg);
                                const persona = reg.colegiados; // Asegúrate de que venga exactamente así
                                const asistio = hasAssisted(reg.id_colegiado);

                                return (
                                    <tr key={reg.id_registro}>
                                        <td className="border px-3 py-2 text-black">
                                            {persona?.nombre} {persona?.apellido}
                                        </td>
                                        <td className="border px-3 py-2 text-black">
                                            {reg.estado_registro}
                                        </td>
                                        <td className="border px-3 py-2 text-center text-black">
                                            {asistio ? "✅" : "❌"}
                                        </td>
                                        <td className="border px-3 py-2 text-center">
                                            <button
                                                onClick={() => toggleAsistencia(reg.id_colegiado)}
                                                className={`px-2 py-1 rounded text-white ${asistio
                                                        ? "bg-red-500 hover:bg-red-600"
                                                        : "bg-green-500 hover:bg-green-600"
                                                    }`}
                                            >
                                                {asistio ? "Desmarcar" : "Marcar"}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <h2 className="text-lg font-semibold mt-6 mb-3">Colegiados que Asistieron</h2>
            {asistencias.length === 0 ? (
                <p className="text-gray-500">Nadie asistió aún.</p>
            ) : (
                <ul className="list-disc list-inside">
                    {asistencias.map((a) => {
                        const persona = a.colegiados; // “colegiados” en plural, tal cual viene con el include
                        return (
                            <li key={a.id_asistencia} className="text-black">
                                {persona?.nombre} {persona?.apellido}
                            </li>
                        );
                    })}
                </ul>
            )}

            <div className="mt-4 text-right">
                <button
                    onClick={onClose}
                    className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
                >
                    Cerrar
                </button>
            </div>
        </div>
    );
}
