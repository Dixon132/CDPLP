import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Mail,
  User,
  Calendar,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Settings,
  X,
  Eye,
  RotateCcw,
  Pause,
  CheckCircle2
} from "lucide-react";
import { Link, useParams } from 'react-router-dom'
import {
  cambiarEstadoCorrespondencia,
  getContenidoBuzon,
  marcarVisto,
  verCorrespondencia,
} from "../../services/correspondencia";
import ConfirmActionModal from "../../../../components/ConfirmActionModal";
import Alerts from "../../components/Alerts";
import { useSession } from "../../../../context/SessionProvider";

// Componente Modal personalizado
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-md w-full transform transition-all duration-300">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors duration-200"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const Contenido = () => {
  const { puedeEditar } = useSession();
  const esEditor = puedeEditar("correspondencia.buzon");
  const { id } = useParams();

  const [modalOpen, setModalOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Para la confirmacion y alertas
  const [confirmEstado, setConfirmEstado] = useState({ open: false, estado: null });
  const [alert, setAlert] = useState({ show: false, type: "success", message: "" });

  const showAlert = (type, message) => setAlert({ show: true, type, message });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const res = await getContenidoBuzon(id);
      if (res.fecha_recibido == null) {
        await marcarVisto(id);
      }
      setData(res);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const getStatusConfig = (estado) => {
    switch (estado) {
      case 'A REVISAR':
        return {
          color: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: AlertCircle,
          bgColor: 'bg-rose-100'
        };
      case 'PENDIENTE':
        return {
          color: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: Clock,
          bgColor: 'bg-amber-100'
        };
      case 'A DISCUSIÓN':
        return {
          color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          icon: MessageSquare,
          bgColor: 'bg-indigo-100'
        };
      case 'ARREGLADO':
        return {
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: CheckCircle,
          bgColor: 'bg-emerald-100'
        };
      default:
        return {
          color: 'bg-slate-50 text-slate-700 border-slate-200',
          icon: FileText,
          bgColor: 'bg-slate-100'
        };
    }
  };

  const handleCambiarEstado = async () => {
    if (!confirmEstado.estado) return;
    try {
      await cambiarEstadoCorrespondencia(id, confirmEstado.estado);
      setData(prev => ({ ...prev, estado: confirmEstado.estado }));
      setConfirmEstado({ open: false, estado: null });
      setModalOpen(false);
      showAlert("success", `Estado cambiado a ${confirmEstado.estado}`);
    } catch (error) {
      setConfirmEstado({ open: false, estado: null });
      showAlert("error", "Error al cambiar de estado");
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50/50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-lg">Cargando correspondencia...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const statusConfig = getStatusConfig(data.estado);
  const StatusIcon = statusConfig.icon;

  return (
    <>
      <Alerts type={alert.type} message={alert.message} show={alert.show} duration={3000} onClose={() => setAlert((p) => ({ ...p, show: false }))} />
      <div className="min-h-full bg-slate-50/50 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header con navegación */}
          <div className="flex items-center gap-4">
            <Link to={'/dashboard/buzon'} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-all duration-200 font-medium">
              <ArrowLeft className="w-5 h-5" />
              Volver al Buzón
            </Link>
          </div>

          {/* Tarjeta principal (Email View) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header del Asunto */}
            <div className="px-6 sm:px-8 py-6 pb-2">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl font-normal text-slate-900 leading-tight">
                  {data.asunto}
                </h1>
                <div className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {data.estado}
                </div>
              </div>
            </div>

            {/* Info del Remitente tipo Email */}
            <div className="px-6 sm:px-8 py-4 flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                {data.remitente?.charAt(0) || 'R'}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
                  <div className="flex items-center gap-2 truncate w-full sm:w-auto">
                    <span className="font-bold text-slate-900 truncate">{data.remitente}</span>
                    <span className="text-sm text-slate-500 hidden sm:inline-flex items-center gap-1">
                      <span className="text-slate-300">&bull;</span> Correspondencia #{data.id_correspondencia}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 whitespace-nowrap flex flex-col sm:items-end">
                    <span>Envío: {new Date(data.fecha_envio).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' })}</span>
                    {data.fecha_recibido && (
                       <span className="text-xs text-slate-400 mt-0.5 font-medium">Visto: {new Date(data.fecha_recibido).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' })}</span>
                    )}
                  </div>
                </div>
                <div className="text-sm text-slate-600 mt-1 sm:mt-0.5">
                  para <span className="font-medium text-slate-700">{data.destinatario?.nombre} {data.destinatario?.apellido}</span>
                </div>
              </div>
            </div>

            {/* Contenido (Cuerpo del Mensaje) */}
            <div className="px-6 sm:px-8 py-8 min-h-[300px]">
              <p className="text-slate-800 leading-relaxed whitespace-pre-line text-[15px]">
                {data.resumen}
              </p>
            </div>

            {/* Footer con acciones */}
            <div className="px-6 sm:px-8 py-4 border-t border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                {esEditor && (
                  <button
                    onClick={() => setModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm"
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                    Cambiar estado
                  </button>
                )}

                <button
                  onClick={() => verCorrespondencia(data.id_correspondencia)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-sm"
                >
                  <Eye className="w-4 h-4" />
                  Ver documento adjunto
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para cambiar estado */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Cambiar estado de correspondencia">
        <div className="space-y-3">
          <p className="text-slate-600 mb-4">Selecciona el nuevo estado para esta correspondencia:</p>

          <button
            onClick={() => setConfirmEstado({ open: true, estado: 'A DISCUSIÓN' })}
            className="w-full flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-all duration-200"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-md flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-blue-900">A Discusión</p>
              <p className="text-sm text-blue-600">Requiere análisis adicional</p>
            </div>
          </button>

          <button
            onClick={() => setConfirmEstado({ open: true, estado: 'PENDIENTE' })}
            className="w-full flex items-center gap-3 p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-all duration-200"
          >
            <div className="w-10 h-10 bg-amber-100 rounded-md flex items-center justify-center">
              <Pause className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-amber-900">Pendiente</p>
              <p className="text-sm text-amber-600">En espera de acción</p>
            </div>
          </button>

          <button
            onClick={() => setConfirmEstado({ open: true, estado: 'ARREGLADO' })}
            className="w-full flex items-center gap-3 p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-all duration-200"
          >
            <div className="w-10 h-10 bg-emerald-100 rounded-md flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-emerald-900">Arreglado</p>
              <p className="text-sm text-emerald-600">Problema resuelto</p>
            </div>
          </button>
        </div>
      </Modal>

      <ConfirmActionModal
        isOpen={confirmEstado.open}
        variant="edit"
        title="¿Confirmar cambio de estado?"
        message={`¿Estás seguro que deseas cambiar el estado a ${confirmEstado.estado}?`}
        onClose={() => setConfirmEstado({ open: false, estado: null })}
        onConfirm={handleCambiarEstado}
      />
    </>
  );
};

export default Contenido;