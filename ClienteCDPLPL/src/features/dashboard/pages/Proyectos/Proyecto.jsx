import Modal from "../../../../components/Modal";
import { Button, ButtonCreate } from "../../components/Button";
import { EmptyTd, H1, Tables, TBody, Td, Tfooter, THead } from "../../components/Tables";
import { useEffect, useState } from 'react';
import { getAllProyectos } from "../../services/proyectos";
import CreateProyecto from "./components/CreateProyecto";


const Proyecto = () => {
    const [proyectos, setProyectos] = useState([])
    const [mostrarModal, SetMostrarModal] = useState(false)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [totalPage, setTotalPage] = useState(1)

    async function fetchProyectos(){
        const{proyectos, total, page: currentPage, totalPages} = await getAllProyectos({page, search});
        setProyectos(proyectos)
        setTotal(total)
        setTotalPage(totalPages)    
        setPage(currentPage)
        console.log('se hizo peticion de proyectos')
    }
    useEffect(() => {
        fetchProyectos()
    }, [page, search]);
    return (
    <>
        <H1>Lista de Proyectos</H1>
        <ButtonCreate onClick={() => SetMostrarModal(true)}>Crear proyecto</ButtonCreate>
        <Tables>
            <THead th={['titulo', 'descripcion', 'fecha inicio', 'fecha fin', 'responsable', 'presupuesto', 'estado']} />
            <TBody>
                {!proyectos.length ? (
                    <EmptyTd />
                ) : (
                    proyectos.map((item) => (
                        <tr key={item.id_proyecto}>
                            <Td>{item.titulo}</Td>
                            <Td>{item.descripcion}</Td>
                            <Td>{item.fecha_inicio}</Td>
                            <Td>{item.fecha_fin}</Td>
                            <Td>{item.responsable}</Td>
                            <Td>{item.presupuesto}</Td>
                            <Td estado={true}>{item.estado}</Td>
                        <Td>
                            <Button className="bg-red-300 hover:bg-red-400">Desactivar</Button>
                        </Td>
                    </tr>
                )))}
            </TBody>
            <Tfooter total={total} totalPage={totalPage} Page={page}/>
        </Tables>
        <Modal isOpen={mostrarModal} title='Crear Proyecto' onClose={()=>SetMostrarModal(false)}>
            <CreateProyecto/>
        </Modal>
    
    </>
    );
};

export default Proyecto;