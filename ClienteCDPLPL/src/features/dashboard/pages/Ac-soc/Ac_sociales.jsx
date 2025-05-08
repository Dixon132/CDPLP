import Modal from "../../../../components/Modal";
import { Button, ButtonCreate } from "../../components/Button";
import { EmptyTd, H1, Tables, TBody, Td, Tfooter, THead } from "../../components/Tables";

import { useEffect, useState } from 'react';
import { gelAllActividadesSociales } from "../../services/ac-sociales";
import CreateActividadSocial from "./components/CreateActividadSocial";
const Ac_sociales = () => {

    const [actSociales, setActSociales] = useState([])
    const [mostrarModal, SetMostrarModal] = useState(false)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [totalPage, setTotalPage] = useState(1)
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
        <Tables>
            <THead th={['Nombre','Descripcion','Ubicacion','Motivo','Origen intervencion', 'Fecha inicio', 'Fecha fin', 'Costo', 'Estado', 'Tipo','Responsable']}/>
            <TBody>
                {!actSociales.length ? (
                    <tr>

                    <EmptyTd/>
                    </tr>
                ) : (

                    actSociales.map((item, index) => (
                        <tr key={item.id_actividad_social}>
                        <Td>{item.nombre}</Td>
                        <Td>{item.descripcion}</Td>
                        <Td>{item.ubicacion}</Td>
                        <Td>{item.motivo}</Td>
                        <Td>{item.origen_intervencion}</Td>
                        <Td>{item.fecha_inicio}</Td>
                        <Td>{item.fecha_fin}</Td>
                        <Td>{item.costo}</Td>
                        <Td estado={true}>{item.estado}</Td>
                        <Td>{item.usuarios.nombre}</Td>
                        <Td>
                            <Button className="bg-red-300 hover:bg-red-400">Desactivar</Button>
                        </Td>
                    </tr>
                    )
                ))}
            </TBody>
            <Tfooter total={total} totalPage={totalPage} Page={page}/>
        </Tables>
        <Modal isOpen={mostrarModal} title='Crear Proyecto' onClose={()=>SetMostrarModal(false)}>
            <CreateActividadSocial/>
        </Modal>

        </>
    );
};




export default Ac_sociales;