import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

// Fix for default marker icon in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function Contact() {
    const position = [-16.516484850575743, -68.12775260748352];

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

            <div className="relative z-10 container mx-auto px-4 md:px-20 py-8 pt-28 sm:pt-24 md:pt-16 flex flex-col">
                <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-[10vw] sm:text-[8vw] md:text-[8rem] leading-none font-black tracking-tighter uppercase mb-4 text-center md:text-left drop-shadow-sm"
                >
                    CONTACTO
                </motion.h1>
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="w-32 h-2 bg-gradient-to-r from-blue-800 to-amber-500 mb-12 mx-auto md:mx-0"
                ></motion.div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 items-stretch bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(30,58,138,0.8)]">
                    {/* Contact Data */}
                    <motion.div 
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="p-6 sm:p-8 md:p-12 lg:p-16 flex flex-col justify-center h-full relative z-10 bg-white"
                    >
                        <img src="/img/logo.png" alt="Logo CDPLP" className="absolute top-8 right-8 h-12 w-auto object-contain opacity-20" />
                        
                        <div className="space-y-6 sm:space-y-8 md:space-y-10">
                            <div>
                                <div className="w-8 h-8 bg-blue-800 text-white flex items-center justify-center mb-3"><MapPin className="w-4 h-4" /></div>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-800 mb-2">Dirección</h3>
                                <p className="text-xl font-bold text-slate-700">Calle Francisco Bedregal N° 2877<br/>Edificio MGM, Subsuelo, Oficina 3.</p>
                            </div>
                            
                            <div>
                                <div className="w-8 h-8 bg-amber-500 text-white flex items-center justify-center mb-3"><Phone className="w-4 h-4" /></div>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-800 mb-2">Celular</h3>
                                <p className="text-xl font-bold text-slate-700">69955395</p>
                            </div>
                            
                            <div>
                                <div className="w-8 h-8 bg-blue-800 text-white flex items-center justify-center mb-3"><Mail className="w-4 h-4" /></div>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-800 mb-2">Correo Electrónico</h3>
                                <p className="text-xl font-bold text-slate-700">col.psicologoslapaz@gmail.com</p>
                            </div>
                            
                            <div>
                                <div className="w-8 h-8 bg-amber-500 text-white flex items-center justify-center mb-3"><Clock className="w-4 h-4" /></div>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-800 mb-2">Horarios</h3>
                                <p className="text-xl font-bold text-slate-700">Lunes a Viernes<br/>8am - 6pm</p>
                            </div>
                        </div>
                    </motion.div>
                    
                    {/* React Leaflet Map */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="h-[400px] sm:h-[500px] md:h-full w-full border-t md:border-t-0 md:border-l border-black z-0 relative transition-all duration-1000"
                    >
                        <MapContainer center={position} zoom={18} scrollWheelZoom={false} className="h-full w-full z-0">
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                            />
                            <Marker position={position}>
                                <Popup>
                                    <div className="font-sans font-bold text-sm">CDPLP</div>
                                    <div className="font-sans text-xs">Oficina Central</div>
                                </Popup>
                            </Marker>
                        </MapContainer>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
