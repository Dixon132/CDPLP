import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import {
    TextField,
    Button,
    MenuItem,
    Box,
    Paper,
    Typography,
} from "@mui/material";
import { getPagoById, updatePago } from "../../../services/colegiados";

const VerDetalles = ({ id_pago, onSuccess }) => {
    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        defaultValues: {
            concepto: "",
            fecha_pago: "",
            monto: "",
            estado_pago: "",
        },
    });
    const [loading, setLoading] = useState(true);

    // Generamos la fecha LOCAL en YYYY-MM-DD
    const now = new Date();
    const today = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
    ].join("-");

    useEffect(() => {
        (async () => {
            try {
                const res = await getPagoById(id_pago);
                reset({
                    concepto: res.concepto || "",
                    fecha_pago: res.fecha_pago?.slice(0, 10) || "",
                    monto: res.monto ?? "",
                    estado_pago: res.estado_pago || "",
                });
            } catch (err) {
                console.error("Error al cargar el pago:", err);
            } finally {
                setLoading(false);
            }
        })();
    }, [id_pago, reset]);

    const onSubmit = async (data) => {
        try {
            await updatePago(id_pago, data);
            alert("Pago actualizado correctamente");
            onSuccess?.();
        } catch (err) {
            console.error("Error al actualizar el pago:", err);
            alert("No se pudo actualizar el pago");
        }
    };

    if (loading) {
        return (
            <Typography align="center" sx={{ mt: 4 }}>
                Cargando...
            </Typography>
        );
    }

    return (
        <Paper elevation={3} sx={{ p: 4, maxWidth: 600, mx: "auto" }}>
            <Typography variant="h6" gutterBottom>
                Detalles del Pago
            </Typography>

            <Box
                component="form"
                onSubmit={handleSubmit(onSubmit)}
                sx={{ display: "flex", flexDirection: "column", gap: 3 }}
            >
                {/* Concepto */}
                <Controller
                    name="concepto"
                    control={control}
                    rules={{ required: "El concepto es obligatorio" }}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            label="Concepto"
                            fullWidth
                            error={!!errors.concepto}
                            helperText={errors.concepto?.message}
                        />
                    )}
                />

                {/* Fecha de pago */}
                <Controller
                    name="fecha_pago"
                    control={control}
                    rules={{
                        required: "La fecha de pago es obligatoria",
                        validate: (v) =>
                            v <= today || "No puede seleccionar una fecha futura",
                    }}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            label="Fecha de pago"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ max: today }}
                            error={!!errors.fecha_pago}
                            helperText={errors.fecha_pago?.message}
                        />
                    )}
                />

                {/* Monto */}
                <Controller
                    name="monto"
                    control={control}
                    rules={{
                        required: "El monto es obligatorio",
                        valueAsNumber: true,
                        min: { value: 0.01, message: "El monto debe ser positivo" },
                    }}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            label="Monto"
                            type="number"
                            fullWidth
                            inputProps={{ step: "0.01", min: 0.01 }}
                            error={!!errors.monto}
                            helperText={errors.monto?.message}
                        />
                    )}
                />

                {/* Estado del pago */}
                <Controller
                    name="estado_pago"
                    control={control}
                    rules={{ required: "Selecciona un estado" }}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            label="Estado del pago"
                            select
                            fullWidth
                            error={!!errors.estado_pago}
                            helperText={errors.estado_pago?.message}
                        >
                            <MenuItem value="">Selecciona...</MenuItem>
                            <MenuItem value="REALIZADO">REALIZADO</MenuItem>
                            <MenuItem value="PENDIENTE">PENDIENTE</MenuItem>
                            <MenuItem value="ANULADO">ANULADO</MenuItem>
                        </TextField>
                    )}
                />

                {/* Botones */}
                <Box sx={{ display: "flex", gap: 2 }}>
                    <Button type="submit" variant="contained" color="primary">
                        Guardar cambios
                    </Button>
                    <Button
                        variant="outlined"
                        color="error"
                        onClick={() => {
                            
                        }}
                    >
                        Eliminar definitivamente
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
};

export default VerDetalles;
