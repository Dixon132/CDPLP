import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
    createMovimientoFinanciero,
    getMovimientosByPresupuesto,
    updateMovimientoFinanciero,
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

export default function MovimientoForm({
    presupuestoId,
    movimientoId = null,
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
            tipo_movimiento: "",
            categoria: "",
        }
    });

    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (movimientoId) {
            const fetchData = async () => {
                setLoading(true);
                try {
                    const allMovs = await getMovimientosByPresupuesto(presupuestoId);
                    const mov = allMovs.find((m) => m.id_movimiento === movimientoId);
                    if (mov) {
                        reset({
                            tipo_movimiento: mov.tipo_movimiento || "",
                            categoria: mov.categoria || "",
                            descripcion: mov.descripcion || "",
                            monto: mov.monto?.toString() || "",
                            fecha_movimiento: mov.fecha_movimiento
                                ? mov.fecha_movimiento.split("T")[0]
                                : "",
                        });
                    }
                } catch (error) {
                    console.error("Error al cargar el movimiento:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, [movimientoId, presupuestoId, reset]);

    const onSubmit = async (formData) => {
        setIsSubmitting(true);
        const payload = {
            id_presupuesto: presupuestoId,
            tipo_movimiento: formData.tipo_movimiento,
            categoria: formData.categoria,
            descripcion: formData.descripcion,
            monto: parseFloat(formData.monto),
            fecha_movimiento: formData.fecha_movimiento
                ? new Date(formData.fecha_movimiento)
                : null,
        };

        try {
            if (movimientoId) {
                await updateMovimientoFinanciero(movimientoId, payload);
                alert("Movimiento actualizado correctamente");
            } else {
                await createMovimientoFinanciero(payload);
                alert("Movimiento creado correctamente");
            }
            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (err) {
            console.error(err);
            alert("Error al guardar movimiento");
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
                    <Box sx={{ display: "flex", gap: 2 }}>
                        <FormControl fullWidth error={!!errors.tipo_movimiento}>
                            <InputLabel shrink id="tipo-label">Tipo</InputLabel>
                            <Select
                                labelId="tipo-label"
                                label="Tipo"
                                displayEmpty
                                value={watch("tipo_movimiento") || ""}
                                {...register("tipo_movimiento", { required: "Campo obligatorio" })}
                            >
                                <MenuItem value="" disabled>Seleccione...</MenuItem>
                                <MenuItem value="INGRESO">INGRESO</MenuItem>
                                <MenuItem value="EGRESO">EGRESO</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl fullWidth error={!!errors.categoria}>
                            <InputLabel shrink id="cat-label">Categoría</InputLabel>
                            <Select
                                labelId="cat-label"
                                label="Categoría"
                                displayEmpty
                                value={watch("categoria") || ""}
                                {...register("categoria", { required: "Campo obligatorio" })}
                            >
                                <MenuItem value="" disabled>Seleccione...</MenuItem>
                                <MenuItem value="OPERATIVO">OPERATIVO</MenuItem>
                                <MenuItem value="ADMINISTRATIVO">ADMINISTRATIVO</MenuItem>
                                <MenuItem value="EVENTOS">EVENTOS</MenuItem>
                                <MenuItem value="OTROS">OTROS</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    <TextField
                        label="Descripción"
                        multiline
                        rows={2}
                        InputLabelProps={{ shrink: true }}
                        {...register("descripcion")}
                        fullWidth
                    />

                    <Box sx={{ display: "flex", gap: 2 }}>
                        <TextField
                            label="Monto"
                            type="number"
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ min: 0, step: 0.1 }}
                            InputProps={{
                                startAdornment: <InputAdornment position="start">Bs.</InputAdornment>,
                            }}
                            {...register("monto", { required: "El monto es obligatorio" })}
                            error={!!errors.monto}
                            helperText={errors.monto?.message}
                            fullWidth
                        />

                        <TextField
                            label="Fecha"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            {...register("fecha_movimiento", { required: "La fecha es obligatoria" })}
                            error={!!errors.fecha_movimiento}
                            helperText={errors.fecha_movimiento?.message}
                            fullWidth
                        />
                    </Box>

                    <Box sx={{ mt: 2, display: "flex", gap: 2, justifyContent: "flex-end" }}>
                        {onClose && (
                            <Button variant="outlined" color="inherit" onClick={onClose} disabled={isSubmitting}>
                                Cancelar
                            </Button>
                        )}
                        <Button type="submit" variant="contained" color={movimientoId ? "warning" : "primary"} disabled={isSubmitting}>
                            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : (movimientoId ? "Guardar Cambios" : "Crear Movimiento")}
                        </Button>
                    </Box>
                </Box>
            </form>
        </Container>
    );
}
