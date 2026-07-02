import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { verificarCI, getConfigPago, crearPostulacion } from '../dashboard/services/postulaciones';
import { getDocumentosRequeridos } from '../dashboard/services/documentosRequeridos';
import {
    CheckCircle, ChevronRight, ChevronLeft, Upload, FileText,
    User, Phone, Mail, CreditCard, Loader2, AlertCircle, X
} from 'lucide-react';

const STEPS = ['Verificación', 'Datos personales', 'Documentos', 'Pago'];

function StepIndicator({ current }) {
    return (
        <div className="flex items-center justify-center gap-0 mb-10">
            {STEPS.map((label, i) => {
                const done = i < current;
                const active = i === current;
                return (
                    <div key={i} className="flex items-center">
                        <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
                                ${done ? 'bg-black border-black text-white' : active ? 'bg-white border-black text-black' : 'bg-white border-slate-300 text-slate-400'}`}>
                                {done ? <CheckCircle className="w-4 h-4" /> : i + 1}
                            </div>
                            <span className={`mt-1.5 text-xs font-medium ${active ? 'text-black' : 'text-slate-400'}`}>{label}</span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={`w-12 sm:w-20 h-0.5 mb-5 mx-1 transition-all ${done ? 'bg-black' : 'bg-slate-200'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function FieldError({ msg }) {
    if (!msg) return null;
    return <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{msg}</p>;
}

function InputField({ label, id, type = 'text', placeholder, value, onChange, error, ...props }) {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
            <input
                id={id}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm outline-none transition-all
                    ${error ? 'border-red-400 bg-red-50 focus:ring-red-300' : 'border-slate-300 focus:border-black focus:ring-2 focus:ring-black/10'}`}
                {...props}
            />
            <FieldError msg={error} />
        </div>
    );
}

// ─── STEP 1: Verificar CI ─────────────────────────────────────
function Step1({ onNext }) {
    const [ci, setCi] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [blocked, setBlocked] = useState(null); // {mensaje}

    const handleCheck = async (e) => {
        e.preventDefault();
        if (!ci.trim()) { setError('Ingresa tu carnet de identidad.'); return; }
        setLoading(true);
        setError('');
        setBlocked(null);
        try {
            const res = await verificarCI(ci.trim());
            if (res.existe) {
                setBlocked(res.mensaje || 'Este CI ya está registrado en el sistema.');
            } else {
                onNext({ carnet_identidad: ci.trim() });
            }
        } catch {
            setError('Error al verificar. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleCheck} className="space-y-6">
            <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Verificar identidad</h2>
                <p className="text-slate-500 text-sm mt-1">Primero verificamos que no tengas un registro previo.</p>
            </div>

            {blocked && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">{blocked}</p>
                </div>
            )}

            <InputField
                label="Carnet de Identidad"
                id="ci"
                placeholder="Ej: 12345678"
                value={ci}
                onChange={e => { setCi(e.target.value); setError(''); setBlocked(null); }}
                error={error}
            />

            <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-all">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Continuar</span><ChevronRight className="w-4 h-4" /></>}
            </button>
        </form>
    );
}

// ─── STEP 2: Datos personales ─────────────────────────────────
function Step2({ onNext, onBack, inicial }) {
    const [form, setForm] = useState({ nombre: '', apellido: '', correo: '', telefono: '', ...inicial });
    const [errors, setErrors] = useState({});

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const validate = () => {
        const e = {};
        if (!form.nombre.trim()) e.nombre = 'Nombre requerido.';
        if (!form.apellido.trim()) e.apellido = 'Apellido requerido.';
        if (!form.correo.trim() || !/\S+@\S+\.\S+/.test(form.correo)) e.correo = 'Correo válido requerido.';
        if (!form.telefono.trim()) e.telefono = 'Teléfono requerido.';
        return e;
    };

    const handleNext = (e) => {
        e.preventDefault();
        const e2 = validate();
        if (Object.keys(e2).length) { setErrors(e2); return; }
        onNext(form);
    };

    return (
        <form onSubmit={handleNext} className="space-y-6">
            <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Datos personales</h2>
                <p className="text-slate-500 text-sm mt-1">Ingresa tu información personal para continuar.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Nombre(s)" id="nombre" value={form.nombre} onChange={e => set('nombre', e.target.value)} error={errors.nombre} placeholder="Juan" />
                <InputField label="Apellido(s)" id="apellido" value={form.apellido} onChange={e => set('apellido', e.target.value)} error={errors.apellido} placeholder="Pérez" />
            </div>
            <InputField label="Correo electrónico" id="correo" type="email" value={form.correo} onChange={e => set('correo', e.target.value)} error={errors.correo} placeholder="juan@ejemplo.com" />
            <InputField label="Teléfono / Celular" id="telefono" value={form.telefono} onChange={e => set('telefono', e.target.value)} error={errors.telefono} placeholder="+591 7XXXXXXX" />

            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onBack} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-all">
                    <ChevronLeft className="w-4 h-4" /> Atrás
                </button>
                <button type="submit" className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-slate-800 transition-all">
                    Siguiente <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </form>
    );
}

// ─── STEP 3: Documentos ───────────────────────────────────────
function Step3({ onNext, onBack }) {
    const [files, setFiles] = useState({});
    const [especialidades, setEspecialidades] = useState('');
    const [error, setError] = useState('');
    const [documentSlots, setDocumentSlots] = useState([]);
    const [loadingDocs, setLoadingDocs] = useState(true);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        setLoadingDocs(true);
        getDocumentosRequeridos()
            .then(res => {
                const docs = res.data ?? [];
                // Normalize each doc to the slot shape used in the form
                const slots = docs.map(doc => ({
                    key: String(doc.id_doc_req),
                    label: doc.es_opcional
                        ? `${doc.nombre} (opcional)`
                        : doc.nombre,
                    accept: '.pdf,image/*',
                    optional: doc.es_opcional,
                }));
                setDocumentSlots(slots);
            })
            .catch(() => setLoadError('No se pudieron cargar los documentos requeridos. Recarga la página.'))
            .finally(() => setLoadingDocs(false));
    }, []);

    const handleFile = (key, file) => {
        setFiles(p => ({ ...p, [key]: file }));
        setError('');
    };

    const handleNext = (e) => {
        e.preventDefault();
        const required = documentSlots.filter(s => !s.optional).map(s => s.key);
        const missing = required.filter(k => !files[k]);
        if (missing.length) { setError('Por favor sube todos los documentos requeridos.'); return; }
        const docArray = Object.values(files).filter(Boolean);
        onNext({ documentos: docArray, especialidades });
    };

    return (
        <form onSubmit={handleNext} className="space-y-6">
            <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Documentos</h2>
                <p className="text-slate-500 text-sm mt-1">Sube los documentos requeridos para tu postulación.</p>
            </div>

            {loadingDocs ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
            ) : loadError ? (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {loadError}
                </div>
            ) : (
                <div className="space-y-3">
                    {documentSlots.map(slot => (
                        <div key={slot.key} className={`flex items-center gap-4 p-3 rounded-lg border transition-all
                            ${files[slot.key] ? 'border-black bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-400'}`}>
                            <FileText className={`w-5 h-5 shrink-0 ${files[slot.key] ? 'text-black' : 'text-slate-400'}`} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-700">
                                    {slot.label}
                                    {!slot.optional && <span className="text-red-500 ml-1">*</span>}
                                </p>
                                {files[slot.key] && (
                                    <p className="text-xs text-slate-500 truncate">{files[slot.key].name}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-md transition-all">
                                    <Upload className="w-3.5 h-3.5" />
                                    {files[slot.key] ? 'Cambiar' : 'Subir'}
                                    <input type="file" className="hidden" accept={slot.accept}
                                        onChange={e => handleFile(slot.key, e.target.files[0])} />
                                </label>
                                {files[slot.key] && (
                                    <button type="button" onClick={() => setFiles(p => { const n = { ...p }; delete n[slot.key]; return n; })}
                                        className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Especialidades</label>
                <textarea
                    rows={3}
                    value={especialidades}
                    onChange={e => setEspecialidades(e.target.value)}
                    placeholder="Ej: Psicología clínica, Psicología educativa..."
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10 resize-none"
                />
            </div>

            {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
            )}

            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onBack} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-all">
                    <ChevronLeft className="w-4 h-4" /> Atrás
                </button>
                <button type="submit" disabled={loadingDocs} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-all">
                    Siguiente <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </form>
    );
}

// ─── STEP 4: Pago ────────────────────────────────────────────
function Step4({ onSubmit, onBack, loading }) {
    const [config, setConfig] = useState(null);
    const [comprobante, setComprobante] = useState(null);
    const [error, setError] = useState('');

    useState(() => {
        getConfigPago().then(setConfig).catch(() => setConfig({}));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!comprobante) { setError('Debes adjuntar el comprobante de pago.'); return; }
        setError('');
        onSubmit({ comprobante });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Pago de registro</h2>
                <p className="text-slate-500 text-sm mt-1">Realiza el pago y adjunta el comprobante para finalizar.</p>
            </div>

            {/* Payment Info */}
            <div className="border border-slate-200 rounded-xl p-5 space-y-4 bg-slate-50">
                {config ? (
                    <>
                        {config.instrucciones && (
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Instrucciones</p>
                                <p className="text-sm text-slate-700">{config.instrucciones}</p>
                            </div>
                        )}
                        {config.cuenta_bancaria && (
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Cuenta Bancaria</p>
                                <p className="text-sm font-mono font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2">{config.cuenta_bancaria}</p>
                            </div>
                        )}
                        {config.qr_url && (
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Código QR</p>
                                <img src={config.qr_url} alt="QR Pago" className="w-48 h-48 object-contain border border-slate-200 rounded-lg bg-white p-2" />
                            </div>
                        )}
                        {!config.instrucciones && !config.cuenta_bancaria && !config.qr_url && (
                            <p className="text-sm text-slate-500 text-center py-4">Información de pago no disponible aún. Contacta a la secretaría.</p>
                        )}
                    </>
                ) : (
                    <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
                )}
            </div>

            {/* Comprobante upload */}
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Comprobante de pago <span className="text-red-500">*</span>
                </label>
                <label className={`flex items-center gap-3 cursor-pointer border-2 border-dashed rounded-xl p-5 transition-all
                    ${comprobante ? 'border-black bg-slate-50' : 'border-slate-300 hover:border-slate-500'}`}>
                    <Upload className={`w-6 h-6 shrink-0 ${comprobante ? 'text-black' : 'text-slate-400'}`} />
                    <div>
                        <p className="text-sm font-semibold text-slate-700">
                            {comprobante ? comprobante.name : 'Haz clic para subir el comprobante'}
                        </p>
                        <p className="text-xs text-slate-500">PDF o imagen, máx. 10MB</p>
                    </div>
                    <input type="file" className="hidden" accept=".pdf,image/*" onChange={e => { setComprobante(e.target.files[0]); setError(''); }} />
                </label>
            </div>

            {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
            )}

            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onBack} disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 disabled:opacity-60 transition-all">
                    <ChevronLeft className="w-4 h-4" /> Atrás
                </button>
                <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-all">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : <><span>Postular</span><ChevronRight className="w-4 h-4" /></>}
                </button>
            </div>
        </form>
    );
}

// ─── STEP 5: Éxito ────────────────────────────────────────────
function StepExito() {
    return (
        <div className="flex flex-col items-center text-center py-8 space-y-6">
            <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">¡Postulación enviada!</h2>
                <p className="text-slate-500 mt-2 text-sm max-w-sm">
                    Tu solicitud está en revisión. Te notificaremos a tu correo cuando sea procesada.
                </p>
            </div>
            <div className="w-full border border-slate-200 rounded-xl p-5 bg-slate-50 text-left space-y-2">
                <p className="text-sm font-semibold text-slate-700">¿Qué sigue?</p>
                <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                    <li>El equipo administrativo revisará tu documentación</li>
                    <li>Verificarán el comprobante de pago</li>
                    <li>Recibirás un correo con la decisión y tu PIN de acceso</li>
                </ul>
            </div>
            <Link to="/" className="flex items-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-all text-sm">
                Volver al inicio
            </Link>
        </div>
    );
}

// ─── MAIN PAGE ────────────────────────────────────────────────
export default function PostularPage() {
    const [step, setStep] = useState(0);
    const [datos, setDatos] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const handleStep1 = (d) => { setDatos(p => ({ ...p, ...d })); setStep(1); };
    const handleStep2 = (d) => { setDatos(p => ({ ...p, ...d })); setStep(2); };
    const handleStep3 = (d) => { setDatos(p => ({ ...p, ...d })); setStep(3); };

    const handleStep4 = async ({ comprobante }) => {
        setSubmitting(true);
        setSubmitError('');
        try {
            const formData = new FormData();
            formData.append('carnet_identidad', datos.carnet_identidad);
            formData.append('nombre', datos.nombre);
            formData.append('apellido', datos.apellido);
            formData.append('correo', datos.correo);
            formData.append('telefono', datos.telefono);
            formData.append('especialidades', datos.especialidades || '');
            (datos.documentos || []).forEach(f => formData.append('documentos', f));
            if (comprobante) formData.append('comprobante', comprobante);
            await crearPostulacion(formData);
            setStep(4);
        } catch (err) {
            setSubmitError(err?.response?.data?.error || 'Error al enviar. Inténtalo de nuevo.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs font-black">C</span>
                        </div>
                        <span className="font-black text-slate-900 tracking-tight text-sm uppercase">CDPLP</span>
                    </Link>
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-widest">Portal de Postulación</span>
                </div>
            </header>

            {/* Main content */}
            <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
                {step < 4 && (
                    <div className="mb-6">
                        <h1 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-6 text-center">
                            Solicitud de Colegiatura
                        </h1>
                        <StepIndicator current={step} />
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                    {submitError && step === 3 && (
                        <div className="mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                            <AlertCircle className="w-4 h-4 shrink-0" /> {submitError}
                        </div>
                    )}
                    {step === 0 && <Step1 onNext={handleStep1} />}
                    {step === 1 && <Step2 onNext={handleStep2} onBack={() => setStep(0)} inicial={{ nombre: datos.nombre, apellido: datos.apellido, correo: datos.correo, telefono: datos.telefono }} />}
                    {step === 2 && <Step3 onNext={handleStep3} onBack={() => setStep(1)} />}
                    {step === 3 && <Step4 onSubmit={handleStep4} onBack={() => setStep(2)} loading={submitting} />}
                    {step === 4 && <StepExito />}
                </div>

                <p className="text-center text-xs text-slate-400 mt-8">
                    © {new Date().getFullYear()} Colegio Departamental de Profesionales de La Paz
                </p>
            </main>
        </div>
    );
}
