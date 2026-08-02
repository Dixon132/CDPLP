import { useEffect, useMemo, useState } from "react";
import { CalendarClock, AlertTriangle, UsersRound, FileText, RefreshCw } from "lucide-react";
import { getVencimientos } from "../../services/vencimientos";
import ResponsiveTable from "../../components/ResponsiveTable";
import Modal from "../../../../components/Modal";
import Documentos from "../Colegiados/Documentos";
import Pagos from "../Colegiados/Pagos";
import parseDate from "../../../../utils/parseData";

const RANGOS = [
    { id: "vencidos", label: "Vencidos" },
    { id: "7", label: "≤ 7 días" },
    { id: "30", label: "≤ 30 días" },
    { id: "90", label: "≤ 90 días" },
    { id: "todos", label: "Todos" },
];

const DOMINIOS = [
    { id: undefined, label: "Todos", icon: CalendarClock },
    { id: "colegiado", label: "Colegiados", icon: UsersRound },
    { id: "documento", label: "Documentos", icon: FileText },
];

const badgeEstado = (item) => {
    if (item.estado_calculado === "VENCIDO") {
        return `inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200`;
    }
    if (item.estado_calculado === "POR_VENCER") {
        return `inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200`;
    }
    return `inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200`;
};

const textoDias = (dias) => {
    if (dias < 0) return `Vencido hace ${Math.abs(dias)} día(s)`;
    if (dias === 0) return "Vence hoy";
    return `Vence en ${dias} día(s)`;
};

const Vencimientos = () => {
    const [rango, setRango] = useState("30");
    const [dominio, setDominio] = useState(undefined);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    // Pagos/Documentos se ven en un modal grande, igual que en Colegiados.jsx —
    // no navegamos a la página completa, que sigue existiendo solo para el
    // buscador Ctrl+K (CommandPalette).
    const [pagosModalId, setPagosModalId] = useState(null);
    const [documentosModalId, setDocumentosModalId] = useState(null);

    const cargar = async () => {
        setLoading(true);
        try {
            const data = await getVencimientos({ dominio, rango });
            setItems(data);
        } catch (error) {
            console.error("Error al cargar vencimientos:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargar(); }, [rango, dominio]);

    const resumen = useMemo(() => ({
        vencidos: items.filter((i) => i.dias_restantes < 0).length,
        porVencer: items.filter((i) => i.dias_restantes >= 0 && i.dias_restantes <= 30).length,
    }), [items]);

    return (
        <div className="space-y-6 p-6 bg-slate-50/50 min-h-full">
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl shadow-lg">
                            <CalendarClock className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 mb-1">Vencimientos</h1>
                            <p className="text-slate-600 text-sm">
                                Colegiaturas y documentos vencidos o próximos a vencer, de más urgente a menos urgente.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={cargar}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-200 transition"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        Actualizar
                    </button>
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4">
                {/* Filtros de dominio */}
                <div className="flex flex-wrap gap-2">
                    {DOMINIOS.map((d) => {
                        const Icon = d.icon;
                        const activo = dominio === d.id;
                        return (
                            <button
                                key={d.label}
                                onClick={() => setDominio(d.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                                    activo
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                            >
                                <Icon className="w-4 h-4" /> {d.label}
                            </button>
                        );
                    })}
                </div>

                {/* Filtros de rango */}
                <div className="flex flex-wrap gap-2">
                    {RANGOS.map((r) => (
                        <button
                            key={r.id}
                            onClick={() => setRango(r.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                                rango === r.id
                                    ? "bg-slate-800 text-white shadow-sm"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>

                {/* Resumen rápido */}
                <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                        <strong className="text-rose-600">{resumen.vencidos}</strong> vencido(s) en esta vista
                    </span>
                    <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <strong className="text-amber-600">{resumen.porVencer}</strong> por vencer en ≤ 30 días
                    </span>
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200 p-2 sm:p-4">
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400 text-sm font-medium">
                        Cargando vencimientos…
                    </div>
                ) : (
                    <ResponsiveTable
                        storageKey="vencimientos"
                        emptyMessage="No hay vencimientos en este filtro"
                        columns={[
                            {
                                label: "Tipo",
                                key: "dominio",
                                render: (item) => (
                                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                                        {item.dominio === "colegiado" ? <UsersRound className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                                        {item.dominio === "colegiado" ? "Colegiatura" : "Documento"}
                                    </span>
                                ),
                            },
                            {
                                label: "Detalle",
                                key: "titulo",
                                render: (item) => (
                                    <div>
                                        <p className="font-semibold text-slate-800">{item.titulo}</p>
                                        <p className="text-xs text-slate-500">{item.subtitulo}</p>
                                    </div>
                                ),
                            },
                            {
                                label: "Vence el",
                                key: "fecha_vencimiento",
                                render: (item) => (
                                    <span className="text-sm text-slate-600">{parseDate(item.fecha_vencimiento)}</span>
                                ),
                            },
                            {
                                label: "Estado",
                                key: "dias_restantes",
                                render: (item) => (
                                    <span className={badgeEstado(item)}>{textoDias(item.dias_restantes)}</span>
                                ),
                            },
                        ]}
                        data={items}
                        actions={[
                            {
                                label: "Ver",
                                hide: (item) => item.id_colegiado == null,
                                onClick: (item) => {
                                    if (item.dominio === "colegiado") setPagosModalId(item.id_colegiado);
                                    else setDocumentosModalId(item.id_colegiado);
                                },
                            },
                        ]}
                    />
                )}
            </div>

            <Modal isOpen={!!pagosModalId} size="xl" title="Pagos del Colegiado" onClose={() => setPagosModalId(null)}>
                <Pagos id={pagosModalId} dentroDeModal />
            </Modal>

            <Modal isOpen={!!documentosModalId} size="xl" title="Documentos del Colegiado" onClose={() => setDocumentosModalId(null)}>
                <Documentos id={documentosModalId} dentroDeModal />
            </Modal>
        </div>
    );
};

export default Vencimientos;
