import { TextField, Button } from '@mui/material';
import { useForm } from 'react-hook-form';
import axios from 'axios';

const AñadirDocumento = ({ id, tipoDoc }) => {
    const { register, handleSubmit, formState: { errors } } = useForm();

    const onSubmit = async (data) => {
        const formData = new FormData();
        formData.append('tipo_documento', tipoDoc);
        formData.append('archivo', data.archivo[0]); // 👈 archivo como array
        formData.append('fecha_vencimiento', data.fecha_vencimiento);

        try {
            await axios.post(`/api/colegiados/documentos/${id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            alert('Documento enviado correctamente');
        } catch (error) {
            console.error('Error al subir el documento:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
                fullWidth
                label="Fecha de Vencimiento"
                type="date"
                {...register('fecha_vencimiento', { required: 'La fecha es obligatoria' })}
                error={!!errors.fecha_vencimiento}
                helperText={errors.fecha_vencimiento?.message}
            />

            <input
                type="file"
                accept="application/pdf"
                {...register('archivo', { required: 'El archivo PDF es obligatorio' })}
            />
            {errors.archivo && <p style={{ color: 'red' }}>{errors.archivo.message}</p>}

            <Button type="submit" variant="contained" color="primary">
                Subir Documento
            </Button>
        </form>
    );
};

export default AñadirDocumento;
