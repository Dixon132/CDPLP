import { Link, useLocation } from 'react-router-dom';

export const Navbar = () => {
    const location = useLocation();
    const isActive = (path) => location.pathname === path;

    return (
        <header className="w-full fixed top-0 left-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
            <div className="w-full px-4 md:px-12 py-5 flex justify-between items-center">
                <Link to="/" className="flex items-center space-x-6 z-50 group">
                    <div className="flex flex-col space-y-1.5 cursor-pointer">
                        <div className="w-8 h-[1.5px] bg-black group-hover:w-6 transition-all duration-300"></div>
                        <div className="w-8 h-[1.5px] bg-black group-hover:w-10 transition-all duration-300"></div>
                    </div>
                    <span className="text-2xl font-black tracking-tighter uppercase mt-1">CDPLP</span>
                </Link>
                
                <nav className="flex items-center space-x-8 text-[10px] md:text-[11px] font-bold uppercase tracking-widest z-50">
                    <Link to="/nosotros" className={`hover:text-gray-500 hover:underline underline-offset-4 transition-all ${isActive('/nosotros') ? 'text-black' : ''}`}>Nosotros</Link>
                    <Link to="/contacto" className={`hover:text-gray-500 hover:underline underline-offset-4 transition-all ${isActive('/contacto') ? 'text-black' : ''}`}>Contacto</Link>
                    <Link to="/auth/login" className="hover:text-gray-500 hover:underline underline-offset-4 transition-all text-black font-black">Iniciar Sesión</Link>
                </nav>
            </div>
        </header>
    );
};
