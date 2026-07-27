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
import AttachFileIcon from "@mui/icons-material/AttachFile";

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
  const metodoPago = watch("metodo_pago");
  const [comprobante, setComprobante] = useState(null);

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
    
    if (data.metodo_pago !== "EFECTIVO" && !comprobante) {
      setErrorMsg("Debe adjuntar un comprobante de pago para pagos por QR o Transferencia.");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("id_actividad", id);
    if (data.id_colegiado) formData.append("id_colegiado", data.id_colegiado.value);
    if (data.id_invitado) formData.append("id_invitado", data.id_invitado.value);
    formData.append("fecha_registro", new Date().toISOString());
    formData.append("estado_registro", "REGISTRADO");
    formData.append("metodo_pago", data.metodo_pago || "EFECTIVO");

    if (comprobante && (data.metodo_pago === "QR" || data.metodo_pago === "TRANSFERENCIA")) {
      formData.append("comprobante", comprobante);
    }

    try {
      await registerColegiadoInstitucional(formData);

      setShowSuccess(true);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        setShowSuccess(false);
        setValue("id_colegiado", null);
        setValue("id_invitado", null);
        setValue("metodo_pago", "EFECTIVO");
        setComprobante(null);
        setLoading(false);
      }, 1500);

    } catch (err) {
      console.error(err);
      const status = err?.response?.status;
      if (status === 409) {
        setErrorMsg(err.response?.data?.error || "Esta persona ya está registrada en la actividad.");
      } else {
        setErrorMsg("Error al registrar. Intenta nuevamente.");
      }
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
                    <MenuItem value="QR">QR</MenuItem>
                    <MenuItem value="TRANSFERENCIA">Transferencia</MenuItem>
                  </Select>
                )}
              />
            </FormControl>

            {(metodoPago === "QR" || metodoPago === "TRANSFERENCIA") && (
              <Box>
                <Typography variant="caption" color="error" sx={{ mb: 0.5, display: "block", fontWeight: "bold" }}>
                  Comprobante (obligatorio)
                </Typography>
                <Box
                  sx={{
                    display: "flex", alignItems: "center", gap: 1.5,
                    border: "1px solid", borderColor: "divider", borderRadius: 1,
                    px: 2, py: 1.25, cursor: "pointer",
                    "&:hover": { borderColor: "text.primary" },
                  }}
                  onClick={() => document.getElementById('comprobante-input')?.click()}
                >
                  <AttachFileIcon fontSize="small" color="action" />
                  <Typography variant="body2" color={comprobante ? "text.primary" : "text.secondary"} noWrap>
                    {comprobante ? comprobante.name : "Seleccionar imagen o PDF..."}
                  </Typography>
                  <input
                    id="comprobante-input"
                    type="file"
                    accept="image/*,.pdf"
                    style={{ display: "none" }}
                    onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
                  />
                </Box>
                {comprobante && (
                  <Button
                    size="small" color="inherit" sx={{ mt: 0.5, fontSize: 11 }}
                    onClick={() => {
                      setComprobante(null);
                      const el = document.getElementById('comprobante-input');
                      if (el) el.value = "";
                    }}
                  >
                    Quitar archivo
                  </Button>
                )}
              </Box>
            )}

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