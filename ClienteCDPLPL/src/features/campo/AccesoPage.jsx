import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AccesoPage() {
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
        <div style={{
            minHeight: "100vh",
            background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            padding: "1rem"
        }}>
            <div style={{
                background: "rgba(255,255,255,0.05)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "24px",
                padding: "3rem 2.5rem",
                width: "100%",
                maxWidth: "420px",
                boxShadow: "0 25px 50px rgba(0,0,0,0.4)"
            }}>
                {/* Logo / Header */}
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: "50%",
                        background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 auto 1rem",
                        fontSize: 28
                    }}>
                        🏥
                    </div>
                    <h1 style={{ color: "white", fontSize: "1.6rem", fontWeight: 700, margin: "0 0 0.25rem" }}>
                        Acceso de Campo
                    </h1>
                    <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem", margin: 0 }}>
                        CDPLP — Sistema de Marcaje
                    </p>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div>
                        <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem", display: "block", marginBottom: 6 }}>
                            Correo electrónico
                        </label>
                        <input
                            type="email"
                            name="correo"
                            value={form.correo}
                            onChange={handleChange}
                            required
                            placeholder="tu@correo.com"
                            style={inputStyle}
                        />
                    </div>
                    <div>
                        <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem", display: "block", marginBottom: 6 }}>
                            Carnet de Identidad
                        </label>
                        <input
                            type="text"
                            name="carnet_identidad"
                            value={form.carnet_identidad}
                            onChange={handleChange}
                            required
                            placeholder="Ej: 12345678"
                            style={inputStyle}
                        />
                    </div>
                    <div>
                        <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem", display: "block", marginBottom: 6 }}>
                            PIN de acceso (4 dígitos)
                        </label>
                        <input
                            type="password"
                            name="pin"
                            value={form.pin}
                            onChange={handleChange}
                            required
                            maxLength={4}
                            placeholder="••••"
                            style={{ ...inputStyle, textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.5rem" }}
                        />
                    </div>

                    {error && (
                        <div style={{
                            background: "rgba(239,68,68,0.2)",
                            border: "1px solid rgba(239,68,68,0.5)",
                            borderRadius: 10,
                            padding: "0.75rem 1rem",
                            color: "#fca5a5",
                            fontSize: "0.875rem",
                            display: "flex",
                            alignItems: "center",
                            gap: 8
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            background: loading ? "#4b5563" : "linear-gradient(135deg, #7c3aed, #a855f7)",
                            color: "white",
                            border: "none",
                            borderRadius: 12,
                            padding: "0.875rem",
                            fontSize: "1rem",
                            fontWeight: 600,
                            cursor: loading ? "not-allowed" : "pointer",
                            transition: "all 0.2s",
                            marginTop: "0.5rem"
                        }}
                    >
                        {loading ? "Verificando..." : "Ingresar"}
                    </button>
                </form>

                {/* Ayuda */}
                <p style={{
                    color: "rgba(255,255,255,0.45)",
                    fontSize: "0.8rem",
                    textAlign: "center",
                    marginTop: "1.5rem",
                    lineHeight: 1.6
                }}>
                    Tu PIN fue asignado cuando te registraron.<br />
                    Si no lo tienes, consulta con la administración.
                </p>
            </div>
        </div>
    );
}

const inputStyle = {
    width: "100%",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 10,
    padding: "0.75rem 1rem",
    color: "white",
    fontSize: "1rem",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
};
