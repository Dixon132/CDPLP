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

            <div className="relative z-10 container mx-auto px-4 md:px-20 py-8">
                <h1 className="text-[12vw] md:text-[8rem] leading-none font-black tracking-tighter uppercase mb-16 text-center drop-shadow-sm">
                    NOSOTROS
                </h1>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-24 max-w-5xl mx-auto">
                    <div className="bg-white p-10 border border-black shadow-xl relative">
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-black -translate-x-1 -translate-y-1"></div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter mb-6">Nuestra Misión</h3>
                        <p className="text-gray-900 font-bold leading-relaxed text-sm md:text-base">
                            Somos una organización comprometida con la sociedad que ejerce la representación legal y la defensa de los derechos de los Psicólogos a nivel departamental. Respaldamos a los psicólogos para que realicen sus actividades dentro de principios éticos, científicos y profesionales a través de procesos de capacitación y actualización.
                        </p>
                    </div>
                    <div className="bg-white p-10 border border-black shadow-xl relative">
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-black translate-x-1 translate-y-1"></div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter mb-6">Nuestra Visión</h3>
                        <p className="text-gray-900 font-bold leading-relaxed text-sm md:text-base">
                            Promover el ejercicio profesional en todas sus especialidades, al servicio de la prevención, diagnóstico, pronostico, tratamiento, promoción e investigación de la conducta humana, aportando a la Salud Mental de la población en pleno derecho de sus facultades.
                        </p>
                    </div>
                </div>
                
                <div className="w-full flex justify-center">
                    <img 
                        src="https://images.pexels.com/photos/3184295/pexels-photo-3184295.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" 
                        alt="Reunión CDPLP" 
                        className="w-[90%] md:w-[70%] h-[60vh] object-cover grayscale border border-black shadow-2xl hover:grayscale-0 transition-all duration-700"
                    />
                </div>
            </div>
        </div>
    );
}
