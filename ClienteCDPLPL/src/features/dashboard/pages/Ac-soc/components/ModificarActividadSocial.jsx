import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { TextField, Button, Box, MenuItem } from "@mui/material";
import { Trash2 } from "lucide-react";
import {
    getConvenios,
    getActividadSocialById,
    updateActividadSocial,
    deleteActividadSocial,
} from "../../../services/ac-sociales";
import ConfirmDialog from "../../../components/ConfirmDialog";

const ModificarActividadSocial = ({ id, onClose, onDelete }) => {
    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
        reset,
        setValue,
        watch,
    } = useForm({
        defaultValues: {
            estado: "",
            tipo: "",
        },
    });

    const [convenios, setConvenios] = useState([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const today = new Date().toISOString().split("T")[0];
    const fechaInicioValue = watch("fecha_inicio");

    // ✅ Carga inicial de datos
    useEffect(() => {
        const fetchData = async () => {
            try {
                const actividad = await getActividadSocialById(id);
                const conveniosData = await getConvenios();
                setConvenios(conveniosData);

                reset({
                    nombre: actividad.nombre || "",
                    descripcion: actividad.descripcion || "",
                    ubicacion: actividad.ubicacion || "",
                    motivo: actividad.motivo || "",
                    id_convenio: actividad.id_convenio || "",
                    fecha_inicio: actividad.fecha_inicio?.split("T")[0] || "",
                    fecha_fin: actividad.fecha_fin?.split("T")[0] || "",
                    estado: actividad.estado?.toUpperCase() || "",
                    tipo: actividad.tipo?.toUpperCase() || "",
                });

                // 🔧 Normalizamos los valores de los selects
                setValue("estado", actividad.estado?.toUpperCase() || "");
                setValue("tipo", actividad.tipo?.toUpperCase() || "");
                setValue("id_convenio", actividad.id_convenio || "");
            } catch (error) {
                console.error("Error al cargar la actividad social:", error);
            }
        };

        if (id) fetchData();
    }, [id, reset, setValue]);

    // ✅ Enviar cambios
    const onSubmit = async (formData) => {
        try {
            formData.id_convenio = formData.id_convenio
                ? parseInt(formData.id_convenio)
                : null;
            await updateActividadSocial(id, formData);
            if (onClose) onClose();
        } catch (error) {
            console.error("Error al modificar la actividad:", error);
        }
    };

    // ✅ Eliminar actividad
    const handleDelete = async () => {
        try {
            await deleteActividadSocial(id);
            setShowDeleteConfirm(false);
            if (onDelete) onDelete(); // Callback para actualizar la lista
            if (onClose) onClose(); // Cerrar el modal
        } catch (error) {
            console.error("Error al eliminar la actividad:", error);
            setShowDeleteConfirm(false);
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit(onSubmit)}>
                <Box display="flex" flexDirection="column" gap={2}>
                    {/* Nombre */}
                    <div>
                        <label className="block mb-1 font-semibold">Nombre</label>
                        <TextField
                            fullWidth
                            {...register("nombre", { required: "Campo obligatorio" })}
                            error={!!errors.nombre}
                            helperText={errors.nombre?.message}
                            variant="outlined"
                            size="small"
                        />
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="block mb-1 font-semibold">Descripción</label>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            {...register("descripcion")}
                            variant="outlined"
                            size="small"
                        />
                    </div>

                    {/* Ubicación */}
                    <div>
                        <label className="block mb-1 font-semibold">Ubicación</label>
                        <TextField
                            fullWidth
                            {...register("ubicacion", { required: "Campo obligatorio" })}
                            error={!!errors.ubicacion}
                            helperText={errors.ubicacion?.message}
                            variant="outlined"
                            size="small"
                        />
                    </div>

                    {/* Motivo */}
                    <div>
                        <label className="block mb-1 font-semibold">Motivo</label>
                        <TextField
                            fullWidth
                            {...register("motivo", { required: "Campo obligatorio" })}
                            error={!!errors.motivo}
                            helperText={errors.motivo?.message}
                            variant="outlined"
                            size="small"
                        />
                    </div>

                    {/* Convenio */}
                    <div>
                        <label className="block mb-1 font-semibold">Convenio</label>
                        <Controller
                            name="id_convenio"
                            control={control}
                            defaultValue=""
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    select
                                    fullWidth
                                    variant="outlined"
                                    size="small"
                                >
                                    <MenuItem value="">Sin convenio</MenuItem>
                                    {convenios.map((c) => (
                                        <MenuItem key={c.id_convenio} value={c.id_convenio}>
                                            {c.nombre}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                        />
                    </div>

                    {/* Fecha de Inicio */}
                    <div>
                        <label className="block mb-1 font-semibold">Fecha de Inicio</label>
                        <TextField
                            fullWidth
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            {...register("fecha_inicio", {
                                required: "Campo obligatorio",
                                validate: (value) =>
                                    value >= today || "No puedes elegir una fecha pasada",
                            })}
                            error={!!errors.fecha_inicio}
                            helperText={errors.fecha_inicio?.message}
                            variant="outlined"
                            size="small"
                        />
                    </div>

                    {/* Fecha de Fin */}
                    <div>
                        <label className="block mb-1 font-semibold">Fecha de Fin</label>
                        <TextField
                            fullWidth
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            {...register("fecha_fin", {
                                validate: (value) => {
                                    if (!value) return true;
                                    if (value < today) return "No puedes elegir una fecha pasada";
                                    if (fechaInicioValue && value < fechaInicioValue)
                                        return "Debe ser posterior a la fecha de inicio";
                                    return true;
                                },
                            })}
                            error={!!errors.fecha_fin}
                            helperText={errors.fecha_fin?.message}
                            variant="outlined"
                            size="small"
                        />
                    </div>

                    {/* Estado */}
                    <div>
                        <label className="block mb-1 font-semibold">Estado</label>
                        <Controller
                            name="estado"
                            control={control}
                            rules={{ required: "Campo obligatorio" }}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    select
                                    fullWidth
                                    variant="outlined"
                                    size="small"
                                    error={!!errors.estado}
                                    helperText={errors.estado?.message}
                                >
                                    <MenuItem value="">Seleccione...</MenuItem>
                                    <MenuItem value="ACTIVO">ACTIVO</MenuItem>
                                    <MenuItem value="EN PROGRESO">EN PROGRESO</MenuItem>
                                    <MenuItem value="FINALIZADO">FINALIZADO</MenuItem>
                                    <MenuItem value="PENDIENTE">PENDIENTE</MenuItem>
                                </TextField>
                            )}
                        />
                    </div>

                    {/* Tipo */}
                    <div>
                        <label className="block mb-1 font-semibold">Tipo</label>
                        <Controller
                            name="tipo"
                            control={control}
                            rules={{ required: "Campo obligatorio" }}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    select
                                    fullWidth
                                    variant="outlined"
                                    size="small"
                                    error={!!errors.tipo}
                                    helperText={errors.tipo?.message}
                                >
                                    <MenuItem value="">Seleccione...</MenuItem>
                                    <MenuItem value="CULTURAL">CULTURAL</MenuItem>
                                    <MenuItem value="DEPORTIVA">DEPORTIVA</MenuItem>
                                    <MenuItem value="SOCIAL">SOCIAL</MenuItem>
                                    <MenuItem value="RECREATIVA">RECREATIVA</MenuItem>
                                    <MenuItem value="EDUCATIVA">EDUCATIVA</MenuItem>
                                    <MenuItem value="BENEFICA">BENÉFICA</MenuItem>
                                </TextField>
                            )}
                        />
                    </div>

                    {/* Botones */}
                    <Box display="flex" justifyContent="space-between" gap={2} mt={2}>
                        {/* Botón Eliminar a la izquierda */}
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<Trash2 size={18} />}
                            onClick={() => setShowDeleteConfirm(true)}
                        >
                            Eliminar
                        </Button>

                        {/* Botones Cancelar y Guardar a la derecha */}
                        <Box display="flex" gap={2}>
                            <Button variant="outlined" color="secondary" onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant="contained" color="primary">
                                Guardar Cambios
                            </Button>
                        </Box>
                    </Box>
                </Box>
            </form>

            {/* Modal de Confirmación para Eliminar */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                message="¿Estás seguro de que deseas eliminar permanentemente esta actividad social? Esta acción no se puede deshacer."
                onConfirm={handleDelete}
                onClose={() => setShowDeleteConfirm(false)}
                confirmText="Eliminar"
            />
        </>
    );
};

export default ModificarActividadSocial;