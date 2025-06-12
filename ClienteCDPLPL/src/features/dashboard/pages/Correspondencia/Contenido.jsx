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
import {Link, useParams} from 'react-router-dom'
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
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300"
        style={{
          animation: isOpen ? 'modalSlideIn 0.3s ease-out' : 'modalSlideOut 0.3s ease-in'
        }}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-400" />
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
  // Simulamos useParams para la demo
   const { id } = useParams();
  const navigate = (direction) => {
    console.log(`Navegando: ${direction}`);
  };

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
          color: 'bg-red-50 text-red-700 border-red-200', 
          icon: AlertCircle,
          bgColor: 'bg-red-100'
        };
      case 'PENDIENTE':
        return { 
          color: 'bg-yellow-50 text-yellow-700 border-yellow-200', 
          icon: Clock,
          bgColor: 'bg-yellow-100'
        };
      case 'A DISCUCION':
        return { 
          color: 'bg-blue-50 text-blue-700 border-blue-200', 
          icon: MessageSquare,
          bgColor: 'bg-blue-100'
        };
      case 'ARREGLADO':
        return { 
          color: 'bg-green-50 text-green-700 border-green-200', 
          icon: CheckCircle,
          bgColor: 'bg-green-100'
        };
      default:
        return { 
          color: 'bg-gray-50 text-gray-700 border-gray-200', 
          icon: FileText,
          bgColor: 'bg-gray-100'
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header con navegación */}
          <div className="mb-6">
            <button
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors duration-200 mb-4 hover:bg-white/50 px-3 py-2 rounded-xl"
            >
              
              <Link to={'/dashboard/buzon'}><ArrowLeft className="w-9 h-5" />Volver</Link>
            </button>
          </div>

          {/* Tarjeta principal */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
            {/* Header de la tarjeta */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-6 text-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5" />
                    </div>
                    <span className="text-blue-100 text-sm font-medium">Correspondencia #{data.id_correspondencia}</span>
                  </div>
                  <h1 className="text-2xl font-bold leading-tight mb-3">
                    {data.asunto}
                  </h1>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.color} bg-white/90`}>
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
                <div className="bg-gray-50 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Remitente</p>
                      <p className="text-gray-900 font-semibold">{data.remitente}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Destinatario</p>
                      <p className="text-gray-900 font-semibold">
                        {data.destinatario?.nombre} {data.destinatario?.apellido}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Fecha de envío</p>
                    <p className="text-gray-900 font-semibold">
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

                <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Fecha de recepción</p>
                    <p className="text-gray-900 font-semibold">
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
              <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Resumen del contenido</h3>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {data.resumen}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer con acciones */}
            <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-700 transition-all duration-200 shadow-lg shadow-purple-500/25 hover:scale-105 active:scale-95 transform"
                  >
                    <Settings className="w-5 h-5" />
                    Cambiar estado
                  </button>
                </div>

                <button
                  onClick={() => verCorrespondencia(data.id_correspondencia)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg shadow-blue-500/25 hover:scale-105 active:scale-95 transform"
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
          <p className="text-gray-600 mb-4">Selecciona el nuevo estado para esta correspondencia:</p>
          
          <button
            onClick={() => handleCambiarEstado('A DISCUCION')}
            className="w-full flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] transform"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-blue-900">A Discusión</p>
              <p className="text-sm text-blue-600">Requiere análisis adicional</p>
            </div>
          </button>

          <button
            onClick={() => handleCambiarEstado('PENDIENTE')}
            className="w-full flex items-center gap-3 p-4 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] transform"
          >
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <Pause className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-yellow-900">Pendiente</p>
              <p className="text-sm text-yellow-600">En espera de acción</p>
            </div>
          </button>

          <button
            onClick={() => handleCambiarEstado('ARREGLADO')}
            className="w-full flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] transform"
          >
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-green-900">Arreglado</p>
              <p className="text-sm text-green-600">Problema resuelto</p>
            </div>
          </button>
        </div>
      </Modal>

      <style jsx>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes modalSlideOut {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
        }
      `}</style>
    </>
  );
};

export default Contenido;