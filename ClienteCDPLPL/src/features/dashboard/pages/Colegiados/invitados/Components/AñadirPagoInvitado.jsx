import React, { useState } from "react";
import {
    Box,
    Button,
    TextField,
    Typography,
    Paper,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    InputAdornment,
} from "@mui/material";
import { useForm } from "react-hook-form";

/**
 * Registro de pago de un invitado.
 *
 * A diferencia del pago de colegiado, aquí NO aplica la lógica de gestiones ni
 * el monto de colegiatura: un invitado paga importes puntuales, así que el
 * concepto y el monto se escriben a mano.
 *
 * No llama a la API: entrega un FormData vía `onSubmitForm` para que el
 * contenedor lo confirme antes de persistirlo.
 */
const AñadirPagoInvitado = ({ onSubmitForm }) => {
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm({
        defaultValues: {
            metodo_pago: "EFECTIVO",
        },
    });

    const [fileComprobante, setFileComprobante] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");

    const metodoPago = watch("metodo_pago");

    // Fecha de hoy en YYYY-MM-DD para validación
    const today = new Date().toISOString().split("T")[0];

    const onSubmit = (data) => {
        if (data.metodo_pago !== "EFECTIVO" && !fileComprobante) {
            setErrorMsg("Debe adjuntar el comprobante para pagos por QR o Transferencia.");
            return;
        }
        setErrorMsg("");

        const formData = new FormData();
        formData.append("concepto", data.concepto.trim());
        formData.append("metodo_pago", data.metodo_pago);

        // Se fija la hora local para evitar el corrimiento de zona horaria
        const fecha_pago_local = data.fecha_pago ? `${data.fecha_pago}T00:00:00` : "";
        formData.append("fecha_pago", fecha_pago_local);

        formData.append("monto", data.monto);
        if (fileComprobante) {
            formData.append("comprobante", fileComprobante);
        }

        if (onSubmitForm) onSubmitForm(formData);
    };

    return (
        <Paper elevation={3} sx={{ p: 4, maxWidth: 500, mx: "auto" }}>
            <Typography variant="h6" gutterBottom>
                Registrar Pago
            </Typography>

            {errorMsg && (
                <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                    {errorMsg}
                </Typography>
            )}

            <Box
                component="form"
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                sx={{ display: "flex", flexDirection: "column", gap: 3 }}
            >
                {/* Concepto libre */}
                <TextField
                    label="Concepto del Pago"
                    fullWidth
                    placeholder="Ej. Inscripción al curso de actualización"
                    {...register("concepto", {
                        required: "El concepto es obligatorio",
                        validate: (v) => v.trim().length > 0 || "El concepto es obligatorio",
                        maxLength: { value: 100, message: "Máximo 100 caracteres" },
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

                {/* Monto libre */}
                <TextField
                    label="Monto a Pagar"
                    type="number"
                    fullWidth
                    inputProps={{ min: 0.01, step: "0.01" }}
                    InputProps={{
                        startAdornment: <InputAdornment position="start">Bs.</InputAdornment>,
                    }}
                    {...register("monto", {
                        required: "El monto es obligatorio",
                        valueAsNumber: true,
                        min: { value: 0.01, message: "El monto debe ser mayor que 0" },
                    })}
                    error={!!errors.monto}
                    helperText={errors.monto?.message}
                />

                {/* Método de Pago */}
                <FormControl fullWidth>
                    <InputLabel id="metodo-label">Método de Pago</InputLabel>
                    <Select
                        labelId="metodo-label"
                        label="Método de Pago"
                        defaultValue="EFECTIVO"
                        {...register("metodo_pago")}
                    >
                        <MenuItem value="EFECTIVO">Efectivo</MenuItem>
                        <MenuItem value="QR">QR</MenuItem>
                        <MenuItem value="TRANSFERENCIA">Transferencia</MenuItem>
                    </Select>
                </FormControl>

                {/* Comprobante */}
                <Box>
                    <Typography
                        variant="body2"
                        color={metodoPago !== "EFECTIVO" ? "error" : "text.secondary"}
                        mb={1}
                    >
                        Comprobante {metodoPago !== "EFECTIVO" ? "(Obligatorio)" : "(Opcional)"}
                    </Typography>
                    <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setFileComprobante(e.target.files[0])}
                        style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid #c4c4c4",
                            borderRadius: "4px",
                        }}
                    />
                </Box>

                <Button type="submit" variant="contained" size="large">
                    Registrar Pago
                </Button>
            </Box>
        </Paper>
    );
};

export default AñadirPagoInvitado;
