/**
 * `ProgresoGateway` — WS Hub de progreso en vivo del `ServidorGDS` (tarea 24.1).
 *
 * Transmite al `Frontend_GDS` el progreso de ciclos / saltos temporales /
 * `Modo_Ejecucion` (semanas procesadas/pendientes, `Estado_Ejecucion`) de los
 * `Analisis` a los que el cliente se suscribe (Req. 18.6, 21.4).
 *
 * Seguridad (handshake fail-closed, Req. 24.1, 24.7, 24.8):
 *  - En `handleConnection` valida el JWT del colegio presentado en el handshake
 *    (claim `auth.token`, cabecera `Authorization: Bearer ...` o query `token`)
 *    REUTILIZANDO el `ServicioAutenticacionService` del modulo `authentication`
 *    (tarea 19.1): mismo `JWT_SECRET` compartido + resolucion de rol GDS contra
 *    la BD propia.
 *  - Si el token falta, es invalido/expirado, o el usuario no tiene rol GDS, la
 *    conexion se RECHAZA (se desconecta el socket): denegacion por defecto, sin
 *    acceso degradado ni de solo lectura.
 *  - Solo una validacion exitosa adjunta el `ContextoAcceso` al socket y permite
 *    suscribirse y recibir progreso.
 *
 * Publicacion desacoplada (Event-Driven): el motor de ciclos NO llama a este
 * gateway directamente; publica `EVENTO_PROGRESO_GDS` (via `WsProgresoService`)
 * y aqui se reenvia por WS solo a la sala (`room`) del `Analisis`, de modo que
 * cada cliente recibe unicamente el progreso de los analisis a los que se
 * suscribio estando autenticado (Req. 21.4).
 */
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import type { ContextoAcceso } from '../auth/servicioAutenticacion';
import { ServicioAutenticacionService } from '../authentication/servicio-autenticacion.service';
import {
    EVENTO_PROGRESO_GDS,
    MENSAJE_WS_DESUSCRIBIR,
    MENSAJE_WS_PROGRESO,
    MENSAJE_WS_SUSCRIBIR,
    salaAnalisis,
    type ProgresoEvento,
} from './progreso.types';

/** Namespace WS del Hub de progreso (aislado, paralelo al prefijo HTTP `/api/gds`). */
export const NAMESPACE_PROGRESO = 'gds/progreso' as const;

/** Payload del mensaje de (de)suscripcion a un `Analisis`. */
interface SuscripcionPayload {
    analisisId?: string;
}

@WebSocketGateway({
    namespace: NAMESPACE_PROGRESO,
    cors: { origin: process.env.CORS_ORIGIN ?? '*' },
})
export class ProgresoGateway implements OnGatewayConnection {
    @WebSocketServer()
    server!: Server;

    private readonly logger = new Logger(ProgresoGateway.name);

    constructor(private readonly autenticacion: ServicioAutenticacionService) { }

    /**
     * Handshake fail-closed: valida el JWT del handshake y, solo si la
     * validacion es exitosa y el usuario tiene rol GDS, conserva el contexto en
     * el socket. Ante CUALQUIER fallo, rechaza la conexion desconectando.
     */
    async handleConnection(client: Socket): Promise<void> {
        const token = extraerToken(client);
        try {
            const contexto = await this.autenticacion.autorizar(token);
            // Acceso concedido: adjuntar el contexto al socket para autorizaciones
            // posteriores (suscripciones).
            (client.data as { contexto?: ContextoAcceso }).contexto = contexto;
        } catch {
            // Token ausente/invalido/expirado, sin rol GDS o fallo tecnico:
            // denegacion por defecto (fail-closed). Nunca se concede acceso ante
            // un fallo (Req. 24.7, 24.8).
            this.rechazar(client);
        }
    }

    /**
     * Suscribe al cliente a la sala del `Analisis` indicado para recibir su
     * progreso. Requiere un socket AUTENTICADO (con `ContextoAcceso`); en caso
     * contrario rechaza la operacion (fail-closed).
     */
    @SubscribeMessage(MENSAJE_WS_SUSCRIBIR)
    suscribir(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: SuscripcionPayload,
    ): { ok: boolean; analisisId?: string } {
        const contexto = (client.data as { contexto?: ContextoAcceso }).contexto;
        const analisisId = payload?.analisisId;
        if (!contexto || !analisisId) {
            return { ok: false };
        }
        void client.join(salaAnalisis(analisisId));
        return { ok: true, analisisId };
    }

    /** Da de baja al cliente de la sala del `Analisis` indicado. */
    @SubscribeMessage(MENSAJE_WS_DESUSCRIBIR)
    desuscribir(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: SuscripcionPayload,
    ): { ok: boolean; analisisId?: string } {
        const contexto = (client.data as { contexto?: ContextoAcceso }).contexto;
        const analisisId = payload?.analisisId;
        if (!contexto || !analisisId) {
            return { ok: false };
        }
        void client.leave(salaAnalisis(analisisId));
        return { ok: true, analisisId };
    }

    /**
     * Reenvia por WebSockets cada `ProgresoEvento` publicado en el bus interno
     * SOLO a la sala del `Analisis` correspondiente, de modo que unicamente los
     * clientes suscritos (y por tanto autenticados) lo reciben (Req. 21.4).
     */
    @OnEvent(EVENTO_PROGRESO_GDS)
    emitirProgreso(evento: ProgresoEvento): void {
        if (!evento?.analisisId || !this.server) {
            return;
        }
        this.server
            .to(salaAnalisis(evento.analisisId))
            .emit(MENSAJE_WS_PROGRESO, evento);
    }

    /** Cierra una conexion no autorizada (denegacion por defecto). */
    private rechazar(client: Socket): void {
        try {
            client.emit('error', { motivo: 'no_autorizado' });
        } finally {
            client.disconnect(true);
        }
    }
}

/**
 * Extrae el JWT del handshake del socket, en orden: `auth.token`, cabecera
 * `Authorization: Bearer ...` y query `token`. Devuelve `undefined` si no hay
 * token (lo que provoca denegacion fail-closed).
 */
function extraerToken(client: Socket): string | undefined {
    const handshake = client?.handshake;
    if (!handshake) {
        return undefined;
    }
    const auth = handshake.auth as { token?: unknown } | undefined;
    if (auth && typeof auth.token === 'string' && auth.token.trim() !== '') {
        return auth.token;
    }
    const header = handshake.headers?.authorization;
    if (typeof header === 'string' && header.trim() !== '') {
        return header;
    }
    const queryToken = handshake.query?.token;
    if (typeof queryToken === 'string' && queryToken.trim() !== '') {
        return queryToken;
    }
    return undefined;
}
