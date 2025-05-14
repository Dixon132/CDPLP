import axios from "axios";
import { useEffect, useState } from 'react';

import { ActivarUsuarios, desactivarUsuarios, getAllActiveUsuarios } from "../../services/usuarios";

import { EmptyTd, H1, InputSearch, Tables, TBody, Td, Tfooter, THead } from "../../components/Tables";
import Modal from "../../../../components/Modal";
import { Button, ButtonCreate } from "../../components/Button";
import CreateUser from "./Components/CreateUser";
import ModificarUser from "./Components/ModificarUser";

const Usuarios = () => {
    const [mostrarInactivos, setMostrarInactivos] = useState(false);
    const [users, setUsers] = useState([])
    const [mostrarModal, SetMostrarModal] = useState(false)
    const [mostrarModalModificar, SetMostrarModalModificar] = useState(false)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [totalPage, setTotalPage] = useState(1)
    const [UsuarioModificando, setUsuarioModificando] = useState(null)
    
    async function fetchUsuarios() {
        const {data, total, page: currentPage, totalPages} = await getAllActiveUsuarios({page, search, inactivos:mostrarInactivos});
        setUsers(data)
        setTotal(total)
        setTotalPage(totalPages)
        setPage(currentPage)
        console.log('se hizo peticion de usuarios')
    }
    useEffect(() => {
        fetchUsuarios()
    }, [page, search, mostrarInactivos]);

    
    return (
<>
        <H1>Lista de usuarios</H1>
        <ButtonCreate onClick={()=>SetMostrarModal(true)}>Crear Usuario</ButtonCreate>
        <Button className={mostrarInactivos ? "bg-green-300" : "bg-red-300"} onClick={() => setMostrarInactivos(!mostrarInactivos)}>
    {mostrarInactivos ? "Ver usuarios activos" : "Ver usuarios inactivos"}
</Button>
        <InputSearch onChange={(e)=> setSearch(e.target.value)}/>
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
                            <Button className="bg-amber-200" onClick={()=>{
                                SetMostrarModalModificar(true)
                                setUsuarioModificando(item.id_usuario)
                                }}>Modificar datos</Button>
                            <Button className="bg-red-300 hover:bg-red-400" onClick={()=>{if(mostrarInactivos){
                                ActivarUsuarios(item.id_usuario)
                            }else{
                                desactivarUsuarios(item.id_usuario)}
                            }  
                        }>{mostrarInactivos ? "Activar usuario" : "Desactivar usuario"}</Button>
                        
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
            <Modal title={'Modificando usuario'} isOpen={mostrarModalModificar} onClose={()=>SetMostrarModalModificar(false)}>
                <ModificarUser  id={UsuarioModificando} onClose={()=>SetMostrarModalModificar(false)}/>
            </Modal>
                
                </>
    )
};

export default Usuarios;