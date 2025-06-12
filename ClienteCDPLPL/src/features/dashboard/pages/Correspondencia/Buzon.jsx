import React, { useEffect, useState } from "react";
import { Search, Mail, MailOpen, Clock, User, Send, Filter, ChevronRight } from "lucide-react";
import { getAllBuzon } from "../../services/correspondencia";

// Componente de búsqueda
const InputSearch = ({ onChange, value }) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
    <input
      type="text"
      placeholder="Buscar en correspondencia..."
      onChange={onChange}
      value={value}
      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
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
        { label: "TODOS", icon: Mail, color: "gray" },
        { label: "A REVISAR", icon: Mail, color: "red" },
        { label: "PENDIENTE", icon: Clock, color: "yellow" },
        { label: "A DISCUCION", icon: Send, color: "blue" },
        { label: "ARREGLADO", icon: MailOpen, color: "green" }
    ];

    const getStatusColor = (estado) => {
        switch (estado) {
            case 'A REVISAR': return 'bg-red-50 text-red-700 border-red-200';
            case 'PENDIENTE': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            case 'A DISCUCION': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'ARREGLADO': return 'bg-green-50 text-green-700 border-green-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <Mail className="w-6 h-6 text-white" />
                        </div>
                        Buzón de Correspondencia
                    </h1>
                    
                </div>

                {/* Filtros */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Filtrar por estado:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {estados.map((estado) => {
                            const IconComponent = estado.icon;
                            return (
                                <button
                                    key={estado.label}
                                    onClick={() => setFilter(estado.label)}
                                    className={`
                                        px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95 transform
                                        ${filter === estado.label
                                            ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25"
                                            : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300"
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

                {/* Buscador */}
                <div className="mb-8">
                    <InputSearch onChange={(e) => setSearch(e.target.value)} value={search} />
                </div>

                {/* Contenido */}
                {loading ? (
                    <div className="flex items-center justify-center p-12">
                        <div className="flex items-center gap-3 text-gray-500">
                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-lg">Cargando correspondencia...</span>
                        </div>
                    </div>
                ) : data.length === 0 ? (
                    <div className="text-center p-12">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Mail className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay correspondencia</h3>
                        <p className="text-gray-500">No se encontraron elementos que coincidan con tu búsqueda</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {data.map((item, index) => {
                            const isReviewed = item.fecha_recibido !== null;
                            return (
                                <div
                                    key={item.id_correspondencia}
                                    className={`
                                        group relative bg-white rounded-2xl shadow-sm border border-gray-200 
                                        hover:shadow-xl hover:border-blue-200 transition-all duration-300 hover:-translate-y-1
                                        ${isReviewed ? 'opacity-90' : ''}
                                    `}
                                    style={{
                                        animationDelay: `${index * 100}ms`,
                                        animation: 'fadeInUp 0.6s ease-out forwards'
                                    }}
                                >
                                    <div className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                {/* Header */}
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isReviewed ? 'bg-gray-100' : 'bg-blue-100'}`}>
                                                        {isReviewed ? 
                                                            <MailOpen className="w-5 h-5 text-gray-600" /> : 
                                                            <Mail className="w-5 h-5 text-blue-600" />
                                                        }
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className={`text-lg font-semibold mb-1 line-clamp-2 ${isReviewed ? 'text-gray-700' : 'text-gray-900'}`}>
                                                            {item.asunto}
                                                        </h3>
                                                        <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                                                            <div className="flex items-center gap-1">
                                                                <User className="w-4 h-4" />
                                                                <span>De: <strong>{item.remitente}</strong></span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Send className="w-4 h-4" />
                                                                <span>Para: <strong>{item.destinatario?.nombre} {item.destinatario?.apellido}</strong></span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Footer */}
                                                <div className="flex items-center justify-between flex-wrap gap-3">
                                                    <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
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
                                                            <div className="flex items-center gap-1 text-orange-600">
                                                                <Mail className="w-4 h-4" />
                                                                <span className="font-medium">No visto</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-3">
                                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(item.estado)}`}>
                                                            {item.estado}
                                                        </span>
                                                        
                                                        <button
                                                            onClick={() => window.location.href = `/dashboard/buzon/${item.id_correspondencia}`}
                                                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium text-sm hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg shadow-blue-500/25 hover:scale-105 active:scale-95 transform"
                                                        >
                                                            {isReviewed ? 'Ver detalles' : 'Revisar'}
                                                            <ChevronRight className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Indicator de no leído */}
                                    {!isReviewed && (
                                        <div className="absolute left-0 top-6 w-1 h-12 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-r-full"></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .line-clamp-2 {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
            `}</style>
        </div>
    );
}