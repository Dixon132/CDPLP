import { useEffect, useState } from "react";
import { getPagoInvitadoById, updatePagoInvitado, verPagoInvitado } from "../../../../services/invitados";
import { AlertTriangle, XCircle, CheckCircle, Calendar, DollarSign, FileText, Ban, Receipt } from "lucide-react";
import parseDate from "../../../../../../utils/parseData";

const VerDetallesPago = ({ id_pago, onSuccess }) => {
    const [pago, setPago] = useState(null);
    const [loading, setLoading] = useState(true);
    const [confirmando, setConfirmando] = useState(false);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!id_pago) return;
        (async () => {
            try {
                const res = await getPagoInvitadoById(id_pago);
                setPago(res);
            } catch (err) {
                setError("No se pudo cargar el pago.");
            } finally {
                setLoading(false);
            }
        })();
    }, [id_pago]);

    const handleAnular = async () => {
        setProcesando(true);
        setError(null);
        try {
            await updatePagoInvitado(id_pago, { estado_pago: "ANULADO" });
            onSuccess?.();
        } catch (err) {
            const msg = err?.response?.data?.error || "No se pudo anular el pago.";
            setError(msg);
            setProcesando(false);
            setConfirmando(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
        );
    }

    if (!pago) {
        return (
            <div className="p-6 text-center text-red-500">
                {error || "Pago no encontrado."}
            </div>
        );
    }

    const yaAnulado = pago.estado_pago === "ANULADO";

    return (
        <div className="p-6 space-y-5 max-w-md mx-auto">
            {/* Cabecera del pago */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 p-5 space-y-3">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500" />
                    Detalle del Pago
                </h3>

                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-3 text-slate-600">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-500 w-20">Concepto:</span>
                        <span className="text-slate-800 font-medium">{pago.concepto}</span>
                    </div>

                    <div className="flex items-center gap-3 text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-500 w-20">Fecha:</span>
                        <span className="text-slate-800">{parseDate(pago.fecha_pago)}</span>
                    </div>

                    <div className="flex items-center gap-3 text-slate-600">
                        <DollarSign className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-500 w-20">Monto:</span>
                        <span className="text-slate-800 font-semibold">
                            Bs. {parseFloat(pago.monto).toFixed(2)}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="font-medium text-slate-500 w-20 text-sm pl-7">Estado:</span>
                        {yaAnulado ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 border border-red-200 rounded-full text-xs font-semibold">
                                <Ban className="w-3 h-3" />
                                ANULADO
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
                                <CheckCircle className="w-3 h-3" />
                                REALIZADO
                            </span>
                        )}
                    </div>
                </div>

                {pago.comprobante !== null && (
                    <button
                        onClick={async () => {
                            const url = await verPagoInvitado(pago.id_pago);
                            if (url) window.open(url, "_blank");
                        }}
                        className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                    >
                        <Receipt className="w-4 h-4" />
                        Ver comprobante
                    </button>
                )}
            </div>

            {/* Mensaje de error */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <XCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* Zona de acción */}
            {yaAnulado ? (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>
                        Este pago ya fue <strong>anulado</strong>. La reversión fue registrada automáticamente en tesorería.
                        No puede modificarse.
                    </p>
                </div>
            ) : !confirmando ? (
                <button
                    onClick={() => setConfirmando(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-red-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Ban className="w-4 h-4" />
                    Anular este pago
                </button>
            ) : (
                /* Panel de confirmación */
                <div className="border border-amber-300 bg-amber-50 rounded-xl p-5 space-y-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-amber-800 text-sm">¿Confirmar anulación?</p>
                            <p className="text-amber-700 text-xs mt-1">
                                Se registrará automáticamente un <strong>EGRESO de reversión</strong> en tesorería por{" "}
                                <strong>Bs. {parseFloat(pago.monto).toFixed(2)}</strong>.
                                El registro original quedará como constancia. Esta acción no puede deshacerse.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setConfirmando(false)}
                            disabled={procesando}
                            className="flex-1 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleAnular}
                            disabled={procesando}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg text-sm font-semibold hover:shadow-md transition-all disabled:opacity-60"
                        >
                            {procesando ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            ) : (
                                <Ban className="w-4 h-4" />
                            )}
                            {procesando ? "Procesando..." : "Sí, anular"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VerDetallesPago;
