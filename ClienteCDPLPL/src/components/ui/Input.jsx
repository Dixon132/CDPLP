import React, { forwardRef } from 'react';

export const Input = forwardRef(({ 
    label, 
    id, 
    error, 
    type = 'text', 
    className = '',
    ...props 
}, ref) => {
    return (
        <div className={`space-y-2 w-full ${className}`}>
            {label && (
                <label htmlFor={id} className="block text-[10px] uppercase tracking-widest font-black text-black mb-2">
                    {label}
                </label>
            )}
            <input
                id={id}
                ref={ref}
                type={type}
                className={`w-full bg-transparent border-b-2 py-3 px-1 focus:outline-none transition-all rounded-none text-sm font-bold placeholder-gray-300 ${
                    error ? 'border-red-500 focus:border-red-700 text-red-500' : 'border-gray-200 focus:border-black text-black'
                }`}
                {...props}
            />
            {error && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mt-2">
                    {error}
                </p>
            )}
        </div>
    );
});

Input.displayName = 'Input';
