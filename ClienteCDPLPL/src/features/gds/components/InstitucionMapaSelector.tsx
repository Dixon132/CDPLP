// Selector de ubicación sobre un mapa interactivo (Leaflet + OpenStreetMap) con
// visualización del radio de influencia como círculo (Req. 7.7, D14).
//
// Al hacer clic en el mapa se fija el marcador y se notifica al padre con las
// coordenadas. El círculo se redibuja según el radio recibido por props.
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { type LatLngExpression, type LeafletMouseEvent } from 'leaflet';

import { MAPA_CENTRO_DEFECTO } from '../api/institucionesApi';

// Corrige las rutas de los iconos de Leaflet bajo Vite/React (el bundler no
// resuelve por defecto las imágenes referenciadas internamente por Leaflet).
const iconDefaultProto = L.Icon.Default.prototype as unknown as {
    _getIconUrl?: unknown;
};
delete iconDefaultProto._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface ClickHandlerProps {
    onSelect: (lat: number, lng: number) => void;
}

// Captura los clics del mapa y los reporta como (lat, lng).
function ClickHandler({ onSelect }: ClickHandlerProps) {
    useMapEvents({
        click(e: LeafletMouseEvent) {
            onSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

export interface InstitucionMapaSelectorProps {
    latitud: number | null;
    longitud: number | null;
    radioMetros: number;
    onSelect: (lat: number, lng: number) => void;
}

export function InstitucionMapaSelector({
    latitud,
    longitud,
    radioMetros,
    onSelect,
}: InstitucionMapaSelectorProps) {
    const tieneUbicacion =
        latitud !== null && latitud !== undefined && longitud !== null && longitud !== undefined;
    const centro: LatLngExpression = tieneUbicacion
        ? [Number(latitud), Number(longitud)]
        : [MAPA_CENTRO_DEFECTO[0], MAPA_CENTRO_DEFECTO[1]];

    return (
        <div className="h-72 w-full overflow-hidden rounded-lg border border-slate-300">
            <MapContainer
                center={centro}
                zoom={tieneUbicacion ? 14 : 12}
                style={{ height: '100%', width: '100%' }}
            >
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
                            pathOptions={{
                                color: '#0891b2',
                                fillColor: '#06b6d4',
                                fillOpacity: 0.15,
                            }}
                        />
                    </>
                )}
            </MapContainer>
        </div>
    );
}

export default InstitucionMapaSelector;
