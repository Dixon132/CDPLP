import { Link } from 'react-router-dom';

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

            <div className="relative z-10 container mx-auto px-4 md:px-20 pt-16 pb-32 flex flex-col md:flex-row items-center min-h-[90vh]">
                {/* Left side: Image */}
                <div className="w-full md:w-1/2 flex justify-center mb-12 md:mb-0 relative">
                    <div className="absolute inset-0 bg-gray-100 transform translate-x-4 translate-y-4 -z-10 w-[70%] md:w-[60%] aspect-[3/4] mx-auto border border-black hidden md:block"></div>
                    <img 
                        src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" 
                        alt="Psicólogos CDPLP" 
                        className="w-[80%] md:w-[60%] aspect-[3/4] object-cover border border-black shadow-2xl grayscale hover:grayscale-0 transition-all duration-700"
                    />
                </div>

                {/* Right side: Huge Typography and Text */}
                <div className="w-full md:w-1/2 flex flex-col justify-center px-4 md:px-12 bg-white/80 backdrop-blur-sm md:bg-transparent py-8 md:py-0">
                    <h1 className="text-[12vw] md:text-[6rem] xl:text-[8rem] leading-none font-black tracking-tighter uppercase mb-6 text-black drop-shadow-sm">
                        PSICOLOGÍA
                    </h1>
                    <p className="text-lg md:text-xl font-bold leading-snug mb-10 max-w-xl text-gray-900">
                        Fundado en febrero de 1999, nos comprometemos a mejorar las condiciones laborales de nuestros colegas psicólogos y promover el valor de su trabajo en la sociedad de La Paz.
                    </p>
                    <div className="flex justify-start">
                        <Link to="/nosotros" className="border border-black px-10 py-4 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition duration-300 bg-white">
                            ¿QUÉ ES EL CDPLP?
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
