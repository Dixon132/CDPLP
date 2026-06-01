import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
    Box,
    Button,
    Typography,
    Autocomplete,
    TextField,
    CircularProgress,
    Stack,
} from "@mui/material";
import { asignarColegiado, getColegiados } from "../../../services/ac-sociales";

export default function AsignarColegiados({ id, onSuccess, asignados }) {
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm();

    const [colegiados, setColegiados] = useState([]);

    const selectedColegiado = watch("id_colegiado");

    // Cargar datos de backend
    useEffect(() => {
        const fetchData = async () => {
            const col = await getColegiados();
            setColegiados(col.map(c => ({ id: c.id_colegiado, label: `${c.nombre} ${c.apellido}` })));
        };
        fetchData();
    }, []);

    // Envío del formulario
    const onSubmit = async (formData) => {
        if (!formData.id_colegiado) {
            alert("Debes seleccionar un colegiado");
            return;
        }

        // 🔥 VALIDACIÓN DE DUPLICADO
        const yaExiste = asignados.some(
            item => item.id_colegiado === formData.id_colegiado.id
        );

        if (yaExiste) {
            alert("Este colegiado ya está asignado a la actividad");
            return;
        }

        const body = {
            id_actividad_social: id,
            id_colegiado: formData.id_colegiado.id,
        };

        await asignarColegiado(body);
        if (onSuccess) onSuccess();
    };

    return (
        <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{
                maxWidth: 500,
                mx: "auto",
                p: 4,
                display: "flex",
                flexDirection: "column",
                gap: 3,
            }}
        >
            <Typography variant="h6" fontWeight={700}>
                Asignar Colegiado
            </Typography>

            {/* Autocomplete Colegiado */}
            <Autocomplete
                options={colegiados}
                value={selectedColegiado || null}
                onChange={(_, value) => {
                    setValue("id_colegiado", value);
                }}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Seleccionar Colegiado"
                        fullWidth
                    />
                )}
            />



            <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                    type="submit"
                    variant="contained"
                    disabled={isSubmitting}
                    sx={{
                        textTransform: "none",
                        fontWeight: 600,
                    }}
                >
                    {isSubmitting ? <CircularProgress size={24} color="inherit" /> : "Asignar"}
                </Button>
            </Stack>
        </Box>
    );
}
