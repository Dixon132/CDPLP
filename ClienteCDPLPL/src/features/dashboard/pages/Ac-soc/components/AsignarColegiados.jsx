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
import { asignarColegiado, getColegiados, getInvitados } from "../../../services/ac-sociales";

export default function AsignarColegiados({ id, onSuccess }) {
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm();

    const [colegiados, setColegiados] = useState([]);
    const [invitados, setInvitados] = useState([]);

    const selectedColegiado = watch("id_colegiado");
    const selectedInvitado = watch("id_invitado");

    // Cargar datos de backend
    useEffect(() => {
        const fetchData = async () => {
            const col = await getColegiados();
            const inv = await getInvitados();
            setColegiados(col.map(c => ({ id: c.id_colegiado, label: `${c.nombre} ${c.apellido}` })));
            setInvitados(inv.map(i => ({ id: i.id_invitado, label: `${i.nombre} ${i.apellido}` })));
        };
        fetchData();
    }, []);

    // Envío del formulario
    const onSubmit = async (data) => {
        if (!data.id_colegiado && !data.id_invitado) {
            alert("Debes seleccionar un colegiado o un invitado.");
            return;
        }
        if (data.id_colegiado && data.id_invitado) {
            alert("Solo puedes seleccionar uno, no ambos.");
            return;
        }

        const body = {
            id_actividad_social: id,
            id_colegiado: data.id_colegiado?.id || null,
            id_invitado: data.id_invitado?.id || null,
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
                Asignar Colegiado o Invitado
            </Typography>

            {/* Autocomplete Colegiado */}
            <Autocomplete
                options={colegiados}
                value={selectedColegiado || null}
                onChange={(_, value) => {
                    setValue("id_colegiado", value);
                    if (value) setValue("id_invitado", null);
                }}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Seleccionar Colegiado"
                        fullWidth
                    />
                )}
            />

            {/* Autocomplete Invitado */}
            <Autocomplete
                options={invitados}
                value={selectedInvitado || null}
                onChange={(_, value) => {
                    setValue("id_invitado", value);
                    if (value) setValue("id_colegiado", null);
                }}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Seleccionar Invitado"
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
