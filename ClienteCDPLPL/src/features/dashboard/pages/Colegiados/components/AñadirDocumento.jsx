import { TextField } from "@mui/material";
import { useForm } from "react-hook-form";

const AñadirDocumento = ({id, tipoDoc}) => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const onSubmit = (data)=>{

    }
    return (
        <div>
            <form onSubmit={handleSubmit(onSubmit)}>
                <TextField
                    label={tipoDoc}
                    {...register('tipo_documento', { required: `El ${tipoDoc} es obligatorio` })}
                    error={!!errors.tipo_documento}
                    helperText={errors.tipo_documento?.message}
                />
                <TextField
                    label={tipoDoc}
                    {...register('archivo', { required: `El ${tipoDoc} es obligatorio` })}
                    error={!!errors.tipo_documento}
                    helperText={errors.tipo_documento?.message}
                />
                <TextField
                    label={tipoDoc}
                    {...register('fecha_vencimiento', { required: `El ${tipoDoc} es obligatorio` })}
                    error={!!errors.tipo_documento}
                    helperText={errors.tipo_documento?.message}
                />
            </form>
        </div>
    );
};

export default AñadirDocumento;