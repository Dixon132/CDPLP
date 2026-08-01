
import { useForm } from "react-hook-form";
import { useState } from "react";
import {
    TextField,
    Button,
    Box,
    Typography,
    Stack
} from "@mui/material";
import InstitucionesSelect from "../../../../components/InstitucionesSelect";

/**
 * Formulario de registro de pasante.
 * No llama a la API: entrega el payload validado vía `onSubmitForm` para que el
 * contenedor lo confirme (ConfirmActionModal) antes de persistirlo. El PIN
 * generado por el servidor lo muestra el contenedor tras la creación.
 */
const CreatePasante = ({ onSubmitForm, onClose }) => {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting }
    } = useForm({
        defaultValues: {
            institucion: "",
        },
    })

    const [institucionSeleccionada, setInstitucionSeleccionada] = useState("");

    const onSubmit = (data) => {
        onSubmitForm({
            ...data,
            institucion: institucionSeleccionada,
        })
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

                {/* Institución */}
                <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Institución
                    </Typography>
                    <InstitucionesSelect
                        value={institucionSeleccionada}
                        onChange={setInstitucionSeleccionada}
                        allowCreate
                    />
                </Box>

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