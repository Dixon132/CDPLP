// ✅ src/features/.../ModificarInvitado.jsx

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { TextField, Button, Box, Typography, Stack } from "@mui/material";
import { getInvitadoById, updateInvitado } from "../../../../services/invitados";

const ModificarInvitado = ({ id, onClose, onSuccess }) => {
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm();

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
            }
        };
        fetchData();
    }, [id, reset]);

    const onSubmit = async (formData) => {
        try {
            await updateInvitado(id, formData);
            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (error) {
            console.error("Error al actualizar invitado:", error);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ p: 2 }}>
            <Typography variant="h5" fontWeight="bold" mb={2}>
                Editar Invitado
            </Typography>

            <Stack spacing={2}>
                {/* Nombre */}
                <div>
                    <label className="block mb-1 font-semibold">Nombre</label>
                    <TextField
                        fullWidth
                        size="small"
                        {...register("nombre", { required: "Campo obligatorio" })}
                        error={!!errors.nombre}
                        helperText={errors.nombre?.message}
                        variant="outlined"
                    />
                </div>

                {/* Apellido */}
                <div>
                    <label className="block mb-1 font-semibold">Apellido</label>
                    <TextField
                        fullWidth
                        size="small"
                        {...register("apellido", { required: "Campo obligatorio" })}
                        error={!!errors.apellido}
                        helperText={errors.apellido?.message}
                        variant="outlined"
                    />
                </div>

                {/* Correo */}
                <div>
                    <label className="block mb-1 font-semibold">Correo (opcional)</label>
                    <TextField
                        fullWidth
                        size="small"
                        type="email"
                        {...register("correo", {
                            pattern: {
                                value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
                                message: "Correo no válido",
                            },
                        })}
                        error={!!errors.correo}
                        helperText={errors.correo?.message}
                        variant="outlined"
                    />
                </div>

                {/* Teléfono */}
                <div>
                    <label className="block mb-1 font-semibold">Teléfono (opcional)</label>
                    <TextField
                        fullWidth
                        size="small"
                        {...register("telefono", {
                            pattern: {
                                value: /^[0-9]{7,15}$/,
                                message: "Solo números (7-15 dígitos)",
                            },
                        })}
                        error={!!errors.telefono}
                        helperText={errors.telefono?.message}
                        variant="outlined"
                    />
                </div>

                {/* Botones */}
                <Stack direction="row" justifyContent="flex-end" spacing={2} mt={2}>
                    <Button variant="outlined" color="secondary" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" variant="contained" color="primary">
                        Guardar Cambios
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
};

export default ModificarInvitado;
