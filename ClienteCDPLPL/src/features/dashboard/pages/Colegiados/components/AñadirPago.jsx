import React, { useState } from "react";
import {
    Box,
    Button,
    TextField,
    Typography,
    Paper,
    FormHelperText,
    FormControl,
} from "@mui/material";
import { useForm } from "react-hook-form";
import { createPago } from "../../../services/colegiados";

const AñadirPago = ({ id }) => {
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm();
    const [submitted, setSubmitted] = useState(false);
    const [fileComprobante, setFileComprobante] = useState(null);

    // Fecha de hoy en YYYY-MM-DD para validación
    const today = new Date().toISOString().split("T")[0];

    const onSubmit = async (data) => {
        try {
            const formData = new FormData();
            formData.append("concepto", data.concepto);
            formData.append("fecha_pago", data.fecha_pago);
            formData.append("monto", data.monto);
            if (fileComprobante) {
                formData.append("comprobante", fileComprobante);
            }

            await createPago(id, formData);
            setSubmitted(true);
        } catch (err) {
            console.error("Error al registrar pago:", err);
            alert("Hubo un error al registrar el pago.");
        }
    };

    return (
        <Paper elevation={3} sx={{ p: 4, maxWidth: 500, mx: "auto" }}>
            <Typography variant="h6" gutterBottom>
                Registrar Pago
            </Typography>

            <Box
                component="form"
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                sx={{ display: "flex", flexDirection: "column", gap: 3 }}
            >
                {/* Concepto */}
                <TextField
                    label="Concepto"
                    fullWidth
                    {...register("concepto", {
                        required: "El concepto es obligatorio",
                    })}
                    error={!!errors.concepto}
                    helperText={errors.concepto?.message}
                />

                {/* Fecha de Pago */}
                <TextField
                    label="Fecha de Pago"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ max: today }}
                    {...register("fecha_pago", {
                        required: "La fecha de pago es obligatoria",
                        validate: (value) =>
                            value <= today || "No puede seleccionar una fecha futura",
                    })}
                    error={!!errors.fecha_pago}
                    helperText={errors.fecha_pago?.message}
                />

                {/* Monto */}
                <TextField
                    label="Monto"
                    type="number"
                    fullWidth
                    inputProps={{ min: 0, step: "0.01" }}
                    {...register("monto", {
                        required: "El monto es obligatorio",
                        valueAsNumber: true,
                        min: { value: 0.01, message: "El monto debe ser positivo" },
                    })}
                    error={!!errors.monto}
                    helperText={errors.monto?.message}
                />

                {/* Comprobante */}
                <Box>
                    <Typography variant="body2" color="text.secondary" mb={1}>
                        Comprobante (Opcional)
                    </Typography>
                    <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setFileComprobante(e.target.files[0])}
                        style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid #c4c4c4",
                            borderRadius: "4px"
                        }}
                    />
                </Box>

                <Button type="submit" variant="contained" size="large">
                    Registrar Pago
                </Button>

                {submitted && (
                    <Typography variant="body2" color="success.main">
                        Pago registrado correctamente.
                    </Typography>
                )}
            </Box>
        </Paper>
    );
};

export default AñadirPago;
