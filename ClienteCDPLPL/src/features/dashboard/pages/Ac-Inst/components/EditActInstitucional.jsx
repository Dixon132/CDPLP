import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  getActividadInstitucionalById,
  updateActividadInstitucional,
} from "../../../services/ac-institucionales";
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
  InputAdornment,
  CircularProgress
} from "@mui/material";

export default function EditActInstitucional({ id, onClose, onSuccess }) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tipos = ["Conferencia", "Taller", "Seminario", "Curso"];
  const estados = ["EN_INSCRIPCION", "EN_CURSO", "TERMINADO"];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const actividad = await getActividadInstitucionalById(id);
        reset({
          nombre: actividad.nombre ?? "",
          descripcion: actividad.descripcion ?? "",
          tipo: actividad.tipo ?? "",
          fecha_programada: actividad.fecha_programada
            ? actividad.fecha_programada.split("T")[0]
            : "",
          costo: actividad.costo ?? "",
          estado: actividad.estado ?? "",
        });
      } catch (err) {
        console.error("Error al cargar actividad", err);
        alert("Error al cargar la actividad");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, reset]);

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
      await updateActividadInstitucional(id, payload);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      alert("Error al actualizar actividad institucional");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 2, mb: 2 }}>
        <Typography variant="h5" component="h2" gutterBottom align="center">
          Editar Actividad
        </Typography>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 3 }}>
            <TextField
              label="Nombre de la Actividad"
              InputLabelProps={{ shrink: true }}
              {...register("nombre", { required: "El nombre es obligatorio" })}
              error={!!errors.nombre}
              helperText={errors.nombre?.message}
              fullWidth
            />

            <TextField
              label="Descripción"
              multiline
              rows={3}
              InputLabelProps={{ shrink: true }}
              {...register("descripcion")}
              fullWidth
            />

            <FormControl fullWidth error={!!errors.tipo}>
              <InputLabel shrink id="tipo-label">Tipo de Actividad</InputLabel>
              <Select
                labelId="tipo-label"
                label="Tipo de Actividad"
                displayEmpty
                value={watch("tipo") || ""}
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
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: 0, step: 0.1 }}
              InputProps={{
                startAdornment: <InputAdornment position="start">Bs.</InputAdornment>,
              }}
              {...register("costo")}
              fullWidth
            />

            <FormControl fullWidth error={!!errors.estado}>
              <InputLabel shrink id="estado-label">Estado</InputLabel>
              <Select
                labelId="estado-label"
                label="Estado"
                displayEmpty
                value={watch("estado") || ""}
                {...register("estado", { required: "Selecciona el estado" })}
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
              <Button type="submit" variant="contained" color="warning" disabled={isSubmitting}>
                Actualizar
              </Button>
            </Box>
          </Box>
        </form>
      </Box>
    </Container>
  );
}
