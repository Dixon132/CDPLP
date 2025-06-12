// src/pages/dashboard/pages/Tesoreria/MovimientosPorPresupuesto.jsx
import React, { useEffect, useState } from "react";
import {
    getPresupuestoById,
    getMovimientosByPresupuesto,
    deleteMovimientoFinanciero,
} from "../../services/tesoreria";
import { Button } from "../../components/Button";

import MovimientoForm from "./components/MovimientoForm";
import Modal from "../../../../components/Modal";

export default function MovimientosPorPresupuesto({ presupuestoId, onClose }) {
    const [presupuesto, setPresupuesto] = useState(null);
    const [movimientos, setMovimientos] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modales
    const [showModalCrearMovimiento, setShowModalCrearMovimiento] = useState(false);
    const [showModalEditarMovimiento, setShowModalEditarMovimiento] = useState(false);

    // ID de movimiento seleccionado para editar
    const [selectedMovId, setSelectedMovId] = useState(null);

    // Cargar datos del presupuesto y sus movimientos
    const fetchData = async () => {
        setLoading(true);
        const dataPres = await getPresupuestoById(presupuestoId);
        setPresupuesto(dataPres);
        setMovimientos(dataPres.movimientos ?? []);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [presupuestoId]);

    const handleDeleteMovimiento = async (id_movimiento) => {
        if (window.confirm("¿Eliminar este movimiento?")) {
            await deleteMovimientoFinanciero(id_movimiento);
            fetchData();
        }
    };

    if (loading || !presupuesto) {
        return <p className="p-4 text-center">Cargando datos...</p>;
    }

    return (
        <div className="p-4">
            <h2 className="text-xl font-semibold mb-2">
                Presupuesto: {presupuesto.nombre_presupuesto}
            </h2>
            <p className="mb-1">
                <strong>Monto Total:</strong> {presupuesto.monto_total?.toString() ?? "-"}
            </p>
            <p className="mb-4">
                <strong>Saldo Restante:</strong> {presupuesto.saldo_restante?.toString() ?? "-"}
            </p>

            <div className="mb-4">
                <Button className="bg-green-300" onClick={() => setShowModalCrearMovimiento(true)}>
                    Nuevo Movimiento
                </Button>
            </div>

            {/* Tabla de movimientos */}
            <div className="overflow-auto border rounded-lg">
                <table className="min-w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border px-3 py-2 text-black">Tipo</th>
                            <th className="border px-3 py-2 text-black">Categoría</th>
                            <th className="border px-3 py-2 text-black">Descripción</th>
                            <th className="border px-3 py-2 text-black">Monto</th>
                            <th className="border px-3 py-2 text-black">Fecha</th>
                            <th className="border px-3 py-2 text-black">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {movimientos.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-4 text-gray-500">
                                    No hay movimientos.
                                </td>
                            </tr>
                        ) : (
                            movimientos.map((m) => (
                                <tr key={m.id_movimiento}>
                                    <td className="border px-3 py-2 text-black">{m.tipo_movimiento}</td>
                                    <td className="border px-3 py-2 text-black">{m.categoria}</td>
                                    <td className="border px-3 py-2 text-black">{m.descripcion}</td>
                                    <td className="border px-3 py-2 text-black">
                                        {m.monto ? m.monto.toString() : "-"}
                                    </td>
                                    <td className="border px-3 py-2 text-black">
                                        {m.fecha_movimiento ? m.fecha_movimiento.split("T")[0] : "-"}
                                    </td>
                                    <td className="border px-3 py-2">
                                        <button
                                            className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded mr-1"
                                            onClick={() => {
                                                setSelectedMovId(m.id_movimiento);
                                                setShowModalEditarMovimiento(true);
                                            }}
                                        >
                                            Editar
                                        </button>
                                        <button
                                            className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded"
                                            onClick={() => handleDeleteMovimiento(m.id_movimiento)}
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 text-right">
                <button
                    onClick={onClose}
                    className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
                >
                    Cerrar
                </button>
            </div>

            {/***— Modal Crear Movimiento —***/}
            <Modal
                isOpen={showModalCrearMovimiento}
                title="Nuevo Movimiento Financiero"
                onClose={() => setShowModalCrearMovimiento(false)}
            >
                <MovimientoForm
                    presupuestoId={presupuestoId}
                    onClose={() => {
                        setShowModalCrearMovimiento(false);
                        fetchData();
                    }}
                    onSuccess={fetchData}
                />
            </Modal>

            {/***— Modal Editar Movimiento —***/}
            <Modal
                isOpen={showModalEditarMovimiento}
                title="Editar Movimiento Financiero"
                onClose={() => setShowModalEditarMovimiento(false)}
            >
                {selectedMovId && (
                    <MovimientoForm
                        presupuestoId={presupuestoId}
                        movimientoId={selectedMovId}
                        onClose={() => {
                            setShowModalEditarMovimiento(false);
                            fetchData();
                        }}
                        onSuccess={fetchData}
                    />
                )}
            </Modal>
        </div>
    );
}
