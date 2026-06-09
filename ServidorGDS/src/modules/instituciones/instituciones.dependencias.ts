/**
 * Utilidades de dependencias de una `Institucion` (Req. 7.6, 7.8).
 *
 * Centraliza el calculo del `total` y la construccion del MENSAJE de
 * dependencia, reutilizado tanto por el rechazo atomico del borrado (Req. 7.6)
 * como por la exposicion proactiva de restricciones (Req. 7.8).
 */
import type { DependenciasInstitucion } from "./instituciones.types";

/** Construye un `DependenciasInstitucion` calculando el `total`. */
export function construirDependencias(parciales: {
    comunidades: number;
    ciclos: number;
    evidencias: number;
    reportes: number;
}): DependenciasInstitucion {
    const { comunidades, ciclos, evidencias, reportes } = parciales;
    return {
        comunidades,
        ciclos,
        evidencias,
        reportes,
        total: comunidades + ciclos + evidencias + reportes,
    };
}

/**
 * Mensaje legible de dependencia. Cadena vacia cuando no hay dependencias
 * (la institucion puede eliminarse).
 */
export function mensajeDependencia(
    institucionId: string,
    deps: DependenciasInstitucion,
): string {
    if (deps.total === 0) {
        return "";
    }
    const partes: string[] = [];
    if (deps.comunidades > 0) {
        partes.push(`${deps.comunidades} comunidad(es) de analisis`);
    }
    if (deps.ciclos > 0) partes.push(`${deps.ciclos} ciclo(s) semanal(es)`);
    if (deps.evidencias > 0) partes.push(`${deps.evidencias} evidencia(s)`);
    if (deps.reportes > 0) partes.push(`${deps.reportes} reporte(s)`);

    return (
        `No se puede eliminar la institucion ${institucionId}: esta referenciada por ` +
        `${partes.join(", ")}. Elimine primero los analisis/datos dependientes.`
    );
}
