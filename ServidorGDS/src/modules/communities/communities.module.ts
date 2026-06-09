import { Module } from '@nestjs/common';

import { ScoreAsociacionService, SCORE_ASOCIACION } from './scoreAsociacion';
import { ZonaGeograficaService, ZONA_GEOGRAFICA } from './zonaGeografica';
import { UsuariosSinteticosService, USUARIOS_SINTETICOS } from './usuarioSintetico';

/**
 * Communities: Comunidad_Digital, Usuario_Sintetico, Score_Asociacion y
 * Zona_Geografica. Modulo de dominio (Req. 25.2).
 *
 * Tarea 14.1: registra el `ScoreAsociacionService` (sobre el `PrismaService`
 * global) y lo expone tras el token estable `SCORE_ASOCIACION`, de modo que los
 * consumidores dependan de la interfaz `RecalculadorScoreAsociacion` y no de la
 * implementacion concreta. Recalcula el `Score_Asociacion` en [0, 1] al cerrar
 * cada `Semana_Simulada` (Req. 11.1, 11.2, 11.3, 11.5).
 *
 * Tarea 14.2: registra el `UsuariosSinteticosService` (sobre el `PrismaService`
 * global) tras el token estable `USUARIOS_SINTETICOS`, que gestiona el
 * `Usuario_Sintetico` persistente: reutiliza (NO regenera) los usuarios entre
 * semanas (Req. 10.2, 10.3) y acumula su historial de forma monotonica
 * (Req. 10.5), conservando el perfil conductual completo (Req. 10.1).
 *
 * Tarea 14.3: registra el `ZonaGeograficaService` tras el token estable
 * `ZONA_GEOGRAFICA`. Deriva la `Zona_Geografica` de cada `Comunidad_Digital`
 * (coordenadas de la `Institucion` + radio del `Analisis`), la incluye en el
 * `ContextoGeneracion` y persiste cada patron detectado anclado a su zona para
 * la trazabilidad y la comparacion por zona (Req. 33.1, 33.2, 33.4, 33.5).
 */
@Module({
    providers: [
        ScoreAsociacionService,
        { provide: SCORE_ASOCIACION, useExisting: ScoreAsociacionService },
        UsuariosSinteticosService,
        { provide: USUARIOS_SINTETICOS, useExisting: UsuariosSinteticosService },
        ZonaGeograficaService,
        { provide: ZONA_GEOGRAFICA, useExisting: ZonaGeograficaService },
    ],
    exports: [
        ScoreAsociacionService,
        SCORE_ASOCIACION,
        UsuariosSinteticosService,
        USUARIOS_SINTETICOS,
        ZonaGeograficaService,
        ZONA_GEOGRAFICA,
    ],
})
export class CommunitiesModule { }
