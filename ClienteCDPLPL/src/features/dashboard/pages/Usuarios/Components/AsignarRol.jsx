import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { TextField, Button, Box, MenuItem } from "@mui/material";
import { getRolById } from "../../../services/roles";
import { getCatalogoRolesActivos } from "../../../services/catalogoRoles";

/**
 * Formulario de asignación de rol.
 * No llama a la API: entrega los datos validados vía `onSubmitForm` para que el
 * contenedor los confirme (ConfirmActionModal) antes de persistirlos.
 */
const AsignarRol = ({ id, onClose, onSubmitForm }) => {
    const [roles, setRoles] = useState([]);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
        reset,
        setValue,
    } = useForm({
        defaultValues: {
            fecha_inicio: "",
            fecha_fin: "",
            id_rol_catalogo: "",
        },
    });

    // Catálogo de roles activos (dinámico: crece según lo que se cree en "Roles y Permisos").
    useEffect(() => {
        getCatalogoRolesActivos()
            .then(setRoles)
            .catch((error) => console.error("Error al obtener el catálogo de roles:", error));
    }, []);

    // ✅ Cargar datos si existen en la BD
    useEffect(() => {
        const fetchRol = async () => {
            try {
                const data = await getRolById(id);
                reset({
                    fecha_inicio: data.fecha_inicio?.split("T")[0] || "",
                    fecha_fin: data.fecha_fin?.split("T")[0] || "",
                    id_rol_catalogo: data.id_rol_catalogo || "",
                });
                setValue("id_rol_catalogo", data.id_rol_catalogo || "");
            } catch (error) {
                console.error("Error al obtener el rol:", error);
            }
        };
        if (id) fetchRol();
    }, [id, reset, setValue]);

    // ✅ Entregar cambios al contenedor para su confirmación
    const onSubmit = (formData) => {
        onSubmitForm(formData);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Box display="flex" flexDirection="column" gap={2}>
                <TextField
                    label="Fecha de Inicio"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    {...register("fecha_inicio", {
                        required: "La fecha de inicio es obligatoria",
                    })}
                    error={!!errors.fecha_inicio}
                    helperText={errors.fecha_inicio?.message}
                />

                <TextField
                    label="Fecha de Fin"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    {...register("fecha_fin", {
                        required: "La fecha de fin es obligatoria",
                    })}
                    error={!!errors.fecha_fin}
                    helperText={errors.fecha_fin?.message}
                />

                <Controller
                    name="id_rol_catalogo"
                    control={control}
                    rules={{ required: "Debe seleccionar un rol" }}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            select
                            label="Rol del Usuario"
                            InputLabelProps={{ shrink: true }}
                            error={!!errors.id_rol_catalogo}
                            helperText={errors.id_rol_catalogo?.message}
                        >
                            <MenuItem value="">-- Seleccione un rol --</MenuItem>
                            {roles.map((rol) => (
                                <MenuItem key={rol.id_rol_catalogo} value={rol.id_rol_catalogo}>
                                    {rol.nombre.replaceAll("_", " ")}
                                </MenuItem>
                            ))}
                        </TextField>
                    )}
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

export default AsignarRol;
