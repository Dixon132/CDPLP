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

const AñadirDocumento = ({ id, tipoDoc, onSubmitForm }) => {
    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm();
    const [fileName, setFileName] = useState('');
    const today = new Date().toISOString().split('T')[0];

    const onSubmit = (data) => {
        const formData = new FormData();
        formData.append('tipo_documento', tipoDoc);
        formData.append('archivo', data.archivo[0]);
        
        // Fix timezone issue by appending local time
        const fecha_vencimiento_local = data.fecha_vencimiento ? `${data.fecha_vencimiento}T00:00:00` : "";
        formData.append('fecha_vencimiento', fecha_vencimiento_local);

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
                <TextField
                    label="Fecha de Vencimiento"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ max: today }}
                    {...register('fecha_vencimiento', {
                        required: 'La fecha es obligatoria',
                        validate: (value) =>
                            value <= today || 'No puede ser una fecha futura'
                    })}
                    error={!!errors.fecha_vencimiento}
                    helperText={errors.fecha_vencimiento?.message}
                />

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
