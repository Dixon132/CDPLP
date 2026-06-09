/**
 * Pruebas basicas del WS Hub de progreso (`ProgresoGateway`, tarea 24.1).
 *
 * Verifican la frontera de seguridad del handshake fail-closed y la entrega de
 * progreso por sala de `Analisis` reutilizando el `ServicioAutenticacionService`
 * (tarea 19.1) como doble determinista (Req. 18.6, 21.4, 24.1, 24.7, 24.8).
 */
import {
    AccesoDenegadoError,
    RolGDS,
    type ContextoAcceso,
} from '../auth/servicioAutenticacion';
import type { ServicioAutenticacionService } from '../authentication/servicio-autenticacion.service';
import { ProgresoGateway } from './progreso.gateway';
import {
    MENSAJE_WS_PROGRESO,
    salaAnalisis,
    type ProgresoEvento,
} from './progreso.types';

/** Construye un socket falso con el handshake y los espias necesarios. */
function fakeSocket(opts: {
    authToken?: string;
    authorization?: string;
    queryToken?: string;
} = {}): {
    socket: any;
    join: jest.Mock;
    leave: jest.Mock;
    disconnect: jest.Mock;
    emit: jest.Mock;
} {
    const join = jest.fn();
    const leave = jest.fn();
    const disconnect = jest.fn();
    const emit = jest.fn();
    const socket = {
        data: {} as { contexto?: ContextoAcceso },
        handshake: {
            auth: opts.authToken ? { token: opts.authToken } : {},
            headers: opts.authorization ? { authorization: opts.authorization } : {},
            query: opts.queryToken ? { token: opts.queryToken } : {},
        },
        join,
        leave,
        disconnect,
        emit,
    };
    return { socket, join, leave, disconnect, emit };
}

const CONTEXTO: ContextoAcceso = { usuarioId: 1, rol: RolGDS.ANALISTA };

/** Doble del Servicio_Autenticacion: autoriza o rechaza segun el token. */
function fakeAuth(autorizar: jest.Mock): ServicioAutenticacionService {
    return { autorizar } as unknown as ServicioAutenticacionService;
}

describe('ProgresoGateway (WS Hub, tarea 24.1)', () => {
    it('handshake: token valido adjunta el contexto al socket (acceso concedido)', async () => {
        const autorizar = jest.fn().mockResolvedValue(CONTEXTO);
        const gateway = new ProgresoGateway(fakeAuth(autorizar));
        const { socket, disconnect } = fakeSocket({ authToken: 'jwt-valido' });

        await gateway.handleConnection(socket);

        expect(autorizar).toHaveBeenCalledWith('jwt-valido');
        expect(socket.data.contexto).toEqual(CONTEXTO);
        expect(disconnect).not.toHaveBeenCalled();
    });

    it('handshake fail-closed: token invalido desconecta y no adjunta contexto', async () => {
        const autorizar = jest.fn().mockRejectedValue(new Error('no_autorizado'));
        const gateway = new ProgresoGateway(fakeAuth(autorizar));
        const { socket, disconnect, emit } = fakeSocket({ authToken: 'jwt-malo' });

        await gateway.handleConnection(socket);

        expect(socket.data.contexto).toBeUndefined();
        expect(emit).toHaveBeenCalledWith('error', { motivo: 'no_autorizado' });
        expect(disconnect).toHaveBeenCalledWith(true);
    });

    it('handshake fail-closed: sin token alguno desconecta (denegacion por defecto)', async () => {
        const autorizar = jest.fn().mockRejectedValue(new Error('token_ausente'));
        const gateway = new ProgresoGateway(fakeAuth(autorizar));
        const { socket, disconnect } = fakeSocket();

        await gateway.handleConnection(socket);

        expect(autorizar).toHaveBeenCalledWith(undefined);
        expect(disconnect).toHaveBeenCalledWith(true);
    });

    it('suscribir: requiere socket autenticado (fail-closed)', () => {
        const gateway = new ProgresoGateway(fakeAuth(jest.fn()));
        const { socket, join } = fakeSocket();
        // Socket sin contexto (no autenticado).
        const res = gateway.suscribir(socket, { analisisId: 'a1' });

        expect(res).toEqual({ ok: false });
        expect(join).not.toHaveBeenCalled();
    });

    it('suscribir: socket autenticado entra en la sala del Analisis', () => {
        const gateway = new ProgresoGateway(fakeAuth(jest.fn()));
        const { socket, join } = fakeSocket();
        socket.data.contexto = CONTEXTO;

        const res = gateway.suscribir(socket, { analisisId: 'a1' });

        expect(res).toEqual({ ok: true, analisisId: 'a1' });
        expect(join).toHaveBeenCalledWith(salaAnalisis('a1'));
    });

    it('desuscribir: socket autenticado sale de la sala del Analisis', () => {
        const gateway = new ProgresoGateway(fakeAuth(jest.fn()));
        const { socket, leave } = fakeSocket();
        socket.data.contexto = CONTEXTO;

        const res = gateway.desuscribir(socket, { analisisId: 'a1' });

        expect(res).toEqual({ ok: true, analisisId: 'a1' });
        expect(leave).toHaveBeenCalledWith(salaAnalisis('a1'));
    });

    it('emitirProgreso: reenvia el evento solo a la sala del Analisis', () => {
        const gateway = new ProgresoGateway(fakeAuth(jest.fn()));
        const emit = jest.fn();
        const to = jest.fn().mockReturnValue({ emit });
        gateway.server = { to } as any;

        const evento: ProgresoEvento = {
            analisisId: 'a1',
            tipo: 'ciclo',
            semanaActual: 3,
            estadoEjecucion: 'EN_EJECUCION',
        };
        gateway.emitirProgreso(evento);

        expect(to).toHaveBeenCalledWith(salaAnalisis('a1'));
        expect(emit).toHaveBeenCalledWith(MENSAJE_WS_PROGRESO, evento);
    });

    it('emitirProgreso: ignora eventos sin analisisId', () => {
        const gateway = new ProgresoGateway(fakeAuth(jest.fn()));
        const to = jest.fn();
        gateway.server = { to } as any;

        gateway.emitirProgreso({ tipo: 'modo' } as ProgresoEvento);

        expect(to).not.toHaveBeenCalled();
    });
});

/** Contexto de un OBSERVADOR (rol de solo lectura, igualmente autenticado). */
const CONTEXTO_OBSERVADOR: ContextoAcceso = {
    usuarioId: 7,
    rol: RolGDS.OBSERVADOR,
};

describe('ProgresoGateway — handshake JWT fail-closed (cobertura 24.2)', () => {
    it('token expirado: deniega y desconecta sin adjuntar contexto', async () => {
        // El Servicio_Autenticacion rechaza un JWT expirado (401 sin reintento).
        const autorizar = jest
            .fn()
            .mockRejectedValue(new AccesoDenegadoError(401, 'token_expirado'));
        const gateway = new ProgresoGateway(fakeAuth(autorizar));
        const { socket, disconnect, emit } = fakeSocket({ authToken: 'jwt-expirado' });

        await gateway.handleConnection(socket);

        expect(socket.data.contexto).toBeUndefined();
        expect(emit).toHaveBeenCalledWith('error', { motivo: 'no_autorizado' });
        expect(disconnect).toHaveBeenCalledWith(true);
    });

    it('usuario sin rol GDS: deniega y desconecta (sin acceso de solo lectura)', async () => {
        // JWT valido del colegio pero sin rol GDS en la BD propia -> 403.
        const autorizar = jest
            .fn()
            .mockRejectedValue(new AccesoDenegadoError(403, 'sin_rol_gds'));
        const gateway = new ProgresoGateway(fakeAuth(autorizar));
        const { socket, disconnect } = fakeSocket({ authToken: 'jwt-sin-rol' });

        await gateway.handleConnection(socket);

        expect(socket.data.contexto).toBeUndefined();
        expect(disconnect).toHaveBeenCalledWith(true);
    });

    it('fallo tecnico de validacion: deniega y desconecta (fail-closed, sin degradacion)', async () => {
        // Indisponibilidad de la validacion (503) -> nunca concede acceso.
        const autorizar = jest
            .fn()
            .mockRejectedValue(new AccesoDenegadoError(503, 'validacion_no_disponible'));
        const gateway = new ProgresoGateway(fakeAuth(autorizar));
        const { socket, disconnect } = fakeSocket({ authToken: 'jwt-cualquiera' });

        await gateway.handleConnection(socket);

        expect(socket.data.contexto).toBeUndefined();
        expect(disconnect).toHaveBeenCalledWith(true);
    });

    it('token en cabecera Authorization: Bearer ... se valida correctamente', async () => {
        const autorizar = jest.fn().mockResolvedValue(CONTEXTO);
        const gateway = new ProgresoGateway(fakeAuth(autorizar));
        const { socket, disconnect } = fakeSocket({ authorization: 'Bearer jwt-en-header' });

        await gateway.handleConnection(socket);

        expect(autorizar).toHaveBeenCalledWith('Bearer jwt-en-header');
        expect(socket.data.contexto).toEqual(CONTEXTO);
        expect(disconnect).not.toHaveBeenCalled();
    });

    it('token en query string ?token=...: se valida correctamente', async () => {
        const autorizar = jest.fn().mockResolvedValue(CONTEXTO);
        const gateway = new ProgresoGateway(fakeAuth(autorizar));
        const { socket, disconnect } = fakeSocket({ queryToken: 'jwt-en-query' });

        await gateway.handleConnection(socket);

        expect(autorizar).toHaveBeenCalledWith('jwt-en-query');
        expect(socket.data.contexto).toEqual(CONTEXTO);
        expect(disconnect).not.toHaveBeenCalled();
    });

    it('precedencia de extraccion: auth.token tiene prioridad sobre header y query', async () => {
        const autorizar = jest.fn().mockResolvedValue(CONTEXTO);
        const gateway = new ProgresoGateway(fakeAuth(autorizar));
        const { socket } = fakeSocket({
            authToken: 'desde-auth',
            authorization: 'Bearer desde-header',
            queryToken: 'desde-query',
        });

        await gateway.handleConnection(socket);

        expect(autorizar).toHaveBeenCalledWith('desde-auth');
    });
});

describe('ProgresoGateway — suscripcion/desuscripcion requieren autenticacion (cobertura 24.2)', () => {
    it('suscribir sin analisisId: rechaza aunque este autenticado', () => {
        const gateway = new ProgresoGateway(fakeAuth(jest.fn()));
        const { socket, join } = fakeSocket();
        socket.data.contexto = CONTEXTO;

        const res = gateway.suscribir(socket, {});

        expect(res).toEqual({ ok: false });
        expect(join).not.toHaveBeenCalled();
    });

    it('suscribir: un OBSERVADOR autenticado tambien puede entrar a la sala', () => {
        const gateway = new ProgresoGateway(fakeAuth(jest.fn()));
        const { socket, join } = fakeSocket();
        socket.data.contexto = CONTEXTO_OBSERVADOR;

        const res = gateway.suscribir(socket, { analisisId: 'a-obs' });

        expect(res).toEqual({ ok: true, analisisId: 'a-obs' });
        expect(join).toHaveBeenCalledWith(salaAnalisis('a-obs'));
    });

    it('desuscribir: requiere socket autenticado (fail-closed)', () => {
        const gateway = new ProgresoGateway(fakeAuth(jest.fn()));
        const { socket, leave } = fakeSocket();
        // Socket sin contexto (no autenticado).
        const res = gateway.desuscribir(socket, { analisisId: 'a1' });

        expect(res).toEqual({ ok: false });
        expect(leave).not.toHaveBeenCalled();
    });

    it('desuscribir sin analisisId: rechaza aunque este autenticado', () => {
        const gateway = new ProgresoGateway(fakeAuth(jest.fn()));
        const { socket, leave } = fakeSocket();
        socket.data.contexto = CONTEXTO;

        const res = gateway.desuscribir(socket, {});

        expect(res).toEqual({ ok: false });
        expect(leave).not.toHaveBeenCalled();
    });
});

describe('ProgresoGateway — entrega por sala sin fuga entre analisis (cobertura 24.2)', () => {
    /**
     * Construye un servidor falso cuyas salas (`to(room)`) son independientes:
     * registra que mensajes recibe cada sala, permitiendo verificar que NO hay
     * fuga de progreso entre analisis distintos.
     */
    function fakeServerPorSala(): {
        server: any;
        emisionesDe: (room: string) => Array<[string, ProgresoEvento]>;
    } {
        const porSala = new Map<string, Array<[string, ProgresoEvento]>>();
        const to = jest.fn((room: string) => ({
            emit: (mensaje: string, payload: ProgresoEvento) => {
                const lista = porSala.get(room) ?? [];
                lista.push([mensaje, payload]);
                porSala.set(room, lista);
            },
        }));
        return {
            server: { to },
            emisionesDe: (room: string) => porSala.get(room) ?? [],
        };
    }

    it('el progreso de un Analisis llega solo a su sala y no a la de otro', () => {
        const gateway = new ProgresoGateway(fakeAuth(jest.fn()));
        const { server, emisionesDe } = fakeServerPorSala();
        gateway.server = server;

        const eventoA1: ProgresoEvento = {
            analisisId: 'a1',
            tipo: 'ciclo',
            semanaActual: 5,
            estadoEjecucion: 'EN_EJECUCION',
        };
        gateway.emitirProgreso(eventoA1);

        // La sala del analisis a1 recibe el evento exactamente una vez...
        expect(emisionesDe(salaAnalisis('a1'))).toEqual([
            [MENSAJE_WS_PROGRESO, eventoA1],
        ]);
        // ...y la sala de un analisis distinto (a2) NO recibe nada (sin fuga).
        expect(emisionesDe(salaAnalisis('a2'))).toEqual([]);
    });

    it('eventos de analisis distintos se enrutan cada uno a su sala', () => {
        const gateway = new ProgresoGateway(fakeAuth(jest.fn()));
        const { server, emisionesDe } = fakeServerPorSala();
        gateway.server = server;

        const eA: ProgresoEvento = { analisisId: 'a1', tipo: 'salto', semanaActual: 2 };
        const eB: ProgresoEvento = { analisisId: 'b2', tipo: 'modo', estadoEjecucion: 'PAUSADO' };
        gateway.emitirProgreso(eA);
        gateway.emitirProgreso(eB);

        expect(emisionesDe(salaAnalisis('a1'))).toEqual([[MENSAJE_WS_PROGRESO, eA]]);
        expect(emisionesDe(salaAnalisis('b2'))).toEqual([[MENSAJE_WS_PROGRESO, eB]]);
    });

    it('el payload entregado es colectivo: identico al publicado y sin campos individuales/PII', () => {
        const gateway = new ProgresoGateway(fakeAuth(jest.fn()));
        const emit = jest.fn();
        const to = jest.fn().mockReturnValue({ emit });
        gateway.server = { to } as any;

        const evento: ProgresoEvento = {
            analisisId: 'a1',
            institucionId: 'i1',
            tipo: 'ciclo',
            semanaActual: 4,
            semanasProcesadas: 4,
            semanasPendientes: 20,
            estadoEjecucion: 'EN_EJECUCION',
            timestamp: 1700000000000,
        };
        gateway.emitirProgreso(evento);

        const [, payload] = emit.mock.calls[0];
        // Se reenvia el mismo evento de orquestacion sin transformacion.
        expect(payload).toBe(evento);
        // Es colectivo: ningun campo de identidad/diagnostico individual (Req. 17.4).
        const clavesProhibidas = [
            'usuarioId',
            'usuarioSinteticoId',
            'pseudonimo',
            'pii',
            'contenido',
            'resultadoIndividual',
        ];
        for (const clave of clavesProhibidas) {
            expect(payload).not.toHaveProperty(clave);
        }
    });

    it('sin servidor inicializado: no falla al intentar emitir', () => {
        const gateway = new ProgresoGateway(fakeAuth(jest.fn()));
        // `server` no inicializado (undefined): debe ignorar sin lanzar.
        expect(() =>
            gateway.emitirProgreso({ analisisId: 'a1', tipo: 'ciclo' }),
        ).not.toThrow();
    });
});
