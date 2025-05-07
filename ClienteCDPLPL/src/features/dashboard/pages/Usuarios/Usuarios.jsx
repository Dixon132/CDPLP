import axios from "axios";
import { useEffect, useState } from 'react';

import { desactivarUsuarios, getAllActiveUsuarios } from "../../services/usuarios";

import { EmptyTd, H1, Tables, TBody, Td, Tfooter, THead } from "../../components/Tables";
import Modal from "../../../../components/Modal";
import { Button, ButtonCreate } from "../../components/Button";
import CreateUser from "./Components/CreateUser";

const Usuarios = () => {
    const [users, setUsers] = useState([])
    const [mostrarModal, SetMostrarModal] = useState(false)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [totalPage, setTotalPage] = useState(1)
    
    async function fetchUsuarios() {
        const {data, total, page: currentPage, totalPages} = await getAllActiveUsuarios({page, search});
        setUsers(data)
        setTotal(total)
        setTotalPage(totalPages)
        setPage(currentPage)
        console.log('se hizo peticion de usuarios')
    }
    useEffect(() => {
        fetchUsuarios()
    }, [page, search]);

    
    return (
<>
        <H1>Lista de usuarios</H1>
        <ButtonCreate onClick={()=>SetMostrarModal(true)}>Crear Usuario</ButtonCreate>
        <Tables>
            <THead th={['Nombre', 'apellido', 'correo', 'telefono', 'direccion', 'estado']} />
            <TBody>
                {!users.length ? (
                    <EmptyTd/>
                ) : (

                    users.map((item, index) => (
                        <tr key={item.id_usuario}>
                        <Td>{item.nombre}</Td>
                        <Td>{item.apellido}</Td>
                        <Td>{item.correo}</Td>
                        <Td>{item.telefono}</Td>
                        <Td>{item.direccion}</Td>
                        <Td estado={true}>{item.estado}</Td>
                        <Td>
                            
                            <Button className="bg-red-300 hover:bg-red-400" onClick={()=>desactivarUsuarios(item.id_usuario)}>Desactivar</Button>
                        
                        </Td>
                    </tr>
                    )
                ))}
            </TBody>
            <Tfooter total={total} totalPage={totalPage} Page={page}/>
        </Tables >
            <Modal isOpen={mostrarModal}  onClose={()=>SetMostrarModal(false)}>               
                <CreateUser/>
            </Modal>
                
                </>
    )
};

export default Usuarios;