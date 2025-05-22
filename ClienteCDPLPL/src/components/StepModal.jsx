import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const StepModal = ({ isOpen, onClose, title, steps, handleSubmit, onSubmit, trigger, validationFields }) => {
    const [stepIndex, setStepIndex] = useState(0);
    const isLastStep = stepIndex === steps.length - 1;

    // Ajusta el índice si cambia el número de pasos dinámicamente
    useEffect(() => {
        if (stepIndex >= steps.length) {
            setStepIndex(steps.length - 1);
        }
    }, [steps.length, stepIndex]);

    const next = async () => {
        if (trigger && validationFields) {
            const fields = validationFields[stepIndex];
            const valid = await trigger(fields);
            if (!valid) return;
        }
        if (!isLastStep) setStepIndex(i => i + 1);
    };

    const prev = () => {
        if (stepIndex > 0) setStepIndex(i => i - 1);
    };

    if (!isOpen) return null;
    console.log(stepIndex)
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 relative overflow-hidden">
                <h2 className="text-lg font-semibold mb-4">{title}</h2>
                <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-red-500">✕</button>

                <form onSubmit={handleSubmit(onSubmit)}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={stepIndex}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.3 }}
                        >
                            {steps[stepIndex]}
                        </motion.div>
                    </AnimatePresence>

                    <div className="flex justify-between mt-6">
                        <button
                            type="button"
                            onClick={prev}
                            disabled={stepIndex === 0}
                            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                        >
                            Anterior
                        </button>

                        {isLastStep ? (
                            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">
                                Enviar
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={next}
                                className="px-4 py-2 bg-blue-500 text-white rounded"
                            >
                                Siguiente
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StepModal;