import React, { useState, useEffect } from "react";

const Header = ({
    icon,
    title,
    stats = [],
    searchPlaceholder = "Buscar...",
    onSearch = () => { },
    buttons = [],
    searchDelay = 800
}) => {
    const [searchValue, setSearchValue] = useState("");
    const [toggleStates, setToggleStates] = useState({}); //  para manejar toggles

    //  Debounce para búsqueda
    useEffect(() => {
        const timeout = setTimeout(() => {
            onSearch(searchValue);
        }, searchDelay);
        return () => clearTimeout(timeout);
    }, [searchValue, onSearch]);

    //  Manejar botones tipo toggle
    const handleToggle = (index, onClick) => {
        setToggleStates((prev) => ({
            ...prev,
            [index]: !prev[index],
        }));
        if (onClick) onClick(!toggleStates[index]);
    };

    return (
        <div className="relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-xl border border-purple-200/50 shadow-2xl shadow-purple-500/20">

            {/* Fondos decorativos */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-50 via-pink-50 to-indigo-50 opacity-60"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(147,51,234,0.15)_1px,transparent_0)] bg-[length:20px_20px]"></div>

            <div className="relative p-6 lg:p-8">
                {/* ENCABEZADO */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-40"></div>
                            <div className="relative p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-xl">
                                <p className="text-white">{icon}</p>
                            </div>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-700 via-pink-600 to-indigo-700">
                            {title}
                        </h1>
                    </div>

                    {/* ESTADÍSTICAS */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full lg:w-auto">
                        {stats.map((s, i) => (
                            <div key={i} className={`text-center p-4 rounded-2xl backdrop-blur border shadow-lg
                                ${s.color === "purple" && "bg-purple-500/10 border-purple-300/30"}
                                ${s.color === "green" && "bg-green-500/10 border-green-300/30"}
                                ${s.color === "blue" && "bg-blue-500/10 border-blue-300/30"}
                                ${s.color === "red" && "bg-red-500/10 border-red-300/30"}`}>
                                <div className={`text-2xl md:text-3xl font-black bg-clip-text text-transparent
                                    ${s.color === "purple" && "bg-gradient-to-r from-purple-600 to-pink-600"}
                                    ${s.color === "green" && "bg-gradient-to-r from-green-600 to-emerald-600"}
                                    ${s.color === "blue" && "bg-gradient-to-r from-blue-600 to-cyan-600"}
                                    ${s.color === "red" && "bg-gradient-to-r from-red-600 to-rose-600"}`}>
                                    {s.value}
                                </div>
                                <div className="text-gray-600 text-xs md:text-sm font-semibold">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* BUSCADOR */}
                <div className="relative mb-6">
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        className="w-full px-4 py-3 bg-white/80 backdrop-blur-xl border border-purple-200/50 
                                   rounded-2xl text-gray-800 placeholder-gray-500 focus:outline-none 
                                   focus:ring-2 focus:ring-purple-500/40 shadow-md focus:shadow-lg 
                                   transition-all duration-300"
                    />
                </div>

                {/* BOTONES */}
                <div className="flex flex-wrap gap-4">
                    {buttons.map((btn, i) => {
                        const isActive = toggleStates[i] || false;

                        return (
                            <button
                                key={i}
                                onClick={() => btn.type === "toggle" ? handleToggle(i, btn.onClick) : btn.onClick()}
                                className={`group relative px-6 py-3 md:px-8 md:py-4 rounded-2xl font-bold text-white
                                    shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 overflow-hidden
                                    ${btn.color === "purple" && "bg-gradient-to-r from-purple-600 via-pink-600 to-red-600"}
                                    ${btn.color === "blue" && "bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600"}
                                    ${btn.color === "green" && "bg-gradient-to-r from-green-600 to-emerald-600"}
                                    ${btn.color === "red" && "bg-gradient-to-r from-red-600 via-rose-600 to-orange-600"}
                                    ${btn.type === "toggle" && isActive ? "ring-4 ring-white/50" : ""}`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                <div className="relative flex items-center gap-3">
                                    {btn.icon}
                                    {btn.label}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Header;
