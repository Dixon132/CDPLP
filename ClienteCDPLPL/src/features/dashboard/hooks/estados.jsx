import { CheckCircle, XCircle, Clock, PartyPopper, Heart, Users, Activity, Star } from 'lucide-react';
export const getEstadoIcon = (estado) => {
    switch (estado) {
        case "ACTIVO": return <CheckCircle className="w-4 h-4 text-green-500" />;
        case "INACTIVO": return <XCircle className="w-4 h-4 text-red-500" />;
        case "PENDIENTE": return <Clock className="w-4 h-4 text-yellow-500" />;
        default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
};

export const getEstadoBadge = (estado) => {
    const base = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium";
    switch (estado) {
        case "ACTIVO": return `${base} bg-green-100 text-green-800 border border-green-200`;
        case "INACTIVO": return `${base} bg-red-100 text-red-800 border border-red-200`;
        case "PENDIENTE": return `${base} bg-yellow-100 text-yellow-800 border border-yellow-200`;
        default: return `${base} bg-gray-100 text-gray-800 border border-gray-200`;
    }
};

export const getTipoIcon = (tipo) => {
    switch (tipo?.toLowerCase()) {
        case "cultural":
            return <Star className="w-4 h-4 text-pink-500" />;
        case "deportiva":
            return <Activity className="w-4 h-4 text-blue-500" />;
        case "social":
            return <Users className="w-4 h-4 text-green-500" />;
        case "benefica":
            return <Heart className="w-4 h-4 text-red-500" />;
        default:
            return <PartyPopper className="w-4 h-4 text-purple-500" />;
    }
};