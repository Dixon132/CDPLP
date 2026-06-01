import { useForm, Controller } from "react-hook-form";
import { useEffect, useState } from "react";
import {
    TextField,
    Button,
    MenuItem,
    Box,
    Typography,
    FormControl,
    InputLabel,
    Select,
    Stack,
    Slider,
} from "@mui/material";
import { MapPin } from "lucide-react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { createActividadSocial, getConvenios } from "../../../services/ac-sociales";

// Fix icono leaflet en Vite/React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Sub-componente: captura clicks en el mapa
function MapClickHandler({ onLocationSelect }) {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

export default function CreateActSocial({ onClose, onSuccess }) {
    const {
        register,
        handleSubmit,
        control,
        setValue,
        watch,
        formState: { errors },
    } = useForm({
        defaultValues: { radio_metros: 100 }
    });

    const [convenios, setConvenios] = useState([]);
    const [markerPos, setMarkerPos] = useState(null); // { lat, lng }
    const hoy = new Date().toISOString().split("T")[0];

    const radioValue = watch("radio_metros") || 100;
    const latValue = watch("latitud");
    const lngValue = watch("longitud");

    useEffect(() => {
        getConvenios().then(setConvenios).catch(console.error);
    }, []);

    const handleLocationSelect = (lat, lng) => {
        setMarkerPos({ lat, lng });
        setValue("latitud", lat);
        setValue("longitud", lng);
    };

    const onSubmit = async (data) => {
        try {
            await createActividadSocial(data);
            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (error) {
            alert("Error al crear actividad social");
        }
    };

    return (
        <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{ display: "flex", flexDirection: "column", gap: 2, p: 3, width: "100%", maxWidth: 700 }}
        >
            <Typography variant="h6" fontWeight="bold">
                Registrar Actividad Social
            </Typography>

            <TextField
                label="Nombre"
                {...register("nombre", { required: "El nombre es obligatorio" })}
                error={!!errors.nombre}
                helperText={errors.nombre?.message}
            />

            <TextField label="Descripción" multiline rows={3} {...register("descripcion")} />
            <TextField label="Ubicación" {...register("ubicacion")} />
            <TextField label="Motivo" {...register("motivo")} />

            {/* Convenio */}
            <FormControl>
                <InputLabel>Convenio</InputLabel>
                <Select label="Convenio" defaultValue="" {...register("id_convenio")}>
                    <MenuItem value="">Sin convenio</MenuItem>
                    {convenios.map((conv) => (
                        <MenuItem key={conv.id_convenio} value={conv.id_convenio}>
                            {conv.nombre}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {/* Fechas */}
            <TextField
                label="Fecha de Inicio"
                type="date"
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: hoy }}
                {...register("fecha_inicio", { required: "Fecha de inicio obligatoria" })}
                error={!!errors.fecha_inicio}
                helperText={errors.fecha_inicio?.message}
            />
            <TextField
                label="Fecha de Fin"
                type="date"
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: hoy }}
                {...register("fecha_fin")}
            />

            {/* Estado */}
            <FormControl error={!!errors.estado}>
                <InputLabel>Estado</InputLabel>
                <Select label="Estado" defaultValue="" {...register("estado", { required: "Estado obligatorio" })}>
                    <MenuItem value="">Seleccione...</MenuItem>
                    <MenuItem value="ACTIVO">ACTIVO</MenuItem>
                    <MenuItem value="INACTIVO">INACTIVO</MenuItem>
                </Select>
                {errors.estado && <Typography variant="caption" color="error">{errors.estado.message}</Typography>}
            </FormControl>

            {/* Tipo */}
            <TextField
                label="Tipo"
                {...register("tipo", { required: "Tipo obligatorio" })}
                error={!!errors.tipo}
                helperText={errors.tipo?.message}
            />

            {/* ─── Sección Geolocalización ─── */}
            <Box>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <MapPin size={18} /> Ubicación GPS del convenio
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                    Haz clic en el mapa para marcar la ubicación exacta. El radio define la zona en la que los colegiados deberán estar para marcar asistencia.
                </Typography>

                {/* Mapa */}
                <Box sx={{ height: 300, borderRadius: 2, overflow: "hidden", border: "1px solid #ddd", mb: 2 }}>
                    <MapContainer
                        center={[-17.78, -63.18]}
                        zoom={13}
                        style={{ height: "100%", width: "100%" }}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />
                        <MapClickHandler onLocationSelect={handleLocationSelect} />
                        {markerPos && (
                            <>
                                <Marker position={[markerPos.lat, markerPos.lng]} />
                                <Circle
                                    center={[markerPos.lat, markerPos.lng]}
                                    radius={Number(radioValue)}
                                    pathOptions={{ color: "#7c3aed", fillColor: "#7c3aed", fillOpacity: 0.15 }}
                                />
                            </>
                        )}
                    </MapContainer>
                </Box>

                {/* Coordenadas ocultas */}
                <input type="hidden" {...register("latitud")} />
                <input type="hidden" {...register("longitud")} />

                {latValue && lngValue && (
                    <Typography variant="caption" color="success.main" sx={{ mb: 1, display: "block" }}>
                        📍 Lat: {Number(latValue).toFixed(6)}, Lng: {Number(lngValue).toFixed(6)}
                    </Typography>
                )}

                {/* Slider de radio */}
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
            <Stack direction="row" spacing={2} justifyContent="flex-end" mt={2}>
                <Button variant="outlined" onClick={onClose}>Cancelar</Button>
                <Button type="submit" variant="contained" color="primary">Crear Actividad</Button>
            </Stack>
        </Box>
    );
}
