import React, { useEffect, useState } from "react";
import Modal from "../../../../components/Modal";
import Table from "../../components/Table";
import Header from "../../components/Header";

import { getAllMemorias, deleteMemoria } from "../../services/memorias";
import CreateMemoria from "./components/CreateMemoria";
import EditMemoria from "./components/EditMemoria";

import { BookMarked, Edit3, Trash2, Eye, Plus, Calendar, FileText } from 'lucide-react';

const Memorias = () => {
    const [memorias, setMemorias] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [selectedMemoria, setSelectedMemoria] = useState(null);

    const fetchMemorias = async () => {
        try {
            const data = await getAllMemorias();
            setMemorias(data || []);
        } catch (error) {
            alert("Error al obtener memorias");
        }
    };

    useEffect(() => {
        fetchMemorias();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm("¿Seguro que deseas eliminar este documento?")) {
            try {
                await deleteMemoria(id);
                alert("Documento eliminado con éxito");
                fetchMemorias();
            } catch (error) {
                alert("Error al eliminar");
            }
        }
    };

    const handleView = (path) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://rykgmqdmtixglxzfjamf.supabase.co";
        if(path) {
            window.open(`${supabaseUrl}/storage/v1/object/public/documentos/${path}`, "_blank");
        } else {
            alert("El documento no tiene archivo adjunto");
        }
    };

    return (
        <div className="space-y-6 p-6 min-h-screen bg-slate-50/50">
            <Header
                title="Memorias Anuales y Balances"
                icon={<BookMarked className="w-8 h-8" />}
                stats={[
                    { value: memorias.length, label: "Total Documentos", color: "purple" }
                ]}
                searchPlaceholder="Buscar documento..."
                onSearch={() => {}}
                buttons={[
                    {
                        label: "Añadir Documento",
                        icon: <Plus />,
                        onClick: () => setShowCreate(true),
                        color: "purple",
                    },
                ]}
            />

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-sm border border-slate-200">
                <Table
                    columns={[
                        {
                            label: "Título",
                            key: "titulo",
                            render: (m) => (
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{m.titulo}</p>
                                    </div>
                                </div>
                            )
                        },
                        {
                            label: "Descripción",
                            key: "descripcion",
                            render: (m) => (
                                <p className="text-slate-600 text-sm max-w-xs truncate" title={m.descripcion}>
                                    {m.descripcion}
                                </p>
                            )
                        },
                        {
                            label: "Categoría",
                            key: "categoria",
                            render: (m) => (
                                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-100">
                                    {m.categoria}
                                </span>
                            )
                        },
                        {
                            label: "Año",
                            key: "anio",
                            render: (m) => (
                                <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
                                    <Calendar className="w-4 h-4 text-emerald-500" />
                                    <span>{m.anio}</span>
                                </div>
                            )
                        }
                    ]}
                    data={memorias}
                    pagination={{}}
                    emptyMessage="No se encontraron documentos"
                    actions={[
                        {
                            label: "Ver",
                            icon: Eye,
                            onClick: (m) => handleView(m.archivo)
                        },
                        {
                            label: "Editar",
                            icon: Edit3,
                            onClick: (m) => {
                                setSelectedMemoria(m);
                                setShowEdit(true);
                            }
                        },
                        {
                            label: "Eliminar",
                            icon: Trash2,
                            onClick: (m) => handleDelete(m.id),
                            className: () => "text-rose-600 bg-rose-50"
                        }
                    ]}
                />
            </div>

            <Modal
                isOpen={showCreate}
                title="Añadir Documento"
                onClose={() => setShowCreate(false)}
            >
                <CreateMemoria
                    onClose={() => setShowCreate(false)}
                    onSuccess={() => {
                        setShowCreate(false);
                        fetchMemorias();
                    }}
                />
            </Modal>

            <Modal
                isOpen={showEdit}
                title="Editar Documento"
                onClose={() => {
                    setShowEdit(false);
                    setSelectedMemoria(null);
                }}
            >
                {selectedMemoria && (
                    <EditMemoria
                        memoria={selectedMemoria}
                        onClose={() => {
                            setShowEdit(false);
                            setSelectedMemoria(null);
                        }}
                        onSuccess={() => {
                            setShowEdit(false);
                            setSelectedMemoria(null);
                            fetchMemorias();
                        }}
                    />
                )}
            </Modal>
        </div>
    );
};

export default Memorias;
