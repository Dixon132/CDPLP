import React, { useState, useEffect } from 'react';
import { getConfigPagoAdmin, upsertConfigPago, uploadQrConfig } from '../../../services/postulaciones';
import { Loader2, CheckCircle2, AlertCircle, CreditCard } from 'lucide-react';
import Alerts from '../../../components/Alerts';

export default function ConfiguracionPagos() {
    const [config, setConfig] = useState({ MONTO_INICIAL: '', QR: '', CUENTA: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [fileQr, setFileQr] = useState(null);
    const [alert, setAlert] = useState({ show: false, type: 'success', message: '' });

    const showAlert = (type, message) => {
        setAlert({ show: true, type, message });
        setTimeout(() => setAlert(a => ({ ...a, show: false })), 3500);
    };

    useEffect(() => {
        getConfigPagoAdmin()
            .then(data => setConfig({
                MONTO_INICIAL: data.MONTO_INICIAL || '',
                QR: data.QR || '',
                CUENTA: data.CUENTA || ''
            }))
            .catch(() => setError('Error al cargar configuración.'))
            .finally(() => setLoading(false));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            let qrUrl = config.QR;
            if (fileQr) {
                const resQr = await uploadQrConfig(fileQr);
                qrUrl = resQr.ruta;
            }

            const items = [
                { clave: 'MONTO_INICIAL', valor: config.MONTO_INICIAL },
                { clave: 'CUENTA', valor: config.CUENTA },
            ];
            
            if (!fileQr && qrUrl) items.push({ clave: 'QR', valor: qrUrl });

            await upsertConfigPago(items);
            showAlert('success', 'Configuración de pagos actualizada exitosamente.');
        } catch {
            setError('Error al guardar configuración.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
    );

    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <CreditCard className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Configuración de Pagos (Postulaciones)</h2>
                    <p className="text-sm text-slate-500 font-medium">Gestiona el monto inicial, código QR y datos bancarios.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                        <AlertCircle className="w-4 h-4" /> {error}
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Monto Inicial (Bs)</label>
                        <input type="number" required value={config.MONTO_INICIAL} onChange={e => setConfig({ ...config, MONTO_INICIAL: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                        <p className="text-xs text-slate-500 mt-1">Monto de inscripción automático.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Imagen QR</label>
                        <div className="space-y-3">
                            {config.QR && !fileQr && (
                                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-between">
                                    <span className="text-sm text-emerald-700 font-medium">QR actual guardado en la nube</span>
                                </div>
                            )}
                            <input type="file" accept="image/*" onChange={e => setFileQr(e.target.files[0])}
                                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
                            <p className="text-xs text-slate-500 mt-1">
                                {config.QR ? "Sube una nueva imagen solo si deseas reemplazar el QR actual." : "Sube la imagen del QR para los pagos."}
                            </p>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Datos de Cuenta Bancaria</label>
                        <textarea rows={3} value={config.CUENTA} onChange={e => setConfig({ ...config, CUENTA: e.target.value })}
                            placeholder="Banco Nacional de Bolivia&#10;Cta: 123456789&#10;A nombre de: Colegio de Auditores"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none" />
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-60">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Guardar Configuración
                    </button>
                </div>
            </form>
            <Alerts type={alert.type} message={alert.message} show={alert.show} onClose={() => setAlert(a => ({ ...a, show: false }))} />
        </div>
    );
}
