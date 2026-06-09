/**
 * Prueba basada en propiedades (PBT) de la EXPOSICION EXCLUSIVAMENTE COLECTIVA.
 *
 * Property 17: Exposición exclusivamente colectiva (Req. 17.4, 17.6, 20.5).
 *
 * *Para toda* salida del `Indice_Riesgo` y del `Motor_Explicativo`, los
 * resultados expuestos son agregados a nivel de `Comunidad_Digital` y NO
 * exponen puntuaciones de riesgo ni diagnósticos a nivel de `Usuario_Sintetico`
 * individual.
 *
 * Esta suite verifica, sobre las funciones puras {@link calcularDimensiones}
 * (Indice_Riesgo) y {@link construirExplicacion} (Motor_Explicativo), las
 * invariantes universales de la propiedad para *toda* entrada —incluso cuando
 * se inyectan deliberadamente identificadores de `Usuario_Sintetico` en las
 * señales de entrada—:
 *
 * - **Cardinalidad colectiva (Req. 17.4):** el `Indice_Riesgo` produce
 *   EXACTAMENTE una fila por dimensión de la `(Comunidad_Digital, Semana)`; su
 *   tamaño depende solo del número de dimensiones, nunca del número de usuarios
 *   sintéticos presentes en la entrada.
 * - **Esquema colectivo (Req. 17.6, 20.5):** cada salida (dimensión y
 *   explicación) expone ÚNICAMENTE el conjunto fijo de campos colectivos; ningún
 *   nombre de campo (recursivamente) alude a un usuario/individuo.
 * - **No fuga de identificadores individuales (Req. 17.6, 20.5):** ningún
 *   identificador de `Usuario_Sintetico` inyectado en la entrada aparece en la
 *   salida serializada del `Indice_Riesgo` ni del `Motor_Explicativo`.
 * - **Anclaje colectivo (Req. 20.5):** la explicación se refiere a la dimensión
 *   colectiva (`dimension`/`nombre`) y su evidencia es agregada (conteos
 *   colectivos), nunca un desglose por usuario individual.
 *
 * Se reconoce por el patrón `pbt` en su ruta para que el runner de PBT ejecute
 * esta suite (Req. 26.1, 26.2). Cada propiedad se ejecuta con un mínimo de 100
 * iteraciones (`{ numRuns: 100 }`).
 *
 * **Validates: Requirements 17.4, 17.6, 20.5**
 */
// Feature: analisis-tendencias-riesgo-emocional, Property 17: Exposición exclusivamente colectiva
// Ejecutado bajo Jest + ts-jest: `describe`, `it` y `expect` son globales (sin import).
import fc from "fast-check";

import {
    calcularDimensiones,
    type DefinicionDimension,
    type DimensionRiesgo,
    type EntradaIndice,
} from "../indiceRiesgo";
import { construirExplicacion, type ContextoExplicacion } from "../motorExplicativo";

/**
 * Conjunto FIJO de campos colectivos que puede exponer una `DimensionRiesgo`.
 * Cualquier campo fuera de este conjunto sería una fuga del esquema colectivo.
 */
const CLAVES_DIMENSION_COLECTIVA = new Set<string>([
    "clave",
    "nombre",
    "valor",
    "minimo",
    "maximo",
    "scoreCalibradoMl",
]);

/**
 * Conjunto FIJO de campos colectivos que puede exponer una `Explicacion`.
 * `evidenciaIds` referencia evidencia COLECTIVA anonimizada por id (Req. 30.1),
 * no a usuarios individuales.
 */
const CLAVES_EXPLICACION_COLECTIVA = new Set<string>([
    "dimension",
    "nombre",
    "direccion",
    "que",
    "porQue",
    "cuandoEmpezo",
    "comoEvoluciono",
    "textoNL",
    "evidencia",
    "evidenciaIds",
]);

/**
 * Patrón de nombres de campo PROHIBIDOS por aludir a un nivel individual de
 * `Usuario_Sintetico` (en vez de colectivo). Si algún campo de la salida usara
 * una de estas claves, sería una exposición individual.
 */
const CAMPO_INDIVIDUAL = /usuari|user|individu|sintetic|persona|alumno|estudiante|perfil/i;

/** Recolecta recursivamente TODOS los nombres de campo de un objeto/array. */
function recolectarClaves(valor: unknown, acc: string[] = []): string[] {
    if (Array.isArray(valor)) {
        for (const item of valor) {
            recolectarClaves(item, acc);
        }
    } else if (valor !== null && typeof valor === "object") {
        for (const [clave, hijo] of Object.entries(valor)) {
            acc.push(clave);
            recolectarClaves(hijo, acc);
        }
    }
    return acc;
}

/**
 * Generador de identificador de `Usuario_Sintetico` con prefijo distintivo, de
 * modo que su aparición en la salida serializada sea inequívoca y no colisione
 * con claves de dimensión (`dim-`), comunidad (`com-`) ni evidencia (`ev-`).
 */
const usuarioSinteticoIdArb: fc.Arbitrary<string> = fc.uuid().map((u) => `usuario-${u}`);

/** Generador de un rango `[minimo, maximo]` arbitrario (puede llegar invertido). */
const rangoArb: fc.Arbitrary<{ minimo: number; maximo: number }> = fc
    .tuple(
        fc.double({ min: -500, max: 500, noNaN: true }),
        fc.double({ min: -500, max: 500, noNaN: true }),
    )
    .map(([a, b]) => ({ minimo: a, maximo: b }));

/** Generador de una `DefinicionDimension` configurable con clave única. */
const definicionDimensionArb: fc.Arbitrary<DefinicionDimension> = fc
    .tuple(fc.uuid(), fc.string(), rangoArb)
    .map(([id, nombre, rango]) => ({
        clave: `dim-${id}`,
        nombre,
        minimo: rango.minimo,
        maximo: rango.maximo,
    }));

/** Conjunto de dimensiones con claves únicas (1..8). */
const dimensionesArb: fc.Arbitrary<DefinicionDimension[]> = fc.uniqueArray(
    definicionDimensionArb,
    { minLength: 1, maxLength: 8, selector: (d) => d.clave },
);

/** Generador de un valor de señal (incluye casos degenerados). */
const valorSenalArb: fc.Arbitrary<number> = fc.oneof(
    fc.double({ min: -1000, max: 1000, noNaN: true }),
    fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
);

/**
 * Genera `{ dimensiones, entrada, usuariosInyectados }`: una `EntradaIndice`
 * AGREGADA Y COLECTIVA por `(Comunidad_Digital, Semana)` cuyas `senales`
 * contienen, ADEMAS de una señal por cada dimensión, señales "contaminadas"
 * indexadas por identificadores de `Usuario_Sintetico` individuales. Un
 * `Indice_Riesgo` correcto debe IGNORAR esas señales individuales y no filtrar
 * jamás esos identificadores a la salida (Req. 17.4, 17.6).
 */
const entradaConUsuariosArb: fc.Arbitrary<{
    dimensiones: DefinicionDimension[];
    entrada: EntradaIndice;
    usuariosInyectados: string[];
}> = dimensionesArb.chain((dimensiones) =>
    fc
        .record({
            comunidadId: fc.uuid().map((u) => `com-${u}`),
            numeroSemana: fc.integer({ min: 1, max: 520 }),
            senalesDimension: fc.record(
                Object.fromEntries(dimensiones.map((d) => [d.clave, valorSenalArb])),
            ) as fc.Arbitrary<Record<string, number>>,
            usuarios: fc.uniqueArray(usuarioSinteticoIdArb, { minLength: 1, maxLength: 6 }),
            valoresUsuario: fc.array(valorSenalArb, { minLength: 1, maxLength: 6 }),
            evidenciaIds: fc.array(fc.uuid().map((u) => `ev-${u}`), { maxLength: 6 }),
        })
        .map(({ comunidadId, numeroSemana, senalesDimension, usuarios, valoresUsuario, evidenciaIds }) => {
            // Inyectamos señales individuales por usuario, que un cálculo
            // colectivo correcto debe ignorar por completo.
            const senalesIndividuales: Record<string, number> = {};
            usuarios.forEach((u, i) => {
                senalesIndividuales[u] = valoresUsuario[i % valoresUsuario.length];
            });
            const entrada: EntradaIndice = {
                comunidadId,
                numeroSemana,
                senales: { ...senalesDimension, ...senalesIndividuales },
                evidenciaIds,
            };
            return { dimensiones, entrada, usuariosInyectados: usuarios };
        }),
);

/** Generador de una `DimensionRiesgo` colectiva ya calculada (para el motor). */
const dimensionRiesgoArb: fc.Arbitrary<DimensionRiesgo> = fc
    .tuple(fc.uuid(), fc.string(), rangoArb, fc.double({ min: 0, max: 1, noNaN: true }))
    .map(([id, nombre, rango, score]) => {
        const minimo = Math.min(rango.minimo, rango.maximo);
        const maximo = Math.max(rango.minimo, rango.maximo);
        const valor = minimo + (maximo - minimo) * 0.5;
        return { clave: `dim-${id}`, nombre, valor, minimo, maximo, scoreCalibradoMl: score };
    });

describe("PBT Property 17: Exposición exclusivamente colectiva (Req. 17.4, 17.6, 20.5)", () => {
    // Feature: analisis-tendencias-riesgo-emocional, Property 17: Exposición exclusivamente colectiva
    it("el Indice_Riesgo expone solo agregados colectivos por (comunidad, semana), nunca por Usuario_Sintetico (Req. 17.4, 17.6)", () => {
        fc.assert(
            fc.property(entradaConUsuariosArb, ({ dimensiones, entrada, usuariosInyectados }) => {
                const filas = calcularDimensiones(entrada, dimensiones);

                // Cardinalidad colectiva: exactamente una fila por dimensión,
                // independiente del número de usuarios sintéticos en la entrada.
                expect(filas).toHaveLength(dimensiones.length);

                // Esquema colectivo: cada fila expone solo el conjunto fijo de
                // campos colectivos; ningún campo alude a un individuo.
                for (const fila of filas) {
                    const claves = Object.keys(fila);
                    expect(new Set(claves)).toEqual(CLAVES_DIMENSION_COLECTIVA);
                    for (const clave of recolectarClaves(fila)) {
                        expect(CAMPO_INDIVIDUAL.test(clave)).toBe(false);
                    }
                }

                // No fuga: ningún identificador de usuario sintético inyectado
                // aparece en la salida serializada del índice.
                const serializado = JSON.stringify(filas);
                for (const usuarioId of usuariosInyectados) {
                    expect(serializado).not.toContain(usuarioId);
                }
            }),
            { numRuns: 100 },
        );
    });

    it("el Motor_Explicativo explica a nivel colectivo (dimensión de la comunidad), nunca por Usuario_Sintetico (Req. 20.5, 17.6)", () => {
        fc.assert(
            fc.property(
                dimensionRiesgoArb,
                fc.option(dimensionRiesgoArb, { nil: null }),
                fc.uniqueArray(fc.uuid().map((u) => `ev-${u}`), { minLength: 1, maxLength: 6 }),
                fc.uniqueArray(usuarioSinteticoIdArb, { minLength: 1, maxLength: 6 }),
                (dim, anteriorBruto, evidenciaIds, usuariosInyectados) => {
                    // El "anterior" debe compartir la dimensión colectiva.
                    const anterior: DimensionRiesgo | null =
                        anteriorBruto === null
                            ? null
                            : { ...anteriorBruto, clave: dim.clave, nombre: dim.nombre };

                    // Contexto colectivo: conteos agregados de la comunidad.
                    const contexto: ContextoExplicacion = {
                        conteoPublicaciones: 7,
                        conteoComentarios: 13,
                        semanaActual: 5,
                    };

                    const exp = construirExplicacion(dim, anterior, evidenciaIds, contexto);

                    // Esquema colectivo: la explicación expone solo el conjunto
                    // fijo de campos colectivos; ningún campo alude a un individuo.
                    expect(new Set(Object.keys(exp))).toEqual(CLAVES_EXPLICACION_COLECTIVA);
                    for (const clave of recolectarClaves(exp)) {
                        expect(CAMPO_INDIVIDUAL.test(clave)).toBe(false);
                    }

                    // Anclaje colectivo: la conclusión se refiere a la dimensión
                    // colectiva, nunca a un usuario individual.
                    expect(exp.dimension).toBe(dim.clave);
                    expect(exp.nombre).toBe(dim.nombre);

                    // La evidencia es agregada (conteos colectivos), sin desglose
                    // por usuario individual.
                    expect(new Set(Object.keys(exp.evidencia))).toEqual(
                        new Set(["conteoPublicaciones", "conteoComentarios", "delta", "variacionPct"]),
                    );

                    // No fuga: ningún identificador de usuario sintético aparece
                    // en la explicación serializada.
                    const serializado = JSON.stringify(exp);
                    for (const usuarioId of usuariosInyectados) {
                        expect(serializado).not.toContain(usuarioId);
                    }
                },
            ),
            { numRuns: 100 },
        );
    });
});
