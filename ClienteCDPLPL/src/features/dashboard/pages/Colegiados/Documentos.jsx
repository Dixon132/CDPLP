import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { getAlldocs, verDocumento } from "../../services/colegiados";
import { useState } from "react";
import parseDate from "../../../../utils/parseData";
import Modal from "../../../../components/Modal";
import AñadirDocumento from "./components/AñadirDocumento";
import { Button } from "../../components/Button";
const TIPO_DOCUMENTOS = [
    "TITULO_PROFESIONAL",
    "TITULO_POSTGRADO",
    "HOJA_DE_VIDA",
    "FOTOGRAFIA",
    "CEDULA_IDENTIDAD",
    "COMPROBANTE",
    "CERTIFICADO_DE_TRIBUNAL",
    "CERTIFICADO_DE_ANTECEDENTES"
];
const Documentos = () => {
    const { id } = useParams()
    const [docs, setDocs] = useState([])
    const [tipoDoc, setTipoDoc] = useState('')
    const [modalAñadir, setModalAñadir] = useState(false)
    const getDocs = async () => {
        try {
            const data = await getAlldocs(id);
            setDocs(data);
        } catch (error) {
            console.error("Error al obtener documentos:", error);
        }
    };
    useEffect(() => {
        getDocs();
    }, [id]);

    return (
        <div className="border-4 border-gray-500 min-h-80 h-auto my-5 rounded-3xl">
            <div className="text-center border-b h-10 flex justify-center items-center">
                <h2 className="font-bold text-1xl">Documentos de {id}</h2>
            </div>
            <div className="p-5">
                <table className="table-auto w-full border">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="p-2 border">Tipo documento</th>
                            <th className="p-2 border">Archivo</th>
                            <th className="p-2 border">Fecha de entrega</th>
                            <th className="p-2 border">Fecha de vencimiento</th>
                            <th className="p-2 border">Estado</th>
                            <th className="p-2 border">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {TIPO_DOCUMENTOS.map((tipo, i) => {
                            const doc = docs.find(d => d.tipo_documento === tipo);
                            const existe = !!doc;

                            return (
                                <tr key={i} className={`text-center ${existe ? "" : "text-gray-400 bg-gray-50"}`}>
                                    <td className="p-2 border">{tipo.replace(/_/g, ' ')}</td>
                                    <td className="p-2 border">{doc?.archivo ? <Button onClick={() => verDocumento(doc.id_documento)}>
                                        Ver PDF
                                    </Button> : "No subido"}</td>
                                    <td className="p-2 border">{doc?.fecha_entrega ? parseDate(doc.fecha_entrega) : "-"}</td>
                                    <td className="p-2 border">{doc?.fecha_vencimiento ? parseDate(doc.fecha_vencimiento) : "-"}</td>
                                    <td className="p-2 border">{doc?.estado || "Pendiente"}</td>
                                    <td className="p-2 border">
                                        {existe ? (
                                            <button className="bg-blue-500 text-white px-2 py-1 rounded">Editar</button>
                                        ) : (
                                            <button onClick={() => {
                                                setModalAñadir(true)
                                                setTipoDoc(tipo)
                                            }} className="bg-green-500 text-white px-2 py-1 rounded">Añadir</button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

            </div>
            <div className="text-center border-b h-10 flex justify-center items-center">
                <h2 className="font-bold text-1xl">Especialidades</h2>
            </div>
            <Modal isOpen={modalAñadir} onClose={() => setModalAñadir(false)} title={'Añadir documento'}>
                <AñadirDocumento id={id} tipoDoc={tipoDoc} />
            </Modal>
        </div>
    );
};

export default Documentos;