import React from 'react';
import { motion } from 'framer-motion';


const Button = ({
    children,
    variant = 'primary',
    size = 'medium',
    className = '',
    onClick,
    type = 'button',
}) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

    const variantStyles = {
        primary: 'bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500',
        secondary: 'bg-blue-100 text-blue-700 hover:bg-blue-200 focus:ring-blue-500',
        outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-teal-500',
    };

    const sizeStyles = {
        small: 'px-3 py-1.5 text-sm',
        medium: 'px-4 py-2 text-base',
        large: 'px-6 py-3 text-lg',
    };

    return (
        <motion.button
            type={type}
            className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
            onClick={onClick}
            whileTap={{ scale: 0.98 }}
            whileHover={{ translateY: -2 }}
        >
            {children}
        </motion.button>
    );
};

export default Button;