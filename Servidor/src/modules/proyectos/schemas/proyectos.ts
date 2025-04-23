import { describe } from 'node:test'
import {z} from 'zod'

export const proyectoSchema = z.object({
    titulo: z.string().min(1, "El título es requerido"),
    descripcion: z.string().min(1, "La descripción es requerida"),
    fecha_inicio: z.string().datetime({ message: "La fecha de inicio debe estar en formato ISO 8601" }),
    fecha_fin: z.string().datetime({ message: "La fecha de fin debe estar en formato ISO 8601" }).optional(),
    id_responsable: z.number().int().positive().optional(),
    presupuesto: z.number().positive().optional(),
    estado: z.enum(["EN_PROCESO", "COMPLETADO", "CANCELADO"]).optional()
})