import React from 'react';
import { motion } from 'framer-motion';


const SectionHeading = ({
    title,
    subtitle,
    centered = false,
    className = '',
}) => {
    return (
        <div className={`mb-10 ${centered ? 'text-center' : ''} ${className}`}>
            <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-3xl md:text-4xl font-bold text-gray-800 mb-4"
            >
                {title}
            </motion.h2>
            {subtitle && (
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-lg text-gray-600 max-w-2xl mx-auto"
                >
                    {subtitle}
                </motion.p>
            )}
        </div>
    );
};

export default SectionHeading;