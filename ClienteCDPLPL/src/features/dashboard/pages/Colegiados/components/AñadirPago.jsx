import { Button, TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import { createPago } from "../../../services/colegiados";

const AñadirPago = ({id}) => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const onSubmit = async(data)=>{
        try{
            await createPago(id, data)
        }catch{
            console.log('errorrrr')
        }
    }
    return (
        <div>
            <form onSubmit={handleSubmit(onSubmit)}>
                <TextField
                    fullWidth
                    label="Concepto"
                    {...register('concepto', { required: 'La fecha es obligatoria' })}
                    error={!!errors.concepto}
                    helperText={errors.fecha_vencimiento?.concepto}
                />
                <label>Fecha de pago</label>
                <TextField
                    fullWidth
                    
                    type="date"
                    {...register('fecha_pago', { required: 'La fecha es obligatoria' })}
                    error={!!errors.fecha_pago}
                    helperText={errors.fecha_vencimiento?.fecha_pago}
                />
                <TextField
                    fullWidth
                    label="Monto"
                    {...register('monto', { required: 'El monto es obligatoria' })}
                    error={!!errors.monto}
                    helperText={errors.fecha_vencimiento?.monto}
                />
                <Button type="submit">Registrar pago</Button>
            </form>
        </div>
    );
};

export default AñadirPago;