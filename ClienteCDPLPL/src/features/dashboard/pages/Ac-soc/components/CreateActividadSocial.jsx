import { useForm } from 'react-hook-form';
import {
    Container, Box, Typography, TextField, Button,
    MenuItem, FormControl, InputLabel, Select
} from '@mui/material';
import { createActividadSocial } from '../../../services/ac-sociales';


const estados = ['PROGRAMADO', 'EN_PROGRESO', 'FINALIZADO'];
const tipos = ['Prevención', 'Intervención', 'Formación', 'Educación', 'Acompañamiento'];

const CreateActividadSocial = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();

    const onSubmit = async (data) => {
        try {
            data.fecha_inicio = new Date(data.fecha_inicio).toISOString();
            data.fecha_fin = new Date(data.fecha_fin).toISOString();
            data.costo = parseFloat(data.costo);

            await createActividadSocial(data);
            alert("Actividad registrada correctamente");
        } catch (error) {
            console.error(error);
            alert("Error al registrar la actividad");
        }
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{ mt: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Registrar Actividad Social
                </Typography>

                <form className='flex' onSubmit={handleSubmit(onSubmit)}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div>

                        <TextField
                            label="Nombre"
                            {...register('nombre', { required: 'El nombre es obligatorio' })}
                            error={!!errors.nombre}
                            helperText={errors.nombre?.message}
                            />

                        <TextField
                            label="Descripción"
                            multiline
                            rows={3}
                            {...register('descripcion', { required: 'La descripción es obligatoria' })}
                            error={!!errors.descripcion}
                            helperText={errors.descripcion?.message}
                            />

                        <TextField
                            label="Ubicación"
                            {...register('ubicacion', { required: 'La ubicación es obligatoria' })}
                            error={!!errors.ubicacion}
                            helperText={errors.ubicacion?.message}
                            />

                        <TextField
                            label="Motivo"
                            {...register('motivo', { required: 'El motivo es obligatorio' })}
                            error={!!errors.motivo}
                            helperText={errors.motivo?.message}
                            />

                        <TextField
                            label="Origen de la intervención"
                            {...register('origen_intervencion', { required: 'Este campo es obligatorio' })}
                            error={!!errors.origen_intervencion}
                            helperText={errors.origen_intervencion?.message}
                            />

                        <TextField
                            label="Fecha de inicio"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            {...register('fecha_inicio', { required: 'La fecha de inicio es obligatoria' })}
                            error={!!errors.fecha_inicio}
                            helperText={errors.fecha_inicio?.message}
                            />
                            </div>

<div>
                        <TextField
                            label="Fecha de fin"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            {...register('fecha_fin', { required: 'La fecha de fin es obligatoria' })}
                            error={!!errors.fecha_fin}
                            helperText={errors.fecha_fin?.message}
                            />

                        <TextField
                            label="Costo"
                            type="number"
                            {...register('costo', { required: 'El costo es obligatorio' })}
                            error={!!errors.costo}
                            helperText={errors.costo?.message}
                            />

                        <FormControl fullWidth>
                            <InputLabel id="estado-label">Estado</InputLabel>
                            <Select
                                labelId="estado-label"
                                defaultValue=""
                                label="Estado"
                                {...register('estado', { required: 'Selecciona un estado' })}
                                >
                                {estados.map((estado) => (
                                    <MenuItem key={estado} value={estado}>{estado}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel id="tipo-label">Tipo</InputLabel>
                            <Select
                                labelId="tipo-label"
                                defaultValue=""
                                label="Tipo"
                                {...register('tipo', { required: 'Selecciona un tipo' })}
                            >
                                {tipos.map((tipo) => (
                                    <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            label="ID del Responsable"
                            type="number"
                            {...register('id_responsable', { required: 'El responsable es obligatorio' })}
                            error={!!errors.id_responsable}
                            helperText={errors.id_responsable?.message}
                            />
                            </div>

                        <Button type="submit" variant="contained" color="primary">
                            Registrar Actividad
                        </Button>
                    </Box>
                </form>
            </Box>
        </Container>
    );
};

export default CreateActividadSocial;
