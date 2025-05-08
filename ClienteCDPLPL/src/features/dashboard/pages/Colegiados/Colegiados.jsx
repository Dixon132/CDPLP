import Modal from "../../../../components/Modal";
import { Button, ButtonCreate } from "../../components/Button";
import { EmptyTd, H1, Tables, TBody, Td, Tfooter, THead } from "../../components/Tables";
import { getAllColegiados, updateEstadoColegiado } from "../../services/colegiados";
import { useEffect, useState } from 'react';
import CreateColegiado from "./components/CreateColegiado";

const Colegiados = () => {
    const [colegiados, setColegiados] = useState([])
    const [mostrarModal, SetMostrarModal] = useState(false)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [totalPage, setTotalPage] = useState(1)
        async function fetchProyectos() {
            const {data, total, page: currentPage, totalPages} = await getAllColegiados({page, search});
            setColegiados(data)
            setTotal(total)
            setTotalPage(totalPages)
            setPage(currentPage)
            console.log('se hizo peticion de usuarios')
        }
        useEffect(() => {
            fetchProyectos()
        }, [page, search]);
        
    return (
        <>
        <H1>Lista de Colegiados</H1>
        <ButtonCreate onClick={()=>SetMostrarModal(true)}>Crear Colegiado</ButtonCreate>
        <Tables>
            <THead th={['carnet', 'nombre', 'apellidos', 'correo','telefono','especialidades','fecha inscripcion', 'fecha renovacion', 'estado']}/>
            <TBody>
                {!colegiados.length ? (
                    <EmptyTd/>
                ) : (

                    colegiados.map((item, index) => (
                        <tr key={item.id_colegiado}>
                        <Td>{item.carnet}</Td>
                        <Td>{item.nombre}</Td>
                        <Td>{item.apellidos}</Td>
                        <Td>{item.correo}</Td>
                        <Td>{item.telefono}</Td>
                        <Td>{item.especialidades}</Td>
                        <Td>{item.fecha_inscripcion}</Td>
                        <Td>{item.fecha_renovacion}</Td>
                        <Td estado={true}>{item.estado}</Td>
                        <Td>
                            <Button onClick={()=>updateEstadoColegiado(item.id_colegiado)} className="bg-red-300 hover:bg-red-400">Desactivar</Button>
                        </Td>
                    </tr>
                    )
                ))}
            </TBody>
            <Tfooter total={total} totalPage={totalPage} Page={page}/>
        </Tables>
        <Modal isOpen={mostrarModal} title='Crear Proyecto' onClose={()=>SetMostrarModal(false)}>
            <CreateColegiado/>
        </Modal>

        </>
    );
};

export default Colegiados;