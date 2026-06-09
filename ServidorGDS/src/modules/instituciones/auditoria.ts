/**
 * Implementacion por defecto del puerto `RegistroAuditoria`.
 *
 * Registra los cambios sobre una `Institucion` para su trazabilidad (Req. 7.5).
 * La implementacion base escribe en la consola del servicio; al estar detras de
 * una interfaz estable puede sustituirse por una tabla de auditoria, un bus de
 * eventos, etc., sin tocar el `Gestor_Instituciones`.
 */
import type { EventoAuditoria, RegistroAuditoria } from "./instituciones.types";

export class RegistroAuditoriaConsola implements RegistroAuditoria {
    registrar(evento: EventoAuditoria): void {
        // eslint-disable-next-line no-console
        console.info(
            `[auditoria][institucion] accion=${evento.accion} id=${evento.institucionId} ` +
            `actor=${evento.actorId ?? "desconocido"} ts=${evento.timestamp}` +
            (evento.cambios
                ? ` cambios=${JSON.stringify(evento.cambios)}`
                : ""),
        );
    }
}
