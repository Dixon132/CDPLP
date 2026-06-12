import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { createConvenio } from "../../../services/convenios";
import {
    Button,
    TextField,
    Box,
    Typography,
    Container,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    CircularProgress,
    Alert
} from "@mui/material";

export default function CreateConvenio({ onClose, onSuccess }) {
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm({
        defaultValues: {
            estado: "ACTIVO"
        }
    });

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const hoy = new Date().toISOString().split("T")[0];

    const onSubmit = async (data) => {
        setLoading(true);
        setErrorMsg("");
        
        try {
            await createConvenio(data);
            if (onSuccess) onSuccess();
            if (onClose) onClose();
            reset();
        } catch (error) {
            console.error("Error al crear convenio:", error);
            setErrorMsg("Ocurrió un error al crear el convenio. Inténtalo nuevamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{ mt: 2, mb: 2 }}>
                <Typography variant="h5" component="h2" gutterBottom align="center">
                    Nuevo Convenio
                </Typography>
                
                {errorMsg && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {errorMsg}
                    </Alert>
                )}

                <form onSubmit={handleSubmit(onSubmit)}>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 3 }}>
                        <TextField
                            label="Nombre del Convenio"
                            {...register("nombre", { required: "El nombre es obligatorio" })}
                            error={!!errors.nombre}
                            helperText={errors.nombre?.message}
                            fullWidth
                            placeholder="Ej: Convenio Universidad Mayor de San Andrés"
                        />

                        <TextField
                            label="Descripción (opcional)"
                            multiline
                            rows={3}
                            {...register("descripcion")}
                            fullWidth
                            placeholder="Detalles del alcance del convenio..."
                        />

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                label="Fecha de Inicio"
                                type="date"
                                InputLabelProps={{ shrink: true }}
                                {...register("fecha_inicio", {
                                    required: "La fecha de inicio es obligatoria",
                                    validate: (value) =>
                                        value >= hoy || "No puedes escoger una fecha pasada",
                                })}
                                error={!!errors.fecha_inicio}
                                helperText={errors.fecha_inicio?.message}
                                fullWidth
                            />

                            <TextField
                                label="Fecha de Fin (opcional)"
                                type="date"
                                InputLabelProps={{ shrink: true }}
                                {...register("fecha_fin", {
                                    validate: (value) =>
                                        !value || value >= hoy || "No puedes escoger una fecha pasada",
                                })}
                                error={!!errors.fecha_fin}
                                helperText={errors.fecha_fin?.message}
                                fullWidth
                            />
                        </Box>

                        <FormControl fullWidth error={!!errors.estado}>
                            <InputLabel id="estado-label">Estado Inicial</InputLabel>
                            <Select
                                labelId="estado-label"
                                label="Estado Inicial"
                                defaultValue="ACTIVO"
                                {...register("estado", { required: "El estado es obligatorio" })}
                            >
                                <MenuItem value="ACTIVO">ACTIVO</MenuItem>
                                <MenuItem value="INACTIVO">INACTIVO</MenuItem>
                            </Select>
                        </FormControl>

                        <Box sx={{ mt: 3, display: "flex", gap: 2, justifyContent: "flex-end" }}>
                            {onClose && (
                                <Button variant="outlined" color="inherit" onClick={onClose} disabled={loading}>
                                    Cancelar
                                </Button>
                            )}
                            <Button type="submit" variant="contained" color="primary" disabled={loading}>
                                {loading ? <CircularProgress size={24} color="inherit" /> : "Crear Convenio"}
                            </Button>
                        </Box>
                    </Box>
                </form>
            </Box>
        </Container>
    );
}
