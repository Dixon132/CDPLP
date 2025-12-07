import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { TextField, Button, Box, MenuItem } from "@mui/material";
import {
    getConvenioById,
    updateConvenioById,
} from "../../../services/convenios";

export default function ModificarConvenio({ id, onClose, onSuccess }) {
    const {
        register,
        handleSubmit,
        control,
        reset,
        watch,
        formState: { errors },
    } = useForm();

    const [loading, setLoading] = useState(true);
    const hoy = new Date().toISOString().split("T")[0];
    const fechaInicio = watch("fecha_inicio");

    // ✅ Cargar datos del convenio
    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await getConvenioById(id);
                reset({
                    nombre: res.nombre || "",
                    descripcion: res.descripcion || "",
                    fecha_inicio: res.fecha_inicio?.slice(0, 10) || "",
                    fecha_fin: res.fecha_fin?.slice(0, 10) || "",
                    estado: res.estado || "",
                });
                setLoading(false);
            } catch (error) {
                console.error("Error al obtener convenio:", error);
            }
        };
        if (id) fetch();
    }, [id, reset]);

    // ✅ Enviar cambios
    const onSubmit = async (data) => {
        try {
            await updateConvenioById(id, data);
            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (error) {
            console.error("Error al actualizar convenio:", error);
        }
    };

    if (loading) return <p className="text-center p-4">Cargando…</p>;

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Box display="flex" flexDirection="column" gap={2}>
                {/* Nombre */}
                <div>
                    <label className="block mb-1 font-semibold">Nombre</label>
                    <TextField
                        fullWidth
                        {...register("nombre", { required: "El nombre es obligatorio" })}
                        error={!!errors.nombre}
                        helperText={errors.nombre?.message}
                        variant="outlined"
                        size="small"
                    />
                </div>

                {/* Descripción */}
                <div>
                    <label className="block mb-1 font-semibold">Descripción</label>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        {...register("descripcion")}
                        variant="outlined"
                        size="small"
                    />
                </div>

                {/* Fecha inicio */}
                <div>
                    <label className="block mb-1 font-semibold">Fecha de Inicio</label>
                    <TextField
                        fullWidth
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        {...register("fecha_inicio", {
                            required: "La fecha de inicio es obligatoria",
                            validate: (value) =>
                                value >= hoy || "No puedes escoger una fecha pasada",
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
                            validate: (value) => {
                                if (!value) return true;
                                if (value < hoy)
                                    return "No puedes escoger una fecha pasada";
                                if (fechaInicio && value < fechaInicio)
                                    return "La fecha fin debe ser igual o posterior a la fecha inicio";
                                return true;
                            },
                        })}
                        error={!!errors.fecha_fin}
                        helperText={errors.fecha_fin?.message}
                        variant="outlined"
                        size="small"
                    />
                </div>

                {/* Estado */}
                <div>
                    <label className="block mb-1 font-semibold">Estado</label>
                    <Controller
                        name="estado"
                        control={control}
                        defaultValue=""
                        rules={{ required: "El estado es obligatorio" }}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                select
                                fullWidth
                                variant="outlined"
                                size="small"
                                error={!!errors.estado}
                                helperText={errors.estado?.message}
                            >
                                <MenuItem value="">-- Seleccione --</MenuItem>
                                <MenuItem value="ACTIVO">ACTIVO</MenuItem>
                                <MenuItem value="INACTIVO">INACTIVO</MenuItem>
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
}
