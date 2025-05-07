import {z} from 'zod'

export const colegiadoSchema = z.object({
    carnet_identidad: z.string()
        .min(1, "El carnet de identidad es requerido")
        .max(20, "El carnet de identidad no puede exceder 20 caracteres")
        ,
    
    nombre: z.string()
        .min(1, "El nombre es requerido")
        .max(100, "El nombre no puede exceder 100 caracteres")
        .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "El nombre solo debe contener letras y espacios"),
    
    apellido: z.string()
        .min(1, "El apellido es requerido")
        .max(100, "El apellido no puede exceder 100 caracteres")
        .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "El apellido solo debe contener letras y espacios"),
    
    correo: z.string()
        .min(1, "El correo es requerido")
        .max(150, "El correo no puede exceder 150 caracteres")
        .email("El correo debe tener un formato válido"),
    
    telefono: z.string()
        .min(1, "El teléfono es requerido")
        .max(20, "El teléfono no puede exceder 20 caracteres")
        .regex(/^[0-9+\s-]+$/, "El teléfono solo debe contener números, +, - y espacios"),
    
    especialidades: z.string()
        .min(1, "Las especialidades son requeridas")
        .max(200, "Las especialidades no pueden exceder 200 caracteres"),
    
    fecha_inscripcion: z.string()
        .datetime({ message: "La fecha de inscripción debe estar en formato ISO 8601" }),
    
    fecha_renovacion: z.string()
        .datetime({ message: "La fecha de renovación debe estar en formato ISO 8601" })
        .optional(),
    
    estado: z.enum(["ACTIVO", "INACTIVO", "SUSPENDIDO"])
        .default("ACTIVO")
})

