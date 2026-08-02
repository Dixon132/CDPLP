import React from "react";
import { X } from "lucide-react";

// `lg` (max-w-4xl) es el tamaño de siempre — el resto de los ~30 usos de
// Modal no pasan `size` y no cambian. `xl` es para contenido que antes vivía
// en una página propia (p. ej. Pagos/Documentos de un colegiado).
const TAMANOS = {
    md: 'max-w-lg',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
};

const Modal = ({ isOpen, onClose, title, children, size = 'lg' }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
            <div className={`relative z-10 bg-white rounded-2xl shadow-2xl border border-slate-100 ${TAMANOS[size] ?? TAMANOS.lg} w-full max-h-[90vh] flex flex-col overflow-hidden`}>
                
                {/* Decorative header accent */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-700 via-slate-500 to-slate-400"></div>

                {/* Header */}
                <div className="bg-white border-b border-slate-100 p-6 flex items-center justify-between shrink-0">
                    <h3 className="text-xl font-bold uppercase tracking-wide text-slate-800">
                        {title}
                    </h3>

                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all duration-200"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 md:p-8 overflow-y-auto bg-slate-50/30">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
