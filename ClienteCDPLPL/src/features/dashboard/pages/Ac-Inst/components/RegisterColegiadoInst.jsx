import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  registerColegiadoInstitucional,
} from "../../../services/ac-institucionales";
import { getColegiados, getInvitados } from "../../../services/ac-sociales";
import {
  Button,
  Box,
  Typography,
  Container,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Autocomplete,
  TextField,
  CircularProgress,
  Alert
} from "@mui/material";

export default function RegisterColegiadoInst({ id, onClose, onSuccess }) {
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      id_colegiado: null,
      id_invitado: null,
      metodo_pago: "EFECTIVO"
    }
  });

  const [colegiados, setColegiados] = useState([]);
  const [invitados, setInvitados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const selectedColegiado = watch("id_colegiado");
  const selectedInvitado = watch("id_invitado");

  useEffect(() => {
    const fetchColegiados = async () => {
      const cols = await getColegiados();
      setColegiados(
        cols.map((c) => ({
          value: c.id_colegiado,
          label: `${c.nombre} ${c.apellido}`,
        }))
      );
    };
    const fetchInvitados = async () => {
      const invs = await getInvitados();
      setInvitados(
        invs.map((i) => ({
          value: i.id_invitado,
          label: `${i.nombre} ${i.apellido}`,
        }))
      );
    };
    fetchColegiados();
    fetchInvitados();
  }, []);

  const onSubmit = async (data) => {
    if (!data.id_colegiado && !data.id_invitado) {
      setErrorMsg("Debes seleccionar un colegiado o un invitado.");
      return;
    }
    if (data.id_colegiado && data.id_invitado) {
      setErrorMsg("Solo puedes registrar un colegiado o un invitado, no ambos.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const payload = {
      id_actividad: id,
      id_colegiado: data.id_colegiado ? data.id_colegiado.value : null,
      id_invitado: data.id_invitado ? data.id_invitado.value : null,
      fecha_registro: new Date(),
      estado_registro: "REGISTRADO",
      metodo_pago: data.metodo_pago || "EFECTIVO",
    };

    try {
      const res = await fetch("/api/ac-institucionales/ac-ins/registrarColegiado", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        const body = await res.json();
        setErrorMsg(body.error || "Esta persona ya está registrada en la actividad.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setErrorMsg("Error al registrar. Intenta nuevamente.");
        setLoading(false);
        return;
      }

      setShowSuccess(true);
      if (onSuccess) onSuccess();
      
      setTimeout(() => {
        setShowSuccess(false);
        setValue("id_colegiado", null);
        setValue("id_invitado", null);
        setValue("metodo_pago", "EFECTIVO");
        setLoading(false);
      }, 1500);
      
    } catch (err) {
      console.error(err);
      setErrorMsg("Error de conexión");
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 2, mb: 2 }}>
        <Typography variant="h5" component="h2" gutterBottom align="center">
          Registrar Participante
        </Typography>

        {showSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Registrado correctamente
          </Alert>
        )}
        
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMsg}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 3 }}>
            
            <Controller
              name="id_colegiado"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  options={colegiados}
                  getOptionLabel={(option) => option.label || ""}
                  isOptionEqualToValue={(option, value) => option.value === value.value}
                  onChange={(_, data) => {
                    field.onChange(data);
                    if (data) setValue("id_invitado", null);
                  }}
                  disabled={!!selectedInvitado || loading}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Seleccionar Colegiado"
                      helperText={selectedInvitado ? "Deshabilita Invitado para seleccionar Colegiado" : ""}
                    />
                  )}
                />
              )}
            />

            <Typography variant="body2" align="center" color="textSecondary">
              - O -
            </Typography>

            <Controller
              name="id_invitado"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  options={invitados}
                  getOptionLabel={(option) => option.label || ""}
                  isOptionEqualToValue={(option, value) => option.value === value.value}
                  onChange={(_, data) => {
                    field.onChange(data);
                    if (data) setValue("id_colegiado", null);
                  }}
                  disabled={!!selectedColegiado || loading}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Seleccionar Invitado"
                      helperText={selectedColegiado ? "Deshabilita Colegiado para seleccionar Invitado" : ""}
                    />
                  )}
                />
              )}
            />

            <FormControl fullWidth>
              <InputLabel id="metodo-pago-label">Método de Pago</InputLabel>
              <Controller
                name="metodo_pago"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    labelId="metodo-pago-label"
                    label="Método de Pago"
                    disabled={loading}
                  >
                    <MenuItem value="EFECTIVO">Efectivo</MenuItem>
                    <MenuItem value="TRANSFERENCIA">Transferencia / QR</MenuItem>
                    <MenuItem value="BECA">Beca / Invitación</MenuItem>
                  </Select>
                )}
              />
            </FormControl>

            <Box sx={{ mt: 3, display: "flex", gap: 2, justifyContent: "flex-end" }}>
              {onClose && (
                <Button variant="outlined" color="inherit" onClick={onClose} disabled={loading}>
                  Cerrar
                </Button>
              )}
              <Button type="submit" variant="contained" color="primary" disabled={loading || (!selectedColegiado && !selectedInvitado)}>
                {loading ? <CircularProgress size={24} /> : "Registrar"}
              </Button>
            </Box>
          </Box>
        </form>
      </Box>
    </Container>
  );
}