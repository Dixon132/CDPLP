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
import { asignarPasante, getPasantes } from "../../../services/ac-sociales";

export default function AsignarPasantes({ id, onSuccess, asignados }) {
    const {
        handleSubmit,
        setValue,
        watch,
        formState: { isSubmitting },
    } = useForm();

    const [pasantes, setPasantes] = useState([]);

    const selectedPasante = watch("id_pasante");

    // Cargar datos de backend
    useEffect(() => {
        const fetchData = async () => {
            const data = await getPasantes();
            setPasantes(
                data.map(p => ({
                    id: p.id_pasante,
                    label: `${p.nombre} ${p.apellido}`,
                }))
            );
        };
        fetchData();
    }, []);

    // Envío del formulario
    const onSubmit = async (data) => {
        if (!data.id_pasante) {
            alert("Debes seleccionar un pasante");
            return;
        }

        const yaExiste = asignados.some(
            item => item.id_pasante === data.id_pasante.id
        )

        if (yaExiste) {
            alert("Este pasante ya está asignado a la actividad");
            return;
        }

        const body = {
            id_actividad_social: id,
            id_pasante: data.id_pasante?.id || null,
        };

        await asignarPasante(body);
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
                Asignar Pasante
            </Typography>

            {/* Autocomplete Pasante */}
            <Autocomplete
                options={pasantes}
                getOptionLabel={(option) => option.label}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={selectedPasante || null}
                onChange={(_, value) => {
                    setValue("id_pasante", value);
                }}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Seleccionar Pasante"
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
                    {isSubmitting ? (
                        <CircularProgress size={24} color="inherit" />
                    ) : (
                        "Asignar"
                    )}
                </Button>
            </Stack>
        </Box>
    );
}
