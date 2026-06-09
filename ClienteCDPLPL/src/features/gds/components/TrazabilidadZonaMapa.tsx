// Mapa de comparación por `Zona_Geografica` (Leaflet + OpenStreetMap) que ancla
// la intensidad de una dimensión del `Indice_Riesgo` a la ubicación de cada
// `Comunidad_Digital` dentro de un análisis (Req. 33.4, 33.5, 22.4, D14).
//
// Cada comunidad con coordenadas se dibuja como un círculo (su radio de
// análisis) coloreado por institución, con un popup que resume el último valor,
// el promedio y el máximo de la dimensión comparada. Las comunidades sin
// coordenadas se listan aparte para no perder su información (vista parcial).
import { useMemo } from 'react';
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLngExpression } from 'leaflet';

import { MAPA_CENTRO_DEFECTO } from '../api/institucionesApi';
import type { ComparacionZonaPunto } from '../api/trazabilidadApi';

export interface TrazabilidadZonaMapaProps {
    puntos: ReadonlyArray<ComparacionZonaPunto>;
    dimensionLabel: string;
}

function formatoValor(valor: number | null): string {
    return valor === null ? '—' : valor.toFixed(2);
}

export function TrazabilidadZonaMapa({ puntos, dimensionLabel }: TrazabilidadZonaMapaProps) {
    const conCoordenadas = useMemo(() => puntos.filter((p) => p.tieneCoordenadas), [puntos]);

    // Centra el mapa en el promedio de las coordenadas disponibles, o en el
    // centro por defecto (La Paz) cuando ninguna comunidad tiene ubicación.
    const centro: LatLngExpression = useMemo(() => {
        if (conCoordenadas.length === 0) {
            return [MAPA_CENTRO_DEFECTO[0], MAPA_CENTRO_DEFECTO[1]];
        }
        const lat =
            conCoordenadas.reduce((acc, p) => acc + (p.latitud ?? 0), 0) / conCoordenadas.length;
        const lng =
            conCoordenadas.reduce((acc, p) => acc + (p.longitud ?? 0), 0) / conCoordenadas.length;
        return [lat, lng];
    }, [conCoordenadas]);

    if (puntos.length === 0) {
        return (
            <div
                role="status"
                className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
            >
                Selecciona una dimensión con instituciones para comparar por zona geográfica.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {conCoordenadas.length > 0 ? (
                <div className="h-72 w-full overflow-hidden rounded-lg border border-slate-300">
                    <MapContainer
                        center={centro}
                        zoom={conCoordenadas.length > 1 ? 11 : 13}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />
                        {conCoordenadas.map((p) => (
                            <Circle
                                key={p.institucionId}
                                center={[Number(p.latitud), Number(p.longitud)]}
                                radius={Number(p.radioMetros) || 500}
                                pathOptions={{
                                    color: p.color,
                                    fillColor: p.color,
                                    fillOpacity: 0.2,
                                }}
                            >
                                <Popup>
                                    <div className="text-xs">
                                        <p className="font-semibold text-slate-700">
                                            {p.institucionNombre}
                                        </p>
                                        {p.zonaNombre && (
                                            <p className="text-slate-500">Zona: {p.zonaNombre}</p>
                                        )}
                                        <p className="mt-1 text-slate-600">{dimensionLabel}</p>
                                        <ul className="text-slate-600">
                                            <li>Último: {formatoValor(p.valorUltimo)}</li>
                                            <li>Promedio: {formatoValor(p.valorPromedio)}</li>
                                            <li>Máximo: {formatoValor(p.valorMaximo)}</li>
                                        </ul>
                                    </div>
                                </Popup>
                            </Circle>
                        ))}
                    </MapContainer>
                </div>
            ) : (
                <div
                    role="status"
                    className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                >
                    Ninguna institución comparada tiene coordenadas para ubicarla en el mapa. Se
                    muestra el resumen por zona a continuación.
                </div>
            )}

            <ul className="space-y-1" aria-label="Resumen por zona geográfica">
                {puntos.map((p) => (
                    <li
                        key={p.institucionId}
                        className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white px-3 py-1.5 text-sm"
                    >
                        <span className="flex items-center gap-2">
                            <span
                                className="inline-block h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: p.color }}
                                aria-hidden="true"
                            />
                            <span className="font-medium text-slate-700">{p.institucionNombre}</span>
                            {p.zonaNombre && (
                                <span className="text-xs text-slate-500">({p.zonaNombre})</span>
                            )}
                            {!p.tieneCoordenadas && (
                                <span className="text-xs text-amber-600">sin coordenadas</span>
                            )}
                        </span>
                        <span className="text-xs text-slate-500">
                            último {formatoValor(p.valorUltimo)} · prom {formatoValor(p.valorPromedio)}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default TrazabilidadZonaMapa;
