// Feature: analisis-tendencias-riesgo-emocional, Property 25: Restricción de borrado de instituciones con dependencias
/**
 * PBT (fast-check, numRuns: 100) de la **Property 25: Restricción de borrado de
 * instituciones con dependencias** del `Gestor_Instituciones` (tarea 20.2),
 * sobre el `InstitutionsService` real del módulo NestJS `institutions`.
 *
 * Enunciado (design.md, Property 25):
 *   *Para toda* `Institucion` referenciada por al menos un `Analisis`, el intento
 *   de borrado se rechaza y entrega un mensaje de dependencia como operación
 *   atómica; una `Institucion` sin referencias puede borrarse.
 *
 * La propiedad se verifica ejerciendo el `InstitutionsService` real sobre un
 * DOBLE EN MEMORIA del `PrismaService` (sin BD viva ni red), siguiendo la
 * convención de `institutions.controller.test.ts`. El doble reproduce la
 * semántica de almacenamiento, los conteos de dependencias entrantes
 * (`comunidad`, `cicloSemanal`, `evidence`, `reporte`, `embedding`) y la
 * ejecución inmediata de `$transaction`, de modo que la propiedad valide la
 * regla de negocio real (rechazo atómico + mensaje de dependencia, exposición
 * proactiva de restricciones) y no un mock de su comportamiento.
 *
 * Reconocida por el segmento `pbt` en su ruta (`jest pbt`, Req. 26.1, 26.2) y
 * ejecutada con un mínimo de 100 iteraciones (`{ numRuns: 100 }`).
 *
 * **Validates: Requirements 7.6, 7.8**
 */
import { ConflictException, NotFoundException } from '@nestjs/common';
import fc from 'fast-check';

import { InstitutionsService } from '../institutions.service';
import type { PrismaService } from '../../../prisma/prisma.service';
import { CATEGORIAS_INSTITUCION } from '../institutions.types';
import type { CrearInstitucionDto } from '../dto/crear-institucion.dto';

interface FilaInstitucion {
    id: string;
    nombre: string;
    categoria: string;
    latitud: number;
    longitud: number;
    radioMetros: number;
    logoUrl: string | null;
    descripcion: string | null;
}

/** Referencias entrantes (de algún `Analisis`) hacia una institución. */
interface ReferenciasAnalisis {
    comunidades: number;
    ciclos: number;
    evidencias: number;
    reportes: number;
    embeddings: number;
}

/**
 * Doble en memoria del `PrismaService` con las delegaciones usadas por el
 * servicio: `institucion` (create/findMany/findUnique/delete) y los `count` de
 * cada entidad dependiente, más `$transaction` (ejecución inmediata del callback
 * con el propio doble). Reproduce el borrado atómico de la implementación real.
 */
class PrismaEnMemoria {
    private filas: FilaInstitucion[] = [];
    private contador = 0;
    /** Referencias entrantes simuladas por institucionId. */
    private referencias: Record<string, ReferenciasAnalisis> = {};

    institucion = {
        create: async ({ data }: { data: Omit<FilaInstitucion, 'id'> }): Promise<FilaInstitucion> => {
            this.contador += 1;
            const fila: FilaInstitucion = { id: `inst-${this.contador}`, ...data };
            this.filas.push(fila);
            return { ...fila };
        },
        findMany: async (): Promise<FilaInstitucion[]> =>
            [...this.filas].sort((a, b) => a.nombre.localeCompare(b.nombre)).map((f) => ({ ...f })),
        findUnique: async ({ where }: { where: { id: string } }): Promise<FilaInstitucion | null> => {
            const f = this.filas.find((x) => x.id === where.id);
            return f ? { ...f } : null;
        },
        delete: async ({ where }: { where: { id: string } }): Promise<FilaInstitucion> => {
            const idx = this.filas.findIndex((x) => x.id === where.id);
            const [borrada] = this.filas.splice(idx, 1);
            delete this.referencias[where.id];
            return { ...borrada };
        },
    };

    private bucket =
        (clave: keyof ReferenciasAnalisis) =>
            async ({ where }: { where: { institucionId: string } }): Promise<number> =>
                this.referencias[where.institucionId]?.[clave] ?? 0;

    comunidad = { count: this.bucket('comunidades') };
    cicloSemanal = { count: this.bucket('ciclos') };
    evidence = { count: this.bucket('evidencias') };
    reporte = { count: this.bucket('reportes') };
    embedding = { count: this.bucket('embeddings') };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async $transaction<T>(cb: (tx: any) => Promise<T>): Promise<T> {
        return cb(this);
    }

    /** Helper de prueba: registra las referencias entrantes de un `Analisis`. */
    registrarReferencias(id: string, referencias: ReferenciasAnalisis): void {
        this.referencias[id] = referencias;
    }
}

/** Nombre legible no vacío (1..40 tras `trim`) admitido por la validación. */
const nombreArb: fc.Arbitrary<string> = fc
    .string({ minLength: 1, maxLength: 40 })
    .map((s) => s.trim())
    .filter((s) => s.length >= 1 && s.length <= 200);

/** Datos válidos de alta de una `Institucion` geolocalizada. */
const datosInstitucionArb: fc.Arbitrary<CrearInstitucionDto> = fc.record({
    nombre: nombreArb,
    categoria: fc.constantFrom(...CATEGORIAS_INSTITUCION),
    latitud: fc.double({ min: -90, max: 90, noNaN: true }),
    longitud: fc.double({ min: -180, max: 180, noNaN: true }),
    radioMetros: fc.integer({ min: 1, max: 50_000 }),
    logoUrl: fc.constant(undefined),
    descripcion: fc.constant(undefined),
});

/** Referencias entrantes; puede ser todo 0 (libre) o tener algún bucket > 0. */
const referenciasArb: fc.Arbitrary<ReferenciasAnalisis> = fc.record({
    comunidades: fc.nat({ max: 4 }),
    ciclos: fc.nat({ max: 4 }),
    evidencias: fc.nat({ max: 4 }),
    reportes: fc.nat({ max: 4 }),
    embeddings: fc.nat({ max: 4 }),
});

/** Una institución candidata con sus referencias entrantes. */
const candidataArb = fc.record({
    datos: datosInstitucionArb,
    referencias: referenciasArb,
});

describe('PBT Property 25: Restriccion de borrado de instituciones con dependencias (Req. 7.6, 7.8)', () => {
    it('rechaza atomicamente con mensaje el borrado de referenciadas y permite borrar las libres (numRuns: 100)', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.array(candidataArb, { minLength: 1, maxLength: 8 }),
                async (candidatas) => {
                    const prisma = new PrismaEnMemoria();
                    const service = new InstitutionsService(prisma as unknown as PrismaService);

                    // --- Alta de todas las instituciones + registro de referencias. ---
                    const seguimiento: Array<{ id: string; total: number }> = [];
                    for (const c of candidatas) {
                        const inst = await service.crear(c.datos);
                        prisma.registrarReferencias(inst.id, c.referencias);
                        const total =
                            c.referencias.comunidades +
                            c.referencias.ciclos +
                            c.referencias.evidencias +
                            c.referencias.reportes +
                            c.referencias.embeddings;
                        seguimiento.push({ id: inst.id, total });
                    }

                    const totalInicial = (await service.listar()).length;
                    expect(totalInicial).toBe(candidatas.length);

                    const referenciadas = seguimiento.filter((s) => s.total > 0);
                    const libres = seguimiento.filter((s) => s.total === 0);

                    // --- REFERENCIADAS: rechazo atomico + mensaje (Req. 7.6, 7.8). ---
                    for (const { id } of referenciadas) {
                        // Exposicion proactiva de la restriccion (Req. 7.8).
                        const restriccion = await service.restriccionesEliminacion(id);
                        expect(restriccion.puedeEliminar).toBe(false);
                        expect(restriccion.dependencias.total).toBeGreaterThan(0);
                        expect(restriccion.mensaje.length).toBeGreaterThan(0);
                        expect(restriccion.mensaje).toContain(id);

                        // El intento de borrado se rechaza con un mensaje de dependencia.
                        let error: unknown;
                        try {
                            await service.eliminar(id);
                        } catch (e) {
                            error = e;
                        }
                        expect(error).toBeInstanceOf(ConflictException);
                        const respuesta = (error as ConflictException).getResponse() as {
                            error: string;
                            institucionId: string;
                            message: string;
                            dependencias: { total: number };
                        };
                        expect(respuesta.error).toBe('institucion_con_dependencias');
                        expect(respuesta.institucionId).toBe(id);
                        expect(respuesta.dependencias.total).toBeGreaterThan(0);
                        expect(respuesta.message.length).toBeGreaterThan(0);
                        expect(respuesta.message).toContain(id);

                        // Atomicidad: el almacen no sufrio mutacion (sigue presente).
                        const sigueExistiendo = await service.obtener(id);
                        expect(sigueExistiendo.id).toBe(id);
                    }

                    // El rechazo no borro ninguna institucion (operacion atomica).
                    expect((await service.listar()).length).toBe(totalInicial);

                    // --- LIBRES: si pueden eliminarse. ---
                    for (const { id } of libres) {
                        const restriccion = await service.restriccionesEliminacion(id);
                        expect(restriccion.puedeEliminar).toBe(true);
                        expect(restriccion.dependencias.total).toBe(0);
                        expect(restriccion.mensaje).toBe('');

                        await expect(service.eliminar(id)).resolves.toBeUndefined();

                        // Quedo efectivamente eliminada del almacen.
                        await expect(service.obtener(id)).rejects.toBeInstanceOf(NotFoundException);
                    }

                    // Estado final: solo permanecen las referenciadas.
                    const finales = await service.listar();
                    expect(finales.length).toBe(referenciadas.length);
                    const idsFinales = new Set(finales.map((i) => i.id));
                    for (const { id } of referenciadas) {
                        expect(idsFinales.has(id)).toBe(true);
                    }
                },
            ),
            { numRuns: 100 },
        );
    });
});
