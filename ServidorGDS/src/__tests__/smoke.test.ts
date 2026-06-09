/**
 * Prueba smoke trivial que confirma que el runner de pruebas (Jest + ts-jest)
 * esta correctamente configurado en el servicio autonomo ServidorGDS.
 * Sirve como evidencia tecnica ejecutable del entorno de pruebas
 * (Req. 26.1, 26.2, 41.5). El smoke real del bootstrap NestJS es la tarea 1.4.
 */
describe('smoke: entorno de pruebas ServidorGDS', () => {
    it('ejecuta una asercion trivial', () => {
        expect(1 + 1).toBe(2);
    });
});
