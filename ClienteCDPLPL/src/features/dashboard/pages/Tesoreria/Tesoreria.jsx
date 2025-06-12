// src/pages/dashboard/pages/Tesoreria/Tesoreria.jsx
import React, { useEffect, useState } from "react";
import Modal from "../../../../components/Modal";
import { Button, ButtonCreate } from "../../components/Button";
import {
    H1,
    Tables,
    THead,
    TBody,
    Td,
    Tfooter,
    EmptyTd,
} from "../../components/Tables";
import {
    getAllPresupuestos,
    deletePresupuesto,
} from "../../services/tesoreria";
import PresupuestoForm from "./components/PresupuestoForm";
import MovimientosPorPresupuesto from "./MovimientosPorPresupuesto";
import GenerarReporteTesoreria from "./components/GenerarReporteTesoreria";

export default function Tesoreria() {
    const [presupuestos, setPresupuestos] = useState([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPage, setTotalPage] = useState(1);
    const [search, setSearch] = useState("");
    const [modalReporte, setModalReporte] = useState(false)
    // Modales
    const [showModalCreate, setShowModalCreate] = useState(false);
    const [showModalEdit, setShowModalEdit] = useState(false);
    const [showModalMovimientos, setShowModalMovimientos] = useState(false);

    // ID de presupuesto seleccionado para editar o ver movimientos
    const [selectedId, setSelectedId] = useState(null);

    const fetchPresupuestos = async () => {
        const { data, total: t, page: currentPage, totalPages } =
            await getAllPresupuestos({ page, search });
        setPresupuestos(data);
        setTotal(t);
        setTotalPage(totalPages);
        setPage(currentPage);
    };

    useEffect(() => {
        fetchPresupuestos();
    }, [page, search]);

    const handleDelete = async (id) => {
        if (window.confirm("¿Deseas eliminar este presupuesto?")) {
            await deletePresupuesto(id);
            fetchPresupuestos();
        }
    };

    return (
        <>
            <H1>Modulo de Tesorería</H1>

            <div className="mb-4 flex items-center space-x-2">
                <input
                    type="text"
                    placeholder="Buscar presupuesto..."
                    className="border px-3 py-2 rounded flex-grow"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                />
                <ButtonCreate onClick={() => setShowModalCreate(true)}>
                    Crear Presupuesto
                </ButtonCreate>
                <Button className="bg-purple-300" onClick={()=>setModalReporte(true)}>Generar Reporte</Button>
            </div>

            <Tables>
                <THead
                    th={[
                        "Nombre",
                        "Descripción",
                        "Monto Total",
                        "Saldo Restante",
                        "Fecha Asignación",
                        "Estado",
                        "Acciones",
                    ]}
                />
                <TBody>
                    {presupuestos.length === 0 ? (
                        <EmptyTd colSpan={7} />
                    ) : (
                        presupuestos.map((p) => (
                            <tr key={p.id_presupuesto}>
                                <Td>{p.nombre_presupuesto}</Td>
                                <Td>{p.descripcion}</Td>
                                <Td>{p.monto_total ? p.monto_total.toString() : "-"}</Td>
                                <Td>{p.saldo_restante ? p.saldo_restante.toString() : "-"}</Td>
                                <Td>
                                    {p.fecha_asignacion
                                        ? p.fecha_asignacion.split("T")[0]
                                        : "-"}
                                </Td>
                                <Td>{p.estado}</Td>
                                <Td>
                                    <Button
                                        className="bg-yellow-500 hover:bg-yellow-600 text-white mr-1"
                                        onClick={() => {
                                            setSelectedId(p.id_presupuesto);
                                            setShowModalMovimientos(true);
                                        }}
                                    >
                                        Movimientos
                                    </Button>

                                    <Button
                                        className="bg-blue-500 hover:bg-blue-600 text-white mr-1"
                                        onClick={() => {
                                            setSelectedId(p.id_presupuesto);
                                            setShowModalEdit(true);
                                        }}
                                    >
                                        Editar
                                    </Button>

                                    <Button
                                        className="bg-red-500 hover:bg-red-600 text-white"
                                        onClick={() => handleDelete(p.id_presupuesto)}
                                    >
                                        Eliminar
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

            {/***— Modal Crear Presupuesto —***/}
            <Modal
                isOpen={showModalCreate}
                title="Crear Presupuesto"
                onClose={() => setShowModalCreate(false)}
            >
                <PresupuestoForm
                    onClose={() => {
                        setShowModalCreate(false);
                        fetchPresupuestos();
                    }}
                    onSuccess={fetchPresupuestos}
                />
            </Modal>

            {/***— Modal Editar Presupuesto —***/}
            <Modal
                isOpen={showModalEdit}
                title="Editar Presupuesto"
                onClose={() => setShowModalEdit(false)}
            >
                {selectedId && (
                    <PresupuestoForm
                        presupuestoId={selectedId}
                        onClose={() => {
                            setShowModalEdit(false);
                            fetchPresupuestos();
                        }}
                        onSuccess={fetchPresupuestos}
                    />
                )}
            </Modal>

            {/***— Modal Movimientos por Presupuesto —***/}
            <Modal
                isOpen={showModalMovimientos}
                title="Movimientos Financieros"
                onClose={() => setShowModalMovimientos(false)}
            >
                {selectedId && (
                    <MovimientosPorPresupuesto
                        presupuestoId={selectedId}
                        onClose={() => setShowModalMovimientos(false)}
                    />
                )}
            </Modal>
            <Modal isOpen={modalReporte} onClose={()=>setModalReporte(false)}>
                <GenerarReporteTesoreria/>
            </Modal>
        </>
    );
}
