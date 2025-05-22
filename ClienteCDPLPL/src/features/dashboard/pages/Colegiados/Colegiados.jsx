import Modal from "../../../../components/Modal";
import { Button, ButtonCreate } from "../../components/Button";
import { EmptyTd, H1, InputSearch, Tables, TBody, Td, Tfooter, THead } from "../../components/Tables";
import { getAllColegiados, modificarColegiados, updateEstadoColegiado } from "../../services/colegiados";
import { useEffect, useState } from 'react';
import CreateColegiado from "./components/CreateColegiado";
import parseDate from "../../../../utils/parseData";
import ModificarColegiado from "./components/ModificarColegiado";
import { Link, Outlet } from "react-router-dom";
import axios from "axios";



const Colegiados = () => {
    const [mostrarInactivos, setMostrarInactivos] = useState(false)
    const [colegiados, setColegiados] = useState([])
    const [mostrarModal, SetMostrarModal] = useState(false)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [mostrarModal2, setMostrarModal2] = useState(false)
    const [total, setTotal] = useState(0)
    const [colegiadoSeleccionado, setColegiadoSeleccionado] = useState(null)
    const [totalPage, setTotalPage] = useState(1)
    async function fetchProyectos() {
        const { data, total, page: currentPage, totalPages } = await getAllColegiados({ page, search, inactivos: mostrarInactivos });
        setColegiados(data)
        setTotal(total)
        setTotalPage(totalPages)
        setPage(currentPage)
        console.log('se hizo peticion de usuarios')
    }


    const descargarReporte = async () => {
        try {
            const response = await axios.get('/api/colegiados/colegiado/report', {
                params: {
                    estado: 'ACTIVO',
                    telefono: '',
                    correo:'',
                    especialidades:'',
                    estado:'',
                    orden_inscripcion:'',
                    orden_renovacion:''
                },
                responseType: 'blob', // IMPORTANTE para manejar PDFs correctamente
            });

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'reporte_colegiados.pdf');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Error al descargar el PDF:', err);
        }
    };


    useEffect(() => {
        fetchProyectos()
    }, [page, search, mostrarInactivos]);

    return (
        <>
            <H1>Lista de Colegiados</H1>

            <ButtonCreate onClick={() => SetMostrarModal(true)}>Crear Colegiado</ButtonCreate>
            <Button className={mostrarInactivos ? "bg-green-300" : "bg-red-300"} onClick={() => setMostrarInactivos(!mostrarInactivos)}>
                {mostrarInactivos ? "Ver usuarios activos" : "Ver usuarios inactivos"}
            </Button>
            <Button onClick={descargarReporte}>Generar reporte</Button>
            <InputSearch onChange={(e) => setSearch(e.target.value)} />
            <Tables>
                <THead th={['carnet', 'nombre', 'apellidos', 'correo', 'telefono', 'especialidades', 'fecha inscripcion', 'fecha renovacion', 'estado', 'Documentos']} />
                <TBody>
                    {!colegiados.length ? (
                        <EmptyTd />
                    ) : (

                        colegiados.map((item, index) => (
                            <tr key={item.id_colegiado}>
                                <Td>{item.carnet_identidad}</Td>
                                <Td>{item.nombre}</Td>
                                <Td>{item.apellido}</Td>
                                <Td>{item.correo}</Td>
                                <Td>{item.telefono}</Td>
                                <Td>{item.especialidades}</Td>
                                <Td>{parseDate(item.fecha_inscripcion)}</Td>
                                <Td>{parseDate(item.fecha_renovacion)}</Td>
                                <Td estado={true}>{item.estado}</Td>
                                <Td>
                                    <Button className="bg-green-200"><Link to={`/dashboard/colegiados/pagos/${item.id_colegiado}`}>Pagos</Link></Button>
                                    <Button className="bg-blue-200"><Link to={`/dashboard/colegiados/documentos/${item.id_colegiado}`}>Documentos</Link></Button>
                                </Td>
                                <Td>
                                    <Button className="bg-amber-200" onClick={() => {
                                        setMostrarModal2(true)
                                        setColegiadoSeleccionado(item.id_colegiado)
                                    }}>Modificar</Button>
                                    <Button onClick={() => updateEstadoColegiado(item.id_colegiado, mostrarInactivos ? "ACTIVO" : "INACTIVO")} className="bg-red-300 hover:bg-red-400">{mostrarInactivos ? "Activar colegiado" : "desactivar colegiado"}</Button>
                                </Td>
                            </tr>
                        )
                        ))}
                </TBody>
                <Tfooter total={total} totalPage={totalPage} Page={page} />
            </Tables>
            <Modal isOpen={mostrarModal} title='Crear Proyecto' onClose={() => SetMostrarModal(false)}>
                <CreateColegiado />
            </Modal>
            <Modal isOpen={mostrarModal2} title={'Modificando usuario'} onClose={() => setMostrarModal2(false)}>
                <ModificarColegiado id={colegiadoSeleccionado} onClose={() => setMostrarModal2(false)} />
            </Modal>
            <div>
                <Outlet />
            </div>

        </>
    );
};

export default Colegiados;