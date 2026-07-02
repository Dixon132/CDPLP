import React, { useState, useEffect } from "react";
import { CheckCircle, Save, Plus } from "lucide-react";

/**
 * Confirmación simple para CREAR y MODIFICAR.
 * Espera 2s antes de habilitar el botón de confirmar.
 * variant: "create" (verde) | "edit" (azul)
 *
 * CÓMO USAR CORRECTAMENTE:
 *   - Abre este modal ANTES de abrir el form.
 *   - Al confirmar, entonces abre el modal del form.
 *   - Al cancelar, no pasa nada.
 */
export default function ConfirmActionModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    variant = "edit",
    waitSeconds = 2,
}) {
    const [secondsLeft, setSecondsLeft] = useState(waitSeconds);

    useEffect(() => {
        if (!isOpen) return;
        setSecondsLeft(waitSeconds);
        const timer = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) { clearInterval(timer); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isOpen, waitSeconds]);

    if (!isOpen) return null;

    const isCreate = variant === "create";
    const colorBg = isCreate ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600";
    const colorBtn = isCreate ? "bg-emerald-500 hover:bg-emerald-600" : "bg-blue-500 hover:bg-blue-600";
    const Icon = isCreate ? Plus : Save;
    const defaultTitle = isCreate ? "Confirmar creación" : "Confirmar modificación";
    const defaultMsg = isCreate
        ? "¿Confirmas que deseas guardar el nuevo registro?"
        : "¿Confirmas que deseas guardar los cambios?";
    const btnLabel = isCreate ? "Crear" : "Guardar cambios";

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${colorBg}`}>
                        <Icon className="w-8 h-8" />
                    </div>

                    <h4 className="text-lg font-bold text-slate-800">
                        {title || defaultTitle}
                    </h4>

                    <p className="text-slate-600 text-sm max-w-sm">
                        {message || defaultMsg}
                    </p>

                    <div className="flex items-center gap-3 w-full mt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 rounded-lg font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={secondsLeft === 0 ? onConfirm : undefined}
                            disabled={secondsLeft > 0}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-white transition-all
                                ${secondsLeft > 0
                                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                    : `${colorBtn} shadow-md`
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {secondsLeft > 0 ? `Espera ${secondsLeft}s` : btnLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
