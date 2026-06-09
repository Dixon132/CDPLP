/**
 * Configuracion de Jest para el servicio autonomo ServidorGDS.
 *
 * - Runner de pruebas unitarias y PBT (property-based testing con fast-check)
 *   con las fuentes y pruebas ubicadas bajo `src/**` (sufijo `.test.ts` o
 *   `.spec.ts`). Ejecucion no interactiva (`jest --runInBand`).
 * - Compilacion TypeScript en memoria mediante `ts-jest`, reutilizando el
 *   `tsconfig.json` base del servicio.
 * - Las pruebas PBT se reconocen por el segmento `pbt` en su ruta, de modo que
 *   `jest pbt` (script `test:pbt`) ejecute unicamente la suite PBT (Req. 26.1,
 *   26.2, 41.5).
 *
 * Las pruebas e2e/HTTP (Supertest) usan su propia configuracion en
 * `test/jest-e2e.json` (script `test:e2e`).
 */
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testRegex: '.*\\.(test|spec)\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
};
