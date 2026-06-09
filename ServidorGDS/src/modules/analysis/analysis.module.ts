import { Module } from '@nestjs/common';

import {
    BIBLIOTECA_ESCENARIOS_REPOSITORIO,
    MOTOR_ESCENARIOS,
} from './escenarios/escenarios.types';
import { BibliotecaRepositorioPrisma } from './escenarios/biblioteca-repositorio';
import { EscenariosController } from './escenarios/escenarios.controller';
import { MotorEscenariosService } from './escenarios/motor-escenarios.service';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { DISPARADOR_CICLO_INICIAL } from './analysis.types';
import { DisparadorCicloInicialCola } from './disparador-ciclo-inicial.cola';
import { ColaSemanaModule } from '../scheduler/cola/cola-semana.module';

/**
 * Analysis: `Gestor_Analisis` y `Motor_Escenarios` / `Biblioteca_Escenarios`
 * (Req. 25.2).
 *
 * Registra:
 *  - el `Motor_Escenarios` / `Biblioteca_Escenarios` sobre el `PrismaService`
 *    global, expuestos tras tokens estables (`MOTOR_ESCENARIOS`,
 *    `BIBLIOTECA_ESCENARIOS_REPOSITORIO`) para que otros modulos dependan de las
 *    interfaces, no de las implementaciones (Req. 29);
 *  - el `Gestor_Analisis` (`AnalysisService` + `AnalysisController`) que crea y
 *    administra `Analisis`, fija el escenario inmutable mediante el
 *    `Motor_Escenarios` (`fijarParaAnalisis`) y dispara la semana 1 por
 *    institucion a traves de la frontera estable `DISPARADOR_CICLO_INICIAL`
 *    (Req. 8, 25.4, 25.7, 29.4, 29.6).
 *
 * El `DisparadorCicloInicial` se cablea a la `Cola_Trabajos` (BullMQ) real
 * mediante `DisparadorCicloInicialCola`, que encola
 * `procesarSemana(analisisId, institucionId, 1)` por institucion al crear el
 * analisis (Req. 8.5), sin tocar el `Gestor_Analisis`.
 */
@Module({
    imports: [ColaSemanaModule],
    controllers: [EscenariosController, AnalysisController],
    providers: [
        BibliotecaRepositorioPrisma,
        {
            provide: BIBLIOTECA_ESCENARIOS_REPOSITORIO,
            useExisting: BibliotecaRepositorioPrisma,
        },
        MotorEscenariosService,
        { provide: MOTOR_ESCENARIOS, useExisting: MotorEscenariosService },
        AnalysisService,
        {
            provide: DISPARADOR_CICLO_INICIAL,
            useClass: DisparadorCicloInicialCola,
        },
    ],
    exports: [
        MotorEscenariosService,
        MOTOR_ESCENARIOS,
        BIBLIOTECA_ESCENARIOS_REPOSITORIO,
        AnalysisService,
    ],
})
export class AnalysisModule { }
