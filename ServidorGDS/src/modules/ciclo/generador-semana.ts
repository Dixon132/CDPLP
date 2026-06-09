/**
 * `GeneradorSemanaModuloSimulacion` - adaptador de GENERACION del motor de
 * ciclos (tarea 28.1 - cableado end-to-end).
 *
 * Implementa el puerto {@link GeneradorSemana} cableando el `Modulo_Simulacion`
 * real (orquestador de `IDataProvider` + `Motor_Memoria_Contextual`) al
 * `procesarSemana` transaccional. Por cada `Semana_Simulada` carga de la BD
 * dedicada el `Escenario` inmutable del `Analisis`, la `Comunidad_Digital`
 * destino con su `Zona_Geografica` derivada (Req. 33.2) y los `Usuario_Sintetico`
 * persistentes a reutilizar (Req. 10.3), arma la `SolicitudGeneracion` y delega
 * en `ModuloSimulacion.generarSemana`, que devuelve un `Contrato_Normalizado`
 * valido anclado a la zona (Req. 4.6).
 *
 * No conoce el LLM concreto (lo elige la `FabricaDataProvider` dentro del
 * `Modulo_Simulacion`) ni la `Cola_Trabajos`: solo traduce el estado persistido
 * del `Analisis` a la solicitud de generacion.
 *
 * _Requirements: 6.1, 6.2, 10.3, 33.2, 4.6, 12.3_
 */
import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import {
    MODULO_SIMULACION,
    type ModuloSimulacion,
    type SolicitudGeneracion,
} from '../simulation/moduloSimulacion';
import type { PerfilUsuario } from '../simulation/adquisicion/dataProvider';
import type {
    GeneradorSemana,
    ResultadoGeneracionSemana,
} from '../scheduler/procesarSemana';

@Injectable()
export class GeneradorSemanaModuloSimulacion implements GeneradorSemana {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(MODULO_SIMULACION)
        private readonly simulacion: ModuloSimulacion,
    ) { }

    /**
     * Genera el candidato de la semana N de `(analisisId, institucionId)`:
     * carga el contexto persistido (escenario, comunidad/zona, usuarios) y delega
     * en el `Modulo_Simulacion`. Devuelve el contrato candidato (lo valida el
     * `Validador_Contrato` dentro de `procesarSemana`) y la `Comunidad_Digital`
     * para la que se genero.
     */
    async generar(
        analisisId: string,
        institucionId: string,
        numeroSemana: number,
    ): Promise<ResultadoGeneracionSemana> {
        const analisis = await this.prisma.analisis.findUniqueOrThrow({
            where: { id: analisisId },
            select: { escenario: true },
        });

        const comunidad = await this.prisma.comunidad.findUniqueOrThrow({
            where: {
                analisisId_institucionId: { analisisId, institucionId },
            },
            select: {
                id: true,
                zonaLatitud: true,
                zonaLongitud: true,
                zonaRadioMetros: true,
                usuarios: {
                    select: {
                        id: true,
                        seudonimo: true,
                        perfilConductual: true,
                        frecuencia: true,
                        estiloEscritura: true,
                        intereses: true,
                        nivelParticipacion: true,
                    },
                },
            },
        });

        const usuariosSinteticos: PerfilUsuario[] = comunidad.usuarios.map((u) => ({
            id: u.id,
            seudonimo: u.seudonimo,
            perfilConductual: u.perfilConductual,
            frecuencia: u.frecuencia,
            estiloEscritura: u.estiloEscritura,
            intereses: dividirIntereses(u.intereses),
            nivelParticipacion: u.nivelParticipacion,
        }));

        const solicitud: SolicitudGeneracion = {
            analisisId,
            institucionId,
            comunidadId: comunidad.id,
            semana: numeroSemana,
            escenario: analisis.escenario,
            usuariosSinteticos,
            zonaGeografica: {
                latitud: comunidad.zonaLatitud,
                longitud: comunidad.zonaLongitud,
                radioMetros: comunidad.zonaRadioMetros,
            },
        };

        const resultado = await this.simulacion.generarSemana(solicitud);

        return {
            contrato: resultado.contrato,
            comunidadId: comunidad.id,
            proveedor: resultado.proveedor,
        };
    }
}

/** Divide la cadena de `intereses` persistida en una lista limpia (sin vacios). */
function dividirIntereses(intereses: string): string[] {
    return intereses
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
}
