import React, { useState, useEffect } from 'react';
import { getPresupuestoActivo, setPresupuestoActivo } from '../../../services/configFinanciera';
import { getAllPresupuestos } from '../../../services/tesoreria';
import { Loader2, CheckCircle2, AlertCircle, Briefcase } from 'lucide-react';
import Alerts from '../../../components/Alerts';
import { useSession } from '../../../../../context/SessionProvider';

export default function ConfiguracionFinanciera() {
    const { puedeEditar } = useSession();
    const esEditor = puedeEditar('ajustes.financiero');
    const [presupuestos, setPresupuestos] = useState([]);
    const [activeId, setActiveId] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [alert, setAlert] = useState({ show: false, type: 'success', message: '' });

    const showAlert = (type, message) => {
        setAlert({ show: true, type, message });
        setTimeout(() => setAlert(a => ({ ...a, show: false })), 3500);
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                // Obtenemos todos los presupuestos sin paginación (o con límite alto) para el dropdown
                const presData = await getAllPresupuestos({ limit: 100 });
                setPresupuestos(presData.data || []);

                const activeData = await getPresupuestoActivo();
                setActiveId(activeData.valor || '');
            } catch (err) {
                setError('Error al cargar configuración de presupuestos.');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!esEditor) return;
        if (!activeId) {
            setError('Debe seleccionar un presupuesto.');
            return;
        }

        setSaving(true);
        setError('');
        try {
            await setPresupuestoActivo(activeId);
            showAlert('success', 'Presupuesto activo actualizado correctamente.');
        } catch (err) {
            setError('Error al guardar el presupuesto activo.');
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
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Briefcase className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Enrutamiento de Pagos</h2>
                    <p className="text-sm text-slate-500 font-medium">Selecciona a qué presupuesto deben dirigirse los nuevos ingresos.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <fieldset disabled={!esEditor} className="space-y-5">
                {!esEditor && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        Solo puedes ver esta configuración; tu permiso sobre este módulo es de observador.
                    </div>
                )}
                {error && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                        <AlertCircle className="w-4 h-4" /> {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Presupuesto Activo</label>
                    <select
                        value={activeId}
                        onChange={(e) => setActiveId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                        required
                    >
                        <option value="" disabled>-- Selecciona un presupuesto --</option>
                        {presupuestos.map((p) => (
                            <option key={p.id_presupuesto} value={p.id_presupuesto}>
                                {p.nombre_presupuesto}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-2">
                        Todos los pagos nuevos (colegiaturas, cursos, etc.) se registrarán automáticamente como ingresos en este presupuesto.
                    </p>
                </div>

                {esEditor && (
                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                        <button type="submit" disabled={saving || !activeId} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-all disabled:opacity-60">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Guardar Presupuesto Activo
                        </button>
                    </div>
                )}
                </fieldset>
            </form>
            <Alerts type={alert.type} message={alert.message} show={alert.show} onClose={() => setAlert(a => ({ ...a, show: false }))} />
        </div>
    );
}
