import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
    getAllPresupuestos, getPresupuestosSummaryReport,
    getPresupuestoDetailReport, getMovimientosSummaryReport
} from "../../../services/tesoreria";
import {
    Box,
    Button,
    TextField,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Tabs,
    Tab,
    Typography,
    CircularProgress
} from "@mui/material";

export default function GenerarReporteTesoreria({ onClose }) {
    const [tabPrincipal, setTabPrincipal] = useState(0); // 0 = Presupuestos, 1 = Movimientos
    const [tabPresupuestos, setTabPresupuestos] = useState(0); // 0 = Resumen, 1 = Detalle
    const [listaPresupuestos, setListaPresupuestos] = useState([]);
    const [loadingPres, setLoadingPres] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const { register, handleSubmit, reset, watch } = useForm({
        defaultValues: {
            fecha_inicio_pres: "",
            fecha_fin_pres: "",
            id_presupuesto: "",
            fecha_inicio_mov: "",
            fecha_fin_mov: "",
        },
    });

    const idPres = watch("id_presupuesto");

    useEffect(() => {
        if (tabPrincipal === 0 && tabPresupuestos === 1) {
            setLoadingPres(true);
            getAllPresupuestos({ page: 1, limit: 1000, search: "" })
                .then((res) => {
                    const minimal = (res.data || []).map((p) => ({
                        id: p.id_presupuesto,
                        nombre: p.nombre_presupuesto || "",
                    }));
                    setListaPresupuestos(minimal);
                })
                .catch((err) => console.error("Error cargando presupuestos", err))
                .finally(() => setLoadingPres(false));
        }
    }, [tabPrincipal, tabPresupuestos]);

    const descargarPDF = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const onSubmitResumenPres = async (data) => {
        setIsGenerating(true);
        try {
            const params = {};
            if (data.fecha_inicio_pres) params.fecha_inicio = data.fecha_inicio_pres;
            if (data.fecha_fin_pres) params.fecha_fin = data.fecha_fin_pres;

            const blob = await getPresupuestosSummaryReport(params);
            descargarPDF(blob, "resumen_presupuestos.pdf");
        } catch (err) {
            console.error("Error generando resumen:", err);
            alert("Error generando reporte de presupuestos.");
        } finally {
            setIsGenerating(false);
        }
    };

    const onSubmitDetallePres = async (data) => {
        if (!data.id_presupuesto) {
            alert("Debes seleccionar un presupuesto.");
            return;
        }
        setIsGenerating(true);
        try {
            const id = data.id_presupuesto;
            const blob = await getPresupuestoDetailReport(id);
            const elegido = listaPresupuestos.find((p) => p.id === Number(id));
            const label = elegido ? elegido.nombre.replace(/\s+/g, "_") : id;
            descargarPDF(blob, `detalle_presupuesto_${label}.pdf`);
        } catch (err) {
            console.error("Error generando detalle:", err);
            alert("Error generando reporte detallado.");
        } finally {
            setIsGenerating(false);
        }
    };

    const onSubmitResumenMov = async (data) => {
        setIsGenerating(true);
        try {
            const params = {};
            if (data.fecha_inicio_mov) params.fecha_inicio = data.fecha_inicio_mov;
            if (data.fecha_fin_mov) params.fecha_fin = data.fecha_fin_mov;

            const blob = await getMovimientosSummaryReport(params);
            descargarPDF(blob, "reporte_movimientos_financieros.pdf");
        } catch (err) {
            console.error("Error generando movimientos:", err);
            alert("Error generando reporte de movimientos.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleTabPrincipalChange = (event, newValue) => {
        setTabPrincipal(newValue);
        reset();
    };

    const handleTabPresupuestosChange = (event, newValue) => {
        setTabPresupuestos(newValue);
        reset();
    };

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={tabPrincipal} onChange={handleTabPrincipalChange} centered variant="fullWidth">
                    <Tab label="Presupuestos" />
                    <Tab label="Movimientos" />
                </Tabs>
            </Box>

            {tabPrincipal === 0 && (
                <Box>
                    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
                        <Tabs 
                            value={tabPresupuestos} 
                            onChange={handleTabPresupuestosChange}
                            indicatorColor="secondary"
                            textColor="secondary"
                        >
                            <Tab label="Resumen" />
                            <Tab label="Detalle" />
                        </Tabs>
                    </Box>

                    {tabPresupuestos === 0 && (
                        <form onSubmit={handleSubmit(onSubmitResumenPres)}>
                            <Typography variant="subtitle1" gutterBottom>Filtros de Fechas (Opcional)</Typography>
                            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                                <TextField
                                    label="Fecha Inicio"
                                    type="date"
                                    InputLabelProps={{ shrink: true }}
                                    {...register("fecha_inicio_pres")}
                                    fullWidth
                                />
                                <TextField
                                    label="Fecha Fin"
                                    type="date"
                                    InputLabelProps={{ shrink: true }}
                                    {...register("fecha_fin_pres")}
                                    fullWidth
                                />
                            </Box>
                            <Button 
                                type="submit" 
                                variant="contained" 
                                color="primary" 
                                fullWidth 
                                disabled={isGenerating}
                            >
                                {isGenerating ? <CircularProgress size={24} color="inherit" /> : "Generar PDF Resumen"}
                            </Button>
                        </form>
                    )}

                    {tabPresupuestos === 1 && (
                        <form onSubmit={handleSubmit(onSubmitDetallePres)}>
                            <Typography variant="subtitle1" gutterBottom>Seleccione Presupuesto</Typography>
                            <FormControl fullWidth sx={{ mb: 3 }}>
                                <InputLabel id="pres-label">Presupuesto</InputLabel>
                                <Select
                                    labelId="pres-label"
                                    label="Presupuesto"
                                    defaultValue=""
                                    value={idPres || ""}
                                    {...register("id_presupuesto")}
                                    disabled={loadingPres}
                                >
                                    <MenuItem value="" disabled>-- Elige un presupuesto --</MenuItem>
                                    {listaPresupuestos.map((p) => (
                                        <MenuItem key={p.id} value={p.id}>
                                            {p.nombre}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <Button 
                                type="submit" 
                                variant="contained" 
                                color="primary" 
                                fullWidth 
                                disabled={isGenerating || !idPres}
                            >
                                {isGenerating ? <CircularProgress size={24} color="inherit" /> : "Generar PDF Detalle"}
                            </Button>
                        </form>
                    )}
                </Box>
            )}

            {tabPrincipal === 1 && (
                <form onSubmit={handleSubmit(onSubmitResumenMov)}>
                    <Typography variant="subtitle1" gutterBottom>Filtros de Fechas (Opcional)</Typography>
                    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                        <TextField
                            label="Fecha Inicio"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            {...register("fecha_inicio_mov")}
                            fullWidth
                        />
                        <TextField
                            label="Fecha Fin"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            {...register("fecha_fin_mov")}
                            fullWidth
                        />
                    </Box>
                    <Button 
                        type="submit" 
                        variant="contained" 
                        color="secondary" 
                        fullWidth 
                        disabled={isGenerating}
                    >
                        {isGenerating ? <CircularProgress size={24} color="inherit" /> : "Generar PDF Movimientos"}
                    </Button>
                </form>
            )}

            {onClose && (
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                    <Button variant="outlined" color="inherit" onClick={onClose} disabled={isGenerating}>
                        Cerrar
                    </Button>
                </Box>
            )}
        </Box>
    );
}
