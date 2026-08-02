import { z } from "zod";

export const nivelAccesoSchema = z.enum(["SIN_ACCESO", "OBSERVADOR", "EDITOR"]);

export const catalogoRolSchema = z.object({
    nombre: z.string().min(2).max(50),
    descripcion: z.string().max(200).optional(),
});

export const actualizarCatalogoRolSchema = z.object({
    descripcion: z.string().max(200).optional(),
});

export const matrizRolSchema = z.object({
    permisos: z.array(
        z.object({
            id_recurso: z.number().int(),
            nivel: nivelAccesoSchema,
        })
    ),
});

export const overrideUsuarioSchema = z.object({
    id_recurso: z.number().int(),
    nivel: nivelAccesoSchema,
});
