import React, { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import {
    Button,
    TextField,
    Box,
    Typography,
    Container,
    MenuItem,
    Select,
    FormControl,
    InputLabel
} from '@mui/material';
import { createCorrespondencia, usuariosCorrespondencia } from "../../../services/correspondencia";

export default function CrearCorrespondencia({ onClose, onSuccess }) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    const [usuarios, setUsuarios] = useState([]);

    const hoy = new Date().toISOString().split('T')[0];

    const onSubmit = async (data) => {
        const formData = new FormData();
        formData.append("asunto", data.asunto);
        formData.append("contenido", data.contenido[0]);
        formData.append("resumen", data.resumen);
        formData.append("fecha_envio", data.fecha_envio);
        formData.append("remitente", data.remitente);
        formData.append("id_destinatario", data.id_destinatario);

        await createCorrespondencia(formData);
        alert("Correspondencia creada con éxito");
        if (onSuccess) onSuccess();
        if (onClose) onClose();
    };

    useEffect(() => {
        const fetchUsuarios = async () => {
            const listado = await usuariosCorrespondencia();
            setUsuarios(listado);
        };
        fetchUsuarios();
    }, []);

    return (
        <Container maxWidth="sm">
            <Box sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Registrar Correspondencia
                </Typography>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Asunto"
                            {...register('asunto', { required: "Asunto es obligatorio" })}
                            error={!!errors.asunto}
                            helperText={errors.asunto?.message}
                            fullWidth
                        />

                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>Contenido (PDF)</Typography>
                            <input
                                type="file"
                                accept="application/pdf"
                                {...register("contenido", { required: "El archivo PDF es obligatorio" })}
                            />
                            {errors.contenido && <Typography color="error" variant="caption">{errors.contenido.message}</Typography>}
                        </Box>

                        <TextField
                            label="Resumen"
                            multiline
                            rows={3}
                            {...register('resumen')}
                            fullWidth
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
                            label="Remitente"
                            {...register('remitente', { required: "Remitente obligatorio" })}
                            error={!!errors.remitente}
                            helperText={errors.remitente?.message}
                            fullWidth
                        />

                        <FormControl fullWidth error={!!errors.id_destinatario}>
                            <InputLabel id="destinatario-label">Destinatario</InputLabel>
                            <Select
                                labelId="destinatario-label"
                                label="Destinatario"
                                defaultValue=""
                                {...register('id_destinatario', { required: "Destinatario obligatorio" })}
                            >
                                <MenuItem value="">
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

                        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                            {onClose && (
                                <Button variant="outlined" color="secondary" onClick={onClose}>
                                    Cancelar
                                </Button>
                            )}
                            <Button type="submit" variant="contained" color="primary">
                                Crear
                            </Button>
                        </Box>
                    </Box>
                </form>
            </Box>
        </Container>
    );
}
