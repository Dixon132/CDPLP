/**
 * Modulo `communities` — Comunidad_Digital, Usuario_Sintetico,
 * `Score_Asociacion` y Zona_Geografica (Req. 25.2).
 *
 * Tarea 14.1: hogar canonico del `Score_Asociacion` (Req. 11), migrado desde el
 * modulo `analisis`.
 */
export type {
    FactoresAsociacion,
    PesosAsociacion,
    EntradaScoreSemana,
    ResultadoScoreSemana,
    RecalculadorScoreAsociacion,
} from './scoreAsociacion';

export {
    FACTORES_ASOCIACION,
    PESOS_POR_DEFECTO,
    SCORE_ASOCIACION,
    clamp01,
    calcularScoreAsociacion,
    ScoreAsociacionService,
    ServicioScoreAsociacion,
    servicioScoreAsociacion,
} from './scoreAsociacion';

export type {
    PatronInteraccion,
    RegistroActividad,
    SemillaUsuarioSintetico,
    UsuarioSinteticoPersistente,
    ClienteUsuarios,
    GestorUsuariosSinteticos,
} from './usuarioSintetico';

export {
    USUARIOS_SINTETICOS,
    serializarIntereses,
    parsearIntereses,
    serializarActividad,
    parsearActividad,
    mapHistorialRowToRegistro,
    agregarPatronesInteraccion,
    mapUsuarioRowToDominio,
    UsuariosSinteticosService,
    ServicioUsuariosSinteticosPrisma,
    servicioUsuariosSinteticos,
} from './usuarioSintetico';

export { CommunitiesModule } from './communities.module';

export type {
    ZonaGeografica,
    CoordenadasInstitucion,
    ColumnasZona,
    PatronDetectado,
    OrigenComunidad,
    RegistroPatron,
    DerivadorZonaGeografica,
} from './zonaGeografica';

export {
    ZONA_GEOGRAFICA,
    aRadioMetrosEntero,
    derivarZona,
    anclarZona,
    zonaAColumnas,
    aRegistroPatron,
    asociarPatronesAZona,
    claveZona,
    agruparPatronesPorZona,
    ZonaGeograficaService,
} from './zonaGeografica';
