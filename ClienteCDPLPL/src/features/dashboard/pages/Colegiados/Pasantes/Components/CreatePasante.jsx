
import { useForm, Controller } from "react-hook-form";
import { useState } from "react";
import {
    TextField,
    Button,
    Box,
    Typography,
    Stack,
    MenuItem,
    Select,
    InputLabel,
    FormControl,
    Alert,
    IconButton
} from "@mui/material";
import { Visibility, VisibilityOff, ContentCopy } from "@mui/icons-material";
import { createPasante } from "../../../../services/pasantes";
import EspecialidadesSelect from "../../../../components/EspecialidadesSelect";

const CreatePasante = ({ onSuccess, onClose }) => {
    const {
        register,
        handleSubmit,
        reset,
        control,
        formState: { errors, isSubmitting }
    } = useForm({
        defaultValues: {
            institucion: "",
        },
    })

    const [pinGenerado, setPinGenerado] = useState(null);
    const [mostrarPin, setMostrarPin] = useState(false);
    const [especialidades, setEspecialidades] = useState([]);

    const onSubmit = async (data) => {
        try {
            const response = await createPasante({
                ...data,
                especialidades: especialidades.join(", "),
            })
            const pin = response?.pin_temporal;
            if (pin) {
                setPinGenerado(pin);
            } else {
                if (onSuccess) onSuccess()
                reset()
                if (onClose) onClose()
            }
        } catch (e) {
            console.error(e)
            alert("Error al crear pasante")
        }
    }
    return (
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ p: 2 }}>
            <Typography variant="h5" fontWeight="bold" mb={2}>
                Registrar pasante
            </Typography>

            <Stack spacing={2}>
                {/* Nombre */}
                <TextField
                    label="Nombre"
                    {...register("nombre", { required: "El nombre es obligatorio" })}
                    error={!!errors.nombre}
                    helperText={errors.nombre?.message}
                    fullWidth
                />

                {/* Apellido */}
                <TextField
                    label="Apellido"
                    {...register("apellido", { required: "El apellido es obligatorio" })}
                    error={!!errors.apellido}
                    helperText={errors.apellido?.message}
                    fullWidth
                />

                {/* carnet identidad */}
                <TextField
                    label="Carnet de identidad"
                    {...register("carnet_identidad", {
                        pattern: {
                            value: /^[0-9]{7,15}$/,
                            message: "Solo números",
                        },
                        required: "El numero de carnet es obligatorio"
                    })}
                    error={!!errors.carnet_identidad}
                    helperText={errors.carnet_identidad?.message}
                    fullWidth
                />
                {/* Correo (Opcional) */}
                <TextField
                    label="Correo electrónico"
                    type="email"
                    {...register("correo", {
                        pattern: {
                            value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
                            message: "Correo no válido",
                        },
                        required: "El correo es obligatorio"
                    })}
                    error={!!errors.correo}
                    helperText={errors.correo?.message}
                    fullWidth
                />

                {/* Teléfono (Opcional) */}
                <TextField
                    label="Teléfono"
                    {...register("telefono", {
                        pattern: {
                            value: /^[0-9]{7,15}$/,
                            message: "Solo números (7 a 15 dígitos)",
                        },
                        required: "El numero de telefono es obligatorio"
                    })}
                    error={!!errors.telefono}
                    helperText={errors.telefono?.message}
                    fullWidth
                />

                {/* Carrera (Select con Controller) */}
                <FormControl fullWidth error={!!errors.institucion}>
                    <InputLabel>Institucion</InputLabel>
                    <Controller
                        name="institucion"
                        control={control}
                        rules={{ required: "Seleccione una institucion" }}
                        render={({ field }) => (
                            <Select {...field} label="Institucion">
                                <MenuItem value="Ingeniería de Sistemas">Ingeniería de Sistemas</MenuItem>
                                <MenuItem value="Derecho">Derecho</MenuItem>
                                <MenuItem value="Administración">Administración</MenuItem>
                                <MenuItem value="Contaduría Pública">Contaduría Pública</MenuItem>
                            </Select>
                        )}
                    />
                    {errors.institucion && (
                        <Typography variant="caption" color="error">
                            {errors.institucion.message}
                        </Typography>
                    )}
                </FormControl>

                {/* Especialidades */}
                <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Especialidades
                    </Typography>
                    <EspecialidadesSelect
                        value={especialidades}
                        onChange={setEspecialidades}
                        allowCreate
                    />
                </Box>

                {/* Botones */}
                {pinGenerado && (
                    <Alert
                        severity="warning"
                        sx={{ mt: 1 }}
                        action={
                            <IconButton
                                color="inherit"
                                size="small"
                                onClick={() => {
                                    navigator.clipboard.writeText(pinGenerado);
                                }}
                            >
                                <ContentCopy fontSize="small" />
                            </IconButton>
                        }
                    >
                        <strong>PIN de acceso:</strong>{" "}
                        {mostrarPin ? pinGenerado : "••••"}
                        <IconButton
                            size="small"
                            onClick={() => setMostrarPin(!mostrarPin)}
                            sx={{ ml: 0.5 }}
                        >
                            {mostrarPin ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                        <br />
                        <Typography variant="caption" color="text.secondary">
                            Guarda este PIN, solo se muestra una vez y es necesario para el acceso por GPS.
                        </Typography>
                    </Alert>
                )}
                <Stack direction="row" justifyContent="flex-end" spacing={2} mt={2}>
                    <Button
                        variant="outlined"
                        color="secondary"
                        onClick={onClose}
                    >
                        Cancelar
                    </Button>
                    {pinGenerado ? (
                        <Button
                            variant="contained"
                            color="success"
                            onClick={() => {
                                setPinGenerado(null);
                                if (onSuccess) onSuccess();
                                reset();
                                if (onClose) onClose();
                            }}
                        >
                            Entendido, continuar
                        </Button>
                    ) : (
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Guardando..." : "Guardar"}
                        </Button>
                    )}
                </Stack>
            </Stack>
        </Box>
    );
};

export default CreatePasante;