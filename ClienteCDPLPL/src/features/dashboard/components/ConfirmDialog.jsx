// src/components/ConfirmDialog.jsx

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";

const ConfirmDialog = ({
    isOpen,
    message = "¿Estás seguro de que deseas realizar esta acción?",
    onConfirm,
    onClose,
    confirmText = "Eliminar",
}) => {
    const [countdown, setCountdown] = useState(5);
    const [canConfirm, setCanConfirm] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setCountdown(2);
            setCanConfirm(false);

            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setCanConfirm(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                {/* Icono y mensaje */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-red-100 rounded-full">
                        <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">
                        Confirmar acción
                    </h3>
                </div>

                <p className="text-slate-600 mb-6">{message}</p>

                {/* Botones */}
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors duration-150"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={canConfirm ? onConfirm : null}
                        disabled={!canConfirm}
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-150 ${canConfirm
                            ? "bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                            : "bg-gray-300 text-gray-600 cursor-not-allowed"
                            }`}
                    >
                        {canConfirm ? confirmText : `Espera ${countdown}s`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
