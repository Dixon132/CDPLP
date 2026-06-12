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
  const { id } = useParams();

  const [modalOpen, setModalOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const handleCambiarEstado = async (nuevoEstado) => {
    await cambiarEstadoCorrespondencia(id, nuevoEstado);
    setData(prev => ({ ...prev, estado: nuevoEstado }));
    setModalOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
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
      <div className="min-h-screen bg-slate-50/50 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header con navegación */}
          <div className="flex items-center gap-4">
            <Link to={'/dashboard/buzon'} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-all duration-200 font-medium">
              <ArrowLeft className="w-5 h-5" />
              Volver al Buzón
            </Link>
          </div>

          {/* Tarjeta principal */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header de la tarjeta */}
            <div className="bg-slate-100/50 px-8 py-6 border-b border-slate-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                      <Mail className="w-5 h-5" />
                    </div>
                    <span className="text-slate-500 text-sm font-medium">Correspondencia #{data.id_correspondencia}</span>
                  </div>
                  <h1 className="text-2xl font-bold text-slate-800 leading-tight mb-3">
                    {data.asunto}
                  </h1>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.color}`}>
                    <StatusIcon className="w-4 h-4" />
                    {data.estado}
                  </div>
                </div>
              </div>
            </div>

            {/* Contenido principal */}
            <div className="p-8">
              {/* Información de contacto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                      <User className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">Remitente</p>
                      <p className="text-slate-800 font-bold">{data.remitente}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                      <User className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">Destinatario</p>
                      <p className="text-slate-800 font-bold">
                        {data.destinatario?.nombre} {data.destinatario?.apellido}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Fecha de envío</p>
                    <p className="text-slate-800 font-semibold">
                      {new Date(data.fecha_envio).toLocaleString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Fecha de recepción</p>
                    <p className="text-slate-800 font-semibold">
                      {data.fecha_recibido
                        ? new Date(data.fecha_recibido).toLocaleString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                        : "No recibido"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Resumen */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Resumen del contenido</h3>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                    {data.resumen}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer con acciones */}
            <div className="bg-slate-50 px-8 py-6 border-t border-slate-200">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-xl font-medium transition-all duration-200"
                  >
                    <Settings className="w-5 h-5 text-slate-500" />
                    Cambiar estado
                  </button>
                </div>

                <button
                  onClick={() => verCorrespondencia(data.id_correspondencia)}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all duration-200"
                >
                  <Eye className="w-5 h-5" />
                  Ver documento completo
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
            onClick={() => handleCambiarEstado('A DISCUSIÓN')}
            className="w-full flex items-center gap-3 p-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all duration-200"
          >
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="text-left">
              <p className="font-bold text-indigo-900">A Discusión</p>
              <p className="text-sm text-indigo-600">Requiere análisis adicional</p>
            </div>
          </button>

          <button
            onClick={() => handleCambiarEstado('PENDIENTE')}
            className="w-full flex items-center gap-3 p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all duration-200"
          >
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Pause className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-left">
              <p className="font-bold text-amber-900">Pendiente</p>
              <p className="text-sm text-amber-600">En espera de acción</p>
            </div>
          </button>

          <button
            onClick={() => handleCambiarEstado('ARREGLADO')}
            className="w-full flex items-center gap-3 p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all duration-200"
          >
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-left">
              <p className="font-bold text-emerald-900">Arreglado</p>
              <p className="text-sm text-emerald-600">Problema resuelto</p>
            </div>
          </button>
        </div>
      </Modal>
    </>
  );
};

export default Contenido;