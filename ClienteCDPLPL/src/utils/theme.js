// src/utils/theme.js
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
    palette: {
        mode: "light",
        primary: {
            main: "#334155", // Slate 700 (Mate oscuro)
            light: "#64748B", // Slate 500
            dark: "#0F172A", // Slate 900
        },
        secondary: {
            main: "#8E9EAA", // Muted blue-grey
            light: "#CBD5E1",
            dark: "#475569",
        },
        success: {
            main: "#059669", // Emerald 600 (Mate)
            light: "#34D399",
            dark: "#065F46",
        },
        error: {
            main: "#DC2626", // Red 600 (Mate)
            light: "#F87171",
            dark: "#991B1B",
        },
        warning: {
            main: "#D97706", // Amber 600 (Mate)
            light: "#FBBF24",
            dark: "#92400E",
        },
        info: {
            main: "#0284C7", // Light Blue 600 (Mate)
        },
        background: {
            default: "#F8FAFC", // Slate 50
            paper: "#FFFFFF",
        },
    },

    shape: {
        borderRadius: 4, // Ligeramente redondeado, más elegante
    },

    typography: {
        fontFamily: `'Inter', sans-serif`,
        h1: { fontWeight: 800, textTransform: "uppercase", letterSpacing: "-0.02em", color: "#1E293B" },
        h2: { fontWeight: 800, textTransform: "uppercase", letterSpacing: "-0.02em", color: "#1E293B" },
        h3: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "-0.02em", color: "#1E293B" },
        h4: { fontWeight: 700, color: "#1E293B" },
        h5: { fontWeight: 600, color: "#334155" },
        h6: { fontWeight: 600, color: "#334155" },
        button: { textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" },
        body1: { fontWeight: 500, color: "#475569" },
        body2: { fontWeight: 400, color: "#64748B" },
    },

    components: {
        MuiTextField: {
            defaultProps: {
                variant: "outlined", // Volvemos a outlined pero elegante
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
                    color: "#64748B",
                    "&.Mui-focused": {
                        color: "#334155",
                    },
                },
            },
        },

        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    fontWeight: 500,
                    fontSize: "0.875rem",
                    borderRadius: 8, // Elegante y suave
                    backgroundColor: "#FFFFFF",
                    transition: "all 0.2s ease-in-out",
                    "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#E2E8F0",
                        borderWidth: "1px",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#94A3B8",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#334155",
                        borderWidth: "2px",
                    },
                    "&.Mui-focused": {
                        boxShadow: "0 4px 12px rgba(51, 65, 85, 0.08)",
                    }
                },
            },
        },

        MuiButton: {
            defaultProps: {
                disableElevation: true,
            },
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    fontSize: "0.75rem",
                    padding: "10px 20px",
                    fontWeight: 700,
                    transition: "all 0.2s",
                },
                contained: {
                    backgroundColor: "#334155",
                    color: "#ffffff",
                    "&:hover": {
                        backgroundColor: "#1E293B",
                        transform: "translateY(-1px)",
                        boxShadow: "0 4px 12px rgba(30, 41, 59, 0.15)",
                    },
                },
                outlined: {
                    borderColor: "#E2E8F0",
                    color: "#334155",
                    backgroundColor: "#FFFFFF",
                    "&:hover": {
                        backgroundColor: "#F8FAFC",
                        borderColor: "#94A3B8",
                    },
                },
            },
        },

        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    background: "#ffffff",
                    border: "1px solid #F1F5F9",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
                    backgroundImage: "none",
                },
                elevation1: {
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.025)",
                },
                elevation3: {
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
                }
            },
        },

        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: 16,
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
                },
            },
        },

        MuiDialogTitle: {
            styleOverrides: {
                root: {
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                    borderBottom: "1px solid #F1F5F9",
                    color: "#1E293B",
                    paddingBottom: "16px",
                    marginBottom: "16px",
                },
            },
        },

        MuiSelect: {
            styleOverrides: {
                select: {
                    fontWeight: 500,
                },
            },
        },
    },
});

export default theme;
