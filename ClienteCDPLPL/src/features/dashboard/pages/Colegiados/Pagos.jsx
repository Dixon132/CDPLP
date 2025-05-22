import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../../components/Button";
import Modal from "../../../../components/Modal";
import AñadirPago from "./components/AñadirPago";
import { getAllPagos } from "../../services/colegiados";
import parseDate from "../../../../utils/parseData";

const Pagos = () => {
    const {id} = useParams()
    const [pagos, setPagos] = useState([])
    const [modalAñadir, setModalAñadir] = useState(false)

    const getPagos = async()=>{
        const data = await getAllPagos(id)
        setPagos(data)
    }

    useEffect(()=>{
        getPagos()
        console.log(pagos)
    },[id])
    return (
    <div className="border-4 border-gray-500 min-h-80 h-auto my-5 rounded-3xl">
        <div className="text-center border-b h-13 flex justify-around items-center">
            <h2 className="font-bold text-1xl">Pagos</h2>
            <Button onClick={()=>setModalAñadir(true)} className="bg-green-300">Añadir pago</Button>
        </div>
        <div className="p-5">
            {pagos.length === 0 ? (
                <div className="text-center text-gray-500 py-4 w-full">
                    Sin pagos registrados
                </div>
            ) : (
                pagos.map((doc, i) => (
                    <div key={i} className="border-b py-2 flex flex-col md:flex-row md:justify-between md:items-center">
                        <div>
                            <span className="font-semibold">Concepto:</span> {doc.concepto}
                        </div>
                        <div>
                            <span className="font-semibold">Fecha de pago:</span> {parseDate(doc.fecha_pago)}
                        </div>
                        <div>
                            <span className="font-semibold">Monto:</span> bs/ {doc.monto}
                        </div>
                    </div>
                ))
            )}
        </div>
        <Modal isOpen={modalAñadir} onClose={()=>setModalAñadir(false)} title={'Añadir pago'}><AñadirPago id={id}/></Modal>
    </div>
);

};

export default Pagos;