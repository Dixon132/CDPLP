import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, Heart } from 'lucide-react';
import { motion } from 'framer-motion';


const Navbar = ({ scrolled }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    return (
        <header
            className={` fixed h-fit w-full top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md py-2 rounded-4xl mt-4 h-15  ' : 'bg-transparent py-4'
                }`}
        >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center">
                    <NavLink to="/" className="flex items-center">
                        <img className='w-30 mr-2.5' src='/img/logo.png' alt="logo" />
                        <span className={`font-bold text-xl ${scrolled ? 'text-gray-800' : 'text-gray-700'}`}>
                            CDPLP
                        </span>
                    </NavLink>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex space-x-8">
                        {['/', '/nosotros', '/contacto'].map((path, index) => (
                            <NavLink
                                key={index}
                                to={path === '/' ? '/' : path.substring(1)}
                                className={({ isActive }) =>
                                    `relative font-medium text-base transition-colors duration-200 ${isActive
                                        ? 'text-teal-600'
                                        : `${scrolled ? 'text-gray-800' : 'text-gray-700'} hover:text-teal-600`
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        {path === '/' ? 'Home' : path.substring(1).charAt(0).toUpperCase() + path.substring(2)}
                                        {isActive && (
                                            <motion.div
                                                className="absolute -bottom-1 left-0 w-full h-0.5 bg-teal-600"
                                                layoutId="navbar-underline"
                                            />
                                        )}
                                    </>
                                )}
                            </NavLink>
                        ))}
                        <Link to={'/auth'}>Iniciar Sesion</Link>
                    </nav>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden text-gray-700 hover:text-teal-600 transition-colors"
                        onClick={toggleMobileMenu}
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="md:hidden bg-white shadow-lg"
                >
                    <div className="px-4 py-5 space-y-4">
                        {['/', '/nosotros', '/contacto'].map((path, index) => (
                            <NavLink
                                key={index}
                                to={path === '/' ? '/' : path.substring(1)}
                                className={({ isActive }) =>
                                    `block py-2 font-medium transition-colors duration-200 ${isActive ? 'text-teal-600' : 'text-gray-700 hover:text-teal-600'
                                    }`
                                }
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {path === '/' ? 'Home' : path.substring(1).charAt(0).toUpperCase() + path.substring(2)}
                            </NavLink>
                        ))}
                    </div>
                </motion.div>
            )}
        </header>
    );
};

export default Navbar;