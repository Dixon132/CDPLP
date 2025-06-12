// src/pages/dashboard/pages/Ac-institucionales/AcInstitucionales.jsx
import React, { useEffect, useState } from "react";
import Modal from "../../../../components/Modal";
import { Button, ButtonCreate } from "../../components/Button";
import {
    EmptyTd,
    H1,
    Tables,
    TBody,
    Td,
    Tfooter,
    THead,
} from "../../components/Tables";

import {
    getAllActividadesInstitucionales,
    updateEstadoActividadInstitucional,
} from "../../services/ac-institucionales";

import CreateActInstitucional from "./components/CreateActInstitucional";
import EditActInstitucional from "./components/EditActInstitucional";
import RegisterColegiadoInst from "./components/RegisterColegiadoInst";
import GestionAsistenciaInst from "./components/GestionAsistenciaInst";
import GenerarReporteActividadesInst from "./components/GenerarReporteActividadesInst";

const AcInstitucionales = () => {
    const [actividades, setActividades] = useState([]);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);
    const [modalReporte, setModalReporte] = useState(false)

    // Flags para mostrar/ocultar modales
    const [showModalCreate, setShowModalCreate] = useState(false);
    const [showModalEdit, setShowModalEdit] = useState(false);
    const [showModalRegister, setShowModalRegister] = useState(false);
    const [showModalAsistencia, setShowModalAsistencia] = useState(false);

    // ID de la actividad seleccionada para Editar / Registrar / Asistencias
    const [selectedId, setSelectedId] = useState(null);

    // Traer la lista cada vez que cambien page o search
    const fetchActividades = async () => {
        const { data, total: t, page: currentPage, totalPages } =
            await getAllActividadesInstitucionales({ page, search });
        setActividades(data);
        setTotal(t);
        setTotalPage(totalPages);
        setPage(currentPage);
    };

    useEffect(() => {
        fetchActividades();
    }, [page, search]);

    // Cambiar estado ACTIVO <-> INACTIVO
    const toggleEstado = async (id, estadoActual) => {
        const nuevoEstado = estadoActual === "ACTIVO" ? "INACTIVO" : "ACTIVO";
        await updateEstadoActividadInstitucional(id, nuevoEstado);
        fetchActividades();
    };

    return (
        <>
            <H1>Lista de Actividades Institucionales</H1>

            {/* Un input para búsqueda (opcional) */}
            <div className="mb-4 flex items-center space-x-2">
                <input
                    type="text"
                    placeholder="Buscar por nombre / tipo / descripción..."
                    className="border px-3 py-2 rounded flex-grow"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                />
                <ButtonCreate onClick={() => setShowModalCreate(true)}>
                    Crear Actividad
                </ButtonCreate>
                <Button className="bg-purple-300" onClick={()=>setModalReporte(true)}>Generar reporte</Button>
            </div>

            {/* Tabla con todas las actividades */}
            <Tables>
                <THead
                    th={[
                        "Nombre",
                        "Descripción",
                        "Tipo",
                        "Fecha Programada",
                        "Costo",
                        "Estado",

                    ]}
                />
                <TBody>
                    {!actividades.length ? (
                        <EmptyTd colSpan={7} />
                    ) : (
                        actividades.map((item) => (
                            <tr key={item.id_actividad}>
                                <Td>{item.nombre}</Td>
                                <Td>{item.descripcion}</Td>
                                <Td>{item.tipo}</Td>
                                <Td>
                                    {item.fecha_programada
                                        ? item.fecha_programada.split("T")[0]
                                        : "-"}
                                </Td>
                                <Td>{item.costo ?? "-"}</Td>
                                <Td estado={item.estado === "ACTIVO"}>{item.estado}</Td>
                                <Td>
                                    {/* Botón Activar / Desactivar */}
                                    <Button
                                        className={`${item.estado === "ACTIVO"
                                                ? "bg-red-300 hover:bg-red-400"
                                                : "bg-green-300 hover:bg-green-400"
                                            } text-white px-3 py-1 rounded text-sm mr-1`}
                                        onClick={() =>
                                            toggleEstado(item.id_actividad, item.estado)
                                        }
                                    >
                                        {item.estado === "ACTIVO" ? "Desactivar" : "Activar"}
                                    </Button>

                                    {/* Botón Editar */}
                                    <Button
                                        className="bg-blue-300 hover:bg-blue-400 text-white px-3 py-1 rounded text-sm mr-1"
                                        onClick={() => {
                                            setSelectedId(item.id_actividad);
                                            setShowModalEdit(true);
                                        }}
                                    >
                                        Editar
                                    </Button>

                                    {/* Botón Registrar Ingreso (colegiado / invitado) */}
                                    <Button
                                        className="bg-yellow-300 hover:bg-yellow-400 text-white px-3 py-1 rounded text-sm mr-1"
                                        onClick={() => {
                                            setSelectedId(item.id_actividad);
                                            setShowModalRegister(true);
                                        }}
                                    >
                                        Registrar
                                    </Button>

                                    {/* Botón Gestionar asistencias (solo colegiados) */}
                                    <Button
                                        className="bg-purple-300 hover:bg-purple-400 text-white px-3 py-1 rounded text-sm"
                                        onClick={() => {
                                            setSelectedId(item.id_actividad);
                                            setShowModalAsistencia(true);
                                        }}
                                    >
                                        Asistencias
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
                    onChangePage={(p) => setPage(p)}
                />
            </Tables>

            {/**— Modal: Crear Actividad Institucional —**/}
            <Modal
                isOpen={showModalCreate}
                title="Crear Actividad Institucional"
                onClose={() => setShowModalCreate(false)}
            >
                <CreateActInstitucional
                    onClose={() => {
                        setShowModalCreate(false);
                        fetchActividades();
                    }}
                    onSuccess={fetchActividades}
                />
            </Modal>

            {/**— Modal: Editar Actividad Institucional —**/}
            <Modal
                isOpen={showModalEdit}
                title="Editar Actividad Institucional"
                onClose={() => setShowModalEdit(false)}
            >
                {selectedId && (
                    <EditActInstitucional
                        id={selectedId}
                        onClose={() => {
                            setShowModalEdit(false);
                            fetchActividades();
                        }}
                        onSuccess={fetchActividades}
                    />
                )}
            </Modal>

            {/**— Modal: Registrar Colegiado / Invitado —**/}
            <Modal
                isOpen={showModalRegister}
                title="Registrar Colegiado / Invitado"
                onClose={() => setShowModalRegister(false)}
            >
                {selectedId && (
                    <RegisterColegiadoInst
                        id={selectedId}
                        onClose={() => setShowModalRegister(false)}
                        onSuccess={() => {
                            setShowModalRegister(false);
                            /* si quisieras refrescar un listado detallado de registros, lo harías aquí */
                        }}
                    />
                )}
            </Modal>

            {/**— Modal: Gestionar Asistencia (solo colegiados) —**/}
            <Modal
                isOpen={showModalAsistencia}
                title="Gestionar Asistencias Colectados"
                onClose={() => setShowModalAsistencia(false)}
            >
                {selectedId && (
                    <GestionAsistenciaInst
                        id={selectedId}
                        onClose={() => setShowModalAsistencia(false)}
                    />
                )}
            </Modal>
            <Modal isOpen={modalReporte} onClose={() => setModalReporte(false)}>
                <GenerarReporteActividadesInst />
            </Modal>
        </>
    );
};

export default AcInstitucionales;
