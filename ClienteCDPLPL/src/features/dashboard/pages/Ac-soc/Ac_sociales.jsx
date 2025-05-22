
import { Button, ButtonCreate } from "../../components/Button";
import { EmptyTd, H1, InputSearch, Tables, TBody, Td, Tfooter, THead } from "../../components/Tables";
import { useEffect, useState } from 'react';
import { gelAllActividadesSociales } from "../../services/ac-sociales";
import StepModal from "../../../../components/StepModal";
import CreateActSocial from "./components/CreateActSocial";
import parseDate from "../../../../utils/parseData";
import Modal from "../../../../components/Modal";
import VerDetallesColegiado from "./components/VerDetallesColegiado";
import ModificarColegiado from "./components/ModificarColegiado";


const Ac_sociales = () => {
    const { steps, handleSubmit, onSubmit, trigger, validationFields } = CreateActSocial()
    const [actSociales, setActSociales] = useState([])
    const [mostrarModal, SetMostrarModal] = useState(false)
    const [search, setSearch] = useState('')
    const [currentId, setCurrentId] = useState(null)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [totalPage, setTotalPage] = useState(1)

    const [modalVerDetalles, setModalVerDetalles] = useState(false)
    const [modalModificar, setModalModificar] = useState(false)

        async function fetchSociales() {
            const {data, total, page: currentPage, totalPages} = await gelAllActividadesSociales({page, search});
            setActSociales(data)
            setTotal(total)
            setTotalPage(totalPages)
            setPage(currentPage)
            console.log('se hizo peticion de usuarios')
        }
        useEffect(() => {
            fetchSociales()
        }, [page, search]);
        
    return (
        <>
        <H1>Lista de actividades sociales</H1>
        <ButtonCreate onClick={()=>SetMostrarModal(true)}>Crear actividad social</ButtonCreate>
        <InputSearch onChange={(e)=>setSearch(e.target.value)}/>
        <Tables>
            <THead th={['Nombre','Descripcion','Ubicacion','Motivo','Origen intervencion', 'Fecha inicio', 'Fecha fin', 'Costo', 'Estado', 'Tipo','Responsable']}/>
            <TBody>
                {!actSociales.length ? (
                    

                    <EmptyTd/>
                    
                ) : (

                    actSociales.map((item, index) => (
                        <tr key={item.id_actividad_social}>
                        <Td>{item.nombre}</Td>
                        <Td>{item.descripcion}</Td>
                        <Td>{item.ubicacion}</Td>
                        <Td>{item.motivo}</Td>
                        <Td>{item.origen_intervencion}</Td>
                        <Td>{parseDate(item.fecha_inicio)}</Td>
                        <Td>{parseDate(item.fecha_fin)}</Td>
                        <Td>{item.costo} bs</Td>
                        <Td estado={true}>{item.estado}</Td>
                        <Td>{item.tipo}</Td>
                        <Td>{item.usuarios.nombre}</Td>
                        <Td>
                            <Button onClick={()=>{
                                setCurrentId(item.id_actividad_social)
                                setModalVerDetalles(true)
                            }} className="bg-blue-300 hover:bg-blue-400">Ver detalles</Button>
                            <Button onClick={()=>{
                                setCurrentId(item.id_actividad_social)
                                setModalModificar(true)
                            }} className="bg-orange-300 hover:bg-orange-400">Modificar</Button>
                        </Td>
                    </tr>
                    )
                ))}
            </TBody>
            <Tfooter total={total} totalPage={totalPage} Page={page}/>
        </Tables>
        <StepModal
            isOpen={mostrarModal}
            onClose={()=>SetMostrarModal(false)}
            title={'Registro de actividad social'}
            steps={steps}
            handleSubmit={handleSubmit}
            onSubmit={onSubmit}
            trigger={trigger}
            validationFields={validationFields}
        />
        <Modal isOpen={modalVerDetalles} onClose={()=>setModalVerDetalles(false)}>
                <VerDetallesColegiado id={currentId} />
        </Modal>

        <Modal isOpen={modalModificar} onClose={()=>setModalModificar(false)}>
                <ModificarColegiado id={currentId}/>
        </Modal>

        </>
    );
};




export default Ac_sociales;