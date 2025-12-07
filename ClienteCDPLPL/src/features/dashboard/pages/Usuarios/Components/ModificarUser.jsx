import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { TextField, Button, Box } from "@mui/material";
import { getUserById, ModificarUsuario } from "../../../services/usuarios";

const ModificarUser = ({ id, onClose }) => {
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

    // ✅ Enviar cambios
    const onSubmit = async (data) => {
        try {
            await ModificarUsuario(id, data);
            if (onClose) onClose();
        } catch (error) {
            console.error("Error al modificar usuario:", error);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Box display="flex" flexDirection="column" gap={2}>
                {/* Teléfono */}
                <div>
                    <label className="block mb-1 font-semibold">Teléfono</label>
                    <TextField
                        fullWidth
                        {...register("telefono", { required: "El teléfono es requerido" })}
                        error={!!errors.telefono}
                        helperText={errors.telefono?.message}
                        variant="outlined"
                        size="small"
                    />
                </div>

                {/* Dirección */}
                <div>
                    <label className="block mb-1 font-semibold">Dirección</label>
                    <TextField
                        fullWidth
                        {...register("direccion", { required: "La dirección es requerida" })}
                        error={!!errors.direccion}
                        helperText={errors.direccion?.message}
                        variant="outlined"
                        size="small"
                    />
                </div>

                {/* Botones */}
                <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
                    <Button
                        variant="outlined"
                        color="secondary"
                        onClick={onClose}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                    >
                        Guardar Cambios
                    </Button>
                </Box>
            </Box>
        </form>
    );
};

export default ModificarUser;
