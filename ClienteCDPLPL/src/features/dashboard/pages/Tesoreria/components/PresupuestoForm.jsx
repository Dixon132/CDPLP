import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
    createPresupuesto,
    getPresupuestoById,
    updatePresupuesto,
} from "../../../services/tesoreria";
import {
    Button,
    TextField,
    Box,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    InputAdornment,
    CircularProgress,
    Container
} from "@mui/material";

export default function PresupuestoForm({
    presupuestoId = null,
    onClose,
    onSuccess,
}) {
    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm({
        defaultValues: {
            estado: "ACTIVO"
        }
    });

    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (presupuestoId) {
            const fetchData = async () => {
                setLoading(true);
                try {
                    const data = await getPresupuestoById(presupuestoId);
                    reset({
                        nombre_presupuesto: data.nombre_presupuesto || "",
                        descripcion: data.descripcion || "",
                        monto_total: data.monto_total || "",
                        fecha_asignacion: data.fecha_asignacion
                            ? data.fecha_asignacion.split("T")[0]
                            : "",
                        estado: data.estado || "ACTIVO",
                    });
                } catch (error) {
                    console.error("Error al cargar presupuesto", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, [presupuestoId, reset]);

    const onSubmit = async (formData) => {
        setIsSubmitting(true);
        const payload = {
            nombre_presupuesto: formData.nombre_presupuesto,
            descripcion: formData.descripcion,
            monto_total: parseFloat(formData.monto_total),
            fecha_asignacion: formData.fecha_asignacion
                ? new Date(formData.fecha_asignacion)
                : null,
            estado: formData.estado,
        };

        try {
            if (presupuestoId) {
                await updatePresupuesto(presupuestoId, payload);
                alert("Presupuesto actualizado correctamente");
            } else {
                await createPresupuesto(payload);
                alert("Presupuesto creado correctamente");
            }
            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (err) {
            console.error(err);
            alert("Error al guardar el presupuesto");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="sm" sx={{ py: 2 }}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <TextField
                        label="Nombre del Presupuesto"
                        InputLabelProps={{ shrink: true }}
                        {...register("nombre_presupuesto", { required: "Este campo es obligatorio" })}
                        error={!!errors.nombre_presupuesto}
                        helperText={errors.nombre_presupuesto?.message}
                        fullWidth
                    />

                    <TextField
                        label="Descripción"
                        multiline
                        rows={3}
                        InputLabelProps={{ shrink: true }}
                        {...register("descripcion")}
                        fullWidth
                    />

                    <TextField
                        label="Monto Total"
                        type="number"
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: 0, step: 0.1 }}
                        InputProps={{
                            startAdornment: <InputAdornment position="start">Bs.</InputAdornment>,
                        }}
                        {...register("monto_total", { required: "El monto es obligatorio" })}
                        error={!!errors.monto_total}
                        helperText={errors.monto_total?.message}
                        fullWidth
                    />

                    <TextField
                        label="Fecha de Asignación"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        {...register("fecha_asignacion", { required: "La fecha es obligatoria" })}
                        error={!!errors.fecha_asignacion}
                        helperText={errors.fecha_asignacion?.message}
                        fullWidth
                    />

                    <FormControl fullWidth error={!!errors.estado}>
                        <InputLabel shrink id="estado-label">Estado</InputLabel>
                        <Select
                            labelId="estado-label"
                            label="Estado"
                            displayEmpty
                            value={watch("estado") || "ACTIVO"}
                            {...register("estado", { required: "El estado es obligatorio" })}
                        >
                            <MenuItem value="ACTIVO">Activo</MenuItem>
                            <MenuItem value="INACTIVO">Inactivo</MenuItem>
                        </Select>
                    </FormControl>

                    <Box sx={{ mt: 2, display: "flex", gap: 2, justifyContent: "flex-end" }}>
                        {onClose && (
                            <Button variant="outlined" color="inherit" onClick={onClose} disabled={isSubmitting}>
                                Cancelar
                            </Button>
                        )}
                        <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : (presupuestoId ? "Guardar Cambios" : "Crear Presupuesto")}
                        </Button>
                    </Box>
                </Box>
            </form>
        </Container>
    );
}
