import { Response } from "express";
import prismaClient from "./prismaClient";
import { Acciones, Modulos } from "../types/auditoria";

/**
 * Metadatos de auditoría de una ruta. Se pasan como segundo argumento a
 * `errorHandler` (`utils/error-handler.ts`), que es quien realmente dispara el
 * registro tras una respuesta exitosa — así ninguna ruta mutadora puede
 * "olvidarse" de auditar: o lleva estos metadatos, o queda visible al grep
 * como una ausencia deliberada.
 */
export interface AuditMeta {
    modulo: Modulos;
    accion: Acciones;
}

/**
 * Escribe una fila en `auditoria`. Nunca lanza — un fallo registrando la
 * auditoría no debe tumbar la respuesta de la operación de negocio que la
 * originó (mismo criterio que `emitirNotificacion`).
 */
export const registrarAuditoria = async (
    idUsuario: number,
    accion: Acciones,
    modulo: Modulos,
    descripcion: string
): Promise<void> => {
    try {
        await prismaClient.auditoria.create({
            data: { id_usuario: idUsuario, accion, modulo, descripcion: descripcion.slice(0, 2000) },
        });
    } catch (e) {
        console.error("No se pudo registrar la auditoría:", e);
    }
};

/**
 * Deja una descripción legible para la auditoría automática de esta petición
 * (p. ej. "Pago de Juan Pérez por Bs. 200"). Si el controlador no la llama, se
 * usa una genérica derivada de la ruta y el método HTTP.
 *
 * Debe llamarse ANTES de que el controlador responda (antes de `res.json(...)`
 * o `res.status(...).send(...)`), en cualquier punto de la función.
 */
export const describir = (res: Response, descripcion: string): void => {
    res.locals.auditoriaDescripcion = descripcion;
};
