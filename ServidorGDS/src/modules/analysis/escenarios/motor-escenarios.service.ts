/**
 * `Motor_Escenarios`: CRUD, versionado y fijacion de escenarios para analisis.
 *
 * Migracion base a NestJS (tarea 3.5): provider `@Injectable()` que mantiene la
 * interfaz estable `MotorEscenarios` y delega la persistencia en el puerto
 * `BibliotecaEscenariosRepositorio` (resuelto por DI sobre `PrismaService`), de
 * modo que la logica de dominio permanece desacoplada de Prisma y testeable con
 * dobles en memoria.
 *
 * Reglas de diseno clave:
 *  - `guardar` crea el escenario con `version = 1` (Req. 29.1).
 *  - `editar` NO muta la fila previa: crea una NUEVA version (`version + 1`),
 *    de forma que las versiones anteriores -y las copias ya fijadas en
 *    cualquier `Analisis`- permanecen intactas (Req. 29.5).
 *  - `fijarParaAnalisis` devuelve una COPIA INMUTABLE del contexto del
 *    escenario + `(escenarioId, version)` para trazabilidad (Req. 29.2-29.6).
 *
 * _Requirements: 29.1, 29.2, 29.3, 29.5, 29.6, 29.7_
 */
import { Inject, Injectable } from '@nestjs/common';

import { sembrarEscenariosPredefinidos } from './escenarios.predefinidos';
import {
    BIBLIOTECA_ESCENARIOS_REPOSITORIO,
    type BibliotecaEscenariosRepositorio,
    type DefinicionEscenario,
    type EscenarioFijado,
    type EscenarioReutilizable,
    type MotorEscenarios,
    type SeleccionEscenario,
} from './escenarios.types';

/** Definicion por defecto al guardar un escenario personalizado en biblioteca. */
function definicionDesdePersonalizado(contexto: string): DefinicionEscenario {
    return {
        nombre: 'Escenario personalizado',
        descripcion: 'Escenario personalizado definido al crear un analisis.',
        contexto,
        intensidad: 'media',
        duracionEsperada: 0,
        eventosDetonantes: [],
        actoresInvolucrados: [],
        categoria: 'personalizado',
        tags: ['personalizado'],
        configuracionComportamiento: {},
        parametros: {},
        esPredefinido: false,
    };
}

@Injectable()
export class MotorEscenariosService implements MotorEscenarios {
    constructor(
        @Inject(BIBLIOTECA_ESCENARIOS_REPOSITORIO)
        private readonly repo: BibliotecaEscenariosRepositorio,
    ) { }

    /** Define y persiste un `Escenario_Reutilizable` con `version = 1`. */
    async guardar(def: DefinicionEscenario): Promise<EscenarioReutilizable> {
        return this.repo.crear({ ...def, version: 1 });
    }

    /** Lista escenarios predefinidos y personalizados disponibles. */
    async listar(): Promise<EscenarioReutilizable[]> {
        return this.repo.listar();
    }

    /** Recupera un `Escenario_Reutilizable` por su `id`, o `null` si no existe. */
    async obtenerPorId(id: string): Promise<EscenarioReutilizable | null> {
        return this.repo.obtenerPorId(id);
    }

    /**
     * Edita un escenario generando una NUEVA version sin mutar la previa.
     * `id` y `version` entrantes en `cambios` se ignoran: el motor controla el
     * versionado.
     */
    async editar(
        id: string,
        cambios: Partial<EscenarioReutilizable>,
    ): Promise<EscenarioReutilizable> {
        const base = await this.repo.obtenerPorId(id);
        if (!base) {
            throw new Error(`Escenario no encontrado en la biblioteca: ${id}`);
        }

        const {
            id: _idIgnorado,
            version: _versionIgnorada,
            ...cambiosAplicables
        } = cambios;

        return this.repo.crear({
            ...base,
            ...cambiosAplicables,
            version: base.version + 1,
        });
    }

    /**
     * Resuelve el escenario a fijar en un `Analisis`: copia inmutable del
     * contexto + `(escenarioId, version)` para trazabilidad.
     */
    async fijarParaAnalisis(
        seleccion: SeleccionEscenario,
    ): Promise<EscenarioFijado> {
        const { escenarioId, personalizado, guardarEnBiblioteca } = seleccion;

        if (escenarioId) {
            const escenario = await this.repo.obtenerPorId(escenarioId);
            if (!escenario) {
                throw new Error(
                    `Escenario no encontrado en la biblioteca: ${escenarioId}`,
                );
            }
            // Copia inmutable: el contexto se copia por valor (string).
            return {
                contexto: escenario.contexto,
                escenarioId: escenario.id,
                version: escenario.version,
            };
        }

        if (personalizado != null) {
            if (guardarEnBiblioteca) {
                const guardado = await this.guardar(
                    definicionDesdePersonalizado(personalizado),
                );
                return {
                    contexto: guardado.contexto,
                    escenarioId: guardado.id,
                    version: guardado.version,
                };
            }
            // Personalizado no guardado: sin referencia de trazabilidad.
            return { contexto: personalizado, escenarioId: null, version: null };
        }

        throw new Error(
            "fijarParaAnalisis requiere 'escenarioId' o 'personalizado'.",
        );
    }

    /**
     * Siembra de forma IDEMPOTENTE los escenarios PREDEFINIDOS en la
     * `Biblioteca_Escenarios`. Delega en `sembrarEscenariosPredefinidos`, que
     * no duplica predefinidos ya presentes (identificados por `nombre`) ni
     * borra escenarios personalizados.
     */
    async sembrarPredefinidos(): Promise<EscenarioReutilizable[]> {
        return sembrarEscenariosPredefinidos(this.repo);
    }
}
