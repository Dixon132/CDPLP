import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
    getAllUsuariosMinimal,
    getCorrespondenciaReport,
} from "../../../services/correspondencia";
import {
    Button,
    TextField,
    Box,
    Typography,
    Container,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    CircularProgress,
    Grid
} from '@mui/material';

export default function GenerarReporteCorrespondencia({ onClose }) {
    const [loadingDestinatarios, setLoadingDestinatarios] = useState(false);
    const [opcionesUsuarios, setOpcionesUsuarios] = useState([]);
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, reset } = useForm({
        defaultValues: {
            fecha_envio_inicio: "",
            fecha_envio_fin: "",
            fecha_recibido_inicio: "",
            fecha_recibido_fin: "",
            asunto: "",
            resumen: "",
            id_destinatario: "",
        },
    });

    useEffect(() => {
        const fetchUsuarios = async () => {
            setLoadingDestinatarios(true);
            try {
                const listado = await getAllUsuariosMinimal();
                
                if (!listado || !Array.isArray(listado)) {
                    console.error("La respuesta no es un array válido:", listado);
                    return;
                }
                setOpcionesUsuarios(listado);
            } catch (err) {
                console.error("Error cargando usuarios minimal:", err);
                alert("Error al cargar la lista de usuarios");
            } finally {
                setLoadingDestinatarios(false);
            }
        };
        fetchUsuarios();
    }, []);

    const onSubmit = async (data) => {
        try {
            setLoading(true);
            const params = {};
            
            if (data.fecha_envio_inicio) params.fecha_envio_inicio = data.fecha_envio_inicio;
            if (data.fecha_envio_fin) params.fecha_envio_fin = data.fecha_envio_fin;
            if (data.fecha_recibido_inicio) params.fecha_recibido_inicio = data.fecha_recibido_inicio;
            if (data.fecha_recibido_fin) params.fecha_recibido_fin = data.fecha_recibido_fin;
            if (data.asunto) params.asunto = data.asunto;
            if (data.resumen) params.resumen = data.resumen;
            if (data.id_destinatario) params.id_destinatario = Number(data.id_destinatario);
            
            const response = await getCorrespondenciaReport(params);
            
            let blob;
            if (response instanceof Blob) {
                blob = response;
            } else if (response.data && response.data instanceof Blob) {
                blob = response.data;
            } else if (response.data) {
                blob = new Blob([response.data], { type: "application/pdf" });
            } else {
                blob = new Blob([response], { type: "application/pdf" });
            }

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "reporte_correspondencia.pdf");
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Error generando reporte de correspondencia:", err);
            alert(`Error generando el reporte: ${err.message || 'Error desconocido'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{ mt: 2, mb: 2 }}>
                <Typography variant="h5" component="h2" gutterBottom align="center">
                    Generar Reporte de Correspondencia
                </Typography>

                <form onSubmit={handleSubmit(onSubmit)}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 3 }}>
                        
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Fecha Envío (Inicio)"
                                    type="date"
                                    InputLabelProps={{ shrink: true }}
                                    {...register("fecha_envio_inicio")}
                                    fullWidth
                                    disabled={loading}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Fecha Envío (Fin)"
                                    type="date"
                                    InputLabelProps={{ shrink: true }}
                                    {...register("fecha_envio_fin")}
                                    fullWidth
                                    disabled={loading}
                                />
                            </Grid>
                        </Grid>

                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Fecha Recibido (Inicio)"
                                    type="date"
                                    InputLabelProps={{ shrink: true }}
                                    {...register("fecha_recibido_inicio")}
                                    fullWidth
                                    disabled={loading}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Fecha Recibido (Fin)"
                                    type="date"
                                    InputLabelProps={{ shrink: true }}
                                    {...register("fecha_recibido_fin")}
                                    fullWidth
                                    disabled={loading}
                                />
                            </Grid>
                        </Grid>

                        <TextField
                            label="Asunto (contiene)"
                            {...register("asunto")}
                            fullWidth
                            disabled={loading}
                        />

                        <TextField
                            label="Resumen (contiene)"
                            {...register("resumen")}
                            fullWidth
                            disabled={loading}
                        />

                        <FormControl fullWidth disabled={loading || loadingDestinatarios}>
                            <InputLabel shrink id="destinatario-label">Destinatario</InputLabel>
                            <Select
                                labelId="destinatario-label"
                                label="Destinatario"
                                displayEmpty
                                defaultValue=""
                                {...register("id_destinatario")}
                            >
                                <MenuItem value="">
                                    <em>-- Cualquiera --</em>
                                </MenuItem>
                                {opcionesUsuarios.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Button 
                                type="submit" 
                                variant="contained" 
                                color="primary" 
                                size="large"
                                disabled={loading}
                                fullWidth
                            >
                                {loading ? <CircularProgress size={24} color="inherit" /> : "Generar Reporte PDF"}
                            </Button>
                            {onClose && (
                                <Button 
                                    variant="outlined" 
                                    color="inherit" 
                                    onClick={onClose}
                                    disabled={loading}
                                    fullWidth
                                >
                                    Cerrar
                                </Button>
                            )}
                        </Box>
                    </Box>
                </form>
            </Box>
        </Container>
    );
}
