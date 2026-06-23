import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BookOpen, FileText, Download, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

const MemoriasBalances = () => {
    const [memorias, setMemorias] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMemorias = async () => {
            try {
                const res = await axios.get('/api/memorias');
                setMemorias(res.data);
            } catch (error) {
                console.error('Error al cargar memorias:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchMemorias();
    }, []);

    // Agrupar por categoría
    const agrupar = memorias.reduce((acc, curr) => {
        const cat = curr.categoria || 'Otros';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(curr);
        return acc;
    }, {});

    const supabaseUrl = "https://rykgmqdmtixglxzfjamf.supabase.co/storage/v1/object/public/documentos/"; // Mismo bucket usado por subirArchivo

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pt-24 pb-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="text-center mb-16">
                    <motion.h1 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-5xl font-bold text-slate-900 mb-4"
                    >
                        Repositorio Institucional
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-slate-600 max-w-2xl mx-auto"
                    >
                        Accede a nuestras memorias anuales, balances financieros y otros documentos públicos de la institución.
                    </motion.p>
                </div>

                {/* Secciones por categoría */}
                {Object.keys(agrupar).length === 0 ? (
                    <div className="text-center text-slate-500 py-12">
                        No hay documentos disponibles en este momento.
                    </div>
                ) : (
                    <div className="space-y-16">
                        {Object.entries(agrupar).map(([categoria, items], idx) => (
                            <motion.div 
                                key={categoria}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * idx }}
                            >
                                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-200">
                                    {categoria.toLowerCase().includes('balance') ? (
                                        <FileText className="w-8 h-8 text-emerald-600" />
                                    ) : (
                                        <BookOpen className="w-8 h-8 text-blue-600" />
                                    )}
                                    <h2 className="text-3xl font-bold text-slate-800">{categoria}</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {items.map((doc) => (
                                        <div 
                                            key={doc.id} 
                                            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group"
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="bg-slate-100 p-3 rounded-lg text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                    {categoria.toLowerCase().includes('balance') ? <FileText size={24} /> : <BookOpen size={24} />}
                                                </div>
                                                {doc.anio && (
                                                    <span className="flex items-center gap-1 text-sm font-medium text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                                                        <Calendar size={14} />
                                                        {doc.anio}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2">
                                                {doc.titulo}
                                            </h3>
                                            
                                            <p className="text-slate-600 text-sm mb-6 line-clamp-3">
                                                {doc.descripcion || "Sin descripción disponible."}
                                            </p>

                                            <div className="mt-auto pt-4 border-t border-slate-100">
                                                <a 
                                                    href={`${supabaseUrl}${doc.archivo}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-blue-600 text-white py-2.5 px-4 rounded-xl transition-colors font-medium text-sm"
                                                >
                                                    <Download size={16} />
                                                    Descargar PDF
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MemoriasBalances;
