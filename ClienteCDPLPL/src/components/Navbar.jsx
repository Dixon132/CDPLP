import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export const Navbar = () => {
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    const isActive = (path) => location.pathname === path;

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    // Prevent scrolling when mobile menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMenuOpen]);

    const navLinks = [
        { name: 'Nosotros', path: '/nosotros' },
        { name: 'Contacto', path: '/contacto' },
        { name: 'Repo Institucional', path: '/memorias' },
    ];

    return (
        <header className="w-full fixed top-0 left-0 z-50 bg-white/95 backdrop-blur-md border-b-2 border-black">
            <div className="w-full px-4 md:px-8 lg:px-12 py-3 lg:py-4 flex justify-between items-center relative z-50">
                
                {/* Left side: Logo */}
                <Link to="/" className="flex items-center space-x-2 md:space-x-3 z-50 shrink-0" onClick={() => setIsMenuOpen(false)}>
                    <img src="/img/logo.png" alt="CDPLP Logo" className="h-8 md:h-10 lg:h-12 w-auto object-contain" />
                    <span className="text-lg md:text-2xl font-black tracking-tighter uppercase mt-1 text-black">CDPLP</span>
                </Link>
                
                {/* Center/Desktop Nav: Links */}
                <nav className="hidden lg:flex items-center space-x-8 text-[11px] font-bold uppercase tracking-widest z-50 absolute left-1/2 -translate-x-1/2">
                    {navLinks.map((link) => (
                        <Link 
                            key={link.path}
                            to={link.path} 
                            className={`hover:text-gray-500 hover:underline underline-offset-4 transition-all ${isActive(link.path) ? 'text-black underline underline-offset-4' : 'text-gray-600'}`}
                        >
                            {link.name}
                        </Link>
                    ))}
                </nav>

                {/* Right side: Login & Mobile Toggle */}
                <div className="flex items-center space-x-2 lg:space-x-4 z-50 shrink-0">
                    {/* Desktop Buttons */}
                    <Link 
                        to="/postular" 
                        className="hidden sm:block border-2 border-black bg-white text-black px-4 lg:px-6 py-2 lg:py-2.5 text-[10px] lg:text-[11px] font-bold uppercase tracking-widest hover:bg-gray-100 transition-colors"
                    >
                        Postularse
                    </Link>
                    <Link 
                        to="/auth/login" 
                        className="hidden sm:block bg-black text-white px-4 lg:px-6 py-2.5 lg:py-3 text-[10px] lg:text-[11px] font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors border-2 border-black"
                    >
                        Iniciar Sesión
                    </Link>

                    {/* Mobile Buttons */}
                    <Link 
                        to="/postular" 
                        className="sm:hidden border-2 border-black bg-white text-black px-3 py-2 text-[9px] font-bold uppercase tracking-widest hover:bg-gray-100 transition-colors"
                    >
                        Postular
                    </Link>
                    <Link 
                        to="/auth/login" 
                        className="sm:hidden bg-black text-white px-3 py-2 text-[9px] font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors border-2 border-black"
                    >
                        Entrar
                    </Link>
                    
                    {/* Mobile Menu Toggle */}
                    <button 
                        className="lg:hidden p-1 -mr-2 text-black focus:outline-none bg-transparent hover:bg-gray-100 transition-colors"
                        onClick={toggleMenu}
                        aria-label="Toggle menu"
                    >
                        {isMenuOpen ? <X size={26} strokeWidth={2.5} /> : <Menu size={26} strokeWidth={2.5} />}
                    </button>
                </div>
            </div>

            {/* Mobile Nav Overlay */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="fixed inset-0 w-full h-screen bg-white z-40 flex flex-col pt-[70px] lg:hidden overflow-y-auto"
                    >
                        <nav className="flex flex-col w-full h-full pb-8">
                            {navLinks.map((link, i) => (
                                <motion.div
                                    key={link.path}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ delay: i * 0.05, duration: 0.3 }}
                                    className="w-full"
                                >
                                    <Link 
                                        to={link.path} 
                                        onClick={() => setIsMenuOpen(false)}
                                        className={`flex items-center w-full px-6 py-6 border-b-2 border-black text-2xl sm:text-3xl font-black uppercase tracking-tighter transition-colors ${isActive(link.path) ? 'bg-black text-white' : 'text-black hover:bg-gray-100'}`}
                                    >
                                        {link.name}
                                        {isActive(link.path) && <span className="ml-auto text-white">→</span>}
                                    </Link>
                                </motion.div>
                            ))}
                            
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: 0.3, duration: 0.3 }}
                                className="mt-auto p-6 text-center"
                            >
                                <div className="text-[10px] text-gray-500 font-black tracking-widest uppercase">
                                    © {new Date().getFullYear()} CDPLP
                                </div>
                            </motion.div>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};
