import { z } from 'zod'

export type EstadoActividad = "EN_INSCRIPCION" | "EN_CURSO" | "TERMINADO"

export const ESTADOS_ACTIVIDAD_VALIDOS: EstadoActividad[] = ["EN_INSCRIPCION", "EN_CURSO", "TERMINADO"]

export const actividadInstitucionalSchema = z.object({
    nombre: z.string()
        .min(1, "El nombre es requerido")
        .max(150, "El nombre no puede exceder 150 caracteres"),

    descripcion: z.string()
        .min(1, "La descripción es requerida"),

    tipo: z.string()
        .min(1, "El tipo es requerido")
        .max(50, "El tipo no puede exceder 50 caracteres"),

    fecha_inicio: z.string()
        .datetime({ message: "La fecha de inicio debe estar en formato ISO 8601" }),

    fecha_fin: z.string()
        .datetime({ message: "La fecha de fin debe estar en formato ISO 8601" })
        .optional(),

    id_responsable: z.number()
        .int()
        .positive()
        .optional(),

    costo: z.number()
        .positive("El costo debe ser un número positivo")
        .optional(),

    estado: z.enum(["EN_INSCRIPCION", "EN_CURSO", "TERMINADO"])
        .default("EN_INSCRIPCION")
})

export const updateActividadInstitucionalSchema = actividadInstitucionalSchema.partial()
