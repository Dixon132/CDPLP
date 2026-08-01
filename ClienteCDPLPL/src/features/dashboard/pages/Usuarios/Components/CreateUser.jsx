import { useForm } from 'react-hook-form';
import { Button, TextField, Box, Typography, Container } from '@mui/material';

/**
 * Formulario de creación de usuario.
 * No llama a la API: entrega los datos validados vía `onSubmitForm` para que el
 * contenedor los confirme (ConfirmActionModal) antes de persistirlos.
 */
const CreateUser = ({ onSubmitForm }) => {
    const { register, handleSubmit, formState: { errors } } = useForm();

    const onSubmit = (data) => {
        onSubmitForm(data);
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Crear Nuevo Usuario
                </Typography>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                            label="Correo electrónico"
                            type="email"
                            {...register('correo', {
                                required: 'El correo es requerido',
                                pattern: {
                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                    message: 'Correo electrónico inválido'
                                }
                            })}
                            error={!!errors.correo}
                            helperText={errors.correo?.message}
                        />

                        <TextField
                            label="Contraseña"
                            type="password"
                            {...register('contraseña', {
                                required: 'La contraseña es requerida',
                                minLength: {
                                    value: 8,
                                    message: 'La contraseña debe tener al menos 8 caracteres'
                                }
                            })}
                            error={!!errors.contraseña}
                            helperText={errors.contraseña?.message}
                        />

                        <TextField
                            label="Teléfono"
                            {...register('telefono', {
                                required: 'El teléfono es requerido',
                                pattern: {
                                    value: /^[0-9]+$/,
                                    message: 'Solo se permiten números'
                                }
                            })}
                            error={!!errors.telefono}
                            helperText={errors.telefono?.message}
                        />

                        <TextField
                            label="Dirección"
                            {...register('direccion', { required: 'La dirección es requerida' })}
                            error={!!errors.direccion}
                            helperText={errors.direccion?.message}
                        />



                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            sx={{ mt: 2 }}
                        >
                            Crear Usuario
                        </Button>
                    </Box>
                </form>
            </Box>
        </Container>
    );
};

export default CreateUser;