import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { verificarCI, getConfigPago, crearPostulacion } from '../dashboard/services/postulaciones';
import { getDocumentosRequeridos } from '../dashboard/services/documentosRequeridos';
import {
    CheckCircle, ChevronRight, ChevronLeft, Upload, FileText,
    Loader2, AlertCircle, X, Shield, Star, Award, BookOpen, Clock
} from 'lucide-react';
import EspecialidadesSelect from '../dashboard/components/EspecialidadesSelect';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = ['Verificación', 'Datos personales', 'Documentos y Pago'];

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
                                ${done ? 'bg-blue-900 border-blue-900 text-white' : active ? 'bg-white border-blue-900 text-blue-900' : 'bg-white border-slate-300 text-slate-400'}`}>
                                {done ? <CheckCircle className="w-4 h-4" /> : i + 1}
                            </div>
                            <span className={`mt-2 text-xs font-medium ${active ? 'text-blue-900 font-bold' : 'text-slate-400'}`}>{label}</span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={`w-10 sm:w-20 h-0.5 mb-6 mx-2 transition-all ${done ? 'bg-blue-900' : 'bg-slate-200'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function FieldError({ msg }) {
    if (!msg) return null;
    return <p className="mt-1 text-xs font-medium text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{msg}</p>;
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
                    ${error ? 'border-red-400 bg-red-50 focus:ring-red-300' : 'border-slate-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10'}`}
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
    const [blocked, setBlocked] = useState(null);

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
        <motion.form 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleCheck} 
            className="space-y-6"
        >
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Verificar identidad</h2>
                <p className="text-slate-500 text-sm mt-1">Ingresa tu número de carnet de identidad para comenzar el trámite.</p>
            </div>

            {blocked && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 font-medium">{blocked}</p>
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
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-900 text-white font-medium rounded-lg hover:bg-blue-800 disabled:opacity-60 transition-all">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Continuar</span><ChevronRight className="w-5 h-5" /></>}
            </button>
        </motion.form>
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
        <motion.form 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleNext} 
            className="space-y-6"
        >
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Datos personales</h2>
                <p className="text-slate-500 text-sm mt-1">Ingresa tu información personal para continuar con el registro.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Nombre(s)" id="nombre" value={form.nombre} onChange={e => set('nombre', e.target.value)} error={errors.nombre} placeholder="Juan" />
                <InputField label="Apellido(s)" id="apellido" value={form.apellido} onChange={e => set('apellido', e.target.value)} error={errors.apellido} placeholder="Pérez" />
            </div>
            <InputField label="Correo electrónico" id="correo" type="email" value={form.correo} onChange={e => set('correo', e.target.value)} error={errors.correo} placeholder="juan@ejemplo.com" />
            <InputField label="Teléfono / Celular" id="telefono" value={form.telefono} onChange={e => set('telefono', e.target.value)} error={errors.telefono} placeholder="+591 7XXXXXXX" />

            <div className="flex gap-3 pt-4">
                <button type="button" onClick={onBack} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-all">
                    <ChevronLeft className="w-5 h-5" /> Atrás
                </button>
                <button type="submit" className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-900 text-white font-medium rounded-lg hover:bg-blue-800 transition-all">
                    Siguiente <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </motion.form>
    );
}

// ─── STEP 3: Documentos y Pago ───────────────────────────────────────
function Step3({ onSubmit, onBack, loading }) {
    const [files, setFiles] = useState({});
    const [especialidades, setEspecialidades] = useState([]);
    const [error, setError] = useState('');
    const [documentSlots, setDocumentSlots] = useState([]);
    const [loadingDocs, setLoadingDocs] = useState(true);
    const [loadError, setLoadError] = useState('');
    
    const [config, setConfig] = useState(null);
    const [comprobante, setComprobante] = useState(null);
    const [metodoPago, setMetodoPago] = useState('TRANSFERENCIA');

    useEffect(() => {
        setLoadingDocs(true);
        getDocumentosRequeridos()
            .then(res => {
                const docs = res.data ?? [];
                const slots = docs.map(doc => ({
                    key: String(doc.id_doc_req),
                    label: doc.es_opcional ? `${doc.nombre} (opcional)` : doc.nombre,
                    name: doc.nombre,
                    accept: '.pdf,image/*',
                    optional: doc.es_opcional,
                }));
                setDocumentSlots(slots);
            })
            .catch(() => setLoadError('No se pudieron cargar los documentos requeridos. Recarga la página.'))
            .finally(() => setLoadingDocs(false));
            
        getConfigPago().then(setConfig).catch(() => setConfig({}));
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
        if (metodoPago !== 'EFECTIVO' && !comprobante) { setError('Debes adjuntar el comprobante de pago.'); return; }
        
        const docArray = Object.entries(files).map(([key, file]) => {
            if (!file) return null;
            const slot = documentSlots.find(s => s.key === key);
            const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
            return new File([file], slot.name + ext, { type: file.type });
        }).filter(Boolean);
        
        onSubmit({ documentos: docArray, especialidades: especialidades.join(", "), comprobante, metodoPago });
    };

    return (
        <motion.form 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleNext} 
            className="space-y-8"
        >
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Documentos y Pago</h2>
                <p className="text-slate-500 text-sm mt-1">Sube los requisitos para finalizar tu postulación al colegio.</p>
            </div>

            {loadingDocs ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
            ) : loadError ? (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    <AlertCircle className="w-5 h-5 shrink-0" /> {loadError}
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">Requisitos de Postulación</p>
                    {documentSlots.map(slot => (
                        <div key={slot.key} className={`flex items-center gap-4 p-4 border rounded-xl transition-all ${files[slot.key] ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                            <FileText className={`w-6 h-6 shrink-0 ${files[slot.key] ? 'text-blue-700' : 'text-slate-400'}`} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800">
                                    {slot.label}
                                    {!slot.optional && <span className="text-red-500 ml-1">*</span>}
                                </p>
                                {files[slot.key] && (
                                    <p className="text-xs text-slate-500 truncate mt-0.5">{files[slot.key].name}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all">
                                    <Upload className="w-4 h-4" />
                                    {files[slot.key] ? 'Cambiar' : 'Subir'}
                                    <input type="file" className="hidden" accept={slot.accept}
                                        onChange={e => handleFile(slot.key, e.target.files[0])} />
                                </label>
                                {files[slot.key] && (
                                    <button type="button" onClick={() => setFiles(p => { const n = { ...p }; delete n[slot.key]; return n; })} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Especialidades (Opcional)</label>
                <EspecialidadesSelect
                    value={especialidades}
                    onChange={setEspecialidades}
                    allowCreate={false}
                />
            </div>

            <div className="pt-6 border-t border-slate-200 mt-8">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Método de pago de cuota inicial</label>
                <select
                    className="w-full px-4 py-2.5 mb-4 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:border-blue-900 focus:ring-blue-900/10 outline-none bg-white font-medium"
                    value={metodoPago}
                    onChange={(e) => {
                        setMetodoPago(e.target.value);
                        setError("");
                    }}
                >
                    <option value="EFECTIVO">Efectivo (Presencial)</option>
                    <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                    <option value="QR">Pago con QR</option>
                </select>

                <div className="border border-slate-200 rounded-xl p-5 space-y-4 bg-slate-50">
                    {config ? (
                        <>
                            {metodoPago === 'EFECTIVO' && (
                                <p className="text-sm font-medium text-slate-700 text-center py-4">Puedes realizar el pago en efectivo directamente en nuestras oficinas, luego de la revisión de tus documentos.</p>
                            )}
                            {metodoPago === 'TRANSFERENCIA' && (
                                <>
                                    {config.instrucciones && (
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500 mb-1 uppercase">Instrucciones</p>
                                            <p className="text-sm text-slate-700">{config.instrucciones}</p>
                                        </div>
                                    )}
                                    {(config.cuenta_bancaria || config.cuenta) ? (
                                        <div className="mt-4">
                                            <p className="text-xs font-semibold text-slate-500 mb-1 uppercase">Cuenta Bancaria</p>
                                            <p className="text-lg font-mono font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-4 py-2 inline-block">{config.cuenta_bancaria || config.cuenta}</p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500 text-center py-4">Información de cuenta bancaria no disponible.</p>
                                    )}
                                </>
                            )}
                            {metodoPago === 'QR' && (
                                <>
                                    {config.qr_url ? (
                                        <div className="flex flex-col items-center">
                                            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">Código QR para pago</p>
                                            <img src={config.qr_url} alt="QR Pago" className="w-56 h-56 object-contain border border-slate-200 rounded-xl bg-white p-2 shadow-sm" />
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500 text-center py-4">Código QR no disponible en este momento.</p>
                                    )}
                                </>
                            )}
                        </>
                    ) : (
                        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                    )}
                </div>
            </div>

            {/* Comprobante upload */}
            {metodoPago !== 'EFECTIVO' && (
                <div className="mt-6">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Comprobante de pago <span className="text-red-500">*</span>
                </label>
                <label className={`flex items-center gap-4 cursor-pointer border-2 border-dashed rounded-xl p-5 transition-all
                    ${comprobante ? 'border-blue-400 bg-blue-50/50' : 'border-slate-300 hover:border-slate-400 bg-white'}`}>
                    <Upload className={`w-6 h-6 shrink-0 ${comprobante ? 'text-blue-700' : 'text-slate-400'}`} />
                    <div>
                        <p className="text-sm font-semibold text-slate-800">
                            {comprobante ? comprobante.name : 'Haz clic para subir el comprobante'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">PDF o imagen, máx. 10MB</p>
                    </div>
                    <input type="file" className="hidden" accept=".pdf,image/*" onChange={e => { setComprobante(e.target.files[0]); setError(''); }} />
                </label>
            </div>
            )}

            {error && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 font-medium mt-6">
                    <AlertCircle className="w-5 h-5 shrink-0" /> {error}
                </div>
            )}

            <div className="flex gap-4 pt-4 mt-8">
                <button type="button" onClick={onBack} disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-slate-300 bg-white text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-all disabled:opacity-50">
                    <ChevronLeft className="w-5 h-5" /> Atrás
                </button>
                <button type="submit" disabled={loading || loadingDocs} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-900 text-white font-medium rounded-lg hover:bg-blue-800 transition-all disabled:opacity-50">
                    {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</> : <><span>Finalizar Postulación</span><ChevronRight className="w-5 h-5" /></>}
                </button>
            </div>
        </motion.form>
    );
}

// ─── STEP 4 (Ex Éxito) ────────────────────────────────────────────
function StepExito() {
    return (
        <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center py-10 space-y-6"
        >
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">¡Postulación Enviada!</h2>
                <p className="text-slate-600 font-medium text-sm max-w-md mx-auto leading-relaxed">
                    Tu solicitud y documentos han sido recibidos correctamente. Nuestro equipo está revisando tu postulación.
                </p>
            </div>
            <div className="w-full border border-slate-200 rounded-xl p-5 bg-slate-50 text-left space-y-3">
                <p className="text-sm font-semibold text-slate-800">¿Qué sigue ahora?</p>
                <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside">
                    <li>Verificaremos tus documentos y comprobante de pago.</li>
                    <li>Si todo está correcto, tu postulación será aprobada.</li>
                    <li>Recibirás un correo electrónico con tu PIN de acceso, que te servirá para participar en actividades sociales, cursos y más beneficios del colegio.</li>
                </ul>
            </div>
            <Link to="/" className="inline-flex items-center gap-2 px-8 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-all text-sm mt-4">
                Volver al inicio
            </Link>
        </motion.div>
    );
}

// ─── LANDING POSTULACION ────────────────────────────────────────────────
function LandingPostulacion({ onStart }) {
    return (
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 z-10 relative">
            <div className="text-center mb-16 mt-8">
                <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter text-black mb-6 drop-shadow-sm"
                >
                    POSTULARSE AL CDPLP
                </motion.h1>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="w-32 h-2 bg-gradient-to-r from-blue-800 to-amber-500 mx-auto mb-8"
                ></motion.div>
                <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="text-xl md:text-2xl text-gray-700 font-bold max-w-3xl mx-auto bg-white p-3 border border-black shadow-[4px_4px_0px_0px_rgba(30,58,138,0.9)]"
                >
                    Únete a nuestra institución y sé parte activa de la red de profesionales más grande y prestigiosa de La Paz.
                </motion.p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-12 items-start">
                
                {/* Beneficios */}
                <div className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(30,58,138,0.9)]">
                    <h3 className="text-2xl font-black uppercase tracking-widest text-black border-b-2 border-blue-800 pb-4 mb-6">Beneficios de ser un Colegiado</h3>
                    <ul className="space-y-6">
                        <motion.li 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="flex gap-4 sm:gap-6"
                        >
                            <div className="w-12 h-12 shrink-0 bg-blue-800 text-white flex items-center justify-center border-2 border-blue-800">
                                <Award className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg uppercase tracking-wider text-black">Respaldo Institucional</h4>
                                <p className="text-sm font-medium text-gray-700 mt-1">Garantía y respaldo para tu ejercicio profesional en todo el departamento.</p>
                            </div>
                        </motion.li>
                        <motion.li 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="flex gap-4 sm:gap-6"
                        >
                            <div className="w-12 h-12 shrink-0 bg-amber-500 text-white flex items-center justify-center border-2 border-amber-500">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg uppercase tracking-wider text-black">Capacitación Continua</h4>
                                <p className="text-sm font-medium text-gray-700 mt-1">Acceso a cursos, seminarios y diplomados con descuentos exclusivos.</p>
                            </div>
                        </motion.li>
                        <motion.li 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="flex gap-4 sm:gap-6"
                        >
                            <div className="w-12 h-12 shrink-0 bg-emerald-600 text-white flex items-center justify-center border-2 border-emerald-600">
                                <Shield className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg uppercase tracking-wider text-black">Defensa del Profesional</h4>
                                <p className="text-sm font-medium text-gray-700 mt-1">Asesoría y apoyo ante vulneraciones de los derechos profesionales.</p>
                            </div>
                        </motion.li>
                        <motion.li 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            className="flex gap-4 sm:gap-6"
                        >
                            <div className="w-12 h-12 shrink-0 bg-purple-600 text-white flex items-center justify-center border-2 border-purple-600">
                                <Star className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg uppercase tracking-wider text-black">Actividades y Redes</h4>
                                <p className="text-sm font-medium text-gray-700 mt-1">Participación en actividades sociales, culturales y deportivas, además de formar parte del directorio de profesionales.</p>
                            </div>
                        </motion.li>
                    </ul>
                </div>

                {/* Pasos y CTA */}
                <motion.div 
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="flex flex-col h-full"
                >
                    <div className="bg-gray-50 border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(30,58,138,0.9)] flex-grow">
                        <h3 className="text-2xl font-black uppercase tracking-widest text-black border-b-2 border-blue-800 pb-4 mb-6">¿Cómo funciona el trámite?</h3>
                        
                        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent hidden"></div>
                        <ul className="space-y-6">
                            <li className="flex gap-4 sm:gap-6 items-center">
                                <span className="w-8 h-8 rounded-full bg-blue-800 text-white font-black flex items-center justify-center shrink-0">1</span>
                                <p className="font-bold text-sm uppercase tracking-wider text-gray-800">Verifica tu identidad y llena tus datos personales.</p>
                            </li>
                            <li className="flex gap-4 sm:gap-6 items-center">
                                <span className="w-8 h-8 rounded-full bg-blue-800 text-white font-black flex items-center justify-center shrink-0">2</span>
                                <p className="font-bold text-sm uppercase tracking-wider text-gray-800">Sube los documentos requeridos (Título, Carnet, etc) y el comprobante de pago inicial.</p>
                            </li>
                            <li className="flex gap-4 sm:gap-6 items-center">
                                <span className="w-8 h-8 rounded-full bg-blue-800 text-white font-black flex items-center justify-center shrink-0">3</span>
                                <p className="font-bold text-sm uppercase tracking-wider text-gray-800">El equipo administrativo revisará tu postulación y documentos.</p>
                            </li>
                            <li className="flex gap-4 sm:gap-6 items-center">
                                <span className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center shrink-0"><CheckCircle className="w-4 h-4" /></span>
                                <p className="font-bold text-sm uppercase tracking-wider text-gray-800">¡Aceptado! Recibirás un correo con tu PIN para acceder al panel de colegiados.</p>
                            </li>
                        </ul>
                    </div>

                    <button 
                        onClick={onStart}
                        className="mt-12 w-full py-4 sm:py-5 md:py-6 bg-blue-800 text-white font-black text-lg sm:text-xl md:text-2xl uppercase tracking-[0.2em] border-2 border-blue-800 hover:bg-white hover:text-blue-800 transition-colors shadow-[8px_8px_0px_0px_rgba(30,58,138,0.9)] hover:shadow-[4px_4px_0px_0px_rgba(30,58,138,0.9)] hover:translate-y-[4px] hover:translate-x-[4px]"
                    >
                        POSTULARME AHORA
                    </button>
                </motion.div>
            </div>
        </div>
    )
}

// ─── MAIN PAGE ────────────────────────────────────────────────
export default function PostularPage() {
    const [isFormVisible, setIsFormVisible] = useState(false);
    
    const [step, setStep] = useState(0);
    const [datos, setDatos] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const handleStep1 = (d) => { setDatos(p => ({ ...p, ...d })); setStep(1); };
    const handleStep2 = (d) => { setDatos(p => ({ ...p, ...d })); setStep(2); };

    const handleStep3 = async ({ documentos, especialidades, comprobante, metodoPago }) => {
        setSubmitting(true);
        setSubmitError('');
        try {
            const formData = new FormData();
            formData.append('carnet_identidad', datos.carnet_identidad);
            formData.append('nombre', datos.nombre);
            formData.append('apellido', datos.apellido);
            formData.append('correo', datos.correo);
            formData.append('telefono', datos.telefono);
            formData.append('especialidades', especialidades || '');
            (documentos || []).forEach(f => formData.append('documentos', f));
            if (comprobante) formData.append('comprobante', comprobante);
            formData.append('metodo_pago', metodoPago);
            
            await crearPostulacion(formData);
            setStep(3); // Go to success step (which is now index 3)
        } catch (err) {
            setSubmitError(err?.response?.data?.error || 'Error al enviar. Inténtalo de nuevo.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="relative font-sans min-h-screen pt-28 sm:pt-32 pb-24 w-full flex flex-col justify-start items-center bg-white overflow-hidden text-black">
            
            {/* Background Grid Lines from Contact/Nosotros */}
            <div className="fixed inset-0 pointer-events-none z-0 flex justify-between px-4 md:px-20">
                <div className="h-full border-l border-dashed border-gray-300 w-1/5"></div>
                <div className="h-full border-l border-dashed border-gray-300 w-1/5"></div>
                <div className="h-full border-l border-dashed border-gray-300 w-1/5"></div>
                <div className="h-full border-l border-dashed border-gray-300 w-1/5"></div>
                <div className="h-full border-l border-dashed border-gray-300 w-1/5 border-r"></div>
            </div>

            {/* Landing Page */}
            {!isFormVisible && (
                <LandingPostulacion onStart={() => setIsFormVisible(true)} />
            )}

            {/* The Formal Form */}
            {isFormVisible && (
                <main className="w-full max-w-xl sm:max-w-2xl mx-auto px-4 sm:px-6 z-10 relative">
                    <div className="flex items-center gap-4 mb-8">
                        <button onClick={() => setIsFormVisible(false)} className="px-4 py-2 bg-white border-2 border-black font-black uppercase tracking-widest text-xs hover:bg-gray-100 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            Volver
                        </button>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-xl mb-12 overflow-hidden">
                        {step < 3 && (
                            <div className="mb-8 border-b border-slate-100 pb-8">
                                <h1 className="text-xl font-bold text-slate-800 mb-6 text-center">
                                    Solicitud de Colegiatura
                                </h1>
                                <StepIndicator current={step} />
                            </div>
                        )}

                        {submitError && step === 2 && (
                            <div className="mb-6 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 font-medium">
                                <AlertCircle className="w-5 h-5 shrink-0" /> {submitError}
                            </div>
                        )}

                        {/* Rendering steps with AnimatePresence for smooth transitions */}
                        <AnimatePresence mode="wait">
                            {step === 0 && <Step1 key="step1" onNext={handleStep1} />}
                            {step === 1 && <Step2 key="step2" onNext={handleStep2} onBack={() => setStep(0)} inicial={{ nombre: datos.nombre, apellido: datos.apellido, correo: datos.correo, telefono: datos.telefono }} />}
                            {step === 2 && <Step3 key="step3" onSubmit={handleStep3} onBack={() => setStep(1)} loading={submitting} />}
                            {step === 3 && <StepExito key="step4" />}
                        </AnimatePresence>
                    </div>

                    <p className="text-center text-xs font-bold uppercase tracking-widest text-gray-400 mt-8">
                        © {new Date().getFullYear()} CDPLP
                    </p>
                </main>
            )}
        </div>
    );
}
