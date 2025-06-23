import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { getAlldocs, getColegiadoById, verDocumento } from "../../services/colegiados";
import { useState } from "react";
import parseDate from "../../../../utils/parseData";
import Modal from "../../../../components/Modal";
import AñadirDocumento from "./components/AñadirDocumento";
import { Button } from "../../components/Button";
import VerDetallesDoc from "./components/VerDetallesDoc";
import {
    FileText,
    Upload,
    Eye,
    Calendar,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    Download,
    Plus,
    Info,
    GraduationCap,
    Shield,
    User,
    Camera,
    CreditCard,
    Award,
    FileCheck
} from 'lucide-react';

const TIPO_DOCUMENTOS = [
    "TITULO_PROFESIONAL",
    "TITULO_POSTGRADO",
    "HOJA_DE_VIDA",
    "FOTOGRAFIA",
    "CEDULA_IDENTIDAD",
    "COMPROBANTE",
    "CERTIFICADO_DE_TRIBUNAL",
    "CERTIFICADO_DE_ANTECEDENTES"
];

const Documentos = () => {
    const { id } = useParams()
    const [docs, setDocs] = useState([])
    const [tipoDoc, setTipoDoc] = useState('')
    const [modalAñadir, setModalAñadir] = useState(false)
    const [modalDetalles, setModalDetalles] = useState(false);
    const [col, setCol] = useState([])

    const getDocs = async () => {
        try {
            const data = await getAlldocs(id);
            setDocs(data);
            const colegiado = await getColegiadoById(id)
            setCol(colegiado)
        } catch (error) {
            console.error("Error al obtener documentos:", error);
        }
    };


    useEffect(() => {
        getDocs();
    }, [id]);

    const getDocumentIcon = (tipo) => {
        switch (tipo) {
            case 'TITULO_PROFESIONAL':
                return <GraduationCap className="w-5 h-5 text-blue-500" />;
            case 'TITULO_POSTGRADO':
                return <Award className="w-5 h-5 text-purple-500" />;
            case 'HOJA_DE_VIDA':
                return <FileText className="w-5 h-5 text-green-500" />;
            case 'FOTOGRAFIA':
                return <Camera className="w-5 h-5 text-pink-500" />;
            case 'CEDULA_IDENTIDAD':
                return <User className="w-5 h-5 text-orange-500" />;
            case 'COMPROBANTE':
                return <CreditCard className="w-5 h-5 text-indigo-500" />;
            case 'CERTIFICADO_DE_TRIBUNAL':
                return <Shield className="w-5 h-5 text-red-500" />;
            case 'CERTIFICADO_DE_ANTECEDENTES':
                return <FileCheck className="w-5 h-5 text-teal-500" />;
            default:
                return <FileText className="w-5 h-5 text-gray-500" />;
        }
    };

    const getEstadoIcon = (estado) => {
        switch (estado) {
            case 'APROBADO':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'RECHAZADO':
                return <XCircle className="w-4 h-4 text-red-500" />;
            case 'PENDIENTE':
                return <Clock className="w-4 h-4 text-yellow-500" />;
            default:
                return <AlertCircle className="w-4 h-4 text-gray-500" />;
        }
    };

    const getEstadoBadge = (estado) => {
        const baseClasses = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium";
        switch (estado) {
            case 'APROBADO':
                return `${baseClasses} bg-green-100 text-green-800 border border-green-200`;
            case 'RECHAZADO':
                return `${baseClasses} bg-red-100 text-red-800 border border-red-200`;
            case 'PENDIENTE':
                return `${baseClasses} bg-yellow-100 text-yellow-800 border border-yellow-200`;
            default:
                return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`;
        }
    };

    const formatDocumentName = (tipo) => {
        return tipo.replace(/_/g, ' ').toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const documentosSubidos = docs.length;
    const documentosTotal = TIPO_DOCUMENTOS.length;
    const porcentajeCompletado = Math.round((documentosSubidos / documentosTotal) * 100);

    return (
        <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 min-h-screen">
            {/* Header mejorado */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                            <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 mb-1">
                                Documentos del Colegiado: {`${col.nombre} ${col.apellido}`}
                            </h1>
                            <p className="text-slate-600 text-sm">
                                {documentosSubidos} de {documentosTotal} documentos completados
                            </p>
                        </div>
                    </div>

                    {/* Progreso */}
                    <div className="hidden md:flex items-center gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{porcentajeCompletado}%</div>
                            <div className="text-xs text-slate-500">Completado</div>
                        </div>
                        <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                                style={{ width: `${porcentajeCompletado}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Barra de progreso móvil */}
                <div className="md:hidden mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">Progreso de documentos</span>
                        <span className="text-sm font-bold text-blue-600">{porcentajeCompletado}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                            style={{ width: `${porcentajeCompletado}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Tabla de documentos mejorada */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200/60">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500" />
                        Documentos Requeridos
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/60">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Documento</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Archivo</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Fechas</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60">
                            {TIPO_DOCUMENTOS.map((tipo, i) => {
                                const doc = docs.find(d => d.tipo_documento === tipo);
                                const existe = !!doc;

                                return (
                                    <tr key={i} className={`hover:bg-blue-50/30 transition-colors duration-150 ${!existe ? "bg-slate-50/30" : ""}`}>
                                        {/* Tipo de documento */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {getDocumentIcon(tipo)}
                                                <div>
                                                    <p className={`font-medium ${existe ? "text-slate-800" : "text-slate-500"}`}>
                                                        {formatDocumentName(tipo)}
                                                    </p>
                                                    <p className="text-xs text-slate-400">
                                                        {existe ? "Documento subido" : "Documento pendiente"}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Archivo */}
                                        <td className="px-6 py-4">
                                            {doc?.archivo ? (
                                                <button
                                                    onClick={() => verDocumento(doc.id_documento)}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors duration-150"
                                                >
                                                    <Eye className="w-3 h-3" />
                                                    Ver PDF
                                                </button>
                                            ) : (
                                                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-sm">
                                                    <Upload className="w-3 h-3" />
                                                    No subido
                                                </span>
                                            )}
                                        </td>

                                        {/* Fechas */}
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Calendar className="w-3 h-3" />
                                                    <span className="text-xs text-slate-500">Entrega:</span>
                                                    {doc?.fecha_entrega ? parseDate(doc.fecha_entrega) : "-"}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Calendar className="w-3 h-3" />
                                                    <span className="text-xs text-slate-500">Vence:</span>
                                                    {doc?.fecha_vencimiento ? parseDate(doc.fecha_vencimiento) : "-"}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Estado */}
                                        <td className="px-6 py-4">
                                            <span className={getEstadoBadge(doc?.estado || "Pendiente")}>
                                                {getEstadoIcon(doc?.estado || "Pendiente")}
                                                {doc?.estado || "Pendiente"}
                                            </span>
                                        </td>

                                        {/* Acciones */}
                                        <td className="px-6 py-4">
                                            {existe ? (
                                                <button
                                                    onClick={() => {
                                                        setModalDetalles(true)
                                                        setTipoDoc(tipo)
                                                    }}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-colors duration-150"
                                                >
                                                    <Info className="w-3 h-3" />
                                                    Ver detalles
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setModalAñadir(true)
                                                        setTipoDoc(tipo)
                                                    }}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-green-500/25 transition-all duration-200 hover:scale-105"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                    Añadir
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Sección de especialidades */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200/60">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-purple-500" />
                        Especialidades
                    </h2>
                </div>
                <div className="p-6">
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">Información de especialidades</p>
                            <p className="text-slate-400 text-sm">Esta sección se encuentra en desarrollo</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modales */}
            <Modal isOpen={modalAñadir} onClose={() => setModalAñadir(false)} title={'Añadir documento'}>
                <AñadirDocumento id={id} tipoDoc={tipoDoc} />
            </Modal>

            <Modal isOpen={modalDetalles} onClose={() => setModalDetalles(false)} title={'Detalles del documento'}>
                <VerDetallesDoc id={id} tipoDoc={tipoDoc} />
            </Modal>
        </div>
    );
};

export default Documentos;