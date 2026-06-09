/**
 * `CicloModule` - cableado del UNICO `procesarSemana` REAL (tarea 28.1).
 *
 * Compone, por inyeccion de dependencias, el `ProcesadorSemana` transaccional
 * (tarea 16.1) con sus puertos cableados a los building blocks REALES del
 * sistema, de modo que el ciclo conecte de extremo a extremo:
 *
 *   genera   -> {@link GeneradorSemanaModuloSimulacion} (Modulo_Simulacion ->
 *               IDataProvider, contexto desde la BD dedicada)
 *   valida   -> `ValidadorContratoService` (frontera Contrato_Normalizado)
 *   analiza  -> {@link AnalizadorPipeline} (anonimizacion -> filtro -> NLP ->
 *               vision -> ... ; servicios IA->fallback via proxy de degradacion)
 *   aprende  -> {@link MotorAprendizajeReal} (Indice_Riesgo + Capa_ML, patrones,
 *               resumen de memoria)
 *   almacena -> {@link crearPersistorSemana} (Prisma, transaccion atomica) +
 *               `MemoriaSemanticaService` ligada a la transaccion (embeddings ->
 *               pgvector), coordinada por `procesarSemana`
 *
 * Se expone bajo el token `PROCESADOR_SEMANA`, que el `ColaSemanaModule` consume
 * para que el worker BullMQ ejecute el ciclo real (Req. 12.3, 13.1, 13.2, 13.3,
 * 36.1). El modulo es agnostico de la cola: solo provee el procesador.
 *
 * _Requirements: 12.3, 13.1, 13.2, 13.3, 18.4, 33.2, 36.1_
 */
import { Module } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CAPA_ML, FILTRO_RELEVANCIA, SERVICIO_NLP, SERVICIO_VISION } from '../../ai/interfaces/tokens';
import { AiModule } from '../../ai/ai.module';
import { PrismaService } from '../../prisma/prisma.service';
import { AlmacenEmbeddingsPrisma } from '../ai-engine/embeddingRepositorio';
import { MemoriaSemanticaService } from '../ai-engine/memoriaSemantica.service';
import type { FiltroRelevancia } from '../analisis/interfaces';
import type { ServicioNLP } from '../analisis/servicioNLP';
import type { ServicioVision } from '../analisis/servicioVision';
import type { CapaML } from '../ml/capaML';
import { SimulationModule } from '../simulation/simulation.module';
import { ValidadorContratoService } from '../simulation/contracts';
import {
    ServicioAnonimizacionService,
    type ServicioAnonimizacion,
} from '../simulation/anonymization';
import { AnalizadorPipeline } from '../scheduler/analizadorPipeline';
import {
    ProcesadorSemana,
    PROCESADOR_SEMANA,
    type DependenciasProcesarSemana,
} from '../scheduler/procesarSemana';
import { GeneradorSemanaModuloSimulacion } from './generador-semana';
import { MotorAprendizajeReal } from './motor-aprendizaje';
import { crearPersistorSemana } from './persistor-semana';

/**
 * Salt de la etapa `ANONIMIZACION` del pipeline. La seudonimizacion es
 * consistente por `(id, salt)` e irreversible (Req. 23.2, 23.4); el salt vive en
 * la configuracion del servicio (`GDS_ANON_SALT`) y es estable, de modo que el
 * mismo `Usuario_Sintetico` recibe el mismo seudonimo entre semanas.
 */
const ANON_SALT = process.env.GDS_ANON_SALT ?? 'gds-pipeline-anon-salt-v1';

@Module({
    imports: [AiModule, SimulationModule],
    providers: [
        GeneradorSemanaModuloSimulacion,
        MotorAprendizajeReal,
        {
            provide: PROCESADOR_SEMANA,
            inject: [
                GeneradorSemanaModuloSimulacion,
                ValidadorContratoService,
                ServicioAnonimizacionService,
                FILTRO_RELEVANCIA,
                SERVICIO_NLP,
                SERVICIO_VISION,
                CAPA_ML,
                PrismaService,
                MotorAprendizajeReal,
            ],
            useFactory: (
                generador: GeneradorSemanaModuloSimulacion,
                validador: ValidadorContratoService,
                anonimizacion: ServicioAnonimizacion,
                filtroRelevancia: FiltroRelevancia,
                servicioNLP: ServicioNLP,
                servicioVision: ServicioVision,
                capaMl: CapaML,
                prisma: PrismaService,
                aprendizaje: MotorAprendizajeReal,
            ) => {
                // ANALIZA: pipeline real (anonimizacion -> filtro -> NLP -> vision
                // -> temporal/patrones/indice/explicacion placeholder -> EMBEDDINGS
                // coordinado por procesarSemana). Servicios resueltos IA->fallback.
                const analizador = new AnalizadorPipeline({
                    anonimizacion: { servicio: anonimizacion, salt: ANON_SALT },
                    servicios: { filtroRelevancia, servicioNLP, servicioVision },
                });

                const deps: DependenciasProcesarSemana<Prisma.TransactionClient> = {
                    generador,
                    validador,
                    analizador,
                    aprendizaje,
                    // ALMACENA: transaccion atomica de Prisma (Req. 25.5).
                    ejecutarTransaccion: <R>(
                        trabajo: (tx: Prisma.TransactionClient) => Promise<R>,
                    ): Promise<R> => prisma.$transaction((tx) => trabajo(tx)),
                    // ALMACENA: subgrafo de la semana -> devuelve resultadoId.
                    persistirResultado: crearPersistorSemana(),
                    // ALMACENA: Memoria_Semantica ligada a la transaccion (embeddings
                    // -> pgvector dentro de la MISMA transaccion, Req. 36.1).
                    memoriaTransaccional: (tx) =>
                        new MemoriaSemanticaService(
                            capaMl,
                            new AlmacenEmbeddingsPrisma(tx),
                        ),
                };

                return new ProcesadorSemana<Prisma.TransactionClient>(deps);
            },
        },
    ],
    exports: [PROCESADOR_SEMANA],
})
export class CicloModule { }
