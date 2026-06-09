/**
 * Prueba basada en propiedades (PBT) de la restriccion de borrado de
 * instituciones con dependencias del `Gestor_Instituciones` (tarea 21.1).
 *
 * Property 25: Restriccion de borrado de instituciones con dependencias
 * (Req. 7.6, 7.8).
 *
 * Para toda `Institucion` referenciada por al menos un `Analisis` (a traves de
 * su `Comunidad`, su `Ciclo_Semanal`, sus `Evidencias` o sus `Reportes`):
 *  - El intento de borrado se RECHAZA y devuelve un MENSAJE de dependencia
 *    (Req. 7.6), y lo hace como una operacion ATOMICA: el almacen no sufre
 *    ninguna mutacion parcial (la institucion y sus referencias permanecen).
 *  - La restriccion se expone de forma PROACTIVA (Req. 7.8):
 *    `restriccionesEliminacion` informa `puedeEliminar === false` con su
 *    mensaje de dependencia, sin intentar el borrado.
 * Y toda `Institucion` NO referenciada (`total === 0`) SI puede eliminarse:
 *  - `restriccionesEliminacion` informa `puedeEliminar === true` con mensaje
 *    vacio, y el borrado efectivo la elimina del almacen.
 *
 * El `Gestor_Instituciones` real se ejerce sobre un DOBLE EN MEMORIA del puerto
 * `InstitucionesRepositorio` (sin base de datos) que reproduce la semantica de
 * almacenamiento y de borrado atomico, reutilizando la MISMA logica de dominio
 * de dependencias (`construirDependencias`, `mensajeDependencia`) y los mismos
 * errores tipados (`InstitucionConDependenciasError`, `InstitucionNoEncontradaError`)
 * que la implementacion Prisma. Asi la propiedad valida la regla de negocio real
 * y no un mock de su comportamiento.
 *
 * Se reconoce por el patron `pbt` en su ruta (`vitest run pbt`, Req. 26.1, 26.2)
 * y se ejecuta con un minimo de 100 iteraciones (`{ numRuns: 100 }`).
 *
 * **Validates: Requirements 7.6, 7.8**
 */
// Feature: analisis-tendencias-riesgo-emocional, Property 25: Restricción de borrado de instituciones con dependencias
import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { GestorInstituciones } from "../gestorInstituciones";
import { CATEGORIAS_INSTITUCION } from "../instituciones.types";
import type {
    CambiosInstitucion,
    DatosInstitucion,
    DependenciasInstitucion,
    Institucion,
    InstitucionesRepositorio,
    RegistroAuditoria,
} from "../instituciones.types";
import {
    InstitucionConDependenciasError,
    InstitucionNoEncontradaError,
} from "../instituciones.errores";
import {
    construirDependencias,
    mensajeDependencia,
} from "../instituciones.dependencias";

// ---------------------------------------------------------------------------
// Conteo de referencias entrantes (de algun `Analisis`) hacia una institucion.
// Cualquier bucket > 0 implica que la institucion esta referenciada y NO puede
// borrarse (Req. 7.6). Todos los buckets en 0 => institucion libre.
// ---------------------------------------------------------------------------
interface ReferenciasAnalisis {
    comunidades: number;
    ciclos: number;
    evidencias: number;
    reportes: number;
}

// ---------------------------------------------------------------------------
// Doble en memoria del puerto `InstitucionesRepositorio` (sin BD).
//
// Reproduce la semantica de la implementacion Prisma:
//  - `eliminarAtomico` lee un snapshot, decide y SOLO muta el almacen cuando el
//    borrado procede; ante dependencias lanza `InstitucionConDependenciasError`
//    con el mensaje de dependencia, sin tocar el almacen (atomicidad).
//  - `contarDependencias` agrega las referencias con `construirDependencias`.
// ---------------------------------------------------------------------------
class RepositorioInstitucionesEnMemoria implements InstitucionesRepositorio {
    private readonly instituciones = new Map<string, Institucion>();
    private readonly referencias = new Map<string, ReferenciasAnalisis>();
    private seq = 0;

    async crear(datos: DatosInstitucion): Promise<Institucion> {
        const id = `inst-${++this.seq}`;
        const institucion: Institucion = { id, ...datos };
        this.instituciones.set(id, { ...institucion });
        return { ...institucion };
    }

    async listar(): Promise<Institucion[]> {
        return [...this.instituciones.values()].map((i) => ({ ...i }));
    }

    async obtenerPorId(id: string): Promise<Institucion | null> {
        const i = this.instituciones.get(id);
        return i ? { ...i } : null;
    }

    async actualizar(
        id: string,
        cambios: CambiosInstitucion,
    ): Promise<Institucion> {
        const existente = this.instituciones.get(id);
        if (!existente) {
            throw new InstitucionNoEncontradaError(id);
        }
        const actualizado: Institucion = { ...existente, ...cambios };
        this.instituciones.set(id, actualizado);
        return { ...actualizado };
    }

    async contarDependencias(id: string): Promise<DependenciasInstitucion> {
        const r =
            this.referencias.get(id) ??
            { comunidades: 0, ciclos: 0, evidencias: 0, reportes: 0 };
        return construirDependencias(r);
    }

    async eliminarAtomico(id: string): Promise<void> {
        // Operacion atomica: snapshot -> decision -> mutacion solo si procede.
        const existente = this.instituciones.get(id);
        if (!existente) {
            throw new InstitucionNoEncontradaError(id);
        }
        const dependencias = await this.contarDependencias(id);
        if (dependencias.total > 0) {
            // Rechazo + mensaje de dependencia como una sola operacion (Req. 7.6).
            throw new InstitucionConDependenciasError(
                id,
                dependencias,
                mensajeDependencia(id, dependencias),
            );
        }
        this.instituciones.delete(id);
        this.referencias.delete(id);
    }

    /** Helper de prueba: registra las referencias entrantes de un `Analisis`. */
    registrarReferencias(id: string, referencias: ReferenciasAnalisis): void {
        this.referencias.set(id, referencias);
    }
}

/** Doble de auditoria: no-op (la auditoria no es objeto de esta propiedad). */
class AuditoriaNoOp implements RegistroAuditoria {
    registrar(): void {
        /* no-op */
    }
}

// ---------------------------------------------------------------------------
// Generadores acotados al espacio de entrada del dominio.
// ---------------------------------------------------------------------------

/** Nombre legible no vacio (1..200 tras `trim`) admitido por la validacion. */
const nombreArb: fc.Arbitrary<string> = fc
    .string({ minLength: 1, maxLength: 40 })
    .map((s) => s.trim())
    .filter((s) => s.length >= 1 && s.length <= 200);

/** Datos validos de alta de una `Institucion` (geolocalizada). */
const datosInstitucionArb: fc.Arbitrary<DatosInstitucion> = fc.record({
    nombre: nombreArb,
    categoria: fc.constantFrom(...CATEGORIAS_INSTITUCION),
    latitud: fc.double({ min: -90, max: 90, noNaN: true }),
    longitud: fc.double({ min: -180, max: 180, noNaN: true }),
    radioMetros: fc.integer({ min: 1, max: 50_000 }),
    logoUrl: fc.constant(null),
    descripcion: fc.constant(null),
});

/** Referencias entrantes; puede ser todo 0 (libre) o tener algun bucket > 0. */
const referenciasArb: fc.Arbitrary<ReferenciasAnalisis> = fc.record({
    comunidades: fc.nat({ max: 4 }),
    ciclos: fc.nat({ max: 4 }),
    evidencias: fc.nat({ max: 4 }),
    reportes: fc.nat({ max: 4 }),
});

/** Una institucion candidata con sus referencias entrantes. */
const candidataArb = fc.record({
    datos: datosInstitucionArb,
    referencias: referenciasArb,
});

describe("PBT Property 25: Restriccion de borrado de instituciones con dependencias (Req. 7.6, 7.8)", () => {
    it("rechaza atomicamente con mensaje el borrado de instituciones referenciadas y permite borrar las libres", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.array(candidataArb, { minLength: 1, maxLength: 8 }),
                async (candidatas) => {
                    const repo = new RepositorioInstitucionesEnMemoria();
                    const gestor = new GestorInstituciones(repo, new AuditoriaNoOp());

                    // --- Alta de todas las instituciones + registro de referencias. ---
                    const seguimiento: Array<{ id: string; total: number }> = [];
                    for (const c of candidatas) {
                        const inst = await gestor.crear(c.datos);
                        repo.registrarReferencias(inst.id, c.referencias);
                        const total =
                            c.referencias.comunidades +
                            c.referencias.ciclos +
                            c.referencias.evidencias +
                            c.referencias.reportes;
                        seguimiento.push({ id: inst.id, total });
                    }

                    const totalInicial = (await gestor.listar()).length;
                    expect(totalInicial).toBe(candidatas.length);

                    const referenciadas = seguimiento.filter((s) => s.total > 0);
                    const libres = seguimiento.filter((s) => s.total === 0);

                    // --- Instituciones REFERENCIADAS: rechazo atomico + mensaje (Req. 7.6, 7.8). ---
                    for (const { id } of referenciadas) {
                        // Exposicion proactiva de la restriccion (Req. 7.8).
                        const restriccion = await gestor.restriccionesEliminacion(id);
                        expect(restriccion.puedeEliminar).toBe(false);
                        expect(restriccion.dependencias.total).toBeGreaterThan(0);
                        expect(restriccion.mensaje.length).toBeGreaterThan(0);
                        expect(restriccion.mensaje).toContain(id);

                        // El intento de borrado se rechaza con un mensaje de dependencia.
                        let error: unknown;
                        try {
                            await gestor.eliminar(id);
                            expect.unreachable(
                                "el borrado de una institucion referenciada debe rechazarse",
                            );
                        } catch (e) {
                            error = e;
                        }
                        expect(error).toBeInstanceOf(InstitucionConDependenciasError);
                        const err = error as InstitucionConDependenciasError;
                        expect(err.institucionId).toBe(id);
                        expect(err.dependencias.total).toBeGreaterThan(0);
                        expect(err.message.length).toBeGreaterThan(0);
                        expect(err.message).toBe(
                            mensajeDependencia(id, err.dependencias),
                        );

                        // Atomicidad: el almacen no sufrio mutacion (sigue presente).
                        const sigueExistiendo = await gestor.obtener(id);
                        expect(sigueExistiendo.id).toBe(id);
                    }

                    // El rechazo no borro ninguna institucion (operacion atomica).
                    expect((await gestor.listar()).length).toBe(totalInicial);

                    // --- Instituciones LIBRES: si pueden eliminarse. ---
                    for (const { id } of libres) {
                        const restriccion = await gestor.restriccionesEliminacion(id);
                        expect(restriccion.puedeEliminar).toBe(true);
                        expect(restriccion.dependencias.total).toBe(0);
                        expect(restriccion.mensaje).toBe("");

                        await gestor.eliminar(id);

                        // Quedo efectivamente eliminada del almacen.
                        await expect(gestor.obtener(id)).rejects.toBeInstanceOf(
                            InstitucionNoEncontradaError,
                        );
                    }

                    // Estado final: solo permanecen las referenciadas.
                    const finales = await gestor.listar();
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
