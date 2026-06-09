// Selector de ubicación sobre un mapa interactivo (Leaflet) con visualización
// del radio de influencia como círculo (Req. 7.7).
//
// Al hacer clic en el mapa se fija el marcador y se notifica al padre con las
// coordenadas. El círculo se redibuja según el radio recibido por props.
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MAPA_CENTRO_DEFECTO } from '../api/instituciones.js';

// Corrige las rutas de los iconos de Leaflet bajo Vite/React (mismo patrón ya
// usado en el resto del cliente).
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Captura los clics del mapa y los reporta como (lat, lng).
function ClickHandler({ onSelect }) {
    useMapEvents({
        click(e) {
            onSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

/**
 * @param {object} props
 * @param {number|null} props.latitud
 * @param {number|null} props.longitud
 * @param {number} props.radioMetros
 * @param {(lat:number,lng:number)=>void} props.onSelect
 */
export function InstitucionMapPicker({ latitud, longitud, radioMetros, onSelect }) {
    const tieneUbicacion =
        latitud !== null && latitud !== undefined && longitud !== null && longitud !== undefined;
    const centro = tieneUbicacion ? [Number(latitud), Number(longitud)] : MAPA_CENTRO_DEFECTO;

    return (
        <div className="h-72 w-full overflow-hidden rounded-lg border border-slate-300">
            <MapContainer center={centro} zoom={tieneUbicacion ? 14 : 12} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <ClickHandler onSelect={onSelect} />
                {tieneUbicacion && (
                    <>
                        <Marker position={[Number(latitud), Number(longitud)]} />
                        <Circle
                            center={[Number(latitud), Number(longitud)]}
                            radius={Number(radioMetros) || 0}
                            pathOptions={{ color: '#0891b2', fillColor: '#06b6d4', fillOpacity: 0.15 }}
                        />
                    </>
                )}
            </MapContainer>
        </div>
    );
}

export default InstitucionMapPicker;
