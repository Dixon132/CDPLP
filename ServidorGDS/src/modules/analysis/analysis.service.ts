/**
 * `AnalysisService` (Gestor_Analisis): creacion y administracion de `Analisis`.
 *
 * Provider `@Injectable()` que persiste en el modelo Prisma `Analisis` (tabla
 * `gds_analisis`) de la base de datos DEDICADA del servicio a traves del
 * `PrismaService` global (Req. 25.1). Responsabilidades:
 *
 *  - CREAR un `Analisis` (estudio longitudinal) con nombre, >=1 `Institucion`,
 *    radio de analisis, escenario y configuracion temporal de hasta 24
 *    `Semana_Simulada`, persistiendolo junto a una `Comunidad_Digital` por
 *    institucion DENTRO de una transaccion atomica (Req. 8.1, 8.3, 25.5).
 *  - RECHAZAR la creacion sin al menos una `Institucion`, con mensaje de
 *    validacion (Req. 8.4), y verificar que las instituciones existen.
 *  - FIJAR el `Escenario` como contexto INMUTABLE del `Analisis` en el momento
 *    de la creacion, mediante el `Motor_Escenarios` (`fijarParaAnalisis`), y
 *    registrar `(escenario_id, escenario_version)` para trazabilidad (Req. 8.6,
 *    29.4, 29.6).
 *  - DISPARAR el ciclo inicial (semana 1) por cada `Institucion` mediante el
 *    `DisparadorCicloInicial` (Cola_Trabajos), tras una creacion correcta
 *    (Req. 8.5).
 *  - ELIMINAR un `Analisis` en CASCADA transaccional, aislado por analisis y
 *    sin afectar a otros (Req. 25.4, 25.6, 25.7).
 *
 * _Requirements: 8.1, 8.2, 8.3, 8.5, 8.6, 25.4, 25.6, 25.7, 29.4, 29.6_
 */
import { randomBytes } from 'node:crypto';

import {
    BadRequestException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import {
    derivarZona,
    zonaAColumnas,
} from '../communities/zonaGeografica';
import {
    MOTOR_ESCENARIOS,
    type EscenarioFijado,
    type MotorEscenarios,
    type SeleccionEscenario,
} from './escenarios/escenarios.types';
import {
    DISPARADOR_CICLO_INICIAL,
    type Analisis,
    type DisparadorCicloInicial,
    type EstadoAnalisis,
    type EstadoEjecucion,
    type ModoEjecucion,
} from './analysis.types';
import { CrearAnalisisDto } from './dto/crear-analisis.dto';

/** Forma minima de una fila `Analisis` de Prisma usada por el mapeo. */
interface FilaAnalisis {
    id: string;
    nombre: string;
    escenario: string;
    escenarioEsPersonalizado: boolean;
    escenarioId: string | null;
    escenarioVersion: number | null;
    semanasTotales: number;
    radioAnalisis: number;
    saltAnon: string;
    modoEjecucion: string;
    intervaloTiempoRealMs: number | null;
    estadoEjecucion: string;
    estado: string;
    comunidades?: { institucionId: string }[];
}

/** Convierte una fila de Prisma (con sus comunidades) al dominio `Analisis`. */
function aDominio(row: FilaAnalisis): Analisis {
    return {
        id: row.id,
        nombre: row.nombre,
        escenario: row.escenario,
        escenarioEsPersonalizado: row.escenarioEsPersonalizado,
        escenarioId: row.escenarioId,
        escenarioVersion: row.escenarioVersion,
        semanasTotales: row.semanasTotales,
        radioAnalisis: row.radioAnalisis,
        saltAnon: row.saltAnon,
        modoEjecucion: row.modoEjecucion as ModoEjecucion,
        intervaloTiempoRealMs: row.intervaloTiempoRealMs,
        estadoEjecucion: row.estadoEjecucion as EstadoEjecucion,
        estado: row.estado as EstadoAnalisis,
        institucionIds: (row.comunidades ?? []).map((c) => c.institucionId),
    };
}

@Injectable()
export class AnalysisService {
    private readonly logger = new Logger(AnalysisService.name);

    constructor(
        private readonly prisma: PrismaService,
        @Inject(MOTOR_ESCENARIOS)
        private readonly motorEscenarios: MotorEscenarios,
        @Inject(DISPARADOR_CICLO_INICIAL)
        private readonly disparador: DisparadorCicloInicial,
    ) { }

    /**
     * Crea y persiste un `Analisis` con su escenario inmutable y una
     * `Comunidad_Digital` por `Institucion`, y dispara la semana 1 por cada una
     * (Req. 8.1, 8.3, 8.5, 8.6, 29.4, 29.6).
     */
    async crear(dto: CrearAnalisisDto, actorId?: number | string): Promise<Analisis> {
        // 1) RECHAZO de creacion sin al menos una `Institucion` (Req. 8.4).
        if (!dto.institucionIds || dto.institucionIds.length === 0) {
            throw new BadRequestException(
                'Un Analisis requiere al menos una Institucion seleccionada.',
            );
        }

        // Lista de instituciones unicas, preservando el orden de seleccion.
        const institucionIds = [...new Set(dto.institucionIds)];

        // 2) Verificar que TODAS las instituciones existen (integridad referencial).
        const instituciones = await this.prisma.institucion.findMany({
            where: { id: { in: institucionIds } },
            select: { id: true, latitud: true, longitud: true },
        });
        if (instituciones.length !== institucionIds.length) {
            const encontradas = new Set(instituciones.map((i) => i.id));
            const faltantes = institucionIds.filter((id) => !encontradas.has(id));
            throw new BadRequestException(
                `Institucion(es) inexistente(s): ${faltantes.join(', ')}.`,
            );
        }

        // 3) FIJAR el escenario como contexto INMUTABLE (copia + trazabilidad)
        //    mediante el Motor_Escenarios (Req. 8.6, 29.4, 29.6).
        const seleccion: SeleccionEscenario = {
            ...(dto.escenarioId !== undefined ? { escenarioId: dto.escenarioId } : {}),
            ...(dto.personalizado !== undefined
                ? { personalizado: dto.personalizado }
                : {}),
            ...(dto.guardarEnBiblioteca !== undefined
                ? { guardarEnBiblioteca: dto.guardarEnBiblioteca }
                : {}),
        };
        let fijado: EscenarioFijado;
        try {
            fijado = await this.motorEscenarios.fijarParaAnalisis(seleccion);
        } catch (err) {
            // Seleccion de escenario invalida (ni biblioteca ni personalizado, o
            // escenario inexistente): se traduce a un error de validacion (Req. 8.2).
            throw new BadRequestException(
                err instanceof Error ? err.message : 'Seleccion de escenario invalida.',
            );
        }

        const modoEjecucion: ModoEjecucion = dto.modoEjecucion ?? 'MANUAL';
        const saltAnon = randomBytes(16).toString('hex');

        // 4) PERSISTIR el `Analisis` + una `Comunidad_Digital` por institucion en
        //    una TRANSACCION atomica (Req. 25.5). La `Zona_Geografica` de cada
        //    comunidad se DERIVA de las coordenadas de la institucion + el radio
        //    del analisis (Req. 33.1).
        const analisisId = await this.prisma.$transaction(async (tx) => {
            const creado = await tx.analisis.create({
                data: {
                    nombre: dto.nombre,
                    escenario: fijado.contexto,
                    escenarioEsPersonalizado: dto.personalizado !== undefined,
                    escenarioId: fijado.escenarioId,
                    escenarioVersion: fijado.version,
                    semanasTotales: dto.semanasTotales,
                    radioAnalisis: dto.radioAnalisis,
                    saltAnon,
                    modoEjecucion,
                    intervaloTiempoRealMs: dto.intervaloTiempoRealMs ?? null,
                    estadoEjecucion: 'DETENIDO',
                    estado: 'ACTIVO',
                },
            });

            for (const institucion of instituciones) {
                const zona = derivarZona(
                    { latitud: institucion.latitud, longitud: institucion.longitud },
                    dto.radioAnalisis,
                );
                await tx.comunidad.create({
                    data: {
                        analisisId: creado.id,
                        institucionId: institucion.id,
                        ...zonaAColumnas(zona),
                    },
                });
            }

            return creado.id;
        });

        this.auditar('crear', analisisId, actorId, {
            nombre: dto.nombre,
            institucionIds,
            semanasTotales: dto.semanasTotales,
            escenarioId: fijado.escenarioId,
            escenarioVersion: fijado.version,
        });

        // 5) DISPARAR el ciclo inicial (semana 1) por cada `Institucion` tras la
        //    creacion correcta (Req. 8.5). Se hace FUERA de la transaccion: el
        //    `Analisis` ya esta persistido y consistente; el encolado es un
        //    efecto idempotente por `(A,I,1)` (Req. 38.3).
        for (const institucionId of institucionIds) {
            await this.disparador.dispararSemanaInicial(analisisId, institucionId);
        }

        return this.obtener(analisisId);
    }

    /** Lista todos los `Analisis` con sus instituciones, ordenados por nombre. */
    async listar(): Promise<Analisis[]> {
        const rows = await this.prisma.analisis.findMany({
            orderBy: [{ nombre: 'asc' }],
            include: { comunidades: { select: { institucionId: true } } },
        });
        return rows.map(aDominio);
    }

    /** Recupera un `Analisis` por su `id` o lanza `NotFoundException`. */
    async obtener(id: string): Promise<Analisis> {
        const row = await this.prisma.analisis.findUnique({
            where: { id },
            include: { comunidades: { select: { institucionId: true } } },
        });
        if (!row) {
            throw new NotFoundException(`Analisis no encontrado: ${id}`);
        }
        return aDominio(row);
    }

    /**
     * Elimina un `Analisis` aplicando el borrado en CASCADA de su subgrafo
     * (comunidades, ciclos, resultados, memorias, embeddings, patrones,
     * evidencias, reportes, calibraciones) DENTRO de una transaccion, AISLADO
     * por analisis y sin afectar datos de otros (Req. 25.4, 25.7).
     *
     * Si la cascada falla a mitad, la transaccion se revierte por completo: el
     * `Analisis` y todos sus datos dependientes quedan INTACTOS (Req. 25.6).
     */
    async eliminar(id: string, actorId?: number | string): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            const existente = await tx.analisis.findUnique({ where: { id } });
            if (!existente) {
                throw new NotFoundException(`Analisis no encontrado: ${id}`);
            }
            // El esquema define onDelete: Cascade desde `gds_analisis` hacia todo
            // su subgrafo, de modo que un unico delete arrastra de forma atomica y
            // aislada los datos del analisis (y solo de este).
            await tx.analisis.delete({ where: { id } });
        });

        this.auditar('eliminar', id, actorId);
    }

    /** Registra un cambio sobre un `Analisis` para su auditoria. */
    private auditar(
        accion: 'crear' | 'eliminar',
        analisisId: string,
        actorId?: number | string,
        cambios?: Record<string, unknown>,
    ): void {
        this.logger.log(
            `[auditoria][analisis] accion=${accion} id=${analisisId} ` +
            `actor=${actorId ?? 'desconocido'} ts=${new Date().toISOString()}` +
            (cambios ? ` cambios=${JSON.stringify(cambios)}` : ''),
        );
    }
}
