import { useForm, Controller } from "react-hook-form";
import { TextField, Button, Box, MenuItem } from "@mui/material";
import { createConvenio } from "../../../services/convenios";

export default function CreateConvenio({ onClose, onSuccess }) {
    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
        reset,
    } = useForm();

    // ✅ Fecha mínima: hoy
    const hoy = new Date().toISOString().split("T")[0];

    // ✅ Enviar datos
    const onSubmit = async (data) => {
        try {
            await createConvenio(data);
            if (onSuccess) onSuccess();
            if (onClose) onClose();
            reset();
        } catch (error) {
            console.error("Error al crear convenio:", error);
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
                            validate: (value) =>
                                !value || value >= hoy || "No puedes escoger una fecha pasada",
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
                        Crear Convenio
                    </Button>
                </Box>
            </Box>
        </form>
    );
}
