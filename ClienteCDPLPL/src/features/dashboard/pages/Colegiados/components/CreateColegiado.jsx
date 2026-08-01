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
    InputLabel
} from '@mui/material';
import EspecialidadesSelect from '../../../components/EspecialidadesSelect';

/**
 * Formulario de registro de colegiado.
 * No llama a la API: entrega el payload validado vía `onSubmitForm` para que el
 * contenedor lo confirme (ConfirmActionModal) antes de persistirlo. El PIN
 * generado por el servidor lo muestra el contenedor tras la creación.
 */
const CreateColegiado = ({ onSubmitForm }) => {
    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm();

    const [especialidades, setEspecialidades] = useState([]);

    // Fecha de hoy en formato AAAA-MM-DD
    const today = new Date().toISOString().split('T')[0];

    const estados = [
        { value: 'ACTIVO', label: 'Activo' },
        { value: 'INACTIVO', label: 'Inactivo' }
    ];

    const onSubmit = (data) => {
        const payload = {
            ...data,
            especialidades: especialidades.join(", "),
        };
        if (payload.fecha_inscripcion) payload.fecha_inscripcion = `${payload.fecha_inscripcion}T00:00:00`;
        if (payload.fecha_renovacion) payload.fecha_renovacion = `${payload.fecha_renovacion}T00:00:00`;

        onSubmitForm(payload);
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

                        <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
                            Registrar Colegiado
                        </Button>
                    </Box>
                </form>
            </Box>
        </Container>
    );
};

export default CreateColegiado;
