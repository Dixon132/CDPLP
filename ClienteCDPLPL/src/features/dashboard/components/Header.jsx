import React, { useState, useEffect } from "react";

const Header = ({
    icon,
    title,
    stats = [],
    searchPlaceholder = "Buscar...",
    onSearch = () => { },
    buttons = [],
    searchDelay = 800,
    showSearch = true
}) => {
    const [searchValue, setSearchValue] = useState("");
    const [toggleStates, setToggleStates] = useState({});

    useEffect(() => {
        const timeout = setTimeout(() => {
            onSearch(searchValue);
        }, searchDelay);
        return () => clearTimeout(timeout);
    }, [searchValue, onSearch]);

    const handleToggle = (index, onClick) => {
        setToggleStates((prev) => ({
            ...prev,
            [index]: !prev[index],
        }));
        if (onClick) onClick(!toggleStates[index]);
    };

    return (
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 lg:p-8 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-slate-800 text-white rounded-xl shadow-md">
                        {icon}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight text-slate-800">
                        {title}
                    </h1>
                </div>

                {/* ESTADÍSTICAS */}
                <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                    {stats.map((s, i) => (
                        <div key={i} className="text-center px-6 py-4 border border-slate-100 bg-slate-50 rounded-xl">
                            <div className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
                                {s.value}
                            </div>
                            <div className="text-slate-500 text-[10px] sm:text-xs uppercase tracking-widest font-bold mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* BUSCADOR */}
            {showSearch && (
                <div className="relative mb-6 z-10">
                    <input
                        type="text"
                        placeholder={searchPlaceholder.toUpperCase()}
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all uppercase tracking-wide"
                    />
                </div>
            )}

            {/* BOTONES */}
            <div className="flex flex-wrap gap-3 z-10 relative">
                {buttons.map((btn, i) => {
                    const isActive = toggleStates[i] || false;
                    let colorClass = "bg-slate-800 text-white hover:bg-slate-900 hover:shadow-md"; // Default
                    if (btn.color === "green") colorClass = "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md";
                    if (btn.color === "red") colorClass = "bg-rose-600 text-white hover:bg-rose-700 hover:shadow-md";
                    if (btn.color === "blue") colorClass = "bg-sky-600 text-white hover:bg-sky-700 hover:shadow-md";
                    if (btn.color === "purple") colorClass = "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md";

                    if (btn.type === "toggle") {
                        colorClass = isActive 
                            ? (btn.color === "green" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white") 
                            : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900";
                    }

                    return (
                        <button
                            key={i}
                            onClick={() => btn.type === "toggle" ? handleToggle(i, btn.onClick) : btn.onClick()}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-200 ${colorClass}`}
                        >
                            {btn.icon}
                            {btn.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default Header;
