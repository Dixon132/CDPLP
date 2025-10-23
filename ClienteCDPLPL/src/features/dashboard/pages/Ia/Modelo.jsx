import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const ZONES = [
    { name: "La Paz", coords: [-16.5000, -68.1500] },
    { name: "El Alto", coords: [-16.5050, -68.1640] },
    { name: "Sopocachi", coords: [-16.5200, -68.1300] },
    { name: "Miraflores", coords: [-16.5220, -68.1150] },
    { name: "Villa Fátima", coords: [-16.4900, -68.1200] },
    { name: "Achumani", coords: [-16.5500, -68.0800] },
    { name: "Obrajes", coords: [-16.5400, -68.0950] }
];

const AnimatedMetrics = ({ data }) => {
    const [animated, setAnimated] = useState(false);

    useEffect(() => {
        setTimeout(() => setAnimated(true), 100);
    }, [data]);

    const getColor = (key) => {
        switch (key) {
            case "depresion": return "bg-slate-600";
            case "ansiedad": return "bg-amber-700";
            case "estres": return "bg-stone-600";
            default: return "bg-zinc-600";
        }
    };

    const getTextColor = (key) => {
        switch (key) {
            case "depresion": return "text-slate-400";
            case "ansiedad": return "text-amber-600";
            case "estres": return "text-stone-500";
            default: return "text-zinc-500";
        }
    };

    return (
        <div className="space-y-3">
            {Object.entries(data).map(([key, value]) => {
                const label = key === "depresion" ? "Tristeza" : key.charAt(0).toUpperCase() + key.slice(1);
                const percentage = (value * 100).toFixed(1);
                const color = getColor(key);
                const textColor = getTextColor(key);

                return (
                    <div key={key} className="relative overflow-hidden rounded-lg bg-stone-800/30 backdrop-blur-sm border border-stone-700/50">
                        <div
                            className={`h-full absolute top-0 left-0 ${color} transition-all duration-1000 ease-out`}
                            style={{ width: animated ? `${percentage}%` : '0%', opacity: 0.4 }}
                        />
                        <div className="relative flex justify-between items-center p-4 px-5">
                            <div className="flex items-center gap-3">
                                <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                                <span className="font-medium text-stone-200 tracking-wide">{label}</span>
                            </div>
                            <span className={`font-semibold text-xl ${textColor}`}>{percentage}%</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const MapUpdater = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
};

const MetricsViewer = () => {
    const [zone, setZone] = useState("La Paz");
    const [days, setDays] = useState(7);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [alertData, setAlertData] = useState(null);
    const [mapCenter, setMapCenter] = useState([-16.5000, -68.1500]);
    const API_URL = "http://localhost:8000";

    const handleFetch = async () => {
        if (!zone) {
            alert("Por favor selecciona una zona.");
            return;
        }
        setLoading(true);
        setResult(null);

        try {
            const metricsRes = await fetch(
                `${API_URL}/metrics?zone=${encodeURIComponent(zone)}&window=${days}d`
            );
            const metricsData = await metricsRes.json();

            const alertRes = await fetch(
                `${API_URL}/alerts?zone=${encodeURIComponent(zone)}&window=${days}d`
            );
            const alertJson = await alertRes.json();

            setResult(metricsData);
            setAlertData(alertJson);

            // Actualizar posición del mapa según la zona seleccionada
            const selectedZone = ZONES.find(z => z.name === zone);
            if (selectedZone) {
                setMapCenter(selectedZone.coords);
            }
        } catch (error) {
            alert("Error al obtener datos del servidor.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-900 via-neutral-900 to-stone-950 p-4 md:p-8">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="bg-stone-800/40 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-stone-700/50">
                    <h1 className="text-4xl md:text-5xl font-light text-stone-100 text-center mb-2 tracking-tight">
                        Monitor de Tendencias Emocionales
                    </h1>
                    <p className="text-center text-stone-400 text-sm tracking-wide">
                        La Paz, Bolivia — Análisis en tiempo real
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Panel de Control */}
                <div className="lg:col-span-1 space-y-5">
                    <div className="bg-stone-800/40 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-stone-700/50">
                        <h2 className="text-xl font-light text-stone-100 mb-6 tracking-wide">
                            Panel de Control
                        </h2>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-3 tracking-wide">
                                    Zona o Localidad
                                </label>
                                <select
                                    value={zone}
                                    onChange={(e) => setZone(e.target.value)}
                                    className="w-full p-3.5 rounded-xl bg-stone-900/60 text-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-600 border border-stone-700/50 appearance-none cursor-pointer"
                                >
                                    {ZONES.map(z => (
                                        <option key={z.name} value={z.name}>{z.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-3 tracking-wide">
                                    Periodo de Análisis
                                </label>
                                <select
                                    value={days}
                                    onChange={(e) => setDays(Number(e.target.value))}
                                    className="w-full p-3.5 rounded-xl bg-stone-900/60 text-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-600 border border-stone-700/50 appearance-none cursor-pointer"
                                >
                                    <option value={7}>Últimos 7 días</option>
                                    <option value={15}>Últimos 15 días</option>
                                    <option value={30}>Últimos 30 días</option>
                                    <option value={60}>Últimos 60 días</option>
                                </select>
                            </div>

                            <button
                                onClick={handleFetch}
                                disabled={loading}
                                className="w-full bg-stone-700 hover:bg-stone-600 disabled:bg-stone-800 text-stone-100 font-medium py-3.5 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 shadow-lg border border-stone-600/50 disabled:border-stone-700/50"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="animate-spin">◌</span> Analizando datos...
                                    </span>
                                ) : (
                                    <span>Analizar Zona</span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Resultados */}
                    {result && (
                        <div className="bg-stone-800/40 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-stone-700/50 text-stone-100">
                            <h3 className="text-lg font-light mb-1 tracking-wide">
                                Resultados
                            </h3>
                            <p className="text-2xl font-semibold text-stone-200 mb-1">{result.zone}</p>
                            <p className="text-sm text-stone-400 mb-6 pb-5 border-b border-stone-700/50">
                                {result.total_posts} publicaciones analizadas
                            </p>

                            <AnimatedMetrics data={result.prevalence} />

                            {/* Alerta */}
                            {alertData && (
                                <div className={`mt-6 p-5 rounded-xl border ${alertData.triggered
                                        ? "bg-red-950/30 border-red-800/50"
                                        : "bg-emerald-950/30 border-emerald-800/50"
                                    }`}>
                                    <h4 className="font-medium text-base mb-2 text-stone-200">
                                        {alertData.triggered ? "Alerta Detectada" : "Estado Normal"}
                                    </h4>
                                    <p className="text-sm text-stone-300 leading-relaxed">{alertData.reason}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Mapa */}
                <div className="lg:col-span-2">
                    <div className="bg-stone-800/40 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-stone-700/50 h-[650px] overflow-hidden">
                        <MapContainer
                            center={mapCenter}
                            zoom={13}
                            className="h-full w-full rounded-xl"
                            zoomControl={true}
                        >
                            <MapUpdater center={mapCenter} zoom={13} />

                            {/* Capa con relieve topográfico */}
                            <TileLayer
                                url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                                attribution='Map data: OpenStreetMap contributors'
                            />

                            {/* Radio de análisis de la zona */}
                            {result && (
                                <>
                                    <Circle
                                        center={mapCenter}
                                        radius={1500}
                                        pathOptions={{
                                            fillColor: alertData?.triggered ? "#7f1d1d" : "#1e3a8a",
                                            fillOpacity: 0.15,
                                            color: alertData?.triggered ? "#b91c1c" : "#3b82f6",
                                            weight: 2,
                                            opacity: 0.6
                                        }}
                                    />

                                    <CircleMarker
                                        center={mapCenter}
                                        radius={12}
                                        fillColor={alertData?.triggered ? "#dc2626" : "#3b82f6"}
                                        color="#ffffff"
                                        weight={3}
                                        opacity={0.9}
                                        fillOpacity={0.7}
                                    >
                                        <Popup>
                                            <div className="text-sm p-1">
                                                <strong className="text-base block mb-2">{result.zone}</strong>
                                                <p className="text-xs text-gray-600 mb-2">
                                                    Radio de análisis: 1.5 km
                                                </p>
                                                <p className="text-xs mb-2 pb-2 border-b">
                                                    {result.total_posts} publicaciones
                                                </p>
                                                <div className="space-y-1">
                                                    {Object.entries(result.prevalence).map(([key, value]) => {
                                                        const label = key === "depresion" ? "Tristeza" : key;
                                                        return (
                                                            <div key={key} className="text-xs flex justify-between">
                                                                <span className="capitalize">{label}:</span>
                                                                <span className="font-semibold ml-2">{(value * 100).toFixed(1)}%</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </Popup>
                                    </CircleMarker>
                                </>
                            )}
                        </MapContainer>
                    </div>
                </div>
            </div>

            {/* Footer info */}
            <div className="max-w-7xl mx-auto mt-6">
                <div className="bg-stone-800/20 backdrop-blur-xl rounded-xl p-4 text-center text-stone-400 text-sm border border-stone-700/30 tracking-wide">
                    Mapa topográfico con radio de análisis de 1.5 km por zona seleccionada
                </div>
            </div>
        </div>
    );
};

export default MetricsViewer;