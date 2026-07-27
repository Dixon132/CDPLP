import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { getConvenioById, updateConvenioById } from "../../../services/convenios";
import ConfirmActionModal from "../../../../../components/ConfirmActionModal";
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

export default function ModificarConvenio({ id, onClose, onSuccess }) {
    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm();

    const [loadingFetch, setLoadingFetch] = useState(true);
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [formData, setFormData] = useState(null);

    const hoy = new Date().toISOString().split("T")[0];

    // Cargar datos del convenio
    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await getConvenioById(id);
                reset({
                    nombre: res.nombre || "",
                    descripcion: res.descripcion || "",
                    fecha_inicio: res.fecha_inicio?.slice(0, 10) || "",
                    estado: res.estado || "",
                });
            } catch (error) {
                console.error("Error al obtener convenio:", error);
                setErrorMsg("No se pudo cargar la información del convenio.");
            } finally {
                setLoadingFetch(false);
            }
        };
        if (id) fetch();
    }, [id, reset]);

    const onSubmit = (data) => {
        setFormData(data);
        setConfirmOpen(true);
    };

    const handleUpdate = async () => {
        setConfirmOpen(false);
        setLoadingSubmit(true);
        setErrorMsg("");
        
        try {
            await updateConvenioById(id, formData);
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Error al actualizar convenio:", error);
            setErrorMsg("Ocurrió un error al actualizar. Inténtalo nuevamente.");
        } finally {
            setLoadingSubmit(false);
        }
    };

    if (loadingFetch) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="sm">
            <Box sx={{ mt: 2, mb: 2 }}>
                <Typography variant="h5" component="h2" gutterBottom align="center">
                    Modificar Convenio
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
                            InputLabelProps={{ shrink: true }}
                            {...register("nombre", { required: "El nombre es obligatorio" })}
                            error={!!errors.nombre}
                            helperText={errors.nombre?.message}
                            fullWidth
                        />

                        <TextField
                            label="Descripción (opcional)"
                            multiline
                            rows={3}
                            InputLabelProps={{ shrink: true }}
                            {...register("descripcion")}
                            fullWidth
                        />

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                label="Fecha de Inicio"
                                type="date"
                                InputLabelProps={{ shrink: true }}
                                {...register("fecha_inicio", {
                                    required: "La fecha de inicio es obligatoria",
                                })}
                                error={!!errors.fecha_inicio}
                                helperText={errors.fecha_inicio?.message}
                                fullWidth
                            />
                        </Box>

                        <Box sx={{ mt: 3, display: "flex", gap: 2, justifyContent: "flex-end" }}>
                            {onClose && (
                                <Button variant="outlined" color="inherit" onClick={onClose} disabled={loadingSubmit}>
                                    Cancelar
                                </Button>
                            )}
                            <Button type="submit" variant="contained" color="warning" disabled={loadingSubmit}>
                                {loadingSubmit ? <CircularProgress size={24} color="inherit" /> : "Guardar Cambios"}
                            </Button>
                        </Box>
                    </Box>
                </form>
            </Box>

            <ConfirmActionModal
                isOpen={confirmOpen}
                variant="edit"
                title="¿Confirmar cambios?"
                message="¿Estás seguro que deseas actualizar este convenio? Revisa que los datos modificados sean correctos."
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleUpdate}
            />
        </Container>
    );
}
