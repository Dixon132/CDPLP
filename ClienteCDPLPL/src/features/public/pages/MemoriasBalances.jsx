import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BookOpen, FileText, Download, Calendar, ChevronDown, ChevronRight, Eye, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const supabaseUrl = "https://rykgmqdmtixglxzfjamf.supabase.co/storage/v1/object/public/documentos/"; 

function AccordionAnio({ anio, categorias, openInit, onOpenDoc, docSeleccionado }) {
    const [isOpen, setIsOpen] = useState(openInit);
    const totalDocs = Object.values(categorias).flat().length;

    return (
        <div className="bg-white border border-slate-200 transition-all mb-4 overflow-hidden group hover:border-blue-300 hover:shadow-md">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 sm:p-5 bg-white hover:bg-blue-50/30 transition-colors text-left"
            >
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-800 to-blue-900 text-white flex items-center justify-center shrink-0">
                        <div className="text-center">
                            <Calendar className="w-4 h-4 mx-auto mb-0.5 opacity-70" />
                            <span className="text-xs font-black">{anio}</span>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-slate-800">Gestión {anio}</h2>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                            {totalDocs} {totalDocs === 1 ? 'documento' : 'documentos'} disponibles
                        </p>
                    </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-700' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 sm:px-5 pb-5 space-y-6">
                            {Object.entries(categorias).map(([categoria, docs]) => (
                                <div key={categoria}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                            {categoria}
                                        </h3>
                                        <div className="h-px flex-1 bg-slate-100"></div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        {docs.map(doc => {
                                            const isActive = docSeleccionado?.id === doc.id;
                                            return (
                                                <div 
                                                    key={doc.id}
                                                    className={`group/item flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-l-[3px]
                                                        ${isActive 
                                                            ? 'border-l-blue-700 bg-blue-50 text-blue-900' 
                                                            : 'border-l-transparent hover:border-l-amber-400 hover:bg-slate-50 text-slate-700'
                                                        }`}
                                                    onClick={() => onOpenDoc(doc)}
                                                >
                                                    <FileText className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-700' : 'text-slate-400 group-hover/item:text-amber-500'}`} />
                                                    <span className="text-sm font-medium leading-tight flex-1">
                                                        {doc.titulo}
                                                    </span>
                                                    <ChevronRight className={`w-4 h-4 shrink-0 transition-all ${isActive ? 'text-blue-700 opacity-100' : 'text-slate-300 opacity-0 group-hover/item:opacity-100'}`} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

const MemoriasBalances = () => {
    const [memorias, setMemorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [docPreview, setDocPreview] = useState(null);

    useEffect(() => {
        const fetchMemorias = async () => {
            try {
                const res = await axios.get('/api/memorias');
                setMemorias(res.data);
                
                if (res.data.length > 0) {
                    const latestYear = res.data.reduce((latest, current) => {
                        const currentAnio = current.anio || '0';
                        return currentAnio > latest ? currentAnio : latest;
                    }, '0');
                    const docsOfLatestYear = res.data.filter(d => (d.anio || '0') === latestYear);
                    if (docsOfLatestYear.length > 0) {
                        setDocPreview(docsOfLatestYear[0]);
                    }
                }
            } catch (error) {
                console.error('Error al cargar memorias:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchMemorias();
    }, []);

    const agruparPorAnio = memorias.reduce((acc, curr) => {
        const anio = curr.anio || 'Sin Año';
        const cat = curr.categoria || 'Otros';
        
        if (!acc[anio]) acc[anio] = {};
        if (!acc[anio][cat]) acc[anio][cat] = [];
        
        acc[anio][cat].push(curr);
        return acc;
    }, {});

    const aniosOrdenados = Object.keys(agruparPorAnio).sort((a, b) => {
        if (a === 'Sin Año') return 1;
        if (b === 'Sin Año') return -1;
        return b - a;
    });

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-blue-700"></div>
                    <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Cargando repositorio...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-slate-50 pt-28 sm:pt-32 pb-24 font-sans text-black overflow-hidden">
            {/* Background Grid Lines */}
            <div className="fixed inset-0 pointer-events-none z-0 flex justify-between px-4 md:px-20">
                <div className="h-full border-l border-dashed border-gray-200 w-1/5"></div>
                <div className="h-full border-l border-dashed border-gray-200 w-1/5"></div>
                <div className="h-full border-l border-dashed border-gray-200 w-1/5"></div>
                <div className="h-full border-l border-dashed border-gray-200 w-1/5"></div>
                <div className="h-full border-l border-dashed border-gray-200 w-1/5 border-r"></div>
            </div>

            {/* Top accent line */}
            <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-800 via-amber-500 to-blue-800 z-50"></div>

            <div className="relative z-10 w-full px-4 sm:px-6 md:px-8 lg:px-12 mx-auto max-w-[1500px]">
                
                {/* Header — Museum/Archive style */}
                <div className="mb-12 md:mb-16">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 border-2 border-blue-800 flex items-center justify-center bg-white">
                            <BookOpen className="w-5 h-5 text-blue-800" />
                        </div>
                        <div className="h-px flex-1 bg-gradient-to-r from-blue-800 to-transparent"></div>
                    </div>

                    <motion.h1 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight text-slate-900 mb-3"
                    >
                        Repositorio Institucional
                    </motion.h1>
                    <div className="w-16 h-1 bg-amber-500 mb-5"></div>
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-base sm:text-lg text-slate-600 font-medium max-w-2xl"
                    >
                        Memorias anuales, balances financieros y documentos públicos oficiales del Colegio Departamental de Psicólogos de La Paz.
                    </motion.p>
                </div>

                {/* Content */}
                {aniosOrdenados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-xl p-16 text-center shadow-sm">
                        <BookOpen className="w-16 h-16 text-slate-200 mb-6" />
                        <h3 className="text-xl font-bold text-slate-600 mb-2">Sin documentos disponibles</h3>
                        <p className="text-slate-500 font-medium text-sm">Actualmente no hay documentos en el repositorio.</p>
                    </div>
                ) : (
                    <div className="flex flex-col md:flex-row gap-6 lg:gap-10 items-start">
                        
                        {/* Left Side: Index/Accordions */}
                        <div className="w-full md:w-[42%] lg:w-[38%] shrink-0">
                            {/* Section label */}
                            <div className="flex items-center gap-2 mb-5">
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-800 bg-blue-50 px-3 py-1.5 border border-blue-100">
                                    Índice
                                </span>
                                <div className="h-px flex-1 bg-slate-200"></div>
                                <span className="text-[10px] font-medium text-slate-400">
                                    {memorias.length} docs
                                </span>
                            </div>
                            
                            {aniosOrdenados.map((anio, idx) => (
                                <AccordionAnio 
                                    key={anio} 
                                    anio={anio} 
                                    categorias={agruparPorAnio[anio]} 
                                    openInit={idx === 0} 
                                    onOpenDoc={setDocPreview}
                                    docSeleccionado={docPreview}
                                />
                            ))}
                        </div>

                        {/* Right Side: Preview — Museum exhibit style */}
                        <div className="w-full md:w-[58%] lg:w-[62%] sticky top-[90px] hidden md:block">
                            {docPreview ? (
                                <div className="bg-white border border-slate-200 shadow-lg flex flex-col h-[78vh] overflow-hidden">
                                    {/* Preview header bar */}
                                    <div className="px-6 py-4 border-b border-slate-100 bg-white shrink-0">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white bg-blue-800 px-2 py-0.5">
                                                        {docPreview.categoria}
                                                    </span>
                                                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-800 bg-blue-50 px-2 py-0.5 border border-blue-100">
                                                        {docPreview.anio}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg lg:text-xl font-bold text-slate-900 leading-tight line-clamp-2">
                                                    {docPreview.titulo}
                                                </h3>
                                            </div>
                                            <a 
                                                href={`${supabaseUrl}${docPreview.archivo}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="shrink-0 flex items-center gap-2 bg-blue-800 hover:bg-blue-900 text-white px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors"
                                            >
                                                <Download className="w-4 h-4" />
                                                <span className="hidden lg:inline">Descargar</span>
                                            </a>
                                        </div>
                                        {docPreview.descripcion && (
                                            <p className="text-sm text-slate-500 mt-3 leading-relaxed border-t border-slate-100 pt-3">
                                                {docPreview.descripcion}
                                            </p>
                                        )}
                                    </div>

                                    {/* Document viewer */}
                                    <div className="flex-1 bg-slate-100 relative">
                                        <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-medium text-sm z-0">
                                            Cargando vista previa...
                                        </div>
                                        <iframe 
                                            src={`${supabaseUrl}${docPreview.archivo}#toolbar=0&navpanes=0`}
                                            className="w-full h-full relative z-10"
                                            title={`Vista previa de ${docPreview.titulo}`}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white border border-slate-200 shadow-sm h-[78vh] flex flex-col items-center justify-center text-center p-12">
                                    <div className="w-20 h-20 bg-slate-50 border border-slate-200 flex items-center justify-center mb-6">
                                        <Eye className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <p className="text-lg font-bold text-slate-400 mb-2">
                                        Vista previa del documento
                                    </p>
                                    <p className="text-sm text-slate-400">
                                        Selecciona un documento del índice para visualizarlo aquí.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Mobile Preview */}
                        <div className="w-full md:hidden">
                            {docPreview && (
                                <div className="bg-white border border-slate-200 shadow-sm flex flex-col mt-2 mb-12 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-slate-100">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white bg-blue-800 px-2 py-0.5">
                                                {docPreview.categoria}
                                            </span>
                                            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-blue-800 bg-blue-50 px-1.5 py-0.5 border border-blue-100">
                                                {docPreview.anio}
                                            </span>
                                        </div>
                                        <h3 className="text-base font-bold text-slate-900 leading-tight">
                                            {docPreview.titulo}
                                        </h3>
                                    </div>

                                    <div className="h-[350px] sm:h-[400px] bg-slate-100 relative">
                                        <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-medium text-xs z-0 text-center px-4">
                                            Cargando vista previa...
                                        </div>
                                        <iframe 
                                            src={`${supabaseUrl}${docPreview.archivo}#toolbar=0&navpanes=0`}
                                            className="w-full h-full relative z-10"
                                            title={`Vista previa de ${docPreview.titulo}`}
                                        />
                                    </div>

                                    <a 
                                        href={`${supabaseUrl}${docPreview.archivo}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 bg-blue-800 hover:bg-blue-900 text-white px-4 py-3 text-sm font-bold uppercase tracking-widest transition-colors"
                                    >
                                        <Download className="w-5 h-5" />
                                        Descargar
                                    </a>
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};

export default MemoriasBalances;
