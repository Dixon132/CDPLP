/**
 * `Motor_Escenarios`: CRUD, versionado y fijación de escenarios para análisis.
 *
 * Toda la persistencia se delega en el puerto `BibliotecaEscenariosRepositorio`
 * (lógica desacoplada de Prisma → testeable con dobles en memoria).
 *
 * Reglas de diseño clave:
 *  - `guardar` crea el escenario con `version = 1` (Req. 29.1).
 *  - `editar` NO muta la fila previa: crea una NUEVA versión (`version + 1`),
 *    de forma que las versiones anteriores —y las copias ya fijadas en
 *    cualquier `Analisis`— permanecen intactas (Req. 29.5).
 *  - `fijarParaAnalisis` devuelve una COPIA INMUTABLE del contexto del
 *    escenario + `(escenarioId, version)` para trazabilidad. Acepta tanto un
 *    escenario de la biblioteca como uno personalizado, que opcionalmente puede
 *    guardarse en la biblioteca (Req. 29.2, 29.3, 29.4, 29.6).
 *
 * _Requirements: 29.1, 29.2, 29.3, 29.5, 29.6, 29.7_
 */
import { PrismaBibliotecaRepositorio } from "./bibliotecaRepositorio";
import type {
    BibliotecaEscenariosRepositorio,
    DefinicionEscenario,
    EscenarioFijado,
    EscenarioReutilizable,
    MotorEscenarios,
    SeleccionEscenario,
} from "./escenarios.types";

/** Definición por defecto al guardar un escenario personalizado en biblioteca. */
function definicionDesdePersonalizado(contexto: string): DefinicionEscenario {
    return {
        nombre: "Escenario personalizado",
        descripcion: "Escenario personalizado definido al crear un análisis.",
        contexto,
        intensidad: "media",
        duracionEsperada: 0,
        eventosDetonantes: [],
        actoresInvolucrados: [],
        categoria: "personalizado",
        tags: ["personalizado"],
        configuracionComportamiento: {},
        parametros: {},
        esPredefinido: false,
    };
}

export class MotorEscenariosImpl implements MotorEscenarios {
    constructor(
        private readonly repo: BibliotecaEscenariosRepositorio = new PrismaBibliotecaRepositorio(),
    ) { }

    /** Define y persiste un `Escenario_Reutilizable` con `version = 1`. */
    async guardar(def: DefinicionEscenario): Promise<EscenarioReutilizable> {
        return this.repo.crear({ ...def, version: 1 });
    }

    /** Lista escenarios predefinidos y personalizados disponibles. */
    async listar(): Promise<EscenarioReutilizable[]> {
        return this.repo.listar();
    }

    /**
     * Edita un escenario generando una NUEVA versión sin mutar la previa.
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
}

/**
 * Crea un `Motor_Escenarios` respaldado por Prisma (BD dedicada del servicio).
 */
export function crearMotorEscenarios(
    repo?: BibliotecaEscenariosRepositorio,
): MotorEscenarios {
    return new MotorEscenariosImpl(repo ?? new PrismaBibliotecaRepositorio());
}
