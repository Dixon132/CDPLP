import React, { useEffect, useRef, useState } from "react";
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
    Container,
    Typography,
} from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import Alerts from "../../../components/Alerts";

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
    const [alert, setAlert] = useState({ show: false, type: "success", message: "" });
    const [comprobante, setComprobante] = useState(null);
    const fileInputRef = useRef(null);

    const showAlert = (type, message) => {
        setAlert({ show: true, type, message });
    };

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
                showAlert("success", "Movimiento actualizado correctamente");
            } else {
                let createPayload;
                if (comprobante) {
                    createPayload = new FormData();
                    createPayload.append("id_presupuesto", presupuestoId);
                    createPayload.append("tipo_movimiento", formData.tipo_movimiento);
                    createPayload.append("categoria", formData.categoria);
                    if (formData.descripcion) createPayload.append("descripcion", formData.descripcion);
                    createPayload.append("monto", parseFloat(formData.monto));
                    if (formData.fecha_movimiento) createPayload.append("fecha_movimiento", new Date(formData.fecha_movimiento).toISOString());
                    createPayload.append("comprobante", comprobante);
                } else {
                    createPayload = payload;
                }
                await createMovimientoFinanciero(createPayload);
                showAlert("success", "Movimiento creado correctamente");
            }
            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (err) {
            console.error(err);
            showAlert("error", "Error al guardar movimiento");
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
            <Alerts type={alert.type} message={alert.message} show={alert.show} duration={2000} onClose={() => setAlert((prev) => ({ ...prev, show: false }))} />
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

                    {!movimientoId && (
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                                Comprobante (opcional)
                            </Typography>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.5,
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: 1,
                                    px: 2,
                                    py: 1.25,
                                    cursor: "pointer",
                                    "&:hover": { borderColor: "text.primary" },
                                }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <AttachFileIcon fontSize="small" color="action" />
                                <Typography variant="body2" color={comprobante ? "text.primary" : "text.secondary"} noWrap>
                                    {comprobante ? comprobante.name : "Seleccionar imagen o PDF..."}
                                </Typography>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,.pdf"
                                    style={{ display: "none" }}
                                    onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
                                />
                            </Box>
                            {comprobante && (
                                <Button
                                    size="small"
                                    color="inherit"
                                    sx={{ mt: 0.5, fontSize: 11 }}
                                    onClick={() => {
                                        setComprobante(null);
                                        if (fileInputRef.current) fileInputRef.current.value = "";
                                    }}
                                >
                                    Quitar archivo
                                </Button>
                            )}
                        </Box>
                    )}

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
