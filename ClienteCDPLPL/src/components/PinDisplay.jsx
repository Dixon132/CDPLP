import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PinDisplay({ pin, fallback = "—" }) {
    const [show, setShow] = useState(false);

    if (!pin) {
        return <span className="text-slate-400 font-mono text-sm">{fallback}</span>;
    }

    return (
        <div className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-mono text-sm font-medium tracking-widest text-slate-700 min-w-[3.5rem] text-center">
                {show ? pin : "••••"}
            </span>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setShow(!show);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition-colors"
                title={show ? "Ocultar PIN" : "Ver PIN"}
            >
                {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
        </div>
    );
}
