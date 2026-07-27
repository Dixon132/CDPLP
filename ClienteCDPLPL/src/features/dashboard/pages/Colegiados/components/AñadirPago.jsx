import React, { useState } from "react";
import {
    Box,
    Button,
    TextField,
    Typography,
    Paper,
    FormHelperText,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from "@mui/material";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { getConfigPago } from "../../../services/postulaciones";

const AñadirPago = ({ id, onSubmitForm }) => {
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm({
        defaultValues: {
            metodo_pago: "EFECTIVO",
            gestiones: 1
        }
    });
    const [submitted, setSubmitted] = useState(false);
    const [fileComprobante, setFileComprobante] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [montoInicial, setMontoInicial] = useState(0);

    useEffect(() => {
        getConfigPago().then(res => {
            if (res.monto_inicial) {
                setMontoInicial(Number(res.monto_inicial));
            }
        }).catch(err => console.error("Error fetching config:", err));
    }, []);

    const gestiones = watch("gestiones");
    const totalPagar = montoInicial * (gestiones || 1);
    
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
        const concepto = `Pago de colegiatura anual (${data.gestiones} gestión/es)`;
        formData.append("concepto", concepto);
        formData.append("metodo_pago", data.metodo_pago);
        
        // Fix timezone issue by appending local time
        const fecha_pago_local = data.fecha_pago ? `${data.fecha_pago}T00:00:00` : "";
        formData.append("fecha_pago", fecha_pago_local);
        
        formData.append("monto", totalPagar);
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
                {/* Gestiones */}
                <TextField
                    label="Cantidad de Gestiones a Pagar"
                    type="number"
                    fullWidth
                    inputProps={{ min: 1, max: 10, step: 1 }}
                    {...register("gestiones", {
                        required: "Debe ingresar la cantidad de gestiones",
                        valueAsNumber: true,
                        min: { value: 1, message: "Mínimo 1 gestión" },
                        max: { value: 10, message: "Máximo 10 gestiones" }
                    })}
                    error={!!errors.gestiones}
                    helperText={errors.gestiones?.message}
                />
                
                <Box sx={{ p: 2, bgcolor: "info.main", color: "info.contrastText", borderRadius: 1 }}>
                    <Typography variant="body1" fontWeight="bold">
                        Concepto: Pago de colegiatura anual ({gestiones || 1} gestión/es)
                    </Typography>
                </Box>

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

                {/* Monto (Calculado) */}
                <TextField
                    label="Monto Total a Pagar (Bs.)"
                    type="number"
                    fullWidth
                    value={totalPagar}
                    InputProps={{
                        readOnly: true,
                    }}
                    helperText={`Cálculo: ${montoInicial} Bs. × ${gestiones || 1} gestión(es)`}
                />

                {/* Método de Pago */}
                <FormControl fullWidth>
                    <InputLabel id="metodo-label">Método de Pago</InputLabel>
                    <Select
                        labelId="metodo-label"
                        label="Método de Pago"
                        {...register("metodo_pago")}
                    >
                        <MenuItem value="EFECTIVO">Efectivo</MenuItem>
                        <MenuItem value="QR">QR</MenuItem>
                        <MenuItem value="TRANSFERENCIA">Transferencia</MenuItem>
                    </Select>
                </FormControl>

                {/* Comprobante */}
                <Box>
                    <Typography variant="body2" color={metodoPago !== "EFECTIVO" ? "error" : "text.secondary"} mb={1}>
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
