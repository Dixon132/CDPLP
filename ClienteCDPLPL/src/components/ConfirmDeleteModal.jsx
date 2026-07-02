import React, { useState, useEffect, useRef } from "react";
import Modal from "./Modal";
import { Trash2, AlertTriangle, AlertCircle } from "lucide-react";
import { Button } from "./ui/Button";

/**
 * Doble confirmación para eliminar / desactivar / activar.
 *
 * Paso 1: overlay amber — botón habilitado tras 2s. El usuario confirma que
 *         quiere continuar. Solo entonces aparece el paso 2.
 * Paso 2: modal con color configurable — botón habilitado tras waitSeconds.
 *         Acción definitiva.
 *
 * Props:
 *   confirmLabel   — texto del botón de confirmación (default "Eliminar")
 *   confirmColor   — "red" | "amber" | "emerald" (default "red")
 *   confirmIcon    — ReactNode (default <Trash2/>)
 *   title          — título del modal paso 2 (auto-derivado de confirmColor si se omite)
 */

const colorMap = {
    red: "bg-red-600 hover:bg-red-700 text-white",
    amber: "bg-amber-500 hover:bg-amber-600 text-white",
    emerald: "bg-emerald-600 hover:bg-emerald-700 text-white",
};

const defaultTitles = {
    red: "Confirmar eliminación",
    amber: "Desactivar",
    emerald: "Activar",
};

export default function ConfirmDeleteModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    waitSeconds = 4,
    confirmLabel = "Eliminar",
    confirmColor = "red",
    confirmIcon = <Trash2 className="w-4 h-4" />,
}) {
    const [step, setStep] = useState(1);
    const [countdown1, setCountdown1] = useState(2);
    const [ready1, setReady1] = useState(false);
    const [countdown2, setCountdown2] = useState(waitSeconds);
    const timer1Ref = useRef(null);
    const timer2Ref = useRef(null);

    // Reset completo al abrir
    useEffect(() => {
        if (isOpen) {
            clearInterval(timer1Ref.current);
            clearInterval(timer2Ref.current);
            setStep(1);
            setCountdown1(2);
            setReady1(false);
            setCountdown2(waitSeconds);
        } else {
            clearInterval(timer1Ref.current);
            clearInterval(timer2Ref.current);
        }
    }, [isOpen, waitSeconds]);

    // Countdown paso 1 — solo cuando isOpen y step === 1
    useEffect(() => {
        if (!isOpen || step !== 1) return;
        setCountdown1(2);
        setReady1(false);
        timer1Ref.current = setInterval(() => {
            setCountdown1((prev) => {
                if (prev <= 1) {
                    clearInterval(timer1Ref.current);
                    setReady1(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer1Ref.current);
    }, [isOpen, step]);

    // Countdown paso 2 — solo cuando isOpen y step === 2
    useEffect(() => {
        if (!isOpen || step !== 2) return;
        setCountdown2(waitSeconds);
        timer2Ref.current = setInterval(() => {
            setCountdown2((prev) => {
                if (prev <= 1) { clearInterval(timer2Ref.current); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer2Ref.current);
    }, [isOpen, step, waitSeconds]);

    const handleClose = () => {
        clearInterval(timer1Ref.current);
        clearInterval(timer2Ref.current);
        setStep(1);
        onClose();
    };

    const irAlPaso2 = () => {
        clearInterval(timer1Ref.current);
        setStep(2);
    };

    if (!isOpen) return null;

    const resolvedTitle = title || defaultTitles[confirmColor] || "Confirmar acción";
    const btnActiveClasses = colorMap[confirmColor] || colorMap.red;

    // ── Paso 1 ─────────────────────────────────────────────────────────────
    if (step === 1) {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-amber-100 rounded-full">
                            <AlertCircle className="w-6 h-6 text-amber-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Confirmar acción</h3>
                    </div>

                    <p className="text-slate-600 mb-6">
                        Esta operación es <strong>irreversible</strong>. ¿Deseas continuar?
                    </p>

                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={ready1 ? irAlPaso2 : undefined}
                            disabled={!ready1}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${ready1
                                ? "bg-amber-500 text-white hover:bg-amber-600 cursor-pointer"
                                : "bg-gray-200 text-gray-500 cursor-not-allowed"
                                }`}
                        >
                            {ready1 ? "Continuar" : `Espera ${countdown1}s`}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Paso 2 ─────────────────────────────────────────────────────────────
    return (
        <Modal isOpen={true} onClose={handleClose} title={resolvedTitle}>
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-2">
                    <AlertTriangle className="w-8 h-8" />
                </div>

                <h4 className="text-lg font-bold text-slate-800">
                    ¿Estás completamente seguro?
                </h4>

                <p className="text-slate-600 text-sm max-w-md">
                    {message || "Esta acción no se puede deshacer. Los datos serán eliminados permanentemente del sistema."}
                </p>

                <div className="flex items-center gap-4 mt-8 w-full justify-center">
                    <Button
                        variant="secondary"
                        onClick={handleClose}
                        className="w-full max-w-[140px]"
                    >
                        Cancelar
                    </Button>
                    <button
                        onClick={countdown2 === 0 ? onConfirm : undefined}
                        disabled={countdown2 > 0}
                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold transition-all w-full max-w-[140px]
                            ${countdown2 > 0
                                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                : `${btnActiveClasses} shadow-md hover:shadow-lg`
                            }`}
                    >
                        {confirmIcon}
                        {countdown2 > 0 ? `${confirmLabel} (${countdown2}s)` : confirmLabel}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
