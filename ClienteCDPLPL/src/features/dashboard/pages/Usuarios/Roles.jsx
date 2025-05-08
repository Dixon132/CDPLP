import axios from "axios";
import { useEffect, useState } from 'react';
import { H1, Tables, TBody, Td, Tfooter, THead } from "../../components/Tables";
import Modal from "../../../../components/Modal";
import { Button, ButtonCreate } from "../../components/Button";
import AsignarRol from "./Components/AsignarRol";
import { desactivarRol, getAllRoles } from "../../services/roles";


const Roles = () => {
    const [roles, setRoles] = useState([]);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);

    const fetchRoles = async () => {
        try {
            const { data, total, page: currentPage, totalPages } = await getAllRoles({ page, search });
            
            setRoles(data);
            setTotal(total);
            setTotalPage(totalPages);
            setPage(currentPage);
        } catch (error) {
            console.error('Error al obtener roles:', error);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, [page, search]);

    const handleDesactivarRol = async (idRol) => {
        try {
            await desactivarRol(idRol);
            fetchRoles(); // Recargar la lista después de desactivar
        } catch (error) {
            console.error('Error al desactivar rol:', error);
        }
    };

    const handleSuccess = () => {
        setMostrarModal(false);
        fetchRoles();
    };

    return (
        <>
            <H1>Lista de Roles</H1>
            <ButtonCreate onClick={() => setMostrarModal(true)}>
                Asignar Rol
            </ButtonCreate>
            <Tables>
                <THead th={['Usuario', 'Rol', 'Fecha Inicio', 'Fecha Fin', 'Estado']} />
                <TBody>
                    {!roles? (
                        <tr>
                            <td colSpan="5" className="text-center py-4 text-gray-500">
                                No hay roles registrados
                            </td>
                        </tr>
                    ) : (
                        roles.map((rol) => (
                            <tr key={rol.id_rol}>
                                <Td>{`${rol.usuarios?.nombre} ${rol.usuarios?.apellido}`}</Td>
                                <Td>{rol.rol}</Td>
                                <Td>{new Date(rol.fecha_inicio).toLocaleDateString()}</Td>
                                <Td>{rol.fecha_fin ? new Date(rol.fecha_fin).toLocaleDateString() : 'No definida'}</Td>
                                <Td estado={rol.activo}>{rol.activo ? 'Activo' : 'Inactivo'}</Td>
                                <Td>
                                    <Button 
                                        className="bg-red-300 hover:bg-red-400"
                                        onClick={() => handleDesactivarRol(rol.id_rol)}
                                    >
                                        Desactivar
                                    </Button>
                                </Td>
                            </tr>
                        ))
                    )}
                </TBody>
                <Tfooter 
                    total={total} 
                    totalPage={totalPage} 
                    Page={page}
                />
            </Tables>

            <Modal 
                isOpen={mostrarModal} 
                onClose={() => setMostrarModal(false)}
            >
                <AsignarRol onSuccess={handleSuccess} />
            </Modal>
        </>
    );
};

export default Roles;