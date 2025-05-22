import axios from "axios";
import { useEffect, useState } from "react";

const VerDetallesColegiado = ({ id }) => {

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        axios.get(`/api/ac-sociales/ac-social/detalles/${id}`)
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError('Error al cargar datos');
                setLoading(false);
            });
    }, [id]);

    if (loading) return <p className="text-gray-500">Cargando...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    const {
        nombre, descripcion, ubicacion, motivo,
        origen_intervencion, fecha_inicio, fecha_fin,
        costo, estado, tipo,
        usuarios: responsable,
        solicitudes_actividad_social: solicitud,
        colegiados_asignados_social,
        origen_movimiento
    } = data;

    return (
        <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow">
            <h1 className="text-2xl font-bold mb-4">{nombre}</h1>
            <p className="text-gray-700 mb-2"><strong>Descripción:</strong> {descripcion}</p>
            <p className="text-gray-700 mb-2"><strong>Ubicación:</strong> {ubicacion}</p>
            <p className="text-gray-700 mb-2"><strong>Motivo:</strong> {motivo}</p>
            <p className="text-gray-700 mb-2"><strong>Origen:</strong> {origen_intervencion}</p>

            <div className="grid grid-cols-2 gap-4 my-4">
                <p><strong>Fecha Inicio:</strong> {new Date(fecha_inicio).toLocaleDateString()}</p>
                <p><strong>Fecha Fin:</strong> {new Date(fecha_fin).toLocaleDateString()}</p>
                <p><strong>Costo:</strong> ${parseFloat(costo).toFixed(2)}</p>
                <p><strong>Estado:</strong> {estado}</p>
                <p><strong>Tipo:</strong> {tipo}</p>
            </div>

            <hr className="my-6" />

            <h2 className="text-xl font-semibold mb-2">Responsable</h2>
            <p className="text-gray-800"><strong>{responsable.nombre}</strong> ({responsable.correo})</p>

            <hr className="my-6" />

            <h2 className="text-xl font-semibold mb-2">Solicitud</h2>
            {solicitud ? (
                <div className="bg-gray-50 p-4 rounded">
                    <p><strong>ID:</strong> {solicitud.id_solicitud}</p>
                    <p><strong>Detalle:</strong> {solicitud.detalle}</p>
                    <p><strong>Fecha:</strong> {new Date(solicitud.fecha).toLocaleDateString()}</p>
                </div>
            ) : (
                <p className="text-gray-500">Sin solicitud vinculada.</p>
            )}

            <hr className="my-6" />

            <h2 className="text-xl font-semibold mb-2">Colegiados Asignados</h2>
            {colegiados_asignados_social.length > 0 ? (
                <ul className="list-disc list-inside">
                    {colegiados_asignados_social.map(item => (
                        <li key={item.id_colegiado_social} className="mb-1">
                            {item.colegiado.nombre} — {item.colegiado.especialidades}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-500">No hay colegiados asignados.</p>
            )}

            <hr className="my-6" />

            <h2 className="text-xl font-semibold mb-2">Movimientos</h2>
            {origen_movimiento.length > 0 ? (
                <ul className="list-disc list-inside">
                    {origen_movimiento.map(m => (
                        <li key={m.id_origen_movimiento} className="mb-1">
                            {m.descripcion} — {new Date(m.fecha).toLocaleDateString()}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-500">No hay movimientos registrados.</p>
            )}
        </div>
    );
};

export default VerDetallesColegiado;