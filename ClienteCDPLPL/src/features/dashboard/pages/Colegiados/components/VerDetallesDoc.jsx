import { useEffect, useState } from "react";
import { getDocById } from "../../../services/colegiados";
import AñadirDocumento from "./AñadirDocumento";
import { Button } from "../../../components/Button";
import Modal from "../../../../../components/Modal";
import EditarDocumento from "./EditarDocumento";
import { FileText, Calendar, ExternalLink, Plus, Pencil } from "lucide-react";

// Misma lógica de badge de estado que el resto del sistema
const getEstadoBadge = (estado) => {
    const map = {
        VIGENTE:  { cls: "bg-emerald-100 text-emerald-800 border-emerald-200", label: "Vigente" },
        VENCIDO:  { cls: "bg-red-100 text-red-800 border-red-200",            label: "Vencido" },
        PENDIENTE:{ cls: "bg-amber-100 text-amber-800 border-amber-200",       label: "Pendiente" },
    };
    return map[estado] ?? { cls: "bg-slate-100 text-slate-700 border-slate-200", label: estado };
};

const VerDetallesDoc = ({ id, tipoDoc }) => {
    const [data, setData] = useState([]);
    const [modalAñadir, setModalAñadir] = useState(false);
    const [modalDetalles, setModalDetalles] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    // Sin cambios en la lógica de carga
    const getDoc = async () => {
        const res = await getDocById(id, tipoDoc);
        setData(res);
    };

    useEffect(() => {
        getDoc();
    }, []);

    return (
        <div className="p-4 space-y-4">
            {/* Botón añadir */}
            <div className="flex justify-end">
                <Button
                    onClick={() => setModalAñadir(true)}
                    className="flex items-center gap-2"
                >
                    <Plus size={15} />
                    Añadir documento
                </Button>
            </div>

            {/* Lista de documentos */}
            {data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <FileText size={40} className="mb-3 opacity-40" />
                    <p className="text-sm font-medium">Sin documentos registrados</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {data.map((doc) => {
                        const badge = getEstadoBadge(doc.estado);
                        return (
                            <div
                                key={doc.id_documento}
                                className="bg-white border border-slate-200 rounded-xl p-4 flex items-start justify-between gap-4 hover:border-slate-300 transition-colors"
                            >
                                {/* Ícono + datos */}
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                                        <FileText size={18} className="text-slate-500" />
                                    </div>
                                    <div className="min-w-0 space-y-1">
                                        <p className="font-semibold text-slate-800 text-sm truncate">
                                            {doc.tipo_documento}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                Entrega: {new Date(doc.fecha_entrega).toLocaleDateString("es-ES")}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                Vence: {new Date(doc.fecha_vencimiento).toLocaleDateString("es-ES")}
                                            </span>
                                            <a
                                                href={`/${doc.archivo}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                                            >
                                                <ExternalLink size={12} />
                                                Ver archivo
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                {/* Badge + botón */}
                                <div className="flex-shrink-0 flex flex-col items-end gap-2">
                                    <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${badge.cls}`}>
                                        {badge.label}
                                    </span>
                                    <button
                                        onClick={() => {
                                            setCurrentId(doc.id_documento);
                                            setModalDetalles(true);
                                        }}
                                        className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                                    >
                                        <Pencil size={12} />
                                        Modificar
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modales — sin cambios */}
            <Modal isOpen={modalAñadir} onClose={() => setModalAñadir(false)} title="Añadir documento">
                <AñadirDocumento id={id} tipoDoc={tipoDoc} />
            </Modal>
            <Modal isOpen={modalDetalles} onClose={() => setModalDetalles(false)} title="Editar documento">
                <EditarDocumento id_documento={currentId} />
            </Modal>
        </div>
    );
};

export default VerDetallesDoc;