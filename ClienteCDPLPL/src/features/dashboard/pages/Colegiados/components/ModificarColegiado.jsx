import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { TextField, Button, Box, MenuItem } from "@mui/material";
import { getColegiadoById, modificarColegiados } from "../../../services/colegiados";

const ModificarColegiado = ({ id, onClose }) => {
    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
        reset
    } = useForm();

    const today = new Date().toISOString().split("T")[0];

    // ✅ Carga de datos
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
                    especialidades: data.especialidades || "",
                    fecha_inscripcion: data.fecha_inscripcion?.split("T")[0] || "",
                    fecha_renovacion: data.fecha_renovacion?.split("T")[0] || "",
                    estado: data.estado || "",
                });
            } catch (error) {
                console.error("Error al obtener el colegiado:", error);
            }
        };
        fetchData();
    }, [id, reset]);

    const onSubmit = async (formData) => {
        try {
            await modificarColegiados(id, formData);
            if (onClose) onClose();
        } catch (error) {
            console.error("Error al modificar:", error);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Box display="flex" flexDirection="column" gap={2}>
                {/* Carnet Identidad */}
                <div>
                    <label className="block mb-1 font-semibold">Carnet de Identidad</label>
                    <TextField
                        fullWidth
                        {...register("carnet_identidad", { required: "Campo obligatorio" })}
                        error={!!errors.carnet_identidad}
                        helperText={errors.carnet_identidad?.message}
                        variant="outlined"
                        size="small"
                    />
                </div>

                {/* Nombre */}
                <div>
                    <label className="block mb-1 font-semibold">Nombre</label>
                    <TextField
                        fullWidth
                        {...register("nombre", { required: "Campo obligatorio" })}
                        error={!!errors.nombre}
                        helperText={errors.nombre?.message}
                        variant="outlined"
                        size="small"
                    />
                </div>

                {/* Apellido */}
                <div>
                    <label className="block mb-1 font-semibold">Apellido</label>
                    <TextField
                        fullWidth
                        {...register("apellido", { required: "Campo obligatorio" })}
                        error={!!errors.apellido}
                        helperText={errors.apellido?.message}
                        variant="outlined"
                        size="small"
                    />
                </div>

                {/* Correo */}
                <div>
                    <label className="block mb-1 font-semibold">Correo Electrónico</label>
                    <TextField
                        fullWidth
                        type="email"
                        {...register("correo", {
                            required: "Campo obligatorio",
                            pattern: {
                                value: /^[^@ ]+@[^@ ]+\.[^@ .]{2,}$/,
                                message: "Correo inválido",
                            },
                        })}
                        error={!!errors.correo}
                        helperText={errors.correo?.message}
                        variant="outlined"
                        size="small"
                    />
                </div>

                {/* Teléfono */}
                <div>
                    <label className="block mb-1 font-semibold">Teléfono</label>
                    <TextField
                        fullWidth
                        {...register("telefono", {
                            required: "Campo obligatorio",
                            pattern: {
                                value: /^[0-9]+$/,
                                message: "Solo números",
                            },
                        })}
                        error={!!errors.telefono}
                        helperText={errors.telefono?.message}
                        variant="outlined"
                        size="small"
                    />
                </div>

                {/* Especialidades */}
                <div>
                    <label className="block mb-1 font-semibold">Especialidades</label>
                    <TextField
                        fullWidth
                        {...register("especialidades", { required: "Campo obligatorio" })}
                        error={!!errors.especialidades}
                        helperText={errors.especialidades?.message}
                        variant="outlined"
                        size="small"
                    />
                </div>

                {/* Fecha Inscripción */}
                <div>
                    <label className="block mb-1 font-semibold">Fecha de Inscripción</label>
                    <TextField
                        fullWidth
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        {...register("fecha_inscripcion", {
                            required: "Campo obligatorio",
                            validate: (value) =>
                                value <= today || "No puede seleccionar una fecha futura",
                        })}
                        error={!!errors.fecha_inscripcion}
                        helperText={errors.fecha_inscripcion?.message}
                        variant="outlined"
                        size="small"
                    />
                </div>




                {/* Botones */}
                <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
                    <Button variant="outlined" color="secondary" onClick={onClose}>
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
