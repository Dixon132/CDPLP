import React, { useEffect, useState } from "react";
import Modal from "../../../../components/Modal";
import ConfirmDeleteModal from "../../../../components/ConfirmDeleteModal";
import ConfirmActionModal from "../../../../components/ConfirmActionModal";
import ResponsiveTable from "../../components/ResponsiveTable";
import Header from "../../components/Header";
import Alerts from "../../components/Alerts";

import { getAllMemorias, deleteMemoria } from "../../services/memorias";
import CreateMemoria from "./components/CreateMemoria";
import EditMemoria from "./components/EditMemoria";

import { BookMarked, Edit3, Trash2, Eye, Plus, Calendar, FileText } from 'lucide-react';

const Memorias = () => {
    const [memorias, setMemorias] = useState([]);
    const [selectedMemoria, setSelectedMemoria] = useState(null);
    const [memoriaToDelete, setMemoriaToDelete] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [alert, setAlert] = useState({ show: false, type: "success", message: "", duration: 2000 });

    // Confirm DESPUÉS de guardar
    const [confirmSave, setConfirmSave] = useState({ open: false, variant: "create", callback: null });

    const showAlert = (type, message, duration = 2000) =>
        setAlert({ show: true, type, message, duration });

    const fetchMemorias = async () => {
        try {
            const data = await getAllMemorias();
            setMemorias(data || []);
        } catch { showAlert("error", "Error al obtener memorias"); }
    };
    useEffect(() => { fetchMemorias(); }, []);

    const handleDelete = (memoria) => setMemoriaToDelete(memoria);

    const handleConfirmDelete = async () => {
        if (!memoriaToDelete?.id) return;
        try {
            await deleteMemoria(memoriaToDelete.id);
            setMemoriaToDelete(null);
            showAlert("success", "Documento eliminado con éxito", 4000);
            fetchMemorias();
        } catch { showAlert("error", "Error al eliminar", 4000); }
    };

    const handleView = (path) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://rykgmqdmtixglxzfjamf.supabase.co";
        if (path) window.open(`${supabaseUrl}/storage/v1/object/public/documentos/${path}`, "_blank");
        else showAlert("warning", "El documento no tiene archivo adjunto");
    };

    return (
        <div className="space-y-6 p-6 min-h-full bg-slate-50/50">
            <Header
                title="Memorias Anuales y Balances"
                icon={<BookMarked className="w-8 h-8" />}
                stats={[{ value: memorias.length, label: "Total Documentos", color: "purple" }]}
                searchPlaceholder="Buscar documento..."
                onSearch={() => { }}
                buttons={[{
                    label: "Añadir Documento", icon: <Plus />,
                    onClick: () => setShowCreate(true), color: "purple",
                }]}
            />

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-sm border border-slate-200 p-2 sm:p-4">
                <ResponsiveTable
                    storageKey="memorias"
                    columns={[
                        {
                            label: "Título", key: "titulo", render: (m) => (
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><FileText className="w-5 h-5" /></div>
                                    <p className="font-bold text-slate-800">{m.titulo}</p>
                                </div>)
                        },
                        { label: "Descripción", key: "descripcion", render: (m) => <p className="text-slate-600 text-sm max-w-xs truncate">{m.descripcion}</p> },
                        { label: "Categoría", key: "categoria", render: (m) => <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-100">{m.categoria}</span> },
                        {
                            label: "Año", key: "anio", render: (m) => (
                                <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
                                    <Calendar className="w-4 h-4 text-emerald-500" />{m.anio}
                                </div>)
                        },
                    ]}
                    data={memorias}
                    pagination={{}}
                    emptyMessage="No se encontraron documentos"
                    actions={[
                        { label: "Ver", icon: Eye, onClick: (m) => handleView(m.archivo) },
                        { label: "Editar", icon: Edit3, onClick: (m) => { setSelectedMemoria(m); setShowEdit(true); } },
                        { label: "Eliminar", icon: Trash2, onClick: (m) => handleDelete(m), className: () => "text-rose-600 bg-rose-50" },
                    ]}
                />
            </div>

            {/* Forms — abren directo */}
            <Modal isOpen={showCreate} title="Añadir Documento" onClose={() => setShowCreate(false)}>
                <CreateMemoria
                    onClose={() => setShowCreate(false)}
                    onSuccess={() => {
                        setConfirmSave({
                            open: true, variant: "create",
                            callback: () => { setShowCreate(false); showAlert("success", "Documento añadido correctamente", 3000); fetchMemorias(); },
                        });
                    }}
                />
            </Modal>

            <Modal isOpen={showEdit} title="Editar Documento" onClose={() => { setShowEdit(false); setSelectedMemoria(null); }}>
                {selectedMemoria && (
                    <EditMemoria
                        memoria={selectedMemoria}
                        onClose={() => { setShowEdit(false); setSelectedMemoria(null); }}
                        onSuccess={() => {
                            setConfirmSave({
                                open: true, variant: "edit",
                                callback: () => { setShowEdit(false); setSelectedMemoria(null); showAlert("success", "Documento actualizado correctamente", 3000); fetchMemorias(); },
                            });
                        }}
                    />
                )}
            </Modal>

            {/* ✅ Confirm DESPUÉS de guardar */}
            <ConfirmActionModal
                isOpen={confirmSave.open}
                variant={confirmSave.variant}
                title={confirmSave.variant === "create" ? "¿Confirmar creación?" : "¿Confirmar cambios?"}
                message={confirmSave.variant === "create" ? "¿Confirmas que deseas guardar el nuevo documento?" : "¿Confirmas que deseas guardar los cambios realizados?"}
                onClose={() => setConfirmSave({ ...confirmSave, open: false })}
                onConfirm={() => { setConfirmSave({ ...confirmSave, open: false }); confirmSave.callback?.(); }}
            />

            {/* ✅ Doble confirmación eliminar (2s + 4s) */}
            <ConfirmDeleteModal
                isOpen={!!memoriaToDelete}
                onClose={() => setMemoriaToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Eliminar documento"
                message={`¿Seguro que deseas eliminar "${memoriaToDelete?.titulo || "este documento"}"? Esta acción no se puede deshacer.`}
                waitSeconds={4}
            />

            <Alerts type={alert.type} message={alert.message} show={alert.show} duration={alert.duration}
                onClose={() => setAlert((p) => ({ ...p, show: false }))} />
        </div>
    );
};
export default Memorias;
