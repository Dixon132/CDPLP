import {z} from 'zod'

export const actividadSocialSchema = z.object({
    nombre: z.string()
        .min(1, "El nombre es requerido")
        .max(150, "El nombre no puede exceder 150 caracteres"),
    
    descripcion: z.string()
        .min(1, "La descripción es requerida"),
    
    ubicacion: z.string()
        .min(1, "La ubicación es requerida")
        .max(200, "La ubicación no puede exceder 200 caracteres"),
    
    motivo: z.string()
        .min(1, "El motivo es requerido"),
    
    origen_intervencion: z.string()
        .min(1, "El origen de la intervención es requerido")
        .max(20, "El origen de la intervención no puede exceder 20 caracteres"),
    
    fecha_inicio: z.string()
        .datetime({ message: "La fecha de inicio debe estar en formato ISO 8601" }),
    
    fecha_fin: z.string()
        .datetime({ message: "La fecha de fin debe estar en formato ISO 8601" })
        .optional(),
    
    costo: z.number()
        .positive("El costo debe ser un número positivo")
        .optional(),
    
    estado: z.enum(["PENDIENTE", "EN_PROGRESO", "COMPLETADA", "CANCELADA"])
        .default("PENDIENTE"),
    
    tipo: z.string()
        .min(1, "El tipo es requerido")
        .max(50, "El tipo no puede exceder 50 caracteres"),
    
    id_solicitud: z.number()
        .int()
        .positive()
        .optional(),
    
    id_responsable: z.number()
        .int()
        .positive()
        .optional()
})

export const updateActividadSocialSchema = actividadSocialSchema.partial() 