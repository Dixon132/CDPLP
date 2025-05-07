import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { AnimatePresence } from 'framer-motion';
import Navbar from '../features/users/components/Navbar';
import Footer from '../features/users/components/Footer';

const UserLayout = () => {

    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <Navbar scrolled={scrolled} />
            <main className="flex-grow">
                <AnimatePresence mode="wait">
                    <Outlet />
                </AnimatePresence>
            </main>
            <Footer />
        </div>
    );
};

export default UserLayout;