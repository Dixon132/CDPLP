import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function Contact() {
    const position = [-16.516484850575743, -68.12775260748352]; // Edificio Asturizaga Lora

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

            <div className="relative z-10 container mx-auto px-4 md:px-20 py-8 flex flex-col">
                <h1 className="text-[12vw] md:text-[8rem] leading-none font-black tracking-tighter uppercase mb-12 text-center md:text-left drop-shadow-sm">
                    CONTACTO
                </h1>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch bg-white border border-black shadow-2xl">
                    {/* Contact Data */}
                    <div className="p-8 md:p-16 flex flex-col justify-center h-full relative z-10 bg-white">
                        <img src="/img/logo.png" alt="Logo CDPLP" className="absolute top-8 right-8 h-12 w-auto object-contain opacity-20" />
                        
                        <div className="space-y-10">
                            <div>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Dirección</h3>
                                <p className="text-xl font-bold">Calle Francisco Bedregal N° 2877<br/>Edificio MGM, Subsuelo, Oficina 3.</p>
                            </div>
                            
                            <div>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Celular</h3>
                                <p className="text-xl font-bold">69955395</p>
                            </div>
                            
                            <div>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Correo Electrónico</h3>
                                <p className="text-xl font-bold">col.psicologoslapaz@gmail.com</p>
                            </div>
                            
                            <div>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Horarios</h3>
                                <p className="text-xl font-bold">Lunes a Viernes<br/>8am - 6pm</p>
                            </div>
                        </div>
                    </div>
                    
                    {/* React Leaflet Map */}
                    <div className="h-[500px] lg:h-full w-full border-t lg:border-t-0 lg:border-l border-black z-0 relative grayscale hover:grayscale-0 transition-all duration-1000">
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
                    </div>
                </div>
            </div>
        </div>
    );
}
