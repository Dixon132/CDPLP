import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { TextField, Button, Box, MenuItem } from "@mui/material";
import { getRolById, actualizarRol } from "../../../services/roles";

const roles = [
    "SECRETARIO_GENERAL",
    "PRESIDENTE",
    "VICEPRESIDENTE",
    "VOCAL",
    "SECRETARIO",
    "TESORERO",
    "NO_DEFINIDO",
];

const AsignarRol = ({ id, onClose }) => {
    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
        reset,
        setValue,
    } = useForm({
        defaultValues: {
            fecha_inicio: "",
            fecha_fin: "",
            rol: "",
        },
    });

    // ✅ Cargar datos si existen en la BD
    useEffect(() => {
        const fetchRol = async () => {
            try {
                const data = await getRolById(id);
                reset({
                    fecha_inicio: data.fecha_inicio?.split("T")[0] || "",
                    fecha_fin: data.fecha_fin?.split("T")[0] || "",
                    rol: data.rol || "",
                });
                setValue("rol", data.rol || "");
            } catch (error) {
                console.error("Error al obtener el rol:", error);
            }
        };
        if (id) fetchRol();
    }, [id, reset, setValue]);

    // ✅ Enviar cambios
    const onSubmit = async (formData) => {
        try {
            await actualizarRol(id, formData);
            if (onClose) onClose();
        } catch (error) {
            console.error("Error al actualizar el rol:", error);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Box display="flex" flexDirection="column" gap={2}>
                {/* Fecha de inicio */}
                <div>
                    <label className="block mb-1 font-semibold">Fecha de Inicio</label>
                    <TextField
                        fullWidth
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        {...register("fecha_inicio", {
                            required: "La fecha de inicio es obligatoria",
                        })}
                        error={!!errors.fecha_inicio}
                        helperText={errors.fecha_inicio?.message}
                        variant="outlined"
                        size="small"
                    />
                </div>

                {/* Fecha fin */}
                <div>
                    <label className="block mb-1 font-semibold">Fecha de Fin</label>
                    <TextField
                        fullWidth
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        {...register("fecha_fin", {
                            required: "La fecha de fin es obligatoria",
                        })}
                        error={!!errors.fecha_fin}
                        helperText={errors.fecha_fin?.message}
                        variant="outlined"
                        size="small"
                    />
                </div>

                {/* Rol del usuario */}
                <div>
                    <label className="block mb-1 font-semibold">Rol del Usuario</label>
                    <Controller
                        name="rol"
                        control={control}
                        rules={{ required: "Debe seleccionar un rol" }}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                select
                                fullWidth
                                variant="outlined"
                                size="small"
                                error={!!errors.rol}
                                helperText={errors.rol?.message}
                            >
                                <MenuItem value="">-- Seleccione un rol --</MenuItem>
                                {roles.map((rol, i) => (
                                    <MenuItem key={i} value={rol}>
                                        {rol.replaceAll("_", " ")}
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}
                    />
                </div>

                {/* Botones */}
                <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
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
                    >
                        Guardar Cambios
                    </Button>
                </Box>
            </Box>
        </form>
    );
};

export default AsignarRol;
