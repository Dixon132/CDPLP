// src/utils/theme.js
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
    palette: {
        mode: "light",
        primary: {
            main: "#6366F1", // Indigo
            light: "#A5B4FC",
            dark: "#4338CA",
        },
        secondary: {
            main: "#EC4899", // Pink
            light: "#F9A8D4",
            dark: "#BE185D",
        },
        success: {
            main: "#10B981",
        },
        error: {
            main: "#EF4444",
        },
        warning: {
            main: "#F59E0B",
        },
        background: {
            default: "#f7f9fc", // Fondo suave
            paper: "rgba(255,255,255,0.8)", // Para efecto glass
        },
    },

    // 🔷 Bordes suaves por defecto
    shape: {
        borderRadius: 16,
    },

    typography: {
        fontFamily: `'Inter', sans-serif`,
        h1: { fontWeight: 700, fontSize: "2.2rem" },
        h2: { fontWeight: 700 },
        button: { textTransform: "none", fontWeight: 600 },
    },

    // 🎨 Estilos globales para componentes
    components: {
        // ✅ TextField estilizado
        MuiTextField: {
            defaultProps: {
                variant: "outlined",
                fullWidth: true,
            },
            styleOverrides: {
                root: {
                    backgroundColor: "rgba(255,255,255,0.7)",
                    borderRadius: 12,
                    transition: "all 0.3s",
                    backdropFilter: "blur(6px)",
                    "& .MuiOutlinedInput-root": {
                        "& fieldset": {
                            borderColor: "#E2E8F0",
                        },
                        "&:hover fieldset": {
                            borderColor: "#A78BFA",
                        },
                        "&.Mui-focused fieldset": {
                            borderColor: "#6366F1",
                            boxShadow: "0 0 0 3px rgba(99,102,241,0.2)",
                        },
                    },
                },
            },
        },

        // ✅ Button degradado y moderno
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 14,
                    fontSize: "0.9rem",
                    padding: "10px 18px",
                    fontWeight: 600,
                    transition: "all 0.3s",
                    backgroundImage: "linear-gradient(90deg, #6366F1, #A855F7)",
                    color: "white",
                    "&:hover": {
                        transform: "translateY(-2px) scale(1.02)",
                        boxShadow: "0 8px 20px rgba(99,102,241,0.3)",
                    },
                },
            },
        },

        // ✅ Paper con efecto glass y sombra suave
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 20,
                    background: "rgba(255,255,255,0.7)",
                    backdropFilter: "blur(10px)",
                    boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
                },
            },
        },

        // ✅ Inputs de Select con mismo estilo
        MuiSelect: {
            styleOverrides: {
                outlined: {
                    backgroundColor: "rgba(255,255,255,0.7)",
                    borderRadius: 12,
                },
            },
        },

        // ✅ Contenedores con líneas suaves
        MuiContainer: {
            styleOverrides: {
                root: {
                    paddingTop: "20px",
                    paddingBottom: "20px",
                },
            },
        },
    },
});

export default theme;
