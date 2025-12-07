
import { useForm, Controller } from "react-hook-form";
import {
    TextField,
    Button,
    Box,
    Typography,
    Stack,
    MenuItem,
    Select,
    InputLabel,
    FormControl
} from "@mui/material";
import { createPasante } from "../../../../services/pasantes";

const CreatePasante = ({ onSuccess, onClose }) => {
    const {
        register,
        handleSubmit,
        reset,
        control,
        formState: { errors, isSubmitting }
    } = useForm({
        defaultValues: {
            institucion: "",
        },
    })

    const onSubmit = async (data) => {
        try {
            const response = await createPasante(data)
            if (onSuccess) onSuccess()
            reset()
            if (onClose) onClose()
        } catch (e) {
            console.error(e)
            alert("Error al crear pasante")
        }
    }
    return (
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ p: 2 }}>
            <Typography variant="h5" fontWeight="bold" mb={2}>
                Registrar pasante
            </Typography>

            <Stack spacing={2}>
                {/* Nombre */}
                <TextField
                    label="Nombre"
                    {...register("nombre", { required: "El nombre es obligatorio" })}
                    error={!!errors.nombre}
                    helperText={errors.nombre?.message}
                    fullWidth
                />

                {/* Apellido */}
                <TextField
                    label="Apellido"
                    {...register("apellido", { required: "El apellido es obligatorio" })}
                    error={!!errors.apellido}
                    helperText={errors.apellido?.message}
                    fullWidth
                />

                {/* carnet identidad */}
                <TextField
                    label="Carnet de identidad"
                    {...register("carnet_identidad", {
                        pattern: {
                            value: /^[0-9]{7,15}$/,
                            message: "Solo números",
                        },
                        required: "El numero de carnet es obligatorio"
                    })}
                    error={!!errors.carnet_identidad}
                    helperText={errors.carnet_identidad?.message}
                    fullWidth
                />
                {/* Correo (Opcional) */}
                <TextField
                    label="Correo electrónico"
                    type="email"
                    {...register("correo", {
                        pattern: {
                            value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
                            message: "Correo no válido",
                        },
                        required: "El correo es obligatorio"
                    })}
                    error={!!errors.correo}
                    helperText={errors.correo?.message}
                    fullWidth
                />

                {/* Teléfono (Opcional) */}
                <TextField
                    label="Teléfono"
                    {...register("telefono", {
                        pattern: {
                            value: /^[0-9]{7,15}$/,
                            message: "Solo números (7 a 15 dígitos)",
                        },
                        required: "El numero de telefono es obligatorio"
                    })}
                    error={!!errors.telefono}
                    helperText={errors.telefono?.message}
                    fullWidth
                />

                {/* Carrera (Select con Controller) */}
                <FormControl fullWidth error={!!errors.carrera}>
                    <InputLabel>Institucion</InputLabel>
                    <Controller
                        name="institucion"
                        control={control}
                        rules={{ required: "Seleccione una institucion" }}
                        render={({ field }) => (
                            <Select {...field} label="Institucion">
                                <MenuItem value="Ingeniería de Sistemas">Ingeniería de Sistemas</MenuItem>
                                <MenuItem value="Derecho">Derecho</MenuItem>
                                <MenuItem value="Administración">Administración</MenuItem>
                                <MenuItem value="Contaduría Pública">Contaduría Pública</MenuItem>
                            </Select>
                        )}
                    />
                    {errors.carrera && (
                        <Typography variant="caption" color="error">
                            {errors.carrera.message}
                        </Typography>
                    )}
                </FormControl>

                {/* Botones */}
                <Stack direction="row" justifyContent="flex-end" spacing={2} mt={2}>
                    <Button
                        variant="outlined"
                        color="secondary"
                        onClick={onClose}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Guardando..." : "Guardar"}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
};

export default CreatePasante;