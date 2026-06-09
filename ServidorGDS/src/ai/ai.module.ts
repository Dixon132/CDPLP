import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { CapaMlFallback } from './fallback/capa-ml.fallback';
import { FiltroRelevanciaFallback } from './fallback/filtro-relevancia.fallback';
import { ServicioNlpFallback } from './fallback/nlp.fallback';
import { ServicioVisionFallback } from './fallback/vision.fallback';
import { ProxyDegradacionServicioIA } from './health/proxy-degradacion';
import { SondaServicioIaHttp } from './health/sonda-servicio-ia';
import {
    CAPA_ML,
    FILTRO_RELEVANCIA,
    SERVICIO_NLP,
    SERVICIO_VISION,
} from './interfaces/tokens';
import {
    crearAdaptadorCapaMl,
    crearAdaptadorFiltroRelevancia,
    crearAdaptadorServicioNlp,
    crearAdaptadorServicioVision,
} from './proxy-adapters';
import {
    CapaMlClient,
    FiltroRelevanciaClient,
    ServicioNlpClient,
    ServicioVisionClient,
} from './servicio-ia.client';

import type { FiltroRelevancia } from '../modules/analisis/interfaces';
import type { ServicioNLP } from '../modules/analisis/servicioNLP';
import type { ServicioVision } from '../modules/analisis/servicioVision';
import type { CapaML } from '../modules/ml/capaML';

/**
 * AI module: alberga el `Servicio_IA` (cerebro analitico en Python) tras sus
 * INTERFACES ESTABLES y resuelve su implementacion concreta POR DISPONIBILIDAD.
 *
 * Cableado (tareas 8.1, 8.2 y 8.3):
 *  - 8.1: cuatro clientes HTTP ({@link ServicioNlpClient},
 *    {@link ServicioVisionClient}, {@link FiltroRelevanciaClient},
 *    {@link CapaMlClient}) que consumen el `Servicio_IA` sobre `HttpModule`/Axios.
 *  - 8.2: la {@link SondaServicioIaHttp} (`GET /health`) y el
 *    {@link ProxyDegradacionServicioIA} que delega al fallback determinista TS.
 *  - 8.3 (este modulo): cada TOKEN ESTABLE (`SERVICIO_NLP`, `SERVICIO_VISION`,
 *    `FILTRO_RELEVANCIA`, `CAPA_ML`) se enlaza por `useFactory` a un ADAPTADOR
 *    proxy-backed cuyos metodos delegan a traves del proxy de degradacion
 *    (primario = cliente HTTP; fallback = implementacion determinista TS; sonda
 *    = `GET /health`). El `Pipeline_Analisis` inyecta SOLO las interfaces: la
 *    eleccion HTTP vs fallback ocurre en tiempo de llamada, sin cambios de
 *    codigo (Req. 31.6, 35.4).
 *
 * IMPORTANTE (resolucion del token estable): las clases fallback concretas
 * ({@link ServicioNlpFallback}, {@link ServicioVisionFallback},
 * {@link FiltroRelevanciaFallback}, {@link CapaMlFallback}) se declaran como
 * providers LOCALES de este modulo y los tokens estables se enlazan UNICAMENTE
 * aqui por `useFactory`. Asi este modulo es el UNICO duenio de los enlaces de
 * `SERVICIO_NLP`/`SERVICIO_VISION`/`FILTRO_RELEVANCIA`/`CAPA_ML`, evitando que
 * un submodulo importado que tambien enlazara esos tokens al fallback directo
 * los SOMBREARA y cortocircuitara el proxy de degradacion.
 *
 * _Requirements: 14.5, 15.4, 31.6, 34.6, 35.4_
 */
@Module({
    imports: [HttpModule],
    providers: [
        // 8.1 - clientes HTTP del Servicio_IA (implementaciones primarias).
        ServicioNlpClient,
        ServicioVisionClient,
        FiltroRelevanciaClient,
        CapaMlClient,
        // Fallback determinista TS (tareas 3.3/3.4) como providers locales; el
        // token estable los referencia SOLO via el `useFactory` de abajo.
        ServicioNlpFallback,
        ServicioVisionFallback,
        FiltroRelevanciaFallback,
        CapaMlFallback,
        // 8.2 - sonda de disponibilidad compartida por los cuatro proxies.
        SondaServicioIaHttp,
        // 8.3 - cada token estable resuelve al adaptador proxy-backed.
        {
            provide: SERVICIO_NLP,
            inject: [ServicioNlpClient, ServicioNlpFallback, SondaServicioIaHttp],
            useFactory: (
                primario: ServicioNLP,
                fallback: ServicioNLP,
                sonda: SondaServicioIaHttp,
            ): ServicioNLP =>
                crearAdaptadorServicioNlp(
                    new ProxyDegradacionServicioIA(primario, fallback, sonda, {
                        nombre: 'Servicio_NLP',
                    }),
                ),
        },
        {
            provide: SERVICIO_VISION,
            inject: [ServicioVisionClient, ServicioVisionFallback, SondaServicioIaHttp],
            useFactory: (
                primario: ServicioVision,
                fallback: ServicioVision,
                sonda: SondaServicioIaHttp,
            ): ServicioVision =>
                crearAdaptadorServicioVision(
                    new ProxyDegradacionServicioIA(primario, fallback, sonda, {
                        nombre: 'Servicio_Vision',
                    }),
                ),
        },
        {
            provide: FILTRO_RELEVANCIA,
            inject: [FiltroRelevanciaClient, FiltroRelevanciaFallback, SondaServicioIaHttp],
            useFactory: (
                primario: FiltroRelevancia,
                fallback: FiltroRelevancia,
                sonda: SondaServicioIaHttp,
            ): FiltroRelevancia =>
                crearAdaptadorFiltroRelevancia(
                    new ProxyDegradacionServicioIA(primario, fallback, sonda, {
                        nombre: 'Filtro_Relevancia',
                    }),
                ),
        },
        {
            provide: CAPA_ML,
            inject: [CapaMlClient, CapaMlFallback, SondaServicioIaHttp],
            useFactory: (
                primario: CapaML,
                fallback: CapaML,
                sonda: SondaServicioIaHttp,
            ): CapaML =>
                crearAdaptadorCapaMl(
                    new ProxyDegradacionServicioIA(primario, fallback, sonda, {
                        nombre: 'Capa_ML',
                    }),
                ),
        },
    ],
    exports: [
        // Interfaces estables resueltas por disponibilidad (consumidas por el
        // Pipeline_Analisis a traves de los tokens, sin conocer la impl concreta).
        SERVICIO_NLP,
        SERVICIO_VISION,
        FILTRO_RELEVANCIA,
        CAPA_ML,
        // Clientes HTTP por tipo concreto (utiles para capacidades extra, p. ej.
        // CapaMlClient.buscarSimilares en el bucle de aprendizaje).
        ServicioNlpClient,
        ServicioVisionClient,
        FiltroRelevanciaClient,
        CapaMlClient,
    ],
})
export class AiModule { }
