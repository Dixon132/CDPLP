import { useState } from "react";
import { LoginForm } from "../components/LoginForm";
import { AccesoForm } from "../components/AccesoForm";
import { useLogin } from "../hooks/useLogin";
import { useNavigate } from "react-router-dom";
import sendLogin from "../services/sendLogin";
import { motion } from "framer-motion";

export default function Login() {
    const navigate = useNavigate();
    const hook = useLogin((data) => sendLogin(data, navigate));
    const [showDashboardLogin, setShowDashboardLogin] = useState(false);

    if (!showDashboardLogin) {
        return (
            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full flex flex-col justify-center items-center p-8 md:p-12 relative z-10 bg-white min-h-[400px]"
            >
                <AccesoForm />
                
                <div className="mt-8 pt-6 border-t border-gray-100 w-full max-w-sm flex flex-col items-center gap-4">
                    <button 
                        onClick={() => setShowDashboardLogin(true)}
                        className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black border border-gray-200 hover:border-black py-2 px-4 transition-all w-3/4"
                    >
                        Acceso al Dashboard Administrativo
                    </button>
                    
                    <button onClick={() => navigate('/')} className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors border-b border-transparent hover:border-black">
                        &larr; Volver al Inicio
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full flex flex-col justify-center items-center p-8 md:p-12 relative z-10 bg-white min-h-[400px]"
        >
            <div className="w-full max-w-sm mb-4">
                <button 
                    onClick={() => setShowDashboardLogin(false)}
                    className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-all flex items-center"
                >
                    &larr; Volver a Acceso de Campo
                </button>
            </div>
            
            <LoginForm hook={hook} onSubmit={hook.onSubmit} />
        </motion.div>
    );
}
