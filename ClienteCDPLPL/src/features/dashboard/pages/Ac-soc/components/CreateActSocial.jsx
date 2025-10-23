import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import {
    TextField,
    Button,
    MenuItem,
    Box,
    Typography,
    FormControl,
    InputLabel,
    Select,
    Stack,
} from "@mui/material";
import { createActividadSocial, getConvenios } from "../../../services/ac-sociales";

export default function CreateActSocial({ onClose, onSuccess }) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    const [convenios, setConvenios] = useState([]);
    const hoy = new Date().toISOString().split("T")[0];

    useEffect(() => {
        const fetchConvenios = async () => {
            const data = await getConvenios();
            setConvenios(data);
        };
        fetchConvenios();
    }, []);

    const onSubmit = async (data) => {
        try {
            await createActividadSocial(data);
            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (error) {
            alert("Error al crear actividad social");
        }
    };

    return (
        <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                p: 3,
                width: "100%",
                maxWidth: 600,
            }}
        >
            <Typography variant="h6" fontWeight="bold">
                Registrar Actividad Social
            </Typography>

            {/* Nombre */}
            <TextField
                label="Nombre"
                {...register("nombre", { required: "El nombre es obligatorio" })}
                error={!!errors.nombre}
                helperText={errors.nombre?.message}
            />

            {/* Descripción */}
            <TextField
                label="Descripción"
                multiline
                rows={3}
                {...register("descripcion")}
            />

            {/* Ubicación */}
            <TextField label="Ubicación" {...register("ubicacion")} />

            {/* Motivo */}
            <TextField label="Motivo" {...register("motivo")} />

            {/* Convenio */}
            <FormControl>
                <InputLabel>Convenio</InputLabel>
                <Select
                    label="Convenio"
                    defaultValue=""
                    {...register("id_convenio")}
                >
                    <MenuItem value="">Sin convenio</MenuItem>
                    {convenios.map((conv) => (
                        <MenuItem key={conv.id_convenio} value={conv.id_convenio}>
                            {conv.nombre}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {/* Fecha de inicio */}
            <TextField
                label="Fecha de Inicio"
                type="date"
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: hoy }}
                {...register("fecha_inicio", {
                    required: "Fecha de inicio obligatoria",
                    validate: (value) =>
                        value >= hoy || "No puedes seleccionar una fecha pasada",
                })}
                error={!!errors.fecha_inicio}
                helperText={errors.fecha_inicio?.message}
            />

            {/* Fecha de fin */}
            <TextField
                label="Fecha de Fin"
                type="date"
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: hoy }}
                {...register("fecha_fin", {
                    validate: (value) =>
                        !value || value >= hoy || "No puedes seleccionar una fecha pasada",
                })}
                error={!!errors.fecha_fin}
                helperText={errors.fecha_fin?.message}
            />

            {/* Estado */}
            <FormControl error={!!errors.estado}>
                <InputLabel>Estado</InputLabel>
                <Select
                    label="Estado"
                    defaultValue=""
                    {...register("estado", { required: "Estado obligatorio" })}
                >
                    <MenuItem value="">Seleccione...</MenuItem>
                    <MenuItem value="ACTIVO">ACTIVO</MenuItem>
                    <MenuItem value="INACTIVO">INACTIVO</MenuItem>
                </Select>
                {errors.estado && (
                    <Typography variant="caption" color="error">
                        {errors.estado.message}
                    </Typography>
                )}
            </FormControl>

            {/* Tipo */}
            <TextField
                label="Tipo"
                {...register("tipo", { required: "Tipo obligatorio" })}
                error={!!errors.tipo}
                helperText={errors.tipo?.message}
            />

            {/* Botones */}
            <Stack direction="row" spacing={2} justifyContent="flex-end" mt={2}>
                <Button variant="outlined" onClick={onClose}>
                    Cancelar
                </Button>
                <Button type="submit" variant="contained" color="primary">
                    Crear Actividad
                </Button>
            </Stack>
        </Box>
    );
}
