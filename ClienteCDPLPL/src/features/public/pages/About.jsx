import { Shield, Heart, Award, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function About() {
    return (
        <div className="relative w-full min-h-screen bg-white text-black font-sans pb-20">
            {/* Background Grid Lines */}
            <div className="absolute inset-0 pointer-events-none z-0 flex justify-between px-4 md:px-20">
                <div className="h-full border-l border-dashed border-gray-300 w-1/5"></div>
                <div className="h-full border-l border-dashed border-gray-300 w-1/5"></div>
                <div className="h-full border-l border-dashed border-gray-300 w-1/5"></div>
                <div className="h-full border-l border-dashed border-gray-300 w-1/5"></div>
                <div className="h-full border-l border-dashed border-gray-300 w-1/5 border-r"></div>
            </div>

            <div className="relative z-10 container mx-auto px-4 md:px-20 py-8 pt-28 sm:pt-24 md:pt-16">
                <motion.h1 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-[10vw] sm:text-[8vw] md:text-[8rem] leading-none font-black tracking-tighter uppercase mb-4 text-center drop-shadow-sm"
                >
                    NOSOTROS
                </motion.h1>
                
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="w-32 h-2 bg-gradient-to-r from-blue-800 to-amber-500 mx-auto mb-16"
                ></motion.div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 mb-24 max-w-5xl mx-auto">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5, delay: 0 }}
                        className="bg-white p-6 sm:p-8 md:p-10 border border-black shadow-[6px_6px_0px_0px_rgba(30,58,138,0.9)] relative"
                    >
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-800 -translate-x-1 -translate-y-1"></div>
                        <div className="w-16 h-1 bg-amber-500 mb-4"></div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter mb-6">Nuestra Misión</h3>
                        <p className="text-gray-900 font-bold leading-relaxed text-sm md:text-base">
                            Somos una organización comprometida con la sociedad que ejerce la representación legal y la defensa de los derechos de los Psicólogos a nivel departamental. Respaldamos a los psicólogos para que realicen sus actividades dentro de principios éticos, científicos y profesionales a través de procesos de capacitación y actualización.
                        </p>
                    </motion.div>
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="bg-white p-6 sm:p-8 md:p-10 border border-black shadow-[6px_6px_0px_0px_rgba(30,58,138,0.9)] relative"
                    >
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-500 translate-x-1 translate-y-1"></div>
                        <div className="w-16 h-1 bg-blue-800 mb-4"></div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter mb-6">Nuestra Visión</h3>
                        <p className="text-gray-900 font-bold leading-relaxed text-sm md:text-base">
                            Promover el ejercicio profesional en todas sus especialidades, al servicio de la prevención, diagnóstico, pronostico, tratamiento, promoción e investigación de la conducta humana, aportando a la Salud Mental de la población en pleno derecho de sus facultades.
                        </p>
                    </motion.div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-24 max-w-5xl mx-auto">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5, delay: 0 }}
                        className="flex flex-col items-center text-center"
                    >
                        <div className="w-12 h-12 flex items-center justify-center bg-blue-800 text-white rounded-md mb-4 border border-black">
                            <Shield className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-lg mb-2">Ética</h4>
                        <p className="text-sm text-slate-700">Integridad en cada acción.</p>
                    </motion.div>
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="flex flex-col items-center text-center"
                    >
                        <div className="w-12 h-12 flex items-center justify-center bg-amber-500 text-white rounded-md mb-4 border border-black">
                            <Heart className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-lg mb-2">Compromiso</h4>
                        <p className="text-sm text-slate-700">Vocación de servicio.</p>
                    </motion.div>
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="flex flex-col items-center text-center"
                    >
                        <div className="w-12 h-12 flex items-center justify-center bg-emerald-600 text-white rounded-md mb-4 border border-black">
                            <Award className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-lg mb-2">Excelencia</h4>
                        <p className="text-sm text-slate-700">Mejora profesional continua.</p>
                    </motion.div>
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="flex flex-col items-center text-center"
                    >
                        <div className="w-12 h-12 flex items-center justify-center bg-purple-600 text-white rounded-md mb-4 border border-black">
                            <Users className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-lg mb-2">Inclusión</h4>
                        <p className="text-sm text-slate-700">Respeto por la diversidad.</p>
                    </motion.div>
                </div>
                
                <div className="w-full flex justify-center">
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.6 }}
                        className="relative inline-block w-[90%] md:w-[70%]"
                    >
                        <div className="absolute inset-0 bg-blue-800 translate-x-3 translate-y-3 -z-10"></div>
                        <img 
                            src="https://images.pexels.com/photos/3184295/pexels-photo-3184295.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" 
                            alt="Reunión CDPLP" 
                            className="w-full h-[60vh] object-cover border border-black shadow-2xl transition-all duration-700"
                        />
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
