import { z } from "zod";

export const signupSchema = z.object({
    nombre: z.string(),
    apellido: z.string(),
    correo: z.string().email(),
    contraseña: z.string().min(8),
    telefono: z.string().optional(),
    direccion: z.string().optional()
});
export const rolSchema = z.object({
    rol: z.string(),
    fecha_inicio: z.date().optional(),
    fecha_fin: z.date().optional()
});
export const loginSchema = z.object({
    correo: z.string().email(),
    contraseña: z.string().min(8)
})