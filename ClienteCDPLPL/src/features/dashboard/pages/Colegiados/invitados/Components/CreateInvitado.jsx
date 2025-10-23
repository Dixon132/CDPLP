// ✅ src/pages/.../CreateInvitado.jsx

import { useForm } from "react-hook-form";
import {
    TextField,
    Button,
    Box,
    Typography,
    Stack
} from "@mui/material";
import { createInvitado } from "../../../../services/invitados";
;

const CreateInvitado = ({ onSuccess, onClose }) => {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm();

    const onSubmit = async (data) => {
        try {
            const response = await createInvitado(data);
            if (onSuccess) onSuccess();
            reset();
            if (onClose) onClose();
        } catch (err) {
            console.error(err);
            alert("❌ Error al crear el invitado");
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ p: 2 }}>
            <Typography variant="h5" fontWeight="bold" mb={2}>
                Registrar invitado
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

                {/* Correo (Opcional) */}
                <TextField
                    label="Correo electrónico"
                    type="email"
                    {...register("correo", {
                        pattern: {
                            value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
                            message: "Correo no válido",
                        },
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
                    })}
                    error={!!errors.telefono}
                    helperText={errors.telefono?.message}
                    fullWidth
                />

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

export default CreateInvitado;
