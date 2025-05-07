import React from 'react';

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 ">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative">
                <h2 className="text-lg font-semibold mb-4">{title}</h2>
                <button
                    className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
                    onClick={onClose}
                >
                    ✕
                </button>
                <div>{children}</div>
            </div>
        </div>
    );
};

export default Modal;
