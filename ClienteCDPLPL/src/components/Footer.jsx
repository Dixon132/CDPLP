import { Link } from 'react-router-dom';

export const Footer = () => {
    return (
        <footer className="border-t border-black py-12 bg-white relative z-10 mt-20">
            <div className="container mx-auto px-6 text-center">
                <img src="/img/logo.png" alt="CDPLP Logo" className="h-8 mx-auto mb-4 object-contain grayscale opacity-100" />
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                    &copy; {new Date().getFullYear()} Colegio Departamental de Psicólogos de La Paz. TODOS LOS DERECHOS RESERVADOS.
                </div>
            </div>
        </footer>
    );
};
