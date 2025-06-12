import { useEffect, useState } from "react";
import { getDocById } from "../../../services/colegiados";
import AñadirDocumento from "./AñadirDocumento";

import { Button } from "../../../components/Button";
import Modal from "../../../../../components/Modal";
import EditarDocumento from "./EditarDocumento";
import { set } from "react-hook-form";

const VerDetallesDoc = ({ id, tipoDoc }) => {
    const [data, setData] = useState([]);
    const [modalAñadir, setModalAñadir] = useState(false);
    const [modalDetalles, setModalDetalles] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const getDoc = async () => {
        const res = await getDocById(id, tipoDoc)
        setData(res);
    }

    useEffect(() => {
        getDoc();
    }, [])

    return (
        <div className="p-6 space-y-4">
            <div>
                <Button className="bg-green-300" onClick={()=>setModalAñadir(true)}>Añadir nuevo documento</Button>
            </div>
            {data.map((doc) => (
                <div
                    key={doc.id_documento}
                    className="bg-white shadow-md rounded-lg p-5 border border-gray-200"
                >
                    <p><span className="font-semibold">Tipo:</span> {doc.tipo_documento}</p>
                    <p><span className="font-semibold">Archivo:</span> <a href={`/${doc.archivo}`} className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">Ver documento</a></p>
                    <p><span className="font-semibold">Fecha de entrega:</span> {new Date(doc.fecha_entrega).toLocaleDateString()}</p>
                    <p><span className="font-semibold">Fecha de vencimiento:</span> {new Date(doc.fecha_vencimiento).toLocaleDateString()}</p>
                    <p><span className="font-semibold">Estado:</span> <span className="text-green-600">{doc.estado}</span></p>
                    <Button className="bg-orange-300" onClick={()=>{
                        setCurrentId(doc.id_documento);
                        setModalDetalles(true);
                    }}>Modificar</Button>
                </div>
            ))}
            <Modal isOpen={modalAñadir} onClose={() => setModalAñadir(false)} title={'Añadir documento'}>
                <AñadirDocumento id={id} tipoDoc={tipoDoc} />
            </Modal>
            <Modal isOpen={modalDetalles} onClose={() => setModalDetalles(false)} title={'Detalles del documento'}>
                <EditarDocumento id_documento={currentId}/>
            </Modal>
        </div>
    );
};

export default VerDetallesDoc;