import React, { useState } from 'react';
import {
    Box,
    Button,
    TextField,
    Typography,
    Paper,
    FormControl,
    FormHelperText
} from '@mui/material';
import { useForm } from 'react-hook-form';
import axios from 'axios';

const AñadirDocumento = ({ id, tipoDoc, vigenciaMeses = null, onSubmitForm }) => {
    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm();
    const [fileName, setFileName] = useState('');

    // Si el tipo de documento ya trae vigencia configurada en el catálogo, el
    // vencimiento lo calcula el servidor (fecha de entrega + vigencia_meses) y
    // este campo no se pide.
    const vencimientoAutomatico = vigenciaMeses != null;
    const fechaVencimientoSugerida = vencimientoAutomatico
        ? (() => {
            const d = new Date();
            d.setMonth(d.getMonth() + vigenciaMeses);
            return d.toLocaleDateString('es-BO');
        })()
        : null;

    const onSubmit = (data) => {
        const formData = new FormData();
        formData.append('tipo_documento', tipoDoc);
        formData.append('archivo', data.archivo[0]);

        // Fix timezone issue by appending local time. Si el vencimiento es
        // automático no se envía: lo calcula el servidor.
        if (!vencimientoAutomatico && data.fecha_vencimiento) {
            formData.append('fecha_vencimiento', `${data.fecha_vencimiento}T00:00:00`);
        }

        if (onSubmitForm) onSubmitForm(formData);
    };

    return (
        <Paper elevation={3} sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
            <Typography variant="h6" gutterBottom>
                Añadir {tipoDoc}
            </Typography>

            <Box
                component="form"
                onSubmit={handleSubmit(onSubmit)}
                sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
            >
                {/* Fecha de Vencimiento */}
                {vencimientoAutomatico ? (
                    <Typography variant="body2" color="text.secondary">
                        Este documento vence automáticamente el <strong>{fechaVencimientoSugerida}</strong> ({vigenciaMeses} mes/es de vigencia desde hoy).
                    </Typography>
                ) : (
                    <TextField
                        label="Fecha de Vencimiento (opcional)"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        {...register('fecha_vencimiento')}
                        error={!!errors.fecha_vencimiento}
                        helperText={errors.fecha_vencimiento?.message || 'Déjalo en blanco si este documento no vence'}
                    />
                )}

                {/* Archivo PDF */}
                <FormControl error={!!errors.archivo}>
                    <input
                        id="archivo-input"
                        type="file"
                        accept="application/pdf"
                        style={{ display: 'none' }}
                        {...register('archivo', {
                            required: 'El PDF es obligatorio',
                            // Aquí inyectamos setFileName sin romper el onChange de RHF
                            onChange: (e) => {
                                setFileName(e.target.files?.[0]?.name || '');
                            }
                        })}
                    />
                    <label htmlFor="archivo-input">
                        <Button variant="outlined" component="span">
                            Seleccionar PDF
                        </Button>
                        <Typography
                            variant="body2"
                            component="span"
                            sx={{ ml: 2, fontStyle: fileName ? 'normal' : 'italic' }}
                        >
                            {fileName || 'Ningún archivo seleccionado'}
                        </Typography>
                    </label>
                    {errors.archivo && (
                        <FormHelperText>{errors.archivo.message}</FormHelperText>
                    )}
                </FormControl>

                {/* Botón de envío */}
                <Button type="submit" variant="contained" size="large">
                    Subir Documento
                </Button>
            </Box>
        </Paper>
    );
};

export default AñadirDocumento;
