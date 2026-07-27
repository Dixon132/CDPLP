import React, { useEffect, useRef, useState } from 'react';
import { useForm } from "react-hook-form";
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
    CircularProgress
} from '@mui/material';
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { createCorrespondencia, usuariosCorrespondencia } from "../../../services/correspondencia";
import Alerts from "../../../components/Alerts";
import ConfirmActionModal from "../../../../../components/ConfirmActionModal";

export default function CrearCorrespondencia({ onClose, onSuccess }) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    const [usuarios, setUsuarios] = useState([]);
    const [alert, setAlert] = useState({ show: false, type: "success", message: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ open: false, data: null });
    
    // Para el archivo
    const [comprobante, setComprobante] = useState(null);
    const fileInputRef = useRef(null);

    const showAlert = (type, message) => {
        setAlert({ show: true, type, message });
    };

    const hoy = new Date().toISOString().split('T')[0];

    const onSubmit = (data) => {
        if (!comprobante) {
            showAlert("error", "El archivo PDF es obligatorio");
            return;
        }
        setConfirmModal({ open: true, data });
    };

    const handleConfirmCreate = async () => {
        const data = confirmModal.data;
        setConfirmModal({ open: false, data: null });
        setIsSubmitting(true);
        const formData = new FormData();
        formData.append("asunto", data.asunto);
        formData.append("contenido", comprobante);
        formData.append("resumen", data.resumen);
        formData.append("fecha_envio", data.fecha_envio);
        formData.append("remitente", data.remitente);
        formData.append("id_destinatario", data.id_destinatario);

        try {
            await createCorrespondencia(formData);
            showAlert("success", "Correspondencia creada con éxito");
            setTimeout(() => {
                if (onSuccess) onSuccess();
                if (onClose) onClose();
            }, 2000);
        } catch (error) {
            showAlert("error", "Error al crear correspondencia");
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const fetchUsuarios = async () => {
            const listado = await usuariosCorrespondencia();
            setUsuarios(listado);
        };
        fetchUsuarios();
    }, []);

    return (
        <Container maxWidth="sm">
            <Alerts type={alert.type} message={alert.message} show={alert.show} duration={2000} onClose={() => setAlert((prev) => ({ ...prev, show: false }))} />
            <Box sx={{ mt: 2, mb: 2 }}>
                <Typography variant="h5" component="h2" gutterBottom>
                    Registrar Correspondencia
                </Typography>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="Asunto"
                            {...register('asunto', { required: "Asunto es obligatorio" })}
                            error={!!errors.asunto}
                            helperText={errors.asunto?.message}
                            fullWidth
                        />

                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                                Documento Escaneado (Obligatorio)
                            </Typography>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.5,
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: 1,
                                    px: 2,
                                    py: 1.25,
                                    cursor: "pointer",
                                    "&:hover": { borderColor: "text.primary" },
                                }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <AttachFileIcon fontSize="small" color="action" />
                                <Typography variant="body2" color={comprobante ? "text.primary" : "text.secondary"} noWrap>
                                    {comprobante ? comprobante.name : "Seleccionar archivo PDF..."}
                                </Typography>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="application/pdf"
                                    style={{ display: "none" }}
                                    onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
                                />
                            </Box>
                            {comprobante && (
                                <Button
                                    size="small"
                                    color="inherit"
                                    sx={{ mt: 0.5, fontSize: 11 }}
                                    onClick={() => {
                                        setComprobante(null);
                                        if (fileInputRef.current) fileInputRef.current.value = "";
                                    }}
                                >
                                    Quitar archivo
                                </Button>
                            )}
                        </Box>

                        <TextField
                            label="Resumen"
                            multiline
                            rows={3}
                            {...register('resumen')}
                            fullWidth
                        />

                        <TextField
                            label="Fecha de envío"
                            type="datetime-local"
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ max: hoy + "T23:59" }}
                            {...register('fecha_envio', {
                                required: "Fecha de envío requerida",
                                validate: value => value <= hoy + "T23:59" || "No puedes escoger una fecha futura"
                            })}
                            error={!!errors.fecha_envio}
                            helperText={errors.fecha_envio?.message}
                            fullWidth
                        />

                        <TextField
                            label="Remitente"
                            {...register('remitente', { required: "Remitente obligatorio" })}
                            error={!!errors.remitente}
                            helperText={errors.remitente?.message}
                            fullWidth
                        />

                        <FormControl fullWidth error={!!errors.id_destinatario}>
                            <InputLabel id="destinatario-label">Destinatario</InputLabel>
                            <Select
                                labelId="destinatario-label"
                                label="Destinatario"
                                defaultValue=""
                                {...register('id_destinatario', { required: "Destinatario obligatorio" })}
                            >
                                <MenuItem value="">
                                    <em>Selecciona un destinatario</em>
                                </MenuItem>
                                {usuarios.map(u => (
                                    <MenuItem key={u.id_usuario} value={u.id_usuario}>
                                        {u.nombre} {u.apellido}
                                    </MenuItem>
                                ))}
                            </Select>
                            {errors.id_destinatario && <Typography color="error" variant="caption">{errors.id_destinatario.message}</Typography>}
                        </FormControl>

                        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                            {onClose && (
                                <Button variant="outlined" color="secondary" onClick={onClose} disabled={isSubmitting}>
                                    Cancelar
                                </Button>
                            )}
                            <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                                {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Crear'}
                            </Button>
                        </Box>
                    </Box>
                </form>
            </Box>

            <ConfirmActionModal
                isOpen={confirmModal.open}
                variant="create"
                title="¿Confirmar creación?"
                message="¿Estás seguro que deseas registrar esta nueva correspondencia?"
                onClose={() => setConfirmModal({ open: false, data: null })}
                onConfirm={handleConfirmCreate}
            />
        </Container>
    );
}
