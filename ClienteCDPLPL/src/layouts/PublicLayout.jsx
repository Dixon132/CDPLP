import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const PublicLayout = () => {
    return (
        <div className="min-h-screen flex flex-col font-sans bg-white text-black selection:bg-black selection:text-white">
            <Navbar />
            
            <main className="flex-grow flex flex-col pt-20">
                <Outlet />
            </main>
            
            <Footer />
        </div>
    );
};
