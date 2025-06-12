import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { getEspecificDoc, updateDoc } from "../../../services/colegiados";
import { TextField, Button, Box, Typography, Paper, FormHelperText } from "@mui/material";

const EditarDocumento = ({ id_documento, onSuccess }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm();
  const [loading, setLoading] = useState(true);

  // Fecha de hoy en formato YYYY-MM-DD
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    (async () => {
      const res = await getEspecificDoc(id_documento);
      reset({
        fecha_entrega: res.fecha_entrega?.slice(0, 10) || "",
        fecha_vencimiento: res.fecha_vencimiento?.slice(0, 10) || "",
        estado: res.estado || ""
      });
      setLoading(false);
    })();
  }, [id_documento, reset]);

  const onSubmit = async (data) => {
    await updateDoc(id_documento, data);
    alert("Documento actualizado con éxito");
    onSuccess?.();
  };

  if (loading) return <Typography align="center">Cargando...</Typography>;

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 600, mx: "auto" }}>
      <Typography variant="h6" gutterBottom>
        Editar Documento
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ display: "flex", flexDirection: "column", gap: 3 }}
      >
        {/* Fecha de entrega */}
        <TextField
          label="Fecha de entrega"
          type="date"
          InputLabelProps={{ shrink: true }}
          inputProps={{ max: today }}
          {...register("fecha_entrega", {
            required: "La fecha de entrega es obligatoria",
            validate: (value) =>
              value <= today || "No puede seleccionar una fecha futura"
          })}
          error={!!errors.fecha_entrega}
          helperText={errors.fecha_entrega?.message}
        />

        {/* Fecha de vencimiento */}
        <TextField
          label="Fecha de vencimiento"
          type="date"
          InputLabelProps={{ shrink: true }}
          {...register("fecha_vencimiento")}
        />

        {/* Estado */}
            <div>
                <label className="block font-semibold mb-1">Estado</label>
                <select
                    {...register("estado", { required: "Debe seleccionar un estado" })}
                    className="w-full border px-4 py-2 rounded"
                >
                    <option value="">Seleccione...</option>
                    <option value="VIGENTE">VIGENTE</option>
                    <option value="VENCIDO">VENCIDO</option>
                </select>
                {errors.estado && (
                    <p className="text-red-500 mt-1">{errors.estado.message}</p>
                )}
            </div>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button type="submit" variant="contained" color="primary">
            Guardar cambios
          </Button>
          <Button variant="outlined" color="error" onClick={() => console.log("Eliminar")}>
            Eliminar definitivamente
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default EditarDocumento;


           