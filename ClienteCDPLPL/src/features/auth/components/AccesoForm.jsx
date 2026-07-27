import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function AccesoForm() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ correo: "", carnet_identidad: "", pin: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await fetch("/api/usuarios/auth/campo/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Credenciales incorrectas");
                setLoading(false);
                return;
            }
            // Guardar token de campo
            sessionStorage.setItem("campo_token", data.token);
            sessionStorage.setItem("campo_usuario", JSON.stringify(data.usuario));
            navigate(`/campo/${data.usuario.tipo.toLowerCase()}/${data.usuario.id}`);
        } catch {
            setError("Error de conexión. Inténtalo nuevamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-sm mx-auto">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-black uppercase tracking-tighter mb-4 text-black">ACCESO CAMPO</h1>
                <div className="w-12 h-[2px] bg-black mx-auto mb-4"></div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Sistema de Marcaje CDPLP</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-[10px] uppercase tracking-widest font-black text-black mb-2">
                        Correo Electrónico
                    </label>
                    <input
                        type="email"
                        name="correo"
                        value={form.correo}
                        onChange={handleChange}
                        required
                        className="w-full bg-white border-b-2 border-gray-200 py-2 px-1 focus:outline-none focus:border-black transition-all rounded-none text-sm font-bold placeholder-gray-300"
                        placeholder="tu@correo.com"
                    />
                </div>
                <div>
                    <label className="block text-[10px] uppercase tracking-widest font-black text-black mb-2">
                        Carnet de Identidad
                    </label>
                    <input
                        type="text"
                        name="carnet_identidad"
                        value={form.carnet_identidad}
                        onChange={handleChange}
                        required
                        className="w-full bg-white border-b-2 border-gray-200 py-2 px-1 focus:outline-none focus:border-black transition-all rounded-none text-sm font-bold placeholder-gray-300"
                        placeholder="Ej: 12345678"
                    />
                </div>
                <div>
                    <label className="block text-[10px] uppercase tracking-widest font-black text-black mb-2">
                        PIN de Acceso
                    </label>
                    <input
                        type="password"
                        name="pin"
                        value={form.pin}
                        onChange={handleChange}
                        required
                        maxLength={4}
                        className="w-full bg-white border-b-2 border-gray-200 py-2 px-1 text-center text-xl tracking-[0.5em] font-black focus:outline-none focus:border-black transition-all rounded-none placeholder-gray-300"
                        placeholder="••••"
                    />
                </div>

                {error && (
                    <div className="border border-black p-3 text-[10px] font-bold uppercase tracking-widest text-white bg-black flex items-center justify-center gap-2">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-black text-white py-4 px-4 font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all mt-4 shadow-[4px_4px_0px_0px_rgba(200,200,200,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
                >
                    {loading ? "VERIFICANDO..." : "INGRESAR AL CAMPO"}
                </button>
            </form>
        </div>
    );
}
