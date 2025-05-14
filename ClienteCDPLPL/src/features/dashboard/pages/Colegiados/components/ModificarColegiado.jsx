import { TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import { getColegiadoById, modificarColegiados } from "../../../services/colegiados";
import { useEffect } from "react";

const ModificarColegiado = ({ id, onClose }) => {
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm();

    const getColegiado = async () => {
        try {
            const { telefono, correo } = await getColegiadoById(id); // ✅ async-await
            reset({ telefono, correo });
        } catch (error) {
            console.error("Error al obtener el colegiado", error);
        }
    };

    const onSubmit = async (data) => {
        
            await modificarColegiados(id, data);
            onClose();
        
    };

    useEffect(() => {
        getColegiado();
    }, [id]);

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
                label="Correo"
                margin="normal"
                {...register("correo", { required: "El correo es requerido" })}
                error={!!errors.correo} // ✅ corregido
                helperText={errors.correo?.message}
            />
            <button className="bg-blue-400 p-2 rounded-2xl mt-4">Guardar</button>
        </form>
    );
};

export default ModificarColegiado;
