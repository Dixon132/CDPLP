import { CheckCircle, AlertCircle, AlertTriangle, X } from "lucide-react";

const Alerts = ({ type = "success", message, onClose, show }) => {
    if (!show) return null;

    const styles = {
        success: {
            bg: "bg-green-100/80 backdrop-blur-md border-green-300 text-green-800 shadow-green-300/30",
            icon: <CheckCircle className="w-5 h-5 text-green-600" />,
            title: "Éxito"
        },
        error: {
            bg: "bg-red-100/80 backdrop-blur-md border-red-300 text-red-800 shadow-red-300/30",
            icon: <AlertCircle className="w-5 h-5 text-red-600" />,
            title: "Error"
        },
        warning: {
            bg: "bg-yellow-100/80 backdrop-blur-md border-yellow-300 text-yellow-800 shadow-yellow-300/30",
            icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
            title: "Advertencia"
        }
    };

    const { bg, icon, title } = styles[type] || styles.success;

    return (
        <div
            className={`
                fixed top-5 right-5 z-50 px-5 py-4 border rounded-2xl shadow-lg 
                flex items-start gap-3 animate-fade-in-up transition-all duration-300
                ${bg}
            `}
            role="alert"
        >
            {/* Icono */}
            <div className="mt-0.5">
                {icon}
            </div>

            {/* Contenido */}
            <div className="flex flex-col">
                <span className="font-bold">{title}</span>
                <span className="text-sm">{message}</span>
            </div>

            {/* Botón cerrar */}
            {onClose && (
                <button
                    onClick={onClose}
                    className="ml-auto text-lg hover:text-gray-700 transition"
                >
                    <X className="w-5 h-5" />
                </button>
            )}
        </div>
    );
};

export default Alerts;
