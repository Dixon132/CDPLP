import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getAlldocs, getColegiadoById, verDocumento, modificarColegiados } from "../../services/colegiados";
import axios from "axios";
import parseDate from "../../../../utils/parseData";
import { getDocumentosRequeridos } from "../../services/documentosRequeridos";
import Modal from "../../../../components/Modal";
import AñadirDocumento from "./components/AñadirDocumento";
import { Button } from "../../components/Button";
import VerDetallesDoc from "./components/VerDetallesDoc";
import Alerts from "../../components/Alerts";
import ConfirmActionModal from "../../../../components/ConfirmActionModal";
import EspecialidadesSelect from "../../../dashboard/components/EspecialidadesSelect";
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
    FileCheck,
    X,
    Loader2,
    Tag
} from 'lucide-react';

// Documentos requeridos se cargarán dinámicamente desde la base de datos

const Documentos = () => {
    const { id } = useParams()
    const [docs, setDocs] = useState([])
    const [tipoDoc, setTipoDoc] = useState('')
    const [modalAñadir, setModalAñadir] = useState(false)
    const [modalDetalles, setModalDetalles] = useState(false);
    const [col, setCol] = useState({})

    // Estado para especialidades
    const [especialidades, setEspecialidades] = useState([]);
    const [nuevaEsp, setNuevaEsp] = useState('');
    const [guardandoEsp, setGuardandoEsp] = useState(false);
    const [errorEsp, setErrorEsp] = useState('');
    
    // Estado para documentos requeridos dinámicos
    const [tiposDocumentos, setTiposDocumentos] = useState([]);

    const [alert, setAlert] = useState(false);
    const [alertType, setAlertType] = useState("success");
    const [alertMsg, setAlertMsg] = useState("");
    const [confirmSave, setConfirmSave] = useState({ open: false, variant: "create", callback: null });

    const showAlertFn = (type, msg) => {
        setAlertType(type);
        setAlertMsg(msg);
        setAlert(true);
        setTimeout(() => setAlert(false), 3000);
    };

    const getDocs = async () => {
        try {
            const data = await getAlldocs(id);
            setDocs(data);
            const colegiado = await getColegiadoById(id)
            setCol(colegiado)
            // Parsear especialidades del string separado por comas
            const esps = colegiado?.especialidades
                ? colegiado.especialidades.split(',').map(e => e.trim()).filter(Boolean)
                : [];
            setEspecialidades(esps);
        } catch (error) {
            console.error("Error al obtener documentos:", error);
        }
    };



    const guardarEspecialidades = async (nuevaLista) => {
        setGuardandoEsp(true);
        setErrorEsp('');
        try {
            await modificarColegiados(id, { especialidades: nuevaLista.join(', ') });
            setEspecialidades(nuevaLista);
            showAlertFn("success", "Especialidades actualizadas correctamente.");
        } catch {
            setErrorEsp('No se pudo guardar. Inténtalo de nuevo.');
        } finally {
            setGuardandoEsp(false);
        }
    };

    useEffect(() => {
        getDocs();
        // Cargar los documentos requeridos desde la base de datos
        getDocumentosRequeridos()
            .then(res => {
                const docs = res.data ?? [];
                // Usamos el nombre del documento como tipo
                setTiposDocumentos(docs.map(doc => doc.nombre));
            })
            .catch(err => console.error("Error al cargar documentos requeridos:", err));
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
        if (tipo.includes('_')) {
            return tipo.replace(/_/g, ' ').toLowerCase()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }
        return tipo;
    };

    // Porcentaje correcto: tipos distintos subidos / total de tipos definidos
    const tiposSubidos = new Set(docs.map(d => d.tipo_documento)).size;
    const documentosTotal = tiposDocumentos.length || 1;
    const porcentajeCompletado = Math.min(100, Math.round((tiposSubidos / documentosTotal) * 100));
    const documentosSubidos = tiposSubidos; // para el texto informativo

    return (
        <div className="space-y-6 p-6 bg-slate-50/50 min-h-screen">
            {/* Header mejorado */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
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
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
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
                            {Array.from(new Set([...tiposDocumentos, ...docs.map(d => d.tipo_documento)])).map((tipo, i) => {
                                const doc = docs.find(d => d.tipo_documento === tipo);
                                const existe = !!doc;

                                return (
                                    <tr key={i} className={`hover:bg-slate-50 transition-colors duration-150 ${!existe ? "bg-slate-50/30" : ""}`}>
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
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        verDocumento(doc.id_documento);
                                                    }}
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
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-100 transition-colors duration-150 shadow-sm"
                                                >
                                                    <Info className="w-3.5 h-3.5" />
                                                    Ver detalles
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setModalAñadir(true)
                                                        setTipoDoc(tipo)
                                                    }}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-colors duration-150 shadow-sm"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
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
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-purple-50 px-6 py-4 border-b border-slate-200/60">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-purple-500" />
                        Especialidades
                    </h2>
                </div>
                <div className="p-6 space-y-4 max-w-xl">
                    <p className="text-sm text-slate-500 mb-2">
                        Selecciona o crea especialidades para este colegiado. Los cambios se guardan automáticamente.
                    </p>
                    <EspecialidadesSelect
                        value={especialidades}
                        onChange={guardarEspecialidades}
                        allowCreate={true}
                    />
                    
                    {guardandoEsp && (
                        <span className="inline-flex items-center gap-1.5 text-blue-500 text-sm mt-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Guardando...
                        </span>
                    )}
                    {errorEsp && (
                        <p className="text-red-500 text-xs mt-2">{errorEsp}</p>
                    )}
                </div>
            </div>

            {/* Modales */}
            <Modal isOpen={modalAñadir} onClose={() => setModalAñadir(false)} title={'Añadir documento'}>
                <AñadirDocumento 
                    id={id} 
                    tipoDoc={tipoDoc} 
                    onSubmitForm={(formData) => {
                        setConfirmSave({
                            open: true, 
                            variant: "create",
                            callback: async () => { 
                                try {
                                    await axios.post(`/api/colegiados/documentos/${id}`, formData, {
                                        headers: { 'Content-Type': 'multipart/form-data' }
                                    });
                                    setModalAñadir(false); 
                                    showAlertFn("success", "Documento añadido exitosamente."); 
                                    getDocs(); 
                                } catch (error) {
                                    showAlertFn("error", "Error al añadir el documento.");
                                }
                            },
                        });
                    }}
                />
            </Modal>

            <Modal isOpen={modalDetalles} onClose={() => setModalDetalles(false)} title={'Detalles del documento'}>
                <VerDetallesDoc id={id} tipoDoc={tipoDoc} />
            </Modal>
            
            <ConfirmActionModal
                isOpen={confirmSave.open}
                variant={confirmSave.variant}
                title="¿Confirmar subida?"
                message="¿Confirmas que deseas subir este documento?"
                onClose={() => setConfirmSave({ ...confirmSave, open: false })}
                onConfirm={async () => { 
                    if (confirmSave.callback) {
                        await confirmSave.callback();
                    }
                    setConfirmSave({ ...confirmSave, open: false }); 
                }}
            />

            <Alerts type={alertType} message={alertMsg} show={alert} onClose={() => setAlert(false)} />
        </div>
    );
};

export default Documentos;