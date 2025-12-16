import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, useMap } from "react-leaflet";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import "leaflet/dist/leaflet.css";

const ZONES = [
    { name: "La Paz", coords: [-16.5000, -68.1500], emoji: "🏛️" },
    { name: "El Alto", coords: [-16.5050, -68.1640], emoji: "🏔️" },
    { name: "Sopocachi", coords: [-16.5200, -68.1300], emoji: "🌆" },
    { name: "Miraflores", coords: [-16.5220, -68.1150], emoji: "🌸" },
    { name: "Villa Fátima", coords: [-16.4900, -68.1200], emoji: "🏘️" },
    { name: "Achumani", coords: [-16.5500, -68.0800], emoji: "🌳" },
    { name: "Obrajes", coords: [-16.5400, -68.0950], emoji: "🏡" }
];

const EMOTION_COLORS = {
    depresion: { color: "#a855f7", gradient: "from-purple-500 to-purple-600", label: "Tristeza" },
    ansiedad: { color: "#3b82f6", gradient: "from-blue-500 to-blue-600", label: "Ansiedad" },
    estres: { color: "#f97316", gradient: "from-orange-500 to-red-500", label: "Estrés" }
};

const ZoneCard = ({ zone, isSelected, onClick }) => (
    <button
        onClick={() => onClick(zone.name)}
        className={`relative group overflow-hidden rounded-3xl p-6 transition-all duration-500 transform hover:scale-105 ${isSelected
                ? 'bg-gradient-to-br from-purple-600 to-blue-600 shadow-2xl shadow-purple-500/50 scale-105'
                : 'bg-white/5 hover:bg-white/10 border border-white/20'
            }`}
    >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative flex flex-col items-center gap-3">
            <div className={`text-5xl transform transition-transform duration-500 ${isSelected ? 'scale-125' : 'group-hover:scale-110'}`}>
                {zone.emoji}
            </div>
            <span className={`font-bold text-lg text-center ${isSelected ? 'text-white' : 'text-white/80'}`}>
                {zone.name}
            </span>
            {isSelected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center animate-pulse">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                </div>
            )}
        </div>
    </button>
);

const EmotionWave = ({ label, value, color, delay }) => {
    const [animated, setAnimated] = useState(false);

    useEffect(() => {
        setTimeout(() => setAnimated(true), delay);
    }, [delay]);

    return (
        <div className="relative group">
            <div className={`absolute inset-0 bg-gradient-to-r ${color} opacity-20 rounded-3xl blur-2xl group-hover:opacity-40 transition-all duration-700`}></div>
            <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/20 hover:border-white/40 transition-all duration-500 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-white font-bold text-lg">{label}</span>
                    <span className={`text-4xl font-black bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
                        {value}%
                    </span>
                </div>
                <div className="relative h-3 bg-black/30 rounded-full overflow-hidden">
                    <div
                        className={`absolute h-full bg-gradient-to-r ${color} rounded-full transition-all duration-1000 ease-out`}
                        style={{
                            width: animated ? `${value}%` : '0%',
                            boxShadow: '0 0 20px currentColor'
                        }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AlertBanner = ({ triggered, reason }) => {
    if (triggered) {
        return (
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-red-900/40 via-red-800/40 to-red-900/40 backdrop-blur-xl border-2 border-red-500/50 p-8">
                <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>
                <div className="relative flex items-start gap-6">
                    <div className="flex-shrink-0">
                        <div className="w-20 h-20 bg-red-500/30 rounded-3xl flex items-center justify-center animate-bounce">
                            <svg className="w-12 h-12 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-3xl">🚨</span>
                            <h3 className="text-3xl font-black text-red-200">ALERTA DETECTADA</h3>
                        </div>
                        <p className="text-red-100 text-lg leading-relaxed font-medium">{reason}</p>
                        <div className="mt-4 flex gap-3">
                            <div className="px-4 py-2 bg-red-500/20 rounded-full border border-red-400/30">
                                <span className="text-red-200 text-sm font-bold">NIVEL: ALTO</span>
                            </div>
                            <div className="px-4 py-2 bg-red-500/20 rounded-full border border-red-400/30">
                                <span className="text-red-200 text-sm font-bold">ACCIÓN REQUERIDA</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-emerald-900/40 via-green-800/40 to-emerald-900/40 backdrop-blur-xl border-2 border-emerald-500/50 p-8">
            <div className="absolute inset-0 bg-emerald-500/10"></div>
            <div className="relative flex items-center gap-6">
                <div className="flex-shrink-0">
                    <div className="w-20 h-20 bg-emerald-500/30 rounded-3xl flex items-center justify-center">
                        <svg className="w-12 h-12 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">✨</span>
                        <h3 className="text-3xl font-black text-emerald-200">ESTADO NORMAL</h3>
                    </div>
                    <p className="text-emerald-100 text-lg leading-relaxed font-medium">{reason}</p>
                </div>
            </div>
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

    const pieData = result ? Object.entries(result.prevalence).map(([key, value]) => ({
        name: EMOTION_COLORS[key]?.label || key,
        value: parseFloat((value * 100).toFixed(1)),
        color: EMOTION_COLORS[key]?.color || "#888"
    })) : [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 p-4 md:p-8">
            {/* Mega Header */}
            <div className="max-w-[1800px] mx-auto mb-10">
                <div className="relative overflow-hidden bg-gradient-to-r from-purple-900/40 via-blue-900/40 to-purple-900/40 backdrop-blur-2xl rounded-[3rem] p-12 shadow-2xl border border-white/10">
                    <div className="absolute inset-0">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 animate-pulse"></div>
                        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
                        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse delay-700"></div>
                    </div>
                    <div className="relative text-center">
                        <div className="inline-flex items-center gap-5 mb-5">
                            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-purple-500/50 transform hover:rotate-12 transition-transform duration-500">
                                <svg className="w-11 h-11 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                        </div>
                        <h1 className="text-6xl md:text-7xl font-black mb-4 bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent tracking-tight">
                            Pulse Emocional Urbano
                        </h1>
                        <p className="text-blue-200/90 text-lg tracking-[0.3em] font-bold mb-4">
                            LA PAZ • BOLIVIA
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                            <span className="text-green-300 text-base font-bold tracking-wider">SISTEMA OPERATIVO</span>
                            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1800px] mx-auto space-y-6">
                {/* Zone Selection Grid */}
                <div className="bg-white/5 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-white/10">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-black text-white">Selecciona tu Zona</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        {ZONES.map(z => (
                            <ZoneCard
                                key={z.name}
                                zone={z}
                                isSelected={zone === z.name}
                                onClick={setZone}
                            />
                        ))}
                    </div>
                </div>

                {/* Time Period + Analyze Button */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1 bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
                        <label className="flex items-center gap-3 text-blue-200 font-bold text-sm mb-4 tracking-wider uppercase">
                            <span className="text-2xl">📅</span>
                            Periodo de Análisis
                        </label>
                        <select
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            className="w-full p-4 rounded-2xl bg-gradient-to-r from-white/10 to-white/5 text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 border border-white/20 cursor-pointer hover:bg-white/15 transition-all"
                        >
                            <option value={7} className="bg-slate-900">7 días</option>
                            <option value={15} className="bg-slate-900">15 días</option>
                            <option value={30} className="bg-slate-900">30 días</option>
                            <option value={60} className="bg-slate-900">60 días</option>
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <button
                            onClick={handleFetch}
                            disabled={loading}
                            className="w-full h-full relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-500 hover:via-pink-500 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-800 text-white font-black text-2xl py-6 rounded-3xl transition-all duration-500 transform hover:scale-[1.02] disabled:scale-100 shadow-2xl shadow-purple-500/40 border-2 border-white/20 disabled:shadow-none"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                            {loading ? (
                                <span className="relative flex items-center justify-center gap-4">
                                    <span className="animate-spin text-4xl">◌</span>
                                    <span className="tracking-wider">ANALIZANDO DATOS...</span>
                                </span>
                            ) : (
                                <span className="relative flex items-center justify-center gap-4">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    <span className="tracking-widest">INICIAR ANÁLISIS</span>
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                {result && (
                    <>
                        {/* Alert Banner */}
                        {alertData && (
                            <AlertBanner triggered={alertData.triggered} reason={alertData.reason} />
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Graphs Column */}
                            <div className="lg:col-span-1 space-y-6">
                                {/* Pie Chart */}
                                <div className="bg-white/5 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-white/10">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-white font-black text-xl">Distribución</h3>
                                    </div>
                                    <ResponsiveContainer width="100%" height={280}>
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'rgba(0,0,0,0.8)',
                                                    border: '1px solid rgba(255,255,255,0.2)',
                                                    borderRadius: '12px',
                                                    color: 'white',
                                                    fontWeight: 'bold'
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="mt-4 space-y-2">
                                        {pieData.map((entry, index) => (
                                            <div key={index} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                                    <span className="text-white font-semibold">{entry.name}</span>
                                                </div>
                                                <span className="text-white font-bold">{entry.value}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Stats Card */}
                                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/10">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/50">
                                            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <p className="text-white/60 text-sm mb-2 font-semibold uppercase tracking-wider">Publicaciones Analizadas</p>
                                        <p className="text-6xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-2">
                                            {result.total_posts}
                                        </p>
                                        <p className="text-3xl font-black bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                                            {result.zone}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Map Column */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Wave Metrics */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {Object.entries(result.prevalence).map(([key, value], index) => {
                                        const config = EMOTION_COLORS[key];
                                        return (
                                            <EmotionWave
                                                key={key}
                                                label={config?.label || key}
                                                value={(value * 100).toFixed(1)}
                                                color={config?.gradient || "from-gray-500 to-gray-600"}
                                                delay={index * 150}
                                            />
                                        );
                                    })}
                                </div>

                                {/* Map */}
                                <div className="bg-white/5 backdrop-blur-2xl rounded-[2.5rem] p-6 shadow-2xl border border-white/10 h-[550px] overflow-hidden">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                                </svg>
                                            </div>
                                            <h3 className="text-white font-black text-2xl">Mapa Geoespacial</h3>
                                        </div>
                                        <div className="bg-purple-500/20 backdrop-blur-xl px-5 py-2 rounded-full border border-purple-400/30">
                                            <span className="text-purple-200 font-bold">Radio: 1.5 km</span>
                                        </div>
                                    </div>
                                    <MapContainer
                                        center={mapCenter}
                                        zoom={13}
                                        className="h-[calc(100%-4rem)] w-full rounded-3xl"
                                        zoomControl={true}
                                    >
                                        <MapUpdater center={mapCenter} zoom={13} />
                                        <TileLayer
                                            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                                            attribution='Map data: OpenStreetMap contributors'
                                        />
                                        <Circle
                                            center={mapCenter}
                                            radius={1500}
                                            pathOptions={{
                                                fillColor: alertData?.triggered ? "#ef4444" : "#8b5cf6",
                                                fillOpacity: 0.25,
                                                color: alertData?.triggered ? "#dc2626" : "#a78bfa",
                                                weight: 4,
                                                opacity: 0.9
                                            }}
                                        />
                                        <CircleMarker
                                            center={mapCenter}
                                            radius={16}
                                            fillColor={alertData?.triggered ? "#ef4444" : "#8b5cf6"}
                                            color="#ffffff"
                                            weight={5}
                                            opacity={1}
                                            fillOpacity={0.9}
                                        >
                                            <Popup>
                                                <div className="p-3">
                                                    <strong className="text-xl block mb-3 text-purple-900 font-black">{result.zone}</strong>
                                                    <div className="bg-purple-50 p-2 rounded-lg mb-3">
                                                        <p className="text-xs text-gray-600 font-semibold">
                                                            📍 Radio: 1.5 km | 📊 {result.total_posts} publicaciones
                                                        </p>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {Object.entries(result.prevalence).map(([key, value]) => {
                                                            const config = EMOTION_COLORS[key];
                                                            return (
                                                                <div key={key} className="bg-gradient-to-r from-purple-50 to-blue-50 p-3 rounded-xl">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="font-bold text-gray-700">{config?.label || key}</span>
                                                                        <span className="font-black text-lg text-purple-600">{(value * 100).toFixed(1)}%</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </Popup>
                                        </CircleMarker>
                                    </MapContainer>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Empty State */}
                {!result && (
                    <div className="bg-white/5 backdrop-blur-2xl rounded-[3rem] p-16 border border-white/10 text-center">
                        <div className="max-w-md mx-auto">
                            <div className="w-32 h-32 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-blue-500/20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 animate-pulse">
                                <svg className="w-16 h-16 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h3 className="text-3xl font-black text-white mb-4">Esperando Análisis</h3>
                            <p className="text-white/60 text-lg leading-relaxed">
                                Selecciona una zona y un periodo de tiempo, luego presiona <span className="text-purple-400 font-bold">"INICIAR ANÁLISIS"</span> para ver los resultados emocionales.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="max-w-[1800px] mx-auto mt-8">
                <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 text-center border border-white/10">
                    <div className="flex items-center justify-center gap-3 text-blue-200/70">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-semibold tracking-wide">
                            Sistema de Monitoreo de Salud Mental • Análisis en Tiempo Real • La Paz, Bolivia
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MetricsViewer;