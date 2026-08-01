// src/utils/theme.js
import { createTheme } from "@mui/material/styles";

/**
 * Tema de MUI derivado del tema de la app.
 *
 * Los formularios dentro de los modales son MUI, mientras que el resto de la
 * interfaz es Tailwind. Como MUI no lee las variables CSS de `index.css`, aquí
 * se replican los mismos valores por tema: si no, en modo oscuro los campos y
 * diálogos seguirían saliendo blancos.
 *
 * Cada entrada debe coincidir con lo definido en `index.css` para el mismo
 * tema.
 */
const PALETAS = {
    claro: {
        modo: "light",
        superficie: "#FFFFFF",
        fondo: "#F8FAFC",
        borde: "#E2E8F0",
        bordeSuave: "#F1F5F9",
        bordeHover: "#94A3B8",
        textoFuerte: "#1E293B",
        texto: "#334155",
        textoSuave: "#475569",
        textoTenue: "#64748B",
        principal: "#334155",
        principalHover: "#1E293B",
        principalTexto: "#FFFFFF",
        exito: "#059669",
        error: "#DC2626",
        aviso: "#D97706",
        info: "#0284C7",
        sombraFoco: "rgba(51, 65, 85, 0.08)",
        sombraDialogo: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
    },
    oscuro: {
        modo: "dark",
        superficie: "#151b26",
        fondo: "#1b2330",
        borde: "#2e394a",
        bordeSuave: "#222b3a",
        bordeHover: "#3d4a5e",
        textoFuerte: "#f3f6fa",
        texto: "#e3e9f0",
        textoSuave: "#ccd5e0",
        textoTenue: "#9aa8bc",
        // En oscuro un botón "contained" claro deslumbra: se usa una superficie
        // elevada con texto claro.
        principal: "#2e394a",
        principalHover: "#3d4a5e",
        principalTexto: "#f3f6fa",
        exito: "#4ade9f",
        error: "#fca5a5",
        aviso: "#fbbf24",
        info: "#7ab0ff",
        sombraFoco: "rgba(148, 163, 184, 0.15)",
        sombraDialogo: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
    },
    durazno: {
        modo: "light",
        superficie: "#fffaf6",
        fondo: "#fdf2ea",
        borde: "#f0d7c8",
        bordeSuave: "#f9e6da",
        bordeHover: "#b79b8a",
        textoFuerte: "#33241f",
        texto: "#47342d",
        textoSuave: "#614a40",
        textoTenue: "#997d6d",
        principal: "#c9583f",
        principalHover: "#a8472f",
        principalTexto: "#fffaf6",
        exito: "#4f8a68",
        error: "#c95555",
        aviso: "#b57e2b",
        info: "#46789e",
        sombraFoco: "rgba(201, 88, 63, 0.12)",
        sombraDialogo: "0 25px 50px -12px rgba(71, 52, 45, 0.25)",
    },
};

/**
 * @param {string} temaId  'claro' | 'oscuro' | 'durazno'
 * @param {string} familia familia tipográfica CSS ya resuelta
 */
export function crearTemaMui(temaId = "claro", familia = "'Inter', sans-serif") {
    const c = PALETAS[temaId] ?? PALETAS.claro;

    return createTheme({
        palette: {
            mode: c.modo,
            primary: { main: c.principal, dark: c.principalHover, contrastText: c.principalTexto },
            secondary: { main: c.textoTenue },
            success: { main: c.exito },
            error: { main: c.error },
            warning: { main: c.aviso },
            info: { main: c.info },
            divider: c.borde,
            background: { default: c.fondo, paper: c.superficie },
            text: { primary: c.texto, secondary: c.textoTenue },
        },

        shape: { borderRadius: 4 },

        typography: {
            fontFamily: familia,
            h1: { fontWeight: 800, textTransform: "uppercase", letterSpacing: "-0.02em", color: c.textoFuerte },
            h2: { fontWeight: 800, textTransform: "uppercase", letterSpacing: "-0.02em", color: c.textoFuerte },
            h3: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "-0.02em", color: c.textoFuerte },
            h4: { fontWeight: 700, color: c.textoFuerte },
            h5: { fontWeight: 600, color: c.texto },
            h6: { fontWeight: 600, color: c.texto },
            button: { textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" },
            body1: { fontWeight: 500, color: c.textoSuave },
            body2: { fontWeight: 400, color: c.textoTenue },
        },

        components: {
            MuiTextField: {
                defaultProps: {
                    variant: "outlined",
                    fullWidth: true,
                    InputLabelProps: { shrink: true },
                },
            },

            MuiInputLabel: {
                styleOverrides: {
                    root: {
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        color: c.textoTenue,
                        "&.Mui-focused": { color: c.texto },
                    },
                },
            },

            MuiOutlinedInput: {
                styleOverrides: {
                    root: {
                        fontWeight: 500,
                        fontSize: "0.875rem",
                        borderRadius: 8,
                        backgroundColor: c.superficie,
                        color: c.texto,
                        transition: "all 0.2s ease-in-out",
                        "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: c.borde,
                            borderWidth: "1px",
                        },
                        "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: c.bordeHover },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: c.texto,
                            borderWidth: "2px",
                        },
                        "&.Mui-focused": { boxShadow: `0 4px 12px ${c.sombraFoco}` },
                    },
                    input: {
                        color: c.texto,
                        // El calendario nativo de los input[type=date] es negro
                        // sobre negro en modo oscuro sin esto.
                        "&::-webkit-calendar-picker-indicator": {
                            filter: c.modo === "dark" ? "invert(1) opacity(0.6)" : "none",
                        },
                    },
                },
            },

            MuiButton: {
                defaultProps: { disableElevation: true },
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                        fontSize: "0.75rem",
                        padding: "10px 20px",
                        fontWeight: 700,
                        transition: "all 0.2s",
                    },
                    contained: {
                        backgroundColor: c.principal,
                        color: c.principalTexto,
                        "&:hover": {
                            backgroundColor: c.principalHover,
                            transform: "translateY(-1px)",
                        },
                    },
                    outlined: {
                        borderColor: c.borde,
                        color: c.texto,
                        backgroundColor: c.superficie,
                        "&:hover": { backgroundColor: c.fondo, borderColor: c.bordeHover },
                    },
                },
            },

            MuiPaper: {
                styleOverrides: {
                    root: {
                        borderRadius: 12,
                        backgroundColor: c.superficie,
                        color: c.texto,
                        border: `1px solid ${c.bordeSuave}`,
                        backgroundImage: "none",
                    },
                },
            },

            MuiDialog: {
                styleOverrides: {
                    paper: {
                        borderRadius: 16,
                        border: `1px solid ${c.borde}`,
                        boxShadow: c.sombraDialogo,
                    },
                },
            },

            MuiDialogTitle: {
                styleOverrides: {
                    root: {
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.02em",
                        borderBottom: `1px solid ${c.bordeSuave}`,
                        color: c.textoFuerte,
                        paddingBottom: "16px",
                        marginBottom: "16px",
                    },
                },
            },

            MuiSelect: {
                styleOverrides: { select: { fontWeight: 500, color: c.texto } },
            },

            // Los desplegables de Select y Autocomplete se montan en un portal
            // fuera del árbol, así que necesitan el color explícito.
            MuiMenu: {
                styleOverrides: {
                    paper: { backgroundColor: c.superficie, border: `1px solid ${c.borde}` },
                },
            },
            MuiMenuItem: {
                styleOverrides: {
                    root: {
                        color: c.texto,
                        "&:hover": { backgroundColor: c.fondo },
                        "&.Mui-selected": { backgroundColor: c.bordeSuave },
                    },
                },
            },

            MuiFormHelperText: {
                styleOverrides: { root: { color: c.textoTenue } },
            },

            MuiTypography: {
                styleOverrides: { root: { color: "inherit" } },
            },

            MuiAlert: {
                styleOverrides: { root: { borderRadius: 10 } },
            },

            MuiCircularProgress: {
                styleOverrides: { root: { color: c.principal === "#2e394a" ? c.texto : c.principal } },
            },
        },
    });
}

// Tema por defecto, para quien lo importe sin pasar por el provider.
export default crearTemaMui("claro");
