/**
 * PBT autorizacion por rol de la plataforma GDS (tarea 19.2).
 *
 * Feature: analisis-tendencias-riesgo-emocional, Property 22: Autorización por
 * rol de la plataforma.
 *
 * "Para toda combinacion de rol GDS y operacion, la decision de autorizacion
 * cumple: `OBSERVADOR` no puede realizar operaciones de escritura; las
 * operaciones administrativas se permiten solo a `ADMIN_PLATAFORMA`; y
 * `ADMIN_PLATAFORMA` puede realizar tanto operaciones administrativas como
 * regulares."
 *
 * Se ejercitan SIN mocks las dos piezas reales de autorizacion del modulo
 * `authentication` (tarea 19.1):
 *   1. `ServicioAutenticacionService.puede(rol, accion)` — la matriz de
 *      autorizacion por rol (Req. 24.3, 24.4, 24.6).
 *   2. `RolesGuard.canActivate(...)` — la proteccion de endpoints por rol que
 *      aplica el decorador `@Roles(...)` sobre cada ruta `/api/gds/*`
 *      (Req. 40.6, coherente con el `Servicio_Autenticacion`).
 *
 * La decision de `puede` es puramente funcional sobre `(rol, accion)`, por lo
 * que el verificador de JWT y el almacen de roles inyectados son dobles inertes
 * que nunca se invocan en esta propiedad.
 *
 * Validates: Requirements 24.3, 24.4, 24.6, 40.6
 */
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import fc from 'fast-check';

import {
    RolGDS,
    type AccionGDS,
    type AlmacenRoles,
    type ContextoAcceso,
    type PayloadVerificado,
    type VerificadorJwt,
} from '../../auth/servicioAutenticacion';
import { Roles } from '../roles.decorator';
import { RolesGuard } from '../roles.guard';
import { ServicioAutenticacionService } from '../servicio-autenticacion.service';

/**
 * Dobles inertes: el calculo de `puede` y la decision del `RolesGuard` no tocan
 * identidad ni la BD de roles, de modo que estas dependencias nunca se ejecutan
 * en esta propiedad. Lanzan si se invocan para evidenciar que la autorizacion
 * es puramente funcional sobre `(rol, accion)` / `(rol, rolesPermitidos)`.
 */
const verificadorInerte: VerificadorJwt = {
    verificar(): Promise<PayloadVerificado> {
        throw new Error('verificador no debe invocarse en Property 22');
    },
};
const almacenInerte: AlmacenRoles = {
    obtenerRol(): Promise<RolGDS | null> {
        throw new Error('almacen no debe invocarse en Property 22');
    },
};

const servicio = new ServicioAutenticacionService(verificadorInerte, almacenInerte, {
    maxReintentos: 0,
    backoffBaseMs: 0,
    dormir: async () => undefined,
});

const reflector = new Reflector();
const guard = new RolesGuard(reflector);

/**
 * Roles permitidos por cada operacion, tal como los declararia `@Roles(...)`
 * sobre los endpoints `/api/gds/*`:
 *  - `leer`: todos los roles (operacion de lectura).
 *  - `escribir`: operaciones regulares de escritura (ADMIN + ANALISTA).
 *  - `admin`: operaciones administrativas (solo ADMIN_PLATAFORMA).
 */
const ROLES_POR_ACCION: Record<AccionGDS, RolGDS[]> = {
    leer: [RolGDS.ADMIN_PLATAFORMA, RolGDS.ANALISTA, RolGDS.OBSERVADOR],
    escribir: [RolGDS.ADMIN_PLATAFORMA, RolGDS.ANALISTA],
    admin: [RolGDS.ADMIN_PLATAFORMA],
};

/** Crea un ExecutionContext doble con `request.user` y metadata `@Roles(...)`. */
function crearContextoEjecucion(
    user: ContextoAcceso,
    rolesPermitidos: RolGDS[],
): ExecutionContext {
    const handler = (): void => undefined;
    Roles(...rolesPermitidos)(handler);
    return {
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
        getHandler: () => handler,
        getClass: () => class Dummy { },
    } as unknown as ExecutionContext;
}

/** Ejecuta el guard y traduce la denegacion fail-closed a `false`. */
function guardPermite(rol: RolGDS, accion: AccionGDS): boolean {
    const ctx = crearContextoEjecucion({ usuarioId: 1, rol }, ROLES_POR_ACCION[accion]);
    try {
        return guard.canActivate(ctx);
    } catch (error) {
        if (error instanceof ForbiddenException) return false;
        throw error;
    }
}

/** Genera cualquier rol GDS valido. */
const rolArb = (): fc.Arbitrary<RolGDS> =>
    fc.constantFrom(RolGDS.ADMIN_PLATAFORMA, RolGDS.ANALISTA, RolGDS.OBSERVADOR);

/** Genera cualquier accion autorizable de la plataforma. */
const accionArb = (): fc.Arbitrary<AccionGDS> =>
    fc.constantFrom<AccionGDS>('leer', 'escribir', 'admin');

/** Generador combinado `(rol, accion)` sobre todo el espacio de autorizacion. */
const rolOperacionArb = (): fc.Arbitrary<{ rol: RolGDS; accion: AccionGDS }> =>
    fc.record({ rol: rolArb(), accion: accionArb() });

describe('Property 22: Autorización por rol de la plataforma', () => {
    // Feature: analisis-tendencias-riesgo-emocional, Property 22: Autorización por rol de la plataforma
    it('OBSERVADOR no escribe; admin solo ADMIN_PLATAFORMA; ADMIN_PLATAFORMA hace admin y regulares (Req. 24.3, 24.4, 24.6, 40.6)', () => {
        fc.assert(
            fc.property(rolOperacionArb(), ({ rol, accion }) => {
                const permitido = servicio.puede(rol, accion);

                // Req. 24.3: OBSERVADOR nunca puede escribir.
                if (rol === RolGDS.OBSERVADOR && accion === 'escribir') {
                    expect(permitido).toBe(false);
                }

                // Req. 24.4 / 24.6: las operaciones administrativas se permiten
                // unicamente a ADMIN_PLATAFORMA.
                if (accion === 'admin') {
                    expect(permitido).toBe(rol === RolGDS.ADMIN_PLATAFORMA);
                }

                // Req. 24.6: ADMIN_PLATAFORMA puede tanto operaciones
                // administrativas como regulares (leer y escribir).
                if (rol === RolGDS.ADMIN_PLATAFORMA) {
                    expect(permitido).toBe(true);
                }

                // Req. 40.6: la proteccion de endpoints por rol (RolesGuard +
                // @Roles) decide de forma coherente con la matriz del
                // Servicio_Autenticacion: la ruta se concede si y solo si el rol
                // esta autorizado para la operacion.
                expect(guardPermite(rol, accion)).toBe(permitido);
            }),
            { numRuns: 100 },
        );
    });
});
