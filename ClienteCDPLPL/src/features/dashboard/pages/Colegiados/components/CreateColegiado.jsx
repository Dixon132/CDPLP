import { useForm } from 'react-hook-form';
import {
    Button, TextField, Box, Typography, Container,
    MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import { createColegiado } from '../../../services/colegiados'; // tu función API

const CreateColegiado = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();

    const estados = [
        { value: 'ACTIVO', label: 'Activo' },
        { value: 'INACTIVO', label: 'Inactivo' }
    ];

    const onSubmit = async (data) => {
        try {
            console.log(data)
            await createColegiado(data);
            alert("Colegiado creado exitosamente");
        } catch (error) {
            alert("Error al registrar colegiado");
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
                            {...register('carnet_identidad', { required: 'CI es requerido' })}
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

                        <TextField
                            label="Especialidades"
                            {...register('especialidades', { required: 'Campo requerido' })}
                            error={!!errors.especialidades}
                            helperText={errors.especialidades?.message}
                        />

                        <TextField
                            label="Fecha de Inscripción"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            {...register('fecha_inscripcion', { required: 'Campo requerido' })}
                            error={!!errors.fecha_inscripcion}
                            helperText={errors.fecha_inscripcion?.message}
                        />

                        <TextField
                            label="Fecha de Renovación"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            {...register('fecha_renovacion', { required: 'Campo requerido' })}
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
