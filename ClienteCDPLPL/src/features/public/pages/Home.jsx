import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Home() {
    return (
        <div className="relative w-full min-h-screen bg-white text-black overflow-hidden font-sans">
            {/* Background Grid Lines */}
            <div className="absolute inset-0 pointer-events-none z-0 flex justify-between px-4 md:px-20">
                <div className="h-full border-l border-dashed border-gray-300 w-1/5"></div>
                <div className="h-full border-l border-dashed border-gray-300 w-1/5"></div>
                <div className="h-full border-l border-dashed border-gray-300 w-1/5"></div>
                <div className="h-full border-l border-dashed border-gray-300 w-1/5"></div>
                <div className="h-full border-l border-dashed border-gray-300 w-1/5 border-r"></div>
            </div>

            {/* Decorative accent line at top */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-800 via-amber-500 to-blue-800 z-20"></div>

            <div className="relative z-10 container mx-auto px-4 sm:px-6 md:px-12 lg:px-20 pt-28 sm:pt-24 md:pt-20 pb-20 md:pb-32 flex flex-col md:flex-row items-center min-h-[90vh]">
                {/* Left side: Image */}
                <motion.div 
                    className="w-full md:w-1/2 flex justify-center mb-12 md:mb-0 relative"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                >
                    {/* Offset colored rectangle */}
                    <div className="absolute inset-0 bg-blue-800 transform translate-x-3 translate-y-3 sm:translate-x-4 sm:translate-y-4 -z-10 w-[75%] sm:w-[70%] md:w-[55%] aspect-[3/4] mx-auto border-2 border-blue-900 hidden sm:block"></div>
                    {/* Secondary accent offset */}
                    <div className="absolute inset-0 bg-amber-400/30 transform -translate-x-2 -translate-y-2 -z-20 w-[75%] sm:w-[70%] md:w-[55%] aspect-[3/4] mx-auto hidden md:block"></div>
                    <img
                        src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
                        alt="Psicólogos CDPLP"
                        className="w-[75%] sm:w-[70%] md:w-[55%] aspect-[3/4] object-cover border-2 border-black shadow-2xl transition-all duration-700 hover:scale-[1.02]"
                    />
                    {/* Small exhibit label like a museum */}
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white border border-black px-4 py-1.5 hidden sm:block">
                        <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500">EST. 1999 — LA PAZ, BOLIVIA</p>
                    </div>
                </motion.div>

                {/* Right side: Typography */}
                <motion.div 
                    className="w-full md:w-1/2 flex flex-col justify-center px-0 sm:px-2 md:px-8 lg:px-12 py-8 md:py-0"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                >
                    {/* Museum-style exhibit number */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 border-2 border-blue-800 flex items-center justify-center">
                            <span className="text-blue-800 font-black text-sm">01</span>
                        </div>
                        <div className="h-px flex-1 bg-gradient-to-r from-blue-800 to-transparent"></div>
                    </div>

                    <div className="w-16 h-1 bg-amber-500 mb-5"></div>
                    <h1 className="text-4xl sm:text-4xl md:text-[3.2rem] lg:text-[4rem] xl:text-[5rem] leading-[0.9] font-black tracking-tighter uppercase mb-6 text-black">
                        COLEGIO DEPARTAMENTAL DE PSICÓLOGOS DE LA PAZ
                    </h1>
                    <div className="w-full h-px bg-black mb-6"></div>
                    <p className="text-base sm:text-lg md:text-xl font-medium leading-relaxed mb-10 max-w-xl text-gray-700">
                        Fundado en febrero de 1999, nos comprometemos a mejorar las condiciones laborales de nuestros colegas psicólogos y promover el valor de su trabajo en la sociedad de La Paz.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-start">
                        <Link to="/nosotros" className="px-8 sm:px-10 py-4 text-xs font-bold uppercase tracking-widest transition duration-300 bg-blue-800 text-white border-2 border-blue-800 hover:bg-white hover:text-blue-800 text-center shadow-[4px_4px_0px_0px_rgba(30,58,138,0.5)] hover:shadow-[2px_2px_0px_0px_rgba(30,58,138,0.5)]">
                            ¿QUÉ ES EL CDPLP?
                        </Link>
                        <Link to="/postular" className="border-2 border-black px-8 sm:px-10 py-4 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition text-center">
                            POSTULARSE
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
