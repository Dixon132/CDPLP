/**
 * `ProgramadorModule` - cableado NestJS del `Programador_Temporal` y de la
 * `Herramienta_Aceleracion` (tarea 16.3).
 *
 * Importa el `ColaSemanaModule` (tarea 16.2) y usa su `ColaProcesarSemanaService`
 * como `EncoladorSemana`: ambos disparadores encolan por la MISMA frontera de la
 * `Cola_Trabajos`, sin ruta alternativa por modo (Req. 18.1, 18.4). El reloj se
 * reutiliza del propio submodulo de cola (`RELOJ_COLA`), inyectable para pruebas
 * deterministas (Req. 18.4).
 *
 * El `PlanAnalisis` se provee con un adaptador en memoria por defecto, a la espera
 * del adaptador Prisma definitivo (`gds_analisis`/`gds_ciclo_semanal`), igual que
 * el `ColaSemanaModule` provee stubs hasta cablear la persistencia. Sustituir el
 * provider del token `PLAN_ANALISIS` por el adaptador Prisma no requiere tocar el
 * `Programador_Temporal`/`Herramienta_Aceleracion`.
 *
 * _Requirements: 12.4, 12.5, 18.1, 18.2, 18.3_
 */
import { Module } from '@nestjs/common';

import { ColaSemanaModule } from '../cola/cola-semana.module';
import { ColaProcesarSemanaService } from '../cola/cola-procesar-semana.service';
import { RELOJ_COLA, type Reloj } from '../cola/puertos-cola';
import { PlanAnalisisPrisma } from '../../ciclo/adaptadores-prisma';
import { HerramientaAceleracion } from './herramienta-aceleracion';
import { ProgramadorTemporal } from './programador-temporal';
import {
    HERRAMIENTA_ACELERACION,
    PLAN_ANALISIS,
    PROGRAMADOR_TEMPORAL,
    type EncoladorSemana,
    type PlanAnalisis,
} from './puertos-programador';

@Module({
    imports: [ColaSemanaModule],
    providers: [
        // `PlanAnalisis`: estado de avance real sobre la BD dedicada
        // (`gds_analisis`/`gds_ciclo_semanal`).
        { provide: PLAN_ANALISIS, useClass: PlanAnalisisPrisma },

        // `Herramienta_Aceleracion`: una semana / un mes / hasta el final.
        {
            provide: HERRAMIENTA_ACELERACION,
            useFactory: (
                plan: PlanAnalisis,
                encolador: EncoladorSemana,
                reloj: Reloj,
            ) => new HerramientaAceleracion({ plan, encolador, reloj }),
            inject: [PLAN_ANALISIS, ColaProcesarSemanaService, RELOJ_COLA],
        },

        // `Programador_Temporal`: disparador del avance en tiempo real simulado.
        {
            provide: PROGRAMADOR_TEMPORAL,
            useFactory: (
                plan: PlanAnalisis,
                encolador: EncoladorSemana,
                reloj: Reloj,
            ) => new ProgramadorTemporal({ plan, encolador, reloj }),
            inject: [PLAN_ANALISIS, ColaProcesarSemanaService, RELOJ_COLA],
        },
    ],
    exports: [
        HERRAMIENTA_ACELERACION,
        PROGRAMADOR_TEMPORAL,
        PLAN_ANALISIS,
        ColaSemanaModule,
    ],
})
export class ProgramadorModule { }
