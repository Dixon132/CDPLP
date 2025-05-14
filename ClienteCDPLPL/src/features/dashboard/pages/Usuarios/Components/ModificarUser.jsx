import { useForm } from "react-hook-form";
import { getUserById, ModificarUsuario } from "../../../services/usuarios";
import { TextField, Button } from "@mui/material";
import { useEffect } from "react";

const ModificarUser = ({ id, onClose }) => {
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm();

    // Obtener datos del usuario y precargar en el formulario
    const getUser = async () => {
        const { telefono, direccion } = await getUserById(id);
        reset({ telefono, direccion }); 
    };

    useEffect(() => {
        getUser();
    }, [id]);

    const onSubmit = (data) => {
        const res = ModificarUsuario(id, data);
        
        onClose(); 
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
                fullWidth
                label="Teléfono"
                margin="normal"
                {...register("telefono", { required: "El teléfono es requerido" })}
                error={!!errors.telefono}
                helperText={errors.telefono?.message}
            />

            <TextField
                fullWidth
                label="Dirección"
                margin="normal"
                {...register("direccion", { required: "La dirección es requerida" })}
                error={!!errors.direccion}
                helperText={errors.direccion?.message}
            />

            <button className="bg-blue-400 p-2 rounded-2xl">Guardar</button>
        </form>
    );
};

export default ModificarUser;
