import React from 'react';
import { motion } from 'framer-motion';



const Card= ({ children, className = '' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -5 }}
      className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default Card;