/**
 * Pruebas unitarias de la autenticacion/autorizacion NestJS del ServidorGDS
 * (tarea 19.1): `ServicioAutenticacionService` (fail-closed), `RolesGuard`
 * (matriz por rol) y `JwtAuthGuard` (denegacion fail-closed).
 *
 * Validan los criterios del Requirement 24: validacion del JWT del colegio,
 * roles propios `ADMIN_PLATAFORMA`/`ANALISTA`/`OBSERVADOR`, OBSERVADOR sin
 * escritura, operaciones admin solo para ADMIN_PLATAFORMA, separacion de roles
 * del colegio, y denegacion segura ante fallo tecnico (Req. 24.1-24.8).
 */
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AlmacenRolesEnMemoria } from '../auth/almacenRoles';
import {
    ErrorTecnicoValidacion,
    ErrorTokenInvalido,
    RolGDS,
    type AlmacenRoles,
    type PayloadVerificado,
    type VerificadorJwt,
} from '../auth/servicioAutenticacion';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles, ROLES_KEY } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { ServicioAutenticacionService } from './servicio-autenticacion.service';

/** Verificador de JWT doble: devuelve un payload fijo o lanza el error indicado. */
class VerificadorFalso implements VerificadorJwt {
    constructor(
        private readonly resultado:
            | { ok: true; payload: PayloadVerificado }
            | { ok: false; error: Error },
    ) { }

    async verificar(): Promise<PayloadVerificado> {
        if (this.resultado.ok) return this.resultado.payload;
        throw this.resultado.error;
    }
}

/** Almacen de roles que siempre falla tecnicamente (BD no disponible). */
class AlmacenRolesCaido implements AlmacenRoles {
    async obtenerRol(): Promise<RolGDS | null> {
        throw new ErrorTecnicoValidacion('bd_no_disponible');
    }
}

/** Construye el servicio con backoff inmediato (sin esperas reales). */
function crearServicio(
    verificador: VerificadorJwt,
    almacen: AlmacenRoles,
): ServicioAutenticacionService {
    return new ServicioAutenticacionService(verificador, almacen, {
        maxReintentos: 2,
        backoffBaseMs: 0,
        dormir: async () => undefined,
    });
}

describe('ServicioAutenticacionService.puede (matriz por rol, Req. 24.3/24.4/24.6)', () => {
    const servicio = crearServicio(
        new VerificadorFalso({ ok: true, payload: { userId: 1 } }),
        new AlmacenRolesEnMemoria(),
    );

    it('OBSERVADOR solo puede leer (no escribe ni admin)', () => {
        expect(servicio.puede(RolGDS.OBSERVADOR, 'leer')).toBe(true);
        expect(servicio.puede(RolGDS.OBSERVADOR, 'escribir')).toBe(false);
        expect(servicio.puede(RolGDS.OBSERVADOR, 'admin')).toBe(false);
    });

    it('ANALISTA puede leer y escribir, pero no admin', () => {
        expect(servicio.puede(RolGDS.ANALISTA, 'leer')).toBe(true);
        expect(servicio.puede(RolGDS.ANALISTA, 'escribir')).toBe(true);
        expect(servicio.puede(RolGDS.ANALISTA, 'admin')).toBe(false);
    });

    it('ADMIN_PLATAFORMA puede leer, escribir y admin', () => {
        expect(servicio.puede(RolGDS.ADMIN_PLATAFORMA, 'leer')).toBe(true);
        expect(servicio.puede(RolGDS.ADMIN_PLATAFORMA, 'escribir')).toBe(true);
        expect(servicio.puede(RolGDS.ADMIN_PLATAFORMA, 'admin')).toBe(true);
    });
});

describe('ServicioAutenticacionService.autorizar (fail-closed, Req. 24.1/24.7/24.8)', () => {
    it('concede acceso tras validacion exitosa y rol GDS resuelto', async () => {
        const almacen = new AlmacenRolesEnMemoria({ '42': RolGDS.ANALISTA });
        const servicio = crearServicio(
            new VerificadorFalso({ ok: true, payload: { userId: 42 } }),
            almacen,
        );

        const ctx = await servicio.autorizar('Bearer token-valido');
        expect(ctx).toEqual({ usuarioId: 42, rol: RolGDS.ANALISTA });
    });

    it('deniega cuando falta el token (sin reintentar)', async () => {
        const servicio = crearServicio(
            new VerificadorFalso({ ok: true, payload: { userId: 1 } }),
            new AlmacenRolesEnMemoria({ '1': RolGDS.ADMIN_PLATAFORMA }),
        );
        await expect(servicio.autorizar(undefined)).rejects.toThrow();
    });

    it('deniega ante token criptograficamente invalido o expirado', async () => {
        const servicio = crearServicio(
            new VerificadorFalso({ ok: false, error: new ErrorTokenInvalido('expirado') }),
            new AlmacenRolesEnMemoria({ '1': RolGDS.ADMIN_PLATAFORMA }),
        );
        await expect(servicio.autorizar('Bearer x')).rejects.toThrow();
    });

    it('deniega (sin acceso degradado) ante fallo tecnico de la BD de roles', async () => {
        const servicio = crearServicio(
            new VerificadorFalso({ ok: true, payload: { userId: 7 } }),
            new AlmacenRolesCaido(),
        );
        await expect(servicio.autorizar('Bearer x')).rejects.toThrow();
    });

    it('deniega a un usuario valido sin rol GDS (ni de solo lectura)', async () => {
        const servicio = crearServicio(
            new VerificadorFalso({ ok: true, payload: { userId: 99 } }),
            new AlmacenRolesEnMemoria(),
        );
        await expect(servicio.autorizar('Bearer x')).rejects.toThrow();
    });
});

describe('ServicioAutenticacionService.resolverContexto (desde payload verificado por Passport)', () => {
    it('resuelve el contexto cuando el usuario tiene rol GDS', async () => {
        const servicio = crearServicio(
            new VerificadorFalso({ ok: true, payload: { userId: 5 } }),
            new AlmacenRolesEnMemoria({ '5': RolGDS.OBSERVADOR }),
        );
        await expect(servicio.resolverContexto(5)).resolves.toEqual({
            usuarioId: 5,
            rol: RolGDS.OBSERVADOR,
        });
    });

    it('devuelve null cuando el usuario no tiene rol GDS (fail-closed en el llamador)', async () => {
        const servicio = crearServicio(
            new VerificadorFalso({ ok: true, payload: { userId: 5 } }),
            new AlmacenRolesEnMemoria(),
        );
        await expect(servicio.resolverContexto(5)).resolves.toBeNull();
    });

    it('propaga el fallo tecnico tras agotar los reintentos con backoff', async () => {
        const servicio = crearServicio(
            new VerificadorFalso({ ok: true, payload: { userId: 5 } }),
            new AlmacenRolesCaido(),
        );
        await expect(servicio.resolverContexto(5)).rejects.toThrow();
    });
});

/** Crea un ExecutionContext doble con un `request.user` y metadata de handler. */
function crearContextoEjecucion(
    user: unknown,
    handler: () => void = () => undefined,
): ExecutionContext {
    return {
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
        getHandler: () => handler,
        getClass: () => class Dummy { },
    } as unknown as ExecutionContext;
}

describe('RolesGuard (autorizacion por rol, Req. 24.3/24.4/24.6/40.6)', () => {
    const reflector = new Reflector();
    const guard = new RolesGuard(reflector);

    /** Aplica `@Roles(...)` a un handler dummy para que el Reflector lo lea. */
    function handlerConRoles(...roles: RolGDS[]): () => void {
        const fn = (): void => undefined;
        Roles(...roles)(fn);
        return fn;
    }

    it('permite cuando no se declaran roles (solo exige autenticacion)', () => {
        const ctx = crearContextoEjecucion({ usuarioId: 1, rol: RolGDS.OBSERVADOR });
        expect(guard.canActivate(ctx)).toBe(true);
    });

    it('permite cuando el rol del usuario esta entre los permitidos', () => {
        const handler = handlerConRoles(RolGDS.ADMIN_PLATAFORMA, RolGDS.ANALISTA);
        const ctx = crearContextoEjecucion({ usuarioId: 1, rol: RolGDS.ANALISTA }, handler);
        expect(guard.canActivate(ctx)).toBe(true);
    });

    it('deniega (Forbidden) cuando el rol no esta permitido (OBSERVADOR en operacion de escritura)', () => {
        const handler = handlerConRoles(RolGDS.ADMIN_PLATAFORMA, RolGDS.ANALISTA);
        const ctx = crearContextoEjecucion({ usuarioId: 1, rol: RolGDS.OBSERVADOR }, handler);
        expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('deniega (Forbidden) operacion admin a un ANALISTA', () => {
        const handler = handlerConRoles(RolGDS.ADMIN_PLATAFORMA);
        const ctx = crearContextoEjecucion({ usuarioId: 1, rol: RolGDS.ANALISTA }, handler);
        expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('deniega fail-closed cuando no hay contexto de acceso', () => {
        const handler = handlerConRoles(RolGDS.OBSERVADOR);
        const ctx = crearContextoEjecucion(undefined, handler);
        expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('expone la clave de metadata estable', () => {
        expect(ROLES_KEY).toBe('roles_gds');
    });
});

describe('JwtAuthGuard (denegacion fail-closed, Req. 24.7/24.8)', () => {
    const guard = new JwtAuthGuard();
    const ctx = crearContextoEjecucion(undefined);

    it('deniega cuando la estrategia reporta error', () => {
        expect(() =>
            guard.handleRequest(new Error('boom'), { usuarioId: 1, rol: RolGDS.ANALISTA }, undefined, ctx),
        ).toThrow(UnauthorizedException);
    });

    it('deniega cuando no hay usuario resuelto', () => {
        expect(() => guard.handleRequest(null, undefined, undefined, ctx)).toThrow(
            UnauthorizedException,
        );
    });

    it('concede acceso devolviendo el contexto cuando la validacion es exitosa', () => {
        const contexto = { usuarioId: 1, rol: RolGDS.ADMIN_PLATAFORMA };
        expect(guard.handleRequest(null, contexto, undefined, ctx)).toBe(contexto);
    });
});
