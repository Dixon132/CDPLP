import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Mail, MapPin, Phone } from 'lucide-react';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-gray-800 text-white">
            <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Logo and description */}
                    <div className="space-y-4">
                        <div className="flex items-center">
                            <img src="/img/logo.png" className='w-18' alt="" />
                            <span className="font-bold text-s">COLEGIO DEPARTAMENTAL DE
                            PSICÓLOGOS DE LA PAZ</span>
                        </div>
                        <p className="text-gray-300 text-sm">
                        Institución comprometida con la regulación y promoción del ejercicio profesional de la psicología en el departamento de La Paz, Bolivia.
                        </p>
                    </div>

                    {/* Quick links */}
                    <div>
                        <h3 className="text-lg font-medium mb-4">Links rápidos</h3>
                        <ul className="space-y-2">
                            {[
                                { name: 'Inicio', path: '/' },
                                { name: 'Nosotros', path: '/nosotros' },
                                { name: 'Contacto', path: '/contacto' },
                            ].map((link, index) => (
                                <li key={index}>
                                    <Link
                                        to={link.path}
                                        className="text-gray-300 hover:text-teal-400 transition-colors duration-200"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Services */}
                    <div>
                        <h3 className="text-lg font-medium mb-4">Nuestros servicios</h3>
                        <ul className="space-y-2">
                            {[
                                {   title:'Formacion continua',
                                    path:'/formacion-continua',
                                },
                                {
                                    title:'Red de apoyo',
                                    path:'/red-de-apoyo'
                                },
                                {
                                    title:'Promocion de la salud mental',
                                    path:'/promocion-salud-mental'
                                }
                                
                            ].map((service, index) => (
                                <li key={index} className="text-gray-300">
                                    <Link to={service.path}>{service.title}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact information */}
                    <div>
                        <h3 className="text-lg font-medium mb-4">Contactanos</h3>
                        <ul className="space-y-3">
                            <li className="flex items-start">
                                <MapPin size={18} className="text-teal-400 mr-2 mt-1 flex-shrink-0" />
                                <span className="text-gray-300">
                                Calle Francisco Bedregal N° 2877, Edificio MGM, Subsuelo, Oficina 3, Plazoleta Mario Bedoya Ballivián La Paz, Bolivia
                                </span>
                            </li>
                            <li className="flex items-center">
                                <Phone size={18} className="text-teal-400 mr-2 flex-shrink-0" />
                                <span className="text-gray-300">+591 69955395</span>
                            </li>
                            <li className="flex items-center">
                                <Mail size={18} className="text-teal-400 mr-2 flex-shrink-0" />
                                <a
                                    href="mailto:info@mindwell.org"
                                    className="text-gray-300 hover:text-teal-400 transition-colors duration-200"
                                >
                                    col.psicologoslapaz@gmail.com
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-700 mt-12 pt-8 text-center text-gray-300 text-sm">
                    <p>&copy; {currentYear} CDPLP. Todos los derechos reservados.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;