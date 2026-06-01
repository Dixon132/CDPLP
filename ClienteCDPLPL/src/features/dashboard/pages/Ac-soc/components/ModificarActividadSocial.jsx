import { useEffect, useState, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { TextField, Button, Box, MenuItem, Slider, Typography } from "@mui/material";
import { Trash2, MapPin } from "lucide-react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
    getConvenios,
    getActividadSocialById,
    updateActividadSocial,
    deleteActividadSocial,
} from "../../../services/ac-sociales";
import ConfirmDialog from "../../../components/ConfirmDialog";

// Fix icono leaflet en Vite/React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapClickHandler({ onLocationSelect }) {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

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
        defaultValues: { estado: "", tipo: "", radio_metros: 100 },
    });

    const [convenios, setConvenios] = useState([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [markerPos, setMarkerPos] = useState(null);
    const today = new Date().toISOString().split("T")[0];
    const fechaInicioValue = watch("fecha_inicio");
    const radioValue = watch("radio_metros") || 100;
    const latValue = watch("latitud");
    const lngValue = watch("longitud");

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
                    latitud: actividad.latitud ?? null,
                    longitud: actividad.longitud ?? null,
                    radio_metros: actividad.radio_metros ?? 100,
                });

                setValue("estado", actividad.estado?.toUpperCase() || "");
                setValue("tipo", actividad.tipo?.toUpperCase() || "");
                setValue("id_convenio", actividad.id_convenio || "");

                if (actividad.latitud && actividad.longitud) {
                    setMarkerPos({ lat: actividad.latitud, lng: actividad.longitud });
                }
            } catch (error) {
                console.error("Error al cargar la actividad social:", error);
            }
        };

        if (id) fetchData();
    }, [id, reset, setValue]);

    const handleLocationSelect = (lat, lng) => {
        setMarkerPos({ lat, lng });
        setValue("latitud", lat);
        setValue("longitud", lng);
    };

    const onSubmit = async (formData) => {
        try {
            formData.id_convenio = formData.id_convenio ? parseInt(formData.id_convenio) : null;
            await updateActividadSocial(id, formData);
            if (onClose) onClose();
        } catch (error) {
            console.error("Error al modificar la actividad:", error);
        }
    };

    const handleDelete = async () => {
        try {
            await deleteActividadSocial(id);
            setShowDeleteConfirm(false);
            if (onDelete) onDelete();
            if (onClose) onClose();
        } catch (error) {
            console.error("Error al eliminar la actividad:", error);
            setShowDeleteConfirm(false);
        }
    };

    // Centro del mapa: coordenadas actuales o Santa Cruz de la Sierra por defecto
    const mapCenter = markerPos
        ? [markerPos.lat, markerPos.lng]
        : [-17.78, -63.18];

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
                        <TextField fullWidth multiline rows={3} {...register("descripcion")} variant="outlined" size="small" />
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
                                <TextField {...field} select fullWidth variant="outlined" size="small">
                                    <MenuItem value="">Sin convenio</MenuItem>
                                    {convenios.map((c) => (
                                        <MenuItem key={c.id_convenio} value={c.id_convenio}>{c.nombre}</MenuItem>
                                    ))}
                                </TextField>
                            )}
                        />
                    </div>

                    {/* Fechas */}
                    <div>
                        <label className="block mb-1 font-semibold">Fecha de Inicio</label>
                        <TextField
                            fullWidth
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            {...register("fecha_inicio", { required: "Campo obligatorio" })}
                            error={!!errors.fecha_inicio}
                            helperText={errors.fecha_inicio?.message}
                            variant="outlined"
                            size="small"
                        />
                    </div>
                    <div>
                        <label className="block mb-1 font-semibold">Fecha de Fin</label>
                        <TextField
                            fullWidth
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            {...register("fecha_fin", {
                                validate: (value) => {
                                    if (!value) return true;
                                    if (fechaInicioValue && value < fechaInicioValue) return "Debe ser posterior a la fecha de inicio";
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
                                <TextField {...field} select fullWidth variant="outlined" size="small" error={!!errors.estado} helperText={errors.estado?.message}>
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
                                <TextField {...field} select fullWidth variant="outlined" size="small" error={!!errors.tipo} helperText={errors.tipo?.message}>
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

                    {/* ─── Sección Geolocalización ─── */}
                    <Box>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                            <MapPin size={16} /> Ubicación GPS del convenio
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                            Haz clic en el mapa o arrastra el marcador para ajustar la ubicación.
                        </Typography>

                        <Box sx={{ height: 280, borderRadius: 2, overflow: "hidden", border: "1px solid #ddd", mb: 1.5 }}>
                            <MapContainer center={mapCenter} zoom={14} style={{ height: "100%", width: "100%" }} key={mapCenter.join(",")}>
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                />
                                <MapClickHandler onLocationSelect={handleLocationSelect} />
                                {markerPos && (
                                    <>
                                        <Marker
                                            position={[markerPos.lat, markerPos.lng]}
                                            draggable
                                            eventHandlers={{
                                                dragend(e) {
                                                    const { lat, lng } = e.target.getLatLng();
                                                    handleLocationSelect(lat, lng);
                                                }
                                            }}
                                        />
                                        <Circle
                                            center={[markerPos.lat, markerPos.lng]}
                                            radius={Number(radioValue)}
                                            pathOptions={{ color: "#7c3aed", fillColor: "#7c3aed", fillOpacity: 0.15 }}
                                        />
                                    </>
                                )}
                            </MapContainer>
                        </Box>

                        <input type="hidden" {...register("latitud")} />
                        <input type="hidden" {...register("longitud")} />

                        {latValue && lngValue && (
                            <Typography variant="caption" color="success.main" sx={{ mb: 1, display: "block" }}>
                                📍 Lat: {Number(latValue).toFixed(6)}, Lng: {Number(lngValue).toFixed(6)}
                            </Typography>
                        )}

                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                            Radio de asistencia: <strong>{radioValue} metros</strong>
                        </Typography>
                        <Controller
                            name="radio_metros"
                            control={control}
                            render={({ field }) => (
                                <Slider
                                    {...field}
                                    min={50}
                                    max={5000}
                                    step={50}
                                    valueLabelDisplay="auto"
                                    valueLabelFormat={(v) => `${v}m`}
                                    sx={{ color: "#7c3aed" }}
                                />
                            )}
                        />
                    </Box>

                    {/* Botones */}
                    <Box display="flex" justifyContent="space-between" gap={2} mt={2}>
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<Trash2 size={18} />}
                            onClick={() => setShowDeleteConfirm(true)}
                        >
                            Eliminar
                        </Button>
                        <Box display="flex" gap={2}>
                            <Button variant="outlined" color="secondary" onClick={onClose}>Cancelar</Button>
                            <Button type="submit" variant="contained" color="primary">Guardar Cambios</Button>
                        </Box>
                    </Box>
                </Box>
            </form>

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