import React, { useState } from 'react';
import { FileBarChart2, ArrowRight } from 'lucide-react';

import Header from '../../components/Header';
import Modal from '../../../../components/Modal';
import { useSession } from '../../../../context/SessionProvider';
import { INFORMES } from './informesConfig';

const Informes = () => {
    const { puedeVer } = useSession();

    const [activeInforme, setActiveInforme] = useState(null);

    const visibles = INFORMES.filter((i) => puedeVer(i.recurso));

    return (
        <div className="space-y-6 p-6 bg-slate-50/50 min-h-full">
            <Header
                title="Informes"
                icon={<FileBarChart2 className="w-8 h-8" />}
                stats={[{ value: visibles.length, label: 'Disponibles para tu rol' }]}
                showSearch={false}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {visibles.map((informe) => (
                    <div
                        key={informe.id}
                        className={`bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all ${informe.featured ? 'lg:col-span-2' : ''}`}
                    >
                        <div>
                            <div className={`inline-flex p-3 rounded-xl text-white ${informe.color} mb-4`}>
                                <informe.icon className="w-6 h-6" />
                            </div>
                            <h3 className="text-base font-bold text-slate-800 mb-2">{informe.titulo}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed mb-6">{informe.descripcion}</p>
                        </div>
                        <button
                            onClick={() => setActiveInforme(informe)}
                            className="inline-flex items-center gap-2 self-start bg-slate-800 hover:bg-slate-900 text-white font-bold uppercase tracking-widest text-[10px] px-4 py-2.5 rounded-xl shadow-sm transition-all"
                        >
                            Generar Informe <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>

            {visibles.length === 0 && (
                <div className="bg-white/80 rounded-3xl border border-slate-200 p-10 text-center text-slate-500">
                    Tu rol no tiene informes disponibles.
                </div>
            )}

            <Modal
                isOpen={!!activeInforme}
                title={activeInforme?.modalTitle}
                onClose={() => setActiveInforme(null)}
            >
                {activeInforme && <activeInforme.Component onClose={() => setActiveInforme(null)} />}
            </Modal>
        </div>
    );
};

export default Informes;
