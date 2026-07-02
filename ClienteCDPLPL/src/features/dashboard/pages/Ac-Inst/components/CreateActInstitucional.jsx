import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { createActividadInstitucional } from "../../../services/ac-institucionales";
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
  InputAdornment
} from "@mui/material";

export default function CreateActInstitucional({ onClose, onSuccess }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const tipos = ["Conferencia", "Taller", "Seminario", "Curso"];
  const estados = ["EN_INSCRIPCION", "EN_CURSO", "TERMINADO"];

  const onSubmit = async (formData) => {
    setIsSubmitting(true);
    const payload = {
      nombre: formData.nombre,
      descripcion: formData.descripcion,
      tipo: formData.tipo,
      fecha_programada: formData.fecha_programada
        ? new Date(formData.fecha_programada)
        : null,
      costo: formData.costo ? parseFloat(formData.costo) : null,
      estado: formData.estado,
    };

    try {
      await createActividadInstitucional(payload);
      reset();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      alert("Error al crear actividad institucional");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 2, mb: 2 }}>
        <Typography variant="h5" component="h2" gutterBottom align="center">
          Registrar Actividad
        </Typography>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 3 }}>
            <TextField
              label="Nombre de la Actividad"
              {...register("nombre", { required: "El nombre es obligatorio" })}
              error={!!errors.nombre}
              helperText={errors.nombre?.message}
              fullWidth
            />

            <TextField
              label="Descripción"
              multiline
              rows={3}
              {...register("descripcion")}
              fullWidth
            />

            <FormControl fullWidth error={!!errors.tipo}>
              <InputLabel id="tipo-label">Tipo de Actividad</InputLabel>
              <Select
                labelId="tipo-label"
                label="Tipo de Actividad"
                defaultValue=""
                {...register("tipo", { required: "Selecciona un tipo" })}
              >
                <MenuItem value="" disabled>
                  <em>Seleccione un tipo</em>
                </MenuItem>
                {tipos.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Select>
              {errors.tipo && (
                <Typography color="error" variant="caption">
                  {errors.tipo.message}
                </Typography>
              )}
            </FormControl>

            <TextField
              label="Fecha Programada"
              type="date"
              InputLabelProps={{ shrink: true }}
              {...register("fecha_programada", { required: "La fecha es obligatoria" })}
              error={!!errors.fecha_programada}
              helperText={errors.fecha_programada?.message}
              fullWidth
            />

            <TextField
              label="Costo"
              type="number"
              inputProps={{ min: 0, step: 0.1 }}
              InputProps={{
                startAdornment: <InputAdornment position="start">Bs.</InputAdornment>,
              }}
              {...register("costo")}
              fullWidth
            />

            <FormControl fullWidth error={!!errors.estado}>
              <InputLabel id="estado-label">Estado</InputLabel>
              <Select
                labelId="estado-label"
                label="Estado"
                defaultValue="EN_INSCRIPCION"
                {...register("estado", { required: "El estado es obligatorio" })}
              >
                {estados.map((e) => (
                  <MenuItem key={e} value={e}>
                    {e}
                  </MenuItem>
                ))}
              </Select>
              {errors.estado && (
                <Typography color="error" variant="caption">
                  {errors.estado.message}
                </Typography>
              )}
            </FormControl>

            <Box sx={{ mt: 3, display: "flex", gap: 2, justifyContent: "flex-end" }}>
              {onClose && (
                <Button variant="outlined" color="inherit" onClick={onClose} disabled={isSubmitting}>
                  Cancelar
                </Button>
              )}
              <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                Guardar
              </Button>
            </Box>
          </Box>
        </form>
      </Box>
    </Container>
  );
}
