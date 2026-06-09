/**
 * Pruebas del dominio consultable de estados de trabajo (tarea 16.2).
 *
 * Verifican que el dominio de estados es CERRADO y consultable (Req. 27.5, 38.5):
 * exactamente {PENDIENTE, EN_PROCESO, COMPLETADO, FALLIDO}, con clasificacion de
 * terminales y validacion de pertenencia.
 * _Requirements: 27.5, 38.5_
 */
import {
    ESTADOS_TERMINALES,
    ESTADOS_TRABAJO,
    EstadoTrabajo,
    esEstadoTerminal,
    esEstadoTrabajo,
} from './estados-trabajo';

describe('Dominio consultable de estados de trabajo (Req. 27.5, 38.5)', () => {
    it('expone EXACTAMENTE los cuatro estados del dominio cerrado', () => {
        expect([...ESTADOS_TRABAJO].sort()).toEqual(
            ['COMPLETADO', 'EN_PROCESO', 'FALLIDO', 'PENDIENTE'].sort(),
        );
        expect(ESTADOS_TRABAJO).toHaveLength(4);
    });

    it('reconoce solo valores del dominio como EstadoTrabajo', () => {
        for (const estado of ESTADOS_TRABAJO) {
            expect(esEstadoTrabajo(estado)).toBe(true);
        }
        for (const fuera of ['', 'pendiente', 'DESCONOCIDO', 42, null, undefined]) {
            expect(esEstadoTrabajo(fuera)).toBe(false);
        }
    });

    it('clasifica COMPLETADO y FALLIDO como terminales; PENDIENTE/EN_PROCESO no', () => {
        expect(esEstadoTerminal(EstadoTrabajo.COMPLETADO)).toBe(true);
        expect(esEstadoTerminal(EstadoTrabajo.FALLIDO)).toBe(true);
        expect(esEstadoTerminal(EstadoTrabajo.PENDIENTE)).toBe(false);
        expect(esEstadoTerminal(EstadoTrabajo.EN_PROCESO)).toBe(false);
        expect([...ESTADOS_TERMINALES].sort()).toEqual(['COMPLETADO', 'FALLIDO']);
    });
});
