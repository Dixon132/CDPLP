import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../../components/Button";
import Modal from "../../../../components/Modal";
import AñadirPago from "./components/AñadirPago";
import { getAllPagos } from "../../services/colegiados";
import parseDate from "../../../../utils/parseData";
import VerDetallesPago from "./components/VerDetallesPago";
import { 
    CreditCard, 
    DollarSign, 
    Calendar, 
    CheckCircle, 
    XCircle, 
    Clock, 
    AlertCircle,
    Plus,
    Eye,
    Edit,
    Receipt,
    TrendingUp,
    Banknote
} from 'lucide-react';

const Pagos = () => {
    const {id} = useParams()
    const [pagos, setPagos] = useState([])
    const [modalAñadir, setModalAñadir] = useState(false)
    const [modalDetalles, setModalDetalles] = useState(false)
    const [currentId, setCurrentId] = useState(null)

    const getPagos = async()=>{
        const data = await getAllPagos(id)
        setPagos(data)
    }

    useEffect(()=>{
        getPagos()
        console.log(pagos)
    },[id])

    const getEstadoIcon = (estado) => {
        switch(estado?.toLowerCase()) {
            case 'pagado':
            case 'completado':
            case 'aprobado':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'rechazado':
            case 'cancelado':
                return <XCircle className="w-4 h-4 text-red-500" />;
            case 'pendiente':
                return <Clock className="w-4 h-4 text-yellow-500" />;
            default:
                return <AlertCircle className="w-4 h-4 text-gray-500" />;
        }
    };

    const getEstadoBadge = (estado) => {
        const baseClasses = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium";
        switch(estado?.toLowerCase()) {
            case 'pagado':
            case 'completado':
            case 'aprobado':
                return `${baseClasses} bg-green-100 text-green-800 border border-green-200`;
            case 'rechazado':
            case 'cancelado':
                return `${baseClasses} bg-red-100 text-red-800 border border-red-200`;
            case 'pendiente':
                return `${baseClasses} bg-yellow-100 text-yellow-800 border border-yellow-200`;
            default:
                return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`;
        }
    };

    const calcularTotalPagos = () => {
        return pagos.reduce((total, pago) => total + (parseFloat(pago.monto) || 0), 0);
    };

    const pagosPagados = pagos.filter(pago => pago.estado_pago?.toLowerCase() === 'pagado').length;
    const pagosPendientes = pagos.filter(pago => pago.estado_pago?.toLowerCase() === 'pendiente').length;
    const totalPagos = pagos.length;

    return (
        <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 via-emerald-50/30 to-green-50/20 min-h-screen">
            {/* Header mejorado */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg">
                            <CreditCard className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 mb-1">
                                Pagos del Colegiado #{id}
                            </h1>
                            <p className="text-slate-600 text-sm">
                                {totalPagos} pagos registrados
                            </p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => setModalAñadir(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 hover:scale-105"
                    >
                        <Plus className="w-4 h-4" />
                        Añadir Pago
                    </button>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200/60">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500 rounded-lg">
                                <Receipt className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <p className="text-xs text-blue-600 font-medium">Total Pagos</p>
                                <p className="text-lg font-bold text-blue-700">{totalPagos}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200/60">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500 rounded-lg">
                                <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <p className="text-xs text-green-600 font-medium">Pagados</p>
                                <p className="text-lg font-bold text-green-700">{pagosPagados}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-xl border border-yellow-200/60">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-500 rounded-lg">
                                <Clock className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <p className="text-xs text-yellow-600 font-medium">Pendientes</p>
                                <p className="text-lg font-bold text-yellow-700">{pagosPendientes}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200/60">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500 rounded-lg">
                                <TrendingUp className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <p className="text-xs text-purple-600 font-medium">Total Bs.</p>
                                <p className="text-lg font-bold text-purple-700">{calcularTotalPagos().toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabla de pagos mejorada */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-emerald-50 px-6 py-4 border-b border-slate-200/60">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-500" />
                        Historial de Pagos
                    </h2>
                </div>
                
                {pagos.length === 0 ? (
                    <div className="p-12">
                        <div className="text-center">
                            <Banknote className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium mb-2">No hay pagos registrados</p>
                            <p className="text-slate-400 text-sm mb-6">Añade el primer pago para comenzar</p>
                            <button 
                                onClick={() => setModalAñadir(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 hover:scale-105"
                            >
                                <Plus className="w-4 h-4" />
                                Añadir Primer Pago
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-slate-50 to-emerald-50 border-b border-slate-200/60">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Concepto</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Monto</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/60">
                                {pagos.map((pago, i) => (
                                    <tr key={i} className="hover:bg-emerald-50/30 transition-colors duration-150">
                                        {/* Concepto */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-emerald-100 rounded-lg">
                                                    <Receipt className="w-4 h-4 text-emerald-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800">{pago.concepto}</p>
                                                    <p className="text-xs text-slate-500">Pago #{pago.id_pago}</p>
                                                </div>
                                            </div>
                                        </td>
                                        
                                        {/* Fecha */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                {parseDate(pago.fecha_pago)}
                                            </div>
                                        </td>
                                        
                                        {/* Monto */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <DollarSign className="w-4 h-4 text-emerald-500" />
                                                <span className="font-semibold text-slate-800">
                                                    Bs. {parseFloat(pago.monto).toFixed(2)}
                                                </span>
                                            </div>
                                        </td>
                                        
                                        {/* Estado */}
                                        <td className="px-6 py-4">
                                            <span className={getEstadoBadge(pago.estado_pago)}>
                                                {getEstadoIcon(pago.estado_pago)}
                                                {pago.estado_pago || "Pendiente"}
                                            </span>
                                        </td>
                                        
                                        {/* Acciones */}
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => {
                                                    setCurrentId(pago.id_pago);
                                                    setModalDetalles(true);
                                                }}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-200 transition-colors duration-150"
                                            >
                                                <Edit className="w-3 h-3" />
                                                Modificar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modales */}
            <Modal isOpen={modalAñadir} onClose={() => setModalAñadir(false)} title={'Añadir pago'}>
                <AñadirPago id={id}/>
            </Modal>
            
            <Modal isOpen={modalDetalles} onClose={() => setModalDetalles(false)} title={'Detalles del pago'}>
                <VerDetallesPago id_pago={currentId}/>
            </Modal>
        </div>
    );
};

export default Pagos;