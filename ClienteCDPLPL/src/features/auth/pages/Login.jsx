import { useState } from "react";
import { LoginForm } from "../components/LoginForm";
import { useLogin } from "../hooks/useLogin";
import { useNavigate } from "react-router-dom";
import sendLogin from "../services/sendLogin";

export default function Login() {
    const navigate = useNavigate();
    const hook = useLogin((data) => sendLogin(data, navigate));
    const [showDashboardLogin, setShowDashboardLogin] = useState(false);

    if (!showDashboardLogin) {
        return (
            <div className="w-full h-full flex flex-col justify-center items-center p-8 md:p-12 relative z-10 bg-white">
                <div className="mb-12 text-center">
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-black mb-4">
                        TIPO DE ACCESO
                    </h1>
                    <div className="w-16 h-[2px] bg-black mx-auto mb-6"></div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        Seleccione el portal al que desea ingresar
                    </p>
                </div>

                <div className="flex flex-col w-full max-w-sm space-y-6">
                    <button 
                        onClick={() => navigate('/acceso')}
                        className="group w-full bg-white border border-black text-black py-5 px-6 flex flex-col items-center hover:bg-black hover:text-white transition-all duration-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
                    >
                        <span className="font-black text-sm uppercase tracking-widest mb-1">Acceso de Campo</span>
                        <span className="text-[9px] font-bold tracking-wider opacity-60 uppercase">Sistema de Marcaje</span>
                    </button>
                    
                    <button 
                        onClick={() => setShowDashboardLogin(true)}
                        className="group w-full bg-white border border-black text-black py-5 px-6 flex flex-col items-center hover:bg-black hover:text-white transition-all duration-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
                    >
                        <span className="font-black text-sm uppercase tracking-widest mb-1">Acceso al Dashboard</span>
                        <span className="text-[9px] font-bold tracking-wider opacity-60 uppercase">Portal Administrativo</span>
                    </button>
                </div>
                
                <div className="mt-16 text-center">
                    <button onClick={() => navigate('/')} className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors border-b border-transparent hover:border-black">
                        &larr; Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full relative z-10 bg-white flex flex-col">
            <div className="p-6">
                <button 
                    onClick={() => setShowDashboardLogin(false)}
                    className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-black border-b border-transparent hover:border-black transition-all"
                >
                    &larr; Cambiar tipo de acceso
                </button>
            </div>
            <div className="flex-grow flex items-center justify-center">
                <LoginForm hook={hook} onSubmit={hook.onSubmit} />
            </div>
        </div>
    );
}
