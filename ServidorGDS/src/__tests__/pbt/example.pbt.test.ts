import fc from 'fast-check';

/**
 * Prueba basada en propiedades (PBT) trivial que confirma que fast-check
 * esta correctamente integrado con Jest en el servicio autonomo ServidorGDS.
 * Se reconoce por el segmento `pbt` en su ruta, de modo que `jest pbt`
 * (script `test:pbt`) ejecute la suite PBT (Req. 26.1, 26.2, 41.5).
 *
 * Toda PBT del proyecto se ejecuta con un minimo de 100 iteraciones
 * (`{ numRuns: 100 }`), conforme a las reglas transversales del plan.
 */
describe('pbt smoke: integracion fast-check + Jest', () => {
    it('la suma de enteros es conmutativa', () => {
        fc.assert(
            fc.property(fc.integer(), fc.integer(), (a, b) => {
                expect(a + b).toBe(b + a);
            }),
            { numRuns: 100 },
        );
    });
});
