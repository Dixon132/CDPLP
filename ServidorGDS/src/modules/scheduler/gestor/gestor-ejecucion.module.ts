/**
 * `GestorEjecucionModule` - cableado NestJS del `GestorEjecucion` y su API HTTP
 * (tarea 17.1).
 *
 * Importa el `ProgramadorModule` (tarea 16.3) y reutiliza sus disparadores
 * (`HerramientaAceleracion` y `ProgramadorTemporal`), que a su vez encolan por la
 * MISMA `Cola_Trabajos` (tarea 16.2) reutilizando el UNICO `procesarSemana`. No
 * hay ruta alternativa por modo: el `GestorEjecucion` solo decide QUIEN dispara y
 * CUANDO (Req. 32.7).
 *
 * Provee, con adaptadores por defecto sustituibles sin tocar el gestor:
 *  - `AlmacenEstadoEjecucion`: en memoria por defecto (a la espera del adaptador
 *    Prisma sobre `gds_analisis`).
 *  - `Temporizador`: `setInterval` por defecto (contador inyectable, Req. 32.5).
 *
 * Al igual que el `ColaSemanaModule`/`ProgramadorModule`, se mantiene aislado del
 * `app.module` para no acoplar el arranque global a una Redis viva antes de
 * tiempo; se monta cuando la app cablea BullMQ en vivo.
 *
 * _Requirements: 32.1, 32.2, 32.3, 32.4, 32.5, 32.6, 32.7, 32.8_
 */
import { Module } from '@nestjs/common';

import { HerramientaAceleracion } from '../programador/herramienta-aceleracion';
import { ProgramadorTemporal } from '../programador/programador-temporal';
import {
    HERRAMIENTA_ACELERACION,
    PROGRAMADOR_TEMPORAL,
} from '../programador/puertos-programador';
import { ProgramadorModule } from '../programador/programador.module';
import { AlmacenEstadoEjecucionEnMemoria } from './almacen-estado-ejecucion';
import {
    GestorEjecucionService,
    type DependenciasGestorEjecucion,
} from './gestor-ejecucion';
import { GestorEjecucionController } from './gestor-ejecucion.controller';
import { TemporizadorIntervalo } from './temporizador';
import {
    ALMACEN_ESTADO_EJECUCION,
    GESTOR_EJECUCION,
    INTERVALO_TIEMPO_REAL_DEFECTO_MS,
    INTERVALO_TIEMPO_REAL_POR_DEFECTO,
    TEMPORIZADOR_EJECUCION,
    type AlmacenEstadoEjecucion,
    type Temporizador,
} from './puertos-gestor';

@Module({
    imports: [ProgramadorModule],
    controllers: [GestorEjecucionController],
    providers: [
        // Estado de modo/intervalo/ejecucion: en memoria por defecto.
        { provide: ALMACEN_ESTADO_EJECUCION, useClass: AlmacenEstadoEjecucionEnMemoria },

        // Contador inyectable del Tiempo_Real: `setInterval` por defecto (Req. 32.5).
        { provide: TEMPORIZADOR_EJECUCION, useClass: TemporizadorIntervalo },

        // Intervalo por defecto del Tiempo_Real (configurable, Req. 32.5).
        {
            provide: INTERVALO_TIEMPO_REAL_POR_DEFECTO,
            useValue: INTERVALO_TIEMPO_REAL_DEFECTO_MS,
        },

        // `GestorEjecucion`: orquesta los tres modos reutilizando los disparadores.
        {
            provide: GESTOR_EJECUCION,
            useFactory: (
                almacen: AlmacenEstadoEjecucion,
                herramienta: HerramientaAceleracion,
                programador: ProgramadorTemporal,
                temporizador: Temporizador,
                intervaloPorDefecto: number,
            ) => {
                const deps: DependenciasGestorEjecucion = {
                    almacen,
                    herramienta,
                    programador,
                    temporizador,
                    intervaloTiempoRealPorDefectoMs: intervaloPorDefecto,
                };
                return new GestorEjecucionService(deps);
            },
            inject: [
                ALMACEN_ESTADO_EJECUCION,
                HERRAMIENTA_ACELERACION,
                PROGRAMADOR_TEMPORAL,
                TEMPORIZADOR_EJECUCION,
                INTERVALO_TIEMPO_REAL_POR_DEFECTO,
            ],
        },
    ],
    exports: [GESTOR_EJECUCION, ALMACEN_ESTADO_EJECUCION, ProgramadorModule],
})
export class GestorEjecucionModule { }
