import React, { useEffect, useState } from "react";
import { Search, Mail, MailOpen, Clock, User, Send, Filter, ChevronRight } from "lucide-react";
import { getAllBuzon } from "../../services/correspondencia";
import { Link } from "react-router-dom";
import Header from "../../components/Header";

// Componente de búsqueda
const InputSearch = ({ onChange, value }) => (
    <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
            type="text"
            placeholder="Buscar en correspondencia..."
            onChange={onChange}
            value={value}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring focus:ring-indigo-200 transition-all duration-200 shadow-sm text-slate-700"
        />
    </div>
);


export default function BuzonCorrespondencia() {
    const [filter, setFilter] = useState("A REVISAR");
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    const fetchData = async () => {
        setLoading(true);
        const params = {
            estado: filter !== "TODOS" ? filter : undefined,
            limit: 50,
            page: 1,
            search: search
        };
        const res = await getAllBuzon(params);
        setData(res.data);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [filter, search]);

    const estados = [
        { label: "TODOS", icon: Mail, color: "slate" },
        { label: "A REVISAR", icon: Mail, color: "rose" },
        { label: "PENDIENTE", icon: Clock, color: "amber" },
        { label: "A DISCUSIÓN", icon: Send, color: "indigo" },
        { label: "ARREGLADO", icon: MailOpen, color: "emerald" }
    ];

    const getStatusColor = (estado) => {
        switch (estado) {
            case 'A REVISAR': return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'PENDIENTE': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'A DISCUSIÓN': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
            case 'ARREGLADO': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            default: return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="space-y-6 p-6 min-h-screen bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-blue-50/40">
            {/* Header Reutilizable */}
            <Header
                title="Buzón de Correspondencia"
                icon={<Mail className="w-8 h-8" />}
            />

            {/* Buscador y Filtros */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
                <div className="w-full md:w-1/3">
                    <InputSearch onChange={(e) => setSearch(e.target.value)} value={search} />
                </div>
                
                <div className="flex flex-wrap gap-2 w-full md:w-2/3">
                    {estados.map((estado) => {
                        const IconComponent = estado.icon;
                        const isSelected = filter === estado.label;
                        return (
                            <button
                                key={estado.label}
                                onClick={() => setFilter(estado.label)}
                                className={`
                                    px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition-all duration-200
                                    ${isSelected
                                        ? "bg-slate-800 text-white shadow-sm"
                                        : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                                    }
                                `}
                            >
                                <IconComponent className="w-4 h-4" />
                                {estado.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Contenido */}
            {loading ? (
                <div className="flex items-center justify-center p-12">
                    <div className="flex items-center gap-3 text-slate-500">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-lg">Cargando correspondencia...</span>
                    </div>
                </div>
            ) : data.length === 0 ? (
                <div className="text-center p-12 bg-white/80 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <Mail className="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">No hay correspondencia</h3>
                    <p className="text-slate-500">No se encontraron elementos que coincidan con tu búsqueda</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {data.map((item, index) => {
                        const isReviewed = item.fecha_recibido !== null;
                        return (
                            <div
                                key={item.id_correspondencia}
                                className={`
                                    group relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200 
                                    hover:shadow-md hover:border-slate-300 transition-all duration-300
                                    ${isReviewed ? 'opacity-90' : ''}
                                `}
                            >
                                <div className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            {/* Header */}
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isReviewed ? 'bg-slate-100' : 'bg-indigo-50'}`}>
                                                    {isReviewed ?
                                                        <MailOpen className="w-5 h-5 text-slate-500" /> :
                                                        <Mail className="w-5 h-5 text-indigo-600" />
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className={`text-lg font-semibold mb-1 line-clamp-2 ${isReviewed ? 'text-slate-600' : 'text-slate-800'}`}>
                                                        {item.asunto}
                                                    </h3>
                                                    <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                                                        <div className="flex items-center gap-1">
                                                            <User className="w-4 h-4" />
                                                            <span>De: <strong className="text-slate-700">{item.remitente}</strong></span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Send className="w-4 h-4" />
                                                            <span>Para: <strong className="text-slate-700">{item.destinatario?.nombre} {item.destinatario?.apellido}</strong></span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Footer */}
                                            <div className="flex items-center justify-between flex-wrap gap-3 mt-4">
                                                <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4" />
                                                        <span>Envío: {new Date(item.fecha_envio).toLocaleDateString()}</span>
                                                    </div>
                                                    {isReviewed ? (
                                                        <div className="flex items-center gap-1">
                                                            <MailOpen className="w-4 h-4" />
                                                            <span>Visto: {new Date(item.fecha_recibido).toLocaleDateString()}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1 text-rose-500">
                                                            <Mail className="w-4 h-4" />
                                                            <span className="font-medium">No visto</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(item.estado)}`}>
                                                        {item.estado}
                                                    </span>

                                                    <Link to={`/dashboard/buzon/${item.id_correspondencia}`}>
                                                        <button
                                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 ${
                                                                isReviewed 
                                                                    ? "bg-slate-100 text-slate-600 hover:bg-slate-200" 
                                                                    : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                                                            }`}
                                                        >
                                                            {isReviewed ? 'Ver detalles' : 'Revisar'}
                                                            <ChevronRight className="w-4 h-4" />
                                                        </button>
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Indicator de no leído */}
                                {!isReviewed && (
                                    <div className="absolute left-0 top-6 w-1 h-12 bg-indigo-500 rounded-r-full"></div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}