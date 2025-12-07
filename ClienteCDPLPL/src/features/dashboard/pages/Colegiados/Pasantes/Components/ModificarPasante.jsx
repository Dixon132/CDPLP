import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { TextField, Button, Box, MenuItem } from "@mui/material";
import { getPasanteById, modificarPasante } from "../../../../services/pasantes";

const ModificarPasante = ({ id, onClose }) => {
    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
        reset,
        setValue,
    } = useForm({
        defaultValues: {
            institucion: "",
        },
    });

    // ✅ Carga de datos al abrir el modal
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
                    institucion: data.institucion || "",
                });
                setValue("institucion", data.institucion || "");
            } catch (error) {
                console.error("Error al obtener el pasante:", error);
            }
        };
        if (id) fetchData();
    }, [id, reset, setValue]);

    // ✅ Enviar cambios
    const onSubmit = async (formData) => {
        try {
            await modificarPasante(id, formData);
            if (onClose) onClose();

        } catch (error) {
            console.error("Error al modificar el pasante:", error);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Box display="flex" flexDirection="column" gap={2}>
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

                {/* Carnet de identidad */}
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
                                message: "Solo números válidos",
                            },
                        })}
                        error={!!errors.telefono}
                        helperText={errors.telefono?.message}
                        variant="outlined"
                        size="small"
                    />
                </div>

                {/* Institución */}
                <div>
                    <label className="block mb-1 font-semibold">Institución</label>
                    <Controller
                        name="institucion"
                        control={control}
                        defaultValue=""
                        rules={{ required: "Campo obligatorio" }}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                select
                                fullWidth
                                variant="outlined"
                                size="small"
                                error={!!errors.institucion}
                                helperText={errors.institucion?.message}
                            >
                                <MenuItem value="">-- Seleccione --</MenuItem>
                                <MenuItem value="Ingeniería de Sistemas">
                                    Ingeniería de Sistemas
                                </MenuItem>
                                <MenuItem value="Derecho">Derecho</MenuItem>
                                <MenuItem value="Administración">Administración</MenuItem>
                                <MenuItem value="Contaduría Pública">
                                    Contaduría Pública
                                </MenuItem>
                            </TextField>
                        )}
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

export default ModificarPasante;
