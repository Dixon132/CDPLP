import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
    getCorrespondenciaById,
    updateCorrespondenciaById,
    usuariosCorrespondencia,
} from "../../../services/correspondencia";
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
    CircularProgress
} from '@mui/material';
import Alerts from "../../../components/Alerts";

export default function EditarCorrespondencia({ id, onClose, onSuccess }) {
    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm();
    const [loading, setLoading] = useState(true);
    const [usuarios, setUsuarios] = useState([]);
    const [alert, setAlert] = useState({ show: false, type: "success", message: "" });

    const showAlert = (type, message) => {
        setAlert({ show: true, type, message });
    };

    const hoy = new Date().toISOString().split('T')[0];

    const estados = [
        "RECIBIDO",
        "VISTO",
        "A DISCUSIÓN",
        "PENDIENTE",
        "ARREGLADO"
    ];

    useEffect(() => {
        const fetchData = async () => {
            const res = await getCorrespondenciaById(id);
            reset({
                asunto: res.asunto,
                resumen: res.resumen,
                fecha_envio: res.fecha_envio?.slice(0, 10),
                fecha_recibido: res.fecha_recibido?.slice(0, 10) || '',
                remitente: res.remitente,
                id_destinatario: res.id_destinatario,
                estado: res.estado,
            });
            setLoading(false);
        };

        const fetchUsuarios = async () => {
            const lista = await usuariosCorrespondencia();
            setUsuarios(lista);
        };

        fetchUsuarios();
        fetchData();
    }, [id, reset]);

    const onSubmit = async (data) => {
        try {
            await updateCorrespondenciaById(id, data);
            if (onSuccess) onSuccess();
        } catch (error) {
            showAlert("error", "Error al actualizar correspondencia");
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
        <Container maxWidth="sm">
            <Alerts type={alert.type} message={alert.message} show={alert.show} duration={2000} onClose={() => setAlert((prev) => ({ ...prev, show: false }))} />
            <Box sx={{ mt: 2, mb: 2 }}>
                <Typography variant="h5" component="h2" gutterBottom>
                    Modificar Correspondencia
                </Typography>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="Asunto"
                            {...register('asunto', { required: "Asunto es obligatorio" })}
                            error={!!errors.asunto}
                            helperText={errors.asunto?.message}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />

                        <TextField
                            label="Resumen"
                            multiline
                            rows={3}
                            {...register('resumen')}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />

                        <TextField
                            label="Fecha de envío"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ max: hoy }}
                            {...register('fecha_envio', {
                                required: "Fecha de envío requerida",
                                validate: value => value <= hoy || "No puedes escoger una fecha futura"
                            })}
                            error={!!errors.fecha_envio}
                            helperText={errors.fecha_envio?.message}
                            fullWidth
                        />

                        <TextField
                            label="Fecha de recibido"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ max: hoy }}
                            {...register('fecha_recibido', {
                                validate: value => !value || value <= hoy || "No puedes escoger una fecha futura"
                            })}
                            error={!!errors.fecha_recibido}
                            helperText={errors.fecha_recibido?.message}
                            fullWidth
                        />

                        <TextField
                            label="Remitente"
                            {...register('remitente', { required: "Remitente obligatorio" })}
                            error={!!errors.remitente}
                            helperText={errors.remitente?.message}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />

                        <FormControl fullWidth error={!!errors.id_destinatario}>
                            <InputLabel shrink id="destinatario-label">Destinatario</InputLabel>
                            <Select
                                labelId="destinatario-label"
                                label="Destinatario"
                                displayEmpty
                                value={watch("id_destinatario") || ""}
                                {...register('id_destinatario', { required: "Destinatario obligatorio" })}
                            >
                                <MenuItem value="" disabled>
                                    <em>Selecciona un destinatario</em>
                                </MenuItem>
                                {usuarios.map(u => (
                                    <MenuItem key={u.id_usuario} value={u.id_usuario}>
                                        {u.nombre} {u.apellido}
                                    </MenuItem>
                                ))}
                            </Select>
                            {errors.id_destinatario && <Typography color="error" variant="caption">{errors.id_destinatario.message}</Typography>}
                        </FormControl>

                        <FormControl fullWidth error={!!errors.estado}>
                            <InputLabel shrink id="estado-label">Estado</InputLabel>
                            <Select
                                labelId="estado-label"
                                label="Estado"
                                value={watch("estado") || ""}
                                {...register('estado', { required: "Estado obligatorio" })}
                            >
                                {estados.map(est => (
                                    <MenuItem key={est} value={est}>
                                        {est}
                                    </MenuItem>
                                ))}
                            </Select>
                            {errors.estado && <Typography color="error" variant="caption">{errors.estado.message}</Typography>}
                        </FormControl>

                        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                            {onClose && (
                                <Button variant="outlined" color="inherit" onClick={onClose}>
                                    Cancelar
                                </Button>
                            )}
                            <Button type="submit" variant="contained" color="warning">
                                Actualizar
                            </Button>
                        </Box>
                    </Box>
                </form>
            </Box>
        </Container>
    );
}
