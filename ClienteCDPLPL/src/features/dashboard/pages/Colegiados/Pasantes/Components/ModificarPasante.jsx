import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { TextField, Button, Box, MenuItem, Typography } from "@mui/material";
import { getPasanteById, modificarPasante } from "../../../../services/pasantes";
import InstitucionesSelect from "../../../../components/InstitucionesSelect";

const ModificarPasante = ({ id, onClose, onSuccess }) => {
    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
        reset,
    } = useForm({
        defaultValues: {
            institucion: "",
        },
    });

    const [institucionSeleccionada, setInstitucionSeleccionada] = useState("");

    // Carga de datos al abrir el modal
    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getPasanteById(id);
                reset({
                    nombre: data.nombre || "",
                    apellido: data.apellido || "",
                    carnet_identidad: data.carnet_identidad || "",
                    correo: data.correo || "",
                    telefono: data.telefono || "",
                });
                setInstitucionSeleccionada(data.institucion || "");
            } catch (error) {
                console.error("Error al obtener el pasante:", error);
            }
        };
        if (id) fetchData();
    }, [id, reset]);

    // Enviar cambios
    const onSubmit = async (formData) => {
        try {
            await modificarPasante(id, {
                ...formData,
                institucion: institucionSeleccionada,
            });
            if (onSuccess) onSuccess();
            else if (onClose) onClose();
        } catch (error) {
            console.error("Error al modificar el pasante:", error);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Box display="flex" flexDirection="column" gap={2}>

                <TextField
                    label="Nombre"
                    InputLabelProps={{ shrink: true }}
                    {...register("nombre", {
                        required: "El nombre es obligatorio",
                        minLength: { value: 2, message: "Mínimo 2 caracteres" },
                    })}
                    error={!!errors.nombre}
                    helperText={errors.nombre?.message}
                />

                <TextField
                    label="Apellido"
                    InputLabelProps={{ shrink: true }}
                    {...register("apellido", {
                        required: "El apellido es obligatorio",
                        minLength: { value: 2, message: "Mínimo 2 caracteres" },
                    })}
                    error={!!errors.apellido}
                    helperText={errors.apellido?.message}
                />

                <TextField
                    label="Carnet de Identidad"
                    InputLabelProps={{ shrink: true }}
                    {...register("carnet_identidad", {
                        required: "El número de carnet es obligatorio",
                        pattern: {
                            value: /^[0-9]{7,15}$/,
                            message: "Solo números (7 a 15 dígitos)",
                        },
                    })}
                    error={!!errors.carnet_identidad}
                    helperText={errors.carnet_identidad?.message}
                />

                <TextField
                    label="Correo Electrónico"
                    type="email"
                    InputLabelProps={{ shrink: true }}
                    {...register("correo", {
                        required: "El correo es obligatorio",
                        pattern: {
                            value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
                            message: "Correo no válido",
                        },
                    })}
                    error={!!errors.correo}
                    helperText={errors.correo?.message}
                />

                <TextField
                    label="Teléfono"
                    InputLabelProps={{ shrink: true }}
                    {...register("telefono", {
                        required: "El número de teléfono es obligatorio",
                        pattern: {
                            value: /^[0-9]{7,15}$/,
                            message: "Solo números (7 a 15 dígitos)",
                        },
                    })}
                    error={!!errors.telefono}
                    helperText={errors.telefono?.message}
                />

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

                <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
                    <Button variant="outlined" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" variant="contained" color="primary">
                        Guardar Cambios
                    </Button>
                </Box>
            </Box>
        </form>
    );
};

export default ModificarPasante;
