import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { TextField, Button, Box, MenuItem, Typography } from "@mui/material";
import { getColegiadoById, modificarColegiados } from "../../../services/colegiados";
import EspecialidadesSelect from "../../../components/EspecialidadesSelect";

const ModificarColegiado = ({ id, onClose, onSuccess }) => {
    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
        reset
    } = useForm();

    const [especialidades, setEspecialidades] = useState([]);
    const today = new Date().toISOString().split("T")[0];

    // Carga de datos del colegiado existente
    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getColegiadoById(id);
                reset({
                    carnet_identidad: data.carnet_identidad || "",
                    nombre: data.nombre || "",
                    apellido: data.apellido || "",
                    correo: data.correo || "",
                    telefono: data.telefono || "",
                    fecha_inscripcion: data.fecha_inscripcion?.split("T")[0] || "",
                    fecha_renovacion: data.fecha_renovacion?.split("T")[0] || "",
                    estado: data.estado || "",
                });
                // Parsear el string de especialidades al array de selección
                setEspecialidades(
                    (data.especialidades || "").split(", ").filter(Boolean)
                );
            } catch (error) {
                console.error("Error al obtener el colegiado:", error);
            }
        };
        fetchData();
    }, [id, reset]);

    const onSubmit = async (formData) => {
        try {
            const payload = {
                ...formData,
                especialidades: especialidades.join(", "),
            };
            if (payload.fecha_inscripcion) payload.fecha_inscripcion = `${payload.fecha_inscripcion}T00:00:00`;
            if (payload.fecha_renovacion) payload.fecha_renovacion = `${payload.fecha_renovacion}T00:00:00`;
            
            await modificarColegiados(id, payload);
            if (onSuccess) onSuccess();
            else if (onClose) onClose();
        } catch (error) {
            console.error("Error al modificar:", error);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Box display="flex" flexDirection="column" gap={2}>

                <TextField
                    label="Carnet de Identidad"
                    InputLabelProps={{ shrink: true }}
                    {...register("carnet_identidad", { required: "Campo obligatorio" })}
                    error={!!errors.carnet_identidad}
                    helperText={errors.carnet_identidad?.message}
                />

                <TextField
                    label="Nombre"
                    InputLabelProps={{ shrink: true }}
                    {...register("nombre", { required: "Campo obligatorio" })}
                    error={!!errors.nombre}
                    helperText={errors.nombre?.message}
                />

                <TextField
                    label="Apellido"
                    InputLabelProps={{ shrink: true }}
                    {...register("apellido", { required: "Campo obligatorio" })}
                    error={!!errors.apellido}
                    helperText={errors.apellido?.message}
                />

                <TextField
                    label="Correo Electrónico"
                    type="email"
                    InputLabelProps={{ shrink: true }}
                    {...register("correo", {
                        required: "Campo obligatorio",
                        pattern: {
                            value: /^[^@ ]+@[^@ ]+\.[^@ .]{2,}$/,
                            message: "Correo inválido",
                        },
                    })}
                    error={!!errors.correo}
                    helperText={errors.correo?.message}
                />

                <TextField
                    label="Teléfono"
                    InputLabelProps={{ shrink: true }}
                    {...register("telefono", {
                        required: "Campo obligatorio",
                        pattern: {
                            value: /^[0-9]+$/,
                            message: "Solo números",
                        },
                    })}
                    error={!!errors.telefono}
                    helperText={errors.telefono?.message}
                />

                <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Especialidades
                    </Typography>
                    <EspecialidadesSelect
                        value={especialidades}
                        onChange={setEspecialidades}
                        allowCreate
                    />
                </Box>

                <TextField
                    label="Fecha de Inscripción"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ max: today }}
                    {...register("fecha_inscripcion", {
                        required: "Campo obligatorio",
                        validate: (value) =>
                            value <= today || "No puede seleccionar una fecha futura",
                    })}
                    error={!!errors.fecha_inscripcion}
                    helperText={errors.fecha_inscripcion?.message}
                />

                <TextField
                    label="Fecha de Renovación"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: today }}
                    {...register("fecha_renovacion")}
                    error={!!errors.fecha_renovacion}
                    helperText={errors.fecha_renovacion?.message}
                />

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

export default ModificarColegiado;
