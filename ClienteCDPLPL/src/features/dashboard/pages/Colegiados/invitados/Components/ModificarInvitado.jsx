// ✅ src/features/.../ModificarInvitado.jsx

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { TextField, Button, Box, Typography, Alert } from "@mui/material";
import { getInvitadoById } from "../../../../services/invitados";

/**
 * Formulario de modificación de invitado.
 * No llama a la API: entrega el payload validado vía `onSubmitForm` para que el
 * contenedor lo confirme (ConfirmActionModal) antes de persistirlo.
 */
const ModificarInvitado = ({ id, onClose, onSubmitForm }) => {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm();

    const [serverError, setServerError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getInvitadoById(id);
                reset({
                    nombre: data.nombre || "",
                    apellido: data.apellido || "",
                    correo: data.correo || "",
                    telefono: data.telefono || "",
                });
            } catch (error) {
                console.error("Error al obtener invitado:", error);
                setServerError("No se pudo cargar la información del invitado.");
            }
        };
        fetchData();
    }, [id, reset]);

    const onSubmit = (formData) => {
        setServerError(null);
        onSubmitForm(formData);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Box display="flex" flexDirection="column" gap={2}>

                <Typography variant="h5" fontWeight="bold">
                    Editar Invitado
                </Typography>

                {serverError && (
                    <Alert severity="error" onClose={() => setServerError(null)}>
                        {serverError}
                    </Alert>
                )}

                {/* Nombre */}
                <TextField
                    label="Nombre"
                    InputLabelProps={{ shrink: true }}
                    {...register("nombre", {
                        required: "El nombre es obligatorio",
                        minLength: {
                            value: 2,
                            message: "El nombre debe tener al menos 2 caracteres",
                        },
                    })}
                    error={!!errors.nombre}
                    helperText={errors.nombre?.message}
                />

                {/* Apellido */}
                <TextField
                    label="Apellido"
                    InputLabelProps={{ shrink: true }}
                    {...register("apellido", {
                        required: "El apellido es obligatorio",
                        minLength: {
                            value: 2,
                            message: "El apellido debe tener al menos 2 caracteres",
                        },
                    })}
                    error={!!errors.apellido}
                    helperText={errors.apellido?.message}
                />

                {/* Correo (Opcional) */}
                <TextField
                    label="Correo electrónico (opcional)"
                    type="email"
                    InputLabelProps={{ shrink: true }}
                    {...register("correo", {
                        pattern: {
                            value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
                            message: "Correo no válido",
                        },
                    })}
                    error={!!errors.correo}
                    helperText={errors.correo?.message}
                />

                {/* Teléfono (Opcional) */}
                <TextField
                    label="Teléfono (opcional)"
                    InputLabelProps={{ shrink: true }}
                    {...register("telefono", {
                        pattern: {
                            value: /^[0-9]{7,15}$/,
                            message: "Solo números (7 a 15 dígitos)",
                        },
                    })}
                    error={!!errors.telefono}
                    helperText={errors.telefono?.message}
                />

                {/* Botones */}
                <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
                    <Button variant="outlined" onClick={onClose} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                </Box>
            </Box>
        </form>
    );
};

export default ModificarInvitado;
