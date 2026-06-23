import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "./ui/Button";

export default function ConfirmDeleteModal({ isOpen, onClose, onConfirm, title, message }) {
    const [secondsLeft, setSecondsLeft] = useState(3);

    useEffect(() => {
        if (isOpen) {
            setSecondsLeft(3);
            const timer = setInterval(() => {
                setSecondsLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title || "Confirmar Eliminación"}>
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
                        onClick={onClose}
                        className="w-full max-w-[140px]"
                    >
                        Cancelar
                    </Button>
                    <button
                        onClick={onConfirm}
                        disabled={secondsLeft > 0}
                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold transition-all w-full max-w-[140px]
                            ${secondsLeft > 0 
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                                : 'bg-rose-500 text-white hover:bg-rose-600 shadow-md hover:shadow-lg'}`}
                    >
                        <Trash2 className="w-4 h-4" />
                        {secondsLeft > 0 ? `Eliminar (${secondsLeft}s)` : "Eliminar"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
