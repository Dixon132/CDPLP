import Modal from "../../../../components/Modal";
import { Button, ButtonCreate } from "../../components/Button";
import { EmptyTd, H1, Tables, TBody, Td, Tfooter, THead } from "../../components/Tables";

import { useEffect, useState } from 'react';
import { getAllActividadesInstitucionales } from "../../services/ac-institucionales";
const Ac_institucionales = () => {

    const [acInstitucionales, setActInstitucionales] = useState([])
    const [mostrarModal, SetMostrarModal] = useState(false)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [totalPage, setTotalPage] = useState(1)
        async function fetchInstitucionales() {
            const {data, total, page: currentPage, totalPages} = await getAllActividadesInstiacInstitucionales({page, search});
            setActInstitucionales(data)
            setTotal(total)
            setTotalPage(totalPages)
            setPage(currentPage)
            console.log('se hizo peticion de usuarios')
        }
        useEffect(() => {
            fetchInstitucionales()
        }, [page, search]);
        
    return (
        <>
        <H1>Lista de actividades institucionales</H1>
        <ButtonCreate onClick={()=>SetMostrarModal(true)}>Crear actividad institucional</ButtonCreate>
        <Tables>
            <THead th={['Nombre','Descripcion','Tipo','Fecha inicio','Fecha fin', 'Costo','Responsable','Estado']}/>
            <TBody>
                {!acInstitucionales.length ? (
                    <tr>
                    <EmptyTd/>
                    </tr>
                ) : (
                    acInstitucionales.map((item, index) => (
                        <tr key={item.id_actividad}>
                        <Td>{item.nombre}</Td>
                        <Td>{item.descripcion}</Td>
                        <Td>{item.tipo}</Td>
                        <Td>{item.fecha_inicio}</Td>
                        <Td>{item.fecha_fin}</Td>
                        <Td>{item.costo}</Td>
                        <Td>{item.id_responsable}</Td>
                        <Td estado={true}>{item.estado}</Td>
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
            sadas
        </Modal>

        </>
    );
};

export default Ac_institucionales;