import axios from "axios";
import { useEffect, useState } from "react";
import { Button } from "../../../components/Button";
import Modal from "../../../../../components/Modal";
import AsignarColegiados from "./AsignarColegiados";

const VerDetallesColegiado = ({ id }) => {

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

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
    }, [id,modalOpen]);

    if (loading) return <p className="text-gray-500">Cargando...</p>;
    if (error) return <p className="text-red-500">{error}</p>;
    
    const {
        nombre, descripcion, ubicacion, motivo,
        origen_intervencion, fecha_inicio, fecha_fin,
        costo, estado, tipo,
        colegiados_asignados_social,
        convenio, id_actividad_social
    } = data;

    return (
        <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow">
            <h1 className="text-2xl font-bold mb-4">{nombre}</h1>
            <p className="text-gray-700 mb-2"><strong>Descripción:</strong> {descripcion}</p>
            <p className="text-gray-700 mb-2"><strong>Ubicación:</strong> {ubicacion}</p>
            <p className="text-gray-700 mb-2"><strong>Motivo:</strong> {motivo}</p>
            <p className="text-gray-700 mb-2"><strong>Convenio:</strong> {convenio?.nombre}</p>

            <div className="grid grid-cols-2 gap-4 my-4">
                <p><strong>Fecha Inicio:</strong> {new Date(fecha_inicio).toLocaleDateString()}</p>
                <p><strong>Fecha Fin:</strong> {new Date(fecha_fin).toLocaleDateString()}</p>
                <p><strong>Estado:</strong> {estado}</p>
                <p><strong>Tipo:</strong> {tipo}</p>
            </div>



            <hr className="my-6" />

            <h2 className="text-xl font-semibold mb-2">Colegiados Asignados</h2>
            <Button onClick={() => setModalOpen(true)} className="bg-green-300 my-2.5">Asignar colegiados</Button>
            {colegiados_asignados_social.length > 0 ? (
                <ul className="list-disc list-inside">
                    {colegiados_asignados_social.map((item, index) => (
                        <li key={index} className="mb-1">
                            {item.colegiados?.nombre} — {item.colegiados?.especialidades}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-500">No hay colegiados asignados.</p>
            )}


            <Modal isOpen={modalOpen} onClose={() => {
                setModalOpen(false);
            }} title={'ASIGNAR COLEGIADOS'}>
                <AsignarColegiados id={id_actividad_social} />
            </Modal>
        </div>
    );
};

export default VerDetallesColegiado;