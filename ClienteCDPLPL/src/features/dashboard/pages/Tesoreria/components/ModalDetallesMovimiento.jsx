import React from 'react';
import Modal from '../../../../../components/Modal';
import { Calendar, Clock, Tag, FileText, DollarSign, TrendingUp, TrendingDown, ExternalLink, Hash, Layers, User } from 'lucide-react';



export default function ModalDetallesMovimiento({ isOpen, onClose, movimiento, onAnular }) {
    if (!movimiento) return null;

    const esIngreso = movimiento.tipo_movimiento === 'INGRESO';
    const fechaObj = movimiento.fecha_movimiento ? new Date(movimiento.fecha_movimiento) : null;
    const fechaFormateada = fechaObj ? fechaObj.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : '\u2014';
    const fechaCreacionObj = movimiento.createdAt ? new Date(movimiento.createdAt) : null;
    const horaFormateada = fechaCreacionObj ? fechaCreacionObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '\u2014';
    // Se cae a createdAt / fecha_movimiento para las filas antiguas que puedan
    // no tener updatedAt, igual que hace la tabla.
    const ultimaActividad = movimiento.updatedAt ?? movimiento.createdAt ?? movimiento.fecha_movimiento;
    const fechaActObj = ultimaActividad ? new Date(ultimaActividad) : null;
    const horaActFormateada = fechaActObj ? fechaActObj.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '\u2014';

    const formatMoney = (amount) => new Intl.NumberFormat('es-BO').format(amount || 0);

    const origen = movimiento.tipo_origen_label || 'MANUAL';
    const persona = movimiento.origen_info?.persona || 'No aplica';
    const carnet = movimiento.origen_info?.carnet || 'No aplica';
    const actividad = movimiento.origen_info?.actividad || 'No aplica';
    const estado = movimiento.estado || 'COMPLETADO';
    const metodo = movimiento.metodo_pago || 'EFECTIVO';

    const autorNombre = movimiento.usuario?.nombre_completo || 'Sistema / Sin registro';
    const autorRol = movimiento.usuario?.rol ? ` [${movimiento.usuario.rol}]` : '';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalles del Movimiento">
            <div className="space-y-5 p-2">
                {/* Header con tipo e \u00edcono */}
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${
                        esIngreso ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                    }`}>
                        {esIngreso ? <TrendingUp className="w-7 h-7" /> : <TrendingDown className="w-7 h-7" />}
                    </div>
                    <div>
                        <div className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                            esIngreso
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                            <div className={`w-1.5 h-1.5 rounded-full mr-2 ${esIngreso ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                            {movimiento.tipo_movimiento}
                        </div>
                        <p className={`text-2xl font-black mt-1 ${esIngreso ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {esIngreso ? '+' : '-'}Bs. {formatMoney(movimiento.monto)}
                        </p>
                    </div>
                </div>

                <hr className="border-slate-100" />

                {/* Info grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg mt-0.5">
                            <Hash className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase">ID Movimiento</p>
                            <p className="text-sm font-bold text-slate-800">#{movimiento.id_movimiento}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg mt-0.5">
                            <Tag className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase">Categoría</p>
                            <p className="text-sm font-bold text-slate-800">{movimiento.categoria || 'Sin categoría'}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg mt-0.5">
                            <Calendar className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase">Fecha</p>
                            <p className="text-sm font-bold text-slate-800">{fechaFormateada}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg mt-0.5">
                            <Clock className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase">Hora Creación</p>
                            <p className="text-sm font-bold text-slate-800">{horaFormateada}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg mt-0.5">
                            <Clock className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase">Última Modificación</p>
                            <p className="text-sm font-bold text-slate-800">{horaActFormateada}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg mt-0.5">
                            <User className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase">Autor del Registro</p>
                            <p className="text-sm font-bold text-slate-800">{autorNombre}<span className="text-xs font-semibold text-indigo-600">{autorRol}</span></p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg mt-0.5">
                            <DollarSign className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase">Método Pago</p>
                            <p className="text-sm font-bold text-slate-800">{metodo}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg mt-0.5">
                            <Layers className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase">Tipo de Origen</p>
                            <p className="text-sm font-bold text-slate-800">{origen}</p>
                        </div>
                    </div>
                    
                    {movimiento.origen_info && (
                        <>
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-slate-100 rounded-lg mt-0.5">
                                    <User className="w-4 h-4 text-slate-500" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase">Persona Vinculada</p>
                                    <p className="text-sm font-bold text-slate-800">{persona}</p>
                                </div>
                            </div>
                            {carnet !== 'No aplica' && (
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-slate-100 rounded-lg mt-0.5">
                                        <Hash className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 uppercase">Carnet</p>
                                        <p className="text-sm font-bold text-slate-800">{carnet}</p>
                                    </div>
                                </div>
                            )}
                            {actividad !== 'No aplica' && (
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-slate-100 rounded-lg mt-0.5">
                                        <Tag className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 uppercase">Actividad</p>
                                        <p className="text-sm font-bold text-slate-800">{actividad}</p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Descripci\u00f3n */}
                {movimiento.descripcion && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <p className="text-xs font-semibold text-slate-400 uppercase">Descripci\u00f3n</p>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">{movimiento.descripcion}</p>
                    </div>
                )}

                {/* Comprobante */}
                {movimiento.comprobante ? (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-500" />
                                <p className="text-sm font-semibold text-blue-700">Comprobante adjunto</p>
                            </div>
                            <button
                                onClick={() => window.open(movimiento.comprobante, '_blank')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                <ExternalLink className="w-3 h-3" />
                                Ver comprobante
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                        <p className="text-xs text-slate-400">Sin comprobante adjunto</p>
                    </div>
                )}

                {/* Sección Estado y Anular */}
                <div className={`p-4 border rounded-xl flex items-center justify-between ${estado === 'ANULADO' ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                    <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">Estado Actual</p>
                        <p className={`text-lg font-black ${estado === 'ANULADO' ? 'text-rose-600' : 'text-emerald-600'}`}>{estado}</p>
                    </div>
                    {estado === 'COMPLETADO' && onAnular && (
                        <button
                            onClick={() => onAnular(movimiento.id_movimiento)}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-lg shadow-sm"
                        >
                            Anular Movimiento
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
}
