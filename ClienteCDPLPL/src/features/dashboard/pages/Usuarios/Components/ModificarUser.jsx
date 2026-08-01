import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { TextField, Button, Box } from "@mui/material";
import { getUserById } from "../../../services/usuarios";

/**
 * Formulario de modificación de usuario.
 * No llama a la API: entrega los datos validados vía `onSubmitForm` para que el
 * contenedor los confirme (ConfirmActionModal) antes de persistirlos.
 */
const ModificarUser = ({ id, onClose, onSubmitForm }) => {
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm();

    // ✅ Obtener datos del usuario y precargar en el formulario
    const getUser = async () => {
        try {
            const { telefono, direccion } = await getUserById(id);
            reset({ telefono, direccion });
        } catch (error) {
            console.error("Error al obtener el usuario:", error);
        }
    };

    useEffect(() => {
        if (id) getUser();
    }, [id]);

    // ✅ Entregar cambios al contenedor para su confirmación
    const onSubmit = (data) => {
        onSubmitForm(data);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Box display="flex" flexDirection="column" gap={2}>
                <TextField
                    label="Teléfono"
                    InputLabelProps={{ shrink: true }}
                    {...register("telefono", { required: "El teléfono es requerido" })}
                    error={!!errors.telefono}
                    helperText={errors.telefono?.message}
                />

                <TextField
                    label="Dirección"
                    InputLabelProps={{ shrink: true }}
                    {...register("direccion", { required: "La dirección es requerida" })}
                    error={!!errors.direccion}
                    helperText={errors.direccion?.message}
                />

                <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
                    <Button variant="outlined" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" variant="contained" color="primary">
                        Guardar Cambios
                    </Button>
                </Box>
            </Box>
        </form>
    );
};

export default ModificarUser;
