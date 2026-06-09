import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { ValidadorContratoService } from './contracts';
import { ServicioAnonimizacionService } from './anonymization';
import { TimelineModule } from '../timeline/timeline.module';
import { MOTOR_MEMORIA_CONTEXTUAL } from '../timeline/memoria/motor-memoria-contextual.types';
import {
    DATA_PROVIDERS,
    FABRICA_DATA_PROVIDER,
    FabricaDataProviderRegistro,
    GeminiProvider,
    GeminiHttpClient,
    GEMINI_CLIENT,
    OllamaProvider,
    OllamaHttpClient,
    OLLAMA_CLIENT,
    type IDataProvider,
} from './adquisicion';
import {
    ModuloSimulacion,
    MODULO_SIMULACION,
    type ConstructorContextoMemoria,
} from './moduloSimulacion';
import type { FabricaDataProvider } from './adquisicion/dataProvider';

/**
 * Simulation: Modulo_Simulacion, IDataProvider y Contrato_Normalizado/Validador.
 *
 * Expone la frontera estable de la `Capa_Analisis`:
 * - el `Validador_Contrato` (`ValidadorContratoService`) que valida/serializa/
 *   deserializa el `Contrato_Normalizado` versionado (tarea 3.1, Req. 2.1, 3.1-3.5).
 * - el `Servicio_Anonimizacion` (`ServicioAnonimizacionService`) que reemplaza los
 *   identificadores de `Usuario_Sintetico` por seudonimos SHA-256 + salt
 *   irreversibles y consistentes antes de cualquier analisis (tarea 3.2,
 *   Req. 23.1, 23.2, 23.4, 13.5).
 * - la `FabricaDataProvider` (`FABRICA_DATA_PROVIDER`) que selecciona el
 *   `IDataProvider` configurado (GeminiProvider por defecto en la nube), entre
 *   los proveedores registrados en `DATA_PROVIDERS` (tarea 11.1, Req. 4.1, 4.2,
 *   4.6).
 *
 * Proveedores registrados en `DATA_PROVIDERS`:
 * - `GeminiProvider` (Google Gemini API): proveedor por defecto en la nube
 *   (tarea 11.2, Req. 4.2, 4.3, 4.4). Consume Gemini detras del
 *   `GeminiHttpClient` (token `GEMINI_CLIENT`) sobre `HttpModule`.
 * - `OllamaProvider` (local): alternativa LOCAL configurable detras de la
 *   MISMA interfaz `IDataProvider` (tarea 11.3, Req. 4.2, 4.4). Consume Ollama
 *   detras del `OllamaHttpClient` (token `OLLAMA_CLIENT`) sobre `HttpModule`.
 *   Registrarlo NO toca el pipeline.
 *
 * El modulo se estructura para crecer con los proveedores de datos sin reescribir
 * lo aqui registrado.
 */
@Module({
    imports: [HttpModule, TimelineModule],
    providers: [
        ValidadorContratoService,
        ServicioAnonimizacionService,
        // Cliente HTTP de Google Gemini detras de la interfaz inyectable
        // `GeminiClient` (la llamada de red queda aislada y es sustituible en
        // pruebas).
        { provide: GEMINI_CLIENT, useClass: GeminiHttpClient },
        // Proveedor de generacion por defecto en la nube (tarea 11.2).
        GeminiProvider,
        // Cliente HTTP del Ollama local detras de la interfaz inyectable
        // `OllamaClient` (la llamada de red queda aislada y es sustituible en
        // pruebas).
        { provide: OLLAMA_CLIENT, useClass: OllamaHttpClient },
        // Proveedor de generacion LOCAL alternativo y configurable (tarea 11.3).
        OllamaProvider,
        // Conjunto de implementaciones IDataProvider disponibles; Gemini (nube,
        // por defecto) + Ollama (local). Anadir un proveedor no toca el pipeline.
        {
            provide: DATA_PROVIDERS,
            useFactory: (
                gemini: GeminiProvider,
                ollama: OllamaProvider,
            ): IDataProvider[] => [gemini, ollama],
            inject: [GeminiProvider, OllamaProvider],
        },
        // Fabrica que selecciona el proveedor configurado (Gemini por defecto).
        {
            provide: FABRICA_DATA_PROVIDER,
            useFactory: (proveedores: IDataProvider[]) =>
                new FabricaDataProviderRegistro(proveedores),
            inject: [DATA_PROVIDERS],
        },
        // Modulo_Simulacion: orquesta IDataProvider (via FabricaDataProvider) +
        // Motor_Memoria_Contextual (TimelineModule) + manejo de fallos (11.4),
        // y arma el ContextoGeneracion del que se deriva el prompt realista
        // (tarea 11.5, Req. 6.1-6.5, 8.6).
        {
            provide: MODULO_SIMULACION,
            useFactory: (
                fabrica: FabricaDataProvider,
                validador: ValidadorContratoService,
                motor: ConstructorContextoMemoria,
            ) => new ModuloSimulacion(fabrica, motor, validador),
            inject: [FABRICA_DATA_PROVIDER, ValidadorContratoService, MOTOR_MEMORIA_CONTEXTUAL],
        },
    ],
    exports: [
        ValidadorContratoService,
        ServicioAnonimizacionService,
        FABRICA_DATA_PROVIDER,
        MODULO_SIMULACION,
    ],
})
export class SimulationModule { }
