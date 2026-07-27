import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
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
    Alert,
    IconButton,
    InputAdornment
} from '@mui/material';
import { Visibility, VisibilityOff, ContentCopy } from '@mui/icons-material';
import { createColegiado } from '../../../services/colegiados';
import EspecialidadesSelect from '../../../components/EspecialidadesSelect';

const CreateColegiado = ({ onSuccess }) => {
    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm();

    const [pinGenerado, setPinGenerado] = useState(null);
    const [mostrarPin, setMostrarPin] = useState(false);
    const [especialidades, setEspecialidades] = useState([]);

    // Fecha de hoy en formato AAAA-MM-DD
    const today = new Date().toISOString().split('T')[0];

    const estados = [
        { value: 'ACTIVO', label: 'Activo' },
        { value: 'INACTIVO', label: 'Inactivo' }
    ];

    const onSubmit = async (data) => {
        try {
            const payload = {
                ...data,
                especialidades: especialidades.join(", "),
            };
            if (payload.fecha_inscripcion) payload.fecha_inscripcion = `${payload.fecha_inscripcion}T00:00:00`;
            if (payload.fecha_renovacion) payload.fecha_renovacion = `${payload.fecha_renovacion}T00:00:00`;
            
            const response = await createColegiado(payload);
            const pin = response?.pin_temporal;
            if (pin) {
                setPinGenerado(pin);
            } else {
                onSuccess();
            }
        } catch (error) {
            alert('Error al registrar colegiado');
        }
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Registrar Colegiado
                </Typography>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Carnet de Identidad"
                            {...register('carnet_identidad', {
                                required: 'CI es requerido'
                            })}
                            error={!!errors.carnet_identidad}
                            helperText={errors.carnet_identidad?.message}
                        />

                        <TextField
                            label="Nombre"
                            {...register('nombre', { required: 'El nombre es requerido' })}
                            error={!!errors.nombre}
                            helperText={errors.nombre?.message}
                        />

                        <TextField
                            label="Apellido"
                            {...register('apellido', { required: 'El apellido es requerido' })}
                            error={!!errors.apellido}
                            helperText={errors.apellido?.message}
                        />

                        <TextField
                            label="Correo Electrónico"
                            type="email"
                            {...register('correo', {
                                required: 'El correo es requerido',
                                pattern: {
                                    value: /^[^@ ]+@[^@ ]+\.[^@ .]{2,}$/,
                                    message: 'Correo inválido'
                                }
                            })}
                            error={!!errors.correo}
                            helperText={errors.correo?.message}
                        />

                        <TextField
                            label="Teléfono"
                            {...register('telefono', {
                                required: 'El teléfono es requerido',
                                pattern: {
                                    value: /^[0-9]+$/,
                                    message: 'Solo números'
                                }
                            })}
                            error={!!errors.telefono}
                            helperText={errors.telefono?.message}
                        />

                        <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                Especialidades
                            </Typography>
                            <EspecialidadesSelect
                                value={especialidades}
                                onChange={setEspecialidades}
                                allowCreate
                            />
                        </Box>

                        <TextField
                            label="Fecha de Inscripción"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ max: today }}
                            {...register('fecha_inscripcion', {
                                required: 'Campo requerido',
                                validate: value =>
                                    value <= today || 'No puede seleccionar una fecha futura'
                            })}
                            error={!!errors.fecha_inscripcion}
                            helperText={errors.fecha_inscripcion?.message}
                        />

                        <TextField
                            label="Fecha de Renovación"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ min: today }}
                            {...register('fecha_renovacion', {
                                required: 'Campo requerido',
                                validate: value =>
                                    value >= today || 'No puede seleccionar una fecha pasada'
                            })}
                            error={!!errors.fecha_renovacion}
                            helperText={errors.fecha_renovacion?.message}
                        />

                        <FormControl fullWidth error={!!errors.estado}>
                            <InputLabel id="estado-label">Estado</InputLabel>
                            <Select
                                labelId="estado-label"
                                label="Estado"
                                defaultValue=""
                                {...register('estado', { required: 'El estado es requerido' })}
                            >
                                {estados.map((e) => (
                                    <MenuItem key={e.value} value={e.value}>
                                        {e.label}
                                    </MenuItem>
                                ))}
                            </Select>
                            {errors.estado && (
                                <Typography color="error" variant="caption">
                                    {errors.estado.message}
                                </Typography>
                            )}
                        </FormControl>

                        {pinGenerado && (
                            <Alert
                                severity="warning"
                                sx={{ mt: 2 }}
                                action={
                                    <IconButton
                                        color="inherit"
                                        size="small"
                                        onClick={() => {
                                            navigator.clipboard.writeText(pinGenerado);
                                        }}
                                    >
                                        <ContentCopy fontSize="small" />
                                    </IconButton>
                                }
                            >
                                <strong>PIN de acceso:</strong>{" "}
                                {mostrarPin ? pinGenerado : "••••"}
                                <IconButton
                                    size="small"
                                    onClick={() => setMostrarPin(!mostrarPin)}
                                    sx={{ ml: 0.5 }}
                                >
                                    {mostrarPin ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                </IconButton>
                                <br />
                                <Typography variant="caption" color="text.secondary">
                                    Guarda este PIN, solo se muestra una vez y es necesario para el acceso por GPS.
                                </Typography>
                            </Alert>
                        )}
                        {pinGenerado ? (
                            <Button
                                variant="contained"
                                color="success"
                                onClick={() => {
                                    setPinGenerado(null);
                                    onSuccess();
                                }}
                            >
                                Entendido, continuar
                            </Button>
                        ) : (
                            <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
                                Registrar Colegiado
                            </Button>
                        )}
                    </Box>
                </form>
            </Box>
        </Container>
    );
};

export default CreateColegiado;
