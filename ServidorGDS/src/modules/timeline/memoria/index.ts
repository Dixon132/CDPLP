/**
 * Submodulo `timeline/memoria` - `Motor_Memoria_Contextual` y persistencia de la
 * `Memoria_Jerarquica` de 5 niveles sobre `gds_memoria_*`, migrado a NestJS
 * (tarea 3.5).
 */
export {
    NivelMemoria,
    ORDEN_NIVELES,
    MEMORIA_REPOSITORIO,
    MEMORIA_HISTORICA_REPOSITORIO,
    RECUPERADOR_SEMANTICO,
    FUENTE_RESUMEN_SEMANAL,
    MOTOR_MEMORIA_CONTEXTUAL,
} from './motor-memoria-contextual.types';
export type {
    ContextoGeneracion,
    ZonaGeografica,
    MemoriaNivel,
    MotorMemoriaContextual,
    FragmentoSemantico,
    RecuperadorSemantico,
    TendenciaHistoricaRegistro,
    EventoHistoricoRegistro,
    FiltroHistoria,
    HistoriaSemana,
} from './motor-memoria-contextual.types';

export {
    MemoriaHistoricaRepositorioPrisma,
} from './memoria-historica-repositorio';
export type {
    MemoriaHistoricaRepositorio,
    ClienteMemoriaHistorica,
} from './memoria-historica-repositorio';

export {
    MemoriaRepositorioPrisma,
    aListaStrings,
    mapSemanalRowToMemoria,
    mapMensualRowToMemoria,
    mapTrimestralRowToMemoria,
    mapSemestralRowToMemoria,
    mapGlobalRowToMemoria,
    mapMemoriaToSemanalCreate,
    mapMemoriaToMensualCreate,
    mapMemoriaToTrimestralCreate,
    mapMemoriaToSemestralCreate,
    mapMemoriaToGlobalCreate,
} from './memoria-repositorio';
export type { MemoriaRepositorio } from './memoria-repositorio';

export {
    MotorMemoriaContextualService,
    consolidarMemorias,
    estimarTokens,
    seleccionarContextoMemoria,
    seleccionarFragmentosSemanticos,
    textoFragmentoSemantico,
    textoMemoria,
    CONTEXTO_SEMANTICO_K,
} from './motor-memoria-contextual.service';
export type {
    FuenteResumenSemanal,
    ResumenSemanaCruda,
    SeleccionContexto,
} from './motor-memoria-contextual.service';
