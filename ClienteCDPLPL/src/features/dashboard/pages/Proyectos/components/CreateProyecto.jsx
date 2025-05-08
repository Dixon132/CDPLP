import { useForm } from 'react-hook-form';
import {
    TextField,
    Button,
    Box,
    Container,
    Typography,
    MenuItem,
    InputLabel,
    FormControl,
    Select
} from '@mui/material';
import { createProyecto } from '../../../services/proyectos'; // Asegúrate de tener esta función creada

const estados = ['EN_PROCESO', 'FINALIZADO', 'SUSPENDIDO'];

const CreateProyecto = () => {
    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm();

    const onSubmit = async (data) => {
        try {
            // Formatear fechas a ISO con hora 00:00:00Z
            data.fecha_inicio = new Date(data.fecha_inicio).toISOString();
            data.fecha_fin = data.fecha_fin ? new Date(data.fecha_fin).toISOString() : null;

            await createProyecto(data);
            alert('Proyecto creado exitosamente');
        } catch (error) {
            console.error('Error al crear proyecto:', error);
            alert('Hubo un error');
        }
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Crear Nuevo Proyecto
                </Typography>

                <form onSubmit={handleSubmit(onSubmit)}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

                        <TextField
                            label="Título"
                            {...register('titulo', { required: 'El título es requerido' })}
                            error={!!errors.titulo}
                            helperText={errors.titulo?.message}
                        />

                        <TextField
                            label="Descripción"
                            multiline
                            rows={4}
                            {...register('descripcion', { required: 'La descripción es requerida' })}
                            error={!!errors.descripcion}
                            helperText={errors.descripcion?.message}
                        />

                        <TextField
                            label="Fecha de inicio"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            {...register('fecha_inicio', { required: 'La fecha de inicio es requerida' })}
                            error={!!errors.fecha_inicio}
                            helperText={errors.fecha_inicio?.message}
                        />

                        <TextField
                            label="Fecha de fin"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            {...register('fecha_fin')}
                        />

                        <TextField
                            label="ID del Responsable"
                            type="number"
                            {...register('id_responsable', { required: 'El ID del responsable es requerido' })}
                            error={!!errors.id_responsable}
                            helperText={errors.id_responsable?.message}
                        />

                        <TextField
                            label="Presupuesto"
                            type="number"
                            {...register('presupuesto', { required: 'El presupuesto es requerido' })}
                            error={!!errors.presupuesto}
                            helperText={errors.presupuesto?.message}
                        />

                        <FormControl fullWidth>
                            <InputLabel id="estado-label">Estado</InputLabel>
                            <Select
                                labelId="estado-label"
                                defaultValue=""
                                label="Estado"
                                {...register('estado', { required: 'El estado es requerido' })}
                                error={!!errors.estado}
                            >
                                {estados.map((estado) => (
                                    <MenuItem key={estado} value={estado}>
                                        {estado}
                                    </MenuItem>
                                ))}
                            </Select>
                            {errors.estado && (
                                <Typography variant="caption" color="error">
                                    {errors.estado.message}
                                </Typography>
                            )}
                        </FormControl>

                        <Button type="submit" variant="contained" color="primary">
                            Crear Proyecto
                        </Button>
                    </Box>
                </form>
            </Box>
        </Container>
    );
};

export default CreateProyecto;
