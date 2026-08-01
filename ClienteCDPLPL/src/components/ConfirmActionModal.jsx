import React, { useState, useEffect } from "react";
import { Save, Plus } from "lucide-react";

/**
 * Confirmación simple para acciones no destructivas (crear, modificar, aprobar).
 * Espera `waitSeconds` antes de habilitar el botón de confirmar.
 *
 * CÓMO USAR CORRECTAMENTE:
 *   - El formulario NO debe llamar a la API. Debe entregar sus datos hacia arriba.
 *   - Este modal se abre con esos datos y es su `onConfirm` quien ejecuta la
 *     petición. Así "Cancelar" realmente cancela la operación.
 *
 * Props:
 *   variant      — "create" (emerald + Plus) | "edit" (blue + Save). Define los
 *                  valores por defecto de color, icono y label.
 *   confirmLabel — texto del botón de confirmación (default según variant)
 *   confirmColor — "emerald" | "blue" | "amber" | "red" (default según variant)
 *   confirmIcon  — ReactNode (default según variant)
 */

const colorMap = {
    emerald: { btn: "bg-emerald-500 hover:bg-emerald-600", ring: "bg-emerald-100 text-emerald-600" },
    blue: { btn: "bg-blue-500 hover:bg-blue-600", ring: "bg-blue-100 text-blue-600" },
    amber: { btn: "bg-amber-500 hover:bg-amber-600", ring: "bg-amber-100 text-amber-600" },
    red: { btn: "bg-red-600 hover:bg-red-700", ring: "bg-red-100 text-red-600" },
};

export default function ConfirmActionModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    variant = "edit",
    waitSeconds = 2,
    confirmLabel,
    confirmColor,
    confirmIcon,
}) {
    const [secondsLeft, setSecondsLeft] = useState(waitSeconds);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleConfirm = async () => {
        setIsProcessing(true);
        try {
            await onConfirm();
        } finally {
            setIsProcessing(false);
        }
    };

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
    const DefaultIcon = isCreate ? Plus : Save;

    const resolvedColor = colorMap[confirmColor] || (isCreate ? colorMap.emerald : colorMap.blue);
    const resolvedIcon = confirmIcon || <DefaultIcon className="w-4 h-4" />;
    const resolvedLabel = confirmLabel || (isCreate ? "Crear" : "Guardar cambios");

    const defaultTitle = isCreate ? "Confirmar creación" : "Confirmar modificación";
    const defaultMsg = isCreate
        ? "¿Confirmas que deseas guardar el nuevo registro?"
        : "¿Confirmas que deseas guardar los cambios?";

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${resolvedColor.ring}`}>
                        {confirmIcon
                            ? React.cloneElement(resolvedIcon, { className: "w-8 h-8" })
                            : <DefaultIcon className="w-8 h-8" />}
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
                            disabled={isProcessing}
                            className="flex-1 px-4 py-2 rounded-lg font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={secondsLeft === 0 && !isProcessing ? handleConfirm : undefined}
                            disabled={secondsLeft > 0 || isProcessing}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-white transition-all
                                ${secondsLeft > 0 || isProcessing
                                    ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                    : `${resolvedColor.btn} shadow-md`
                                }`}
                        >
                            {isProcessing ? (
                                <svg className="animate-spin h-5 w-5 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                resolvedIcon
                            )}
                            {secondsLeft > 0 ? `Espera ${secondsLeft}s` : isProcessing ? "Procesando..." : resolvedLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
