import React from 'react';

export const Button = ({ 
    children, 
    onClick, 
    type = 'button', 
    variant = 'primary', // 'primary' | 'outline' | 'ghost'
    className = '',
    disabled = false,
    fullWidth = false,
    ...props 
}) => {
    
    const baseStyles = "py-4 px-6 font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center";
    const widthStyle = fullWidth ? "w-full" : "";
    
    const variants = {
        primary: "bg-black text-white hover:bg-gray-800 shadow-[4px_4px_0px_0px_rgba(200,200,200,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]",
        outline: "bg-white border-2 border-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:bg-black hover:text-white hover:translate-x-[4px] hover:translate-y-[4px]",
        ghost: "bg-transparent text-gray-500 hover:text-black border-b border-transparent hover:border-black p-0"
    };

    const disabledStyles = disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "";

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${baseStyles} ${variants[variant]} ${widthStyle} ${disabledStyles} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};
