import prismaClient from "../../../utils/prismaClient";
import { diasRestantes } from "../../../utils/fechas";

export type DominioVencimiento = "colegiado" | "documento";
export type RangoVencimiento = "vencidos" | "7" | "15" | "30" | "60" | "90" | "todos";
export type EstadoCalculado = "VENCIDO" | "POR_VENCER" | "VIGENTE";

export interface ItemVencimiento {
    id: number;
    dominio: DominioVencimiento;
    titulo: string;
    subtitulo: string;
    fecha_vencimiento: Date;
    dias_restantes: number;
    estado_calculado: EstadoCalculado;
    // Id del colegiado dueño del ítem, para que el frontend abra el modal de
    // Pagos/Documentos correspondiente (mismo patrón que `Colegiados.jsx`) en
    // vez de navegar a una página aparte.
    id_colegiado: number | null;
}

const calcularEstado = (dias: number): EstadoCalculado => {
    if (dias < 0) return "VENCIDO";
    if (dias <= 30) return "POR_VENCER";
    return "VIGENTE";
};

/** Colegiados activos con `fecha_renovacion` registrada, normalizados a `ItemVencimiento`. */
const colegiadosVencimientos = async (): Promise<ItemVencimiento[]> => {
    const colegiados = await prismaClient.colegiados.findMany({
        where: { estado: "ACTIVO", fecha_renovacion: { not: null } },
        select: { id_colegiado: true, nombre: true, apellido: true, fecha_renovacion: true },
    });

    return colegiados.map((c) => {
        const dias = diasRestantes(c.fecha_renovacion!);
        return {
            id: c.id_colegiado,
            dominio: "colegiado" as const,
            titulo: `${c.nombre ?? ""} ${c.apellido ?? ""}`.trim() || "Colegiado sin nombre",
            subtitulo: "Renovación de colegiatura",
            fecha_vencimiento: c.fecha_renovacion!,
            dias_restantes: dias,
            estado_calculado: calcularEstado(dias),
            id_colegiado: c.id_colegiado,
        };
    });
};

/** Documentos de colegiados con `fecha_vencimiento` registrada, normalizados a `ItemVencimiento`. */
const documentosVencimientos = async (): Promise<ItemVencimiento[]> => {
    const documentos = await prismaClient.documentos_colegiados.findMany({
        where: { fecha_vencimiento: { not: null } },
        include: { colegiados: { select: { nombre: true, apellido: true } } },
    });

    return documentos.map((d) => {
        const dias = diasRestantes(d.fecha_vencimiento!);
        const nombreColegiado = `${d.colegiados?.nombre ?? ""} ${d.colegiados?.apellido ?? ""}`.trim();
        return {
            id: d.id_documento,
            dominio: "documento" as const,
            titulo: d.tipo_documento ?? "Documento",
            subtitulo: nombreColegiado || "Colegiado sin nombre",
            fecha_vencimiento: d.fecha_vencimiento!,
            dias_restantes: dias,
            estado_calculado: calcularEstado(dias),
            id_colegiado: d.id_colegiado,
        };
    });
};

const RANGOS_DIAS: Record<Exclude<RangoVencimiento, "vencidos" | "todos">, number> = {
    "7": 7,
    "15": 15,
    "30": 30,
    "60": 60,
    "90": 90,
};

const dentroDelRango = (item: ItemVencimiento, rango?: RangoVencimiento): boolean => {
    if (!rango || rango === "todos") return true;
    if (rango === "vencidos") return item.dias_restantes < 0;
    return item.dias_restantes <= RANGOS_DIAS[rango];
};

/** Vencimientos de colegiados y/o documentos, filtrados por dominio/rango y ordenados por proximidad. */
export const obtenerVencimientos = async (params: {
    dominio?: DominioVencimiento;
    rango?: RangoVencimiento;
}): Promise<ItemVencimiento[]> => {
    const [colegiados, documentos] = await Promise.all([
        params.dominio === "documento" ? Promise.resolve([]) : colegiadosVencimientos(),
        params.dominio === "colegiado" ? Promise.resolve([]) : documentosVencimientos(),
    ]);

    return [...colegiados, ...documentos]
        .filter((item) => dentroDelRango(item, params.rango))
        .sort((a, b) => a.dias_restantes - b.dias_restantes);
};

/** Conteos por rango, para el widget del resumen del dashboard. */
export const obtenerResumenVencimientos = async () => {
    const todos = await obtenerVencimientos({});
    return {
        vencidos: todos.filter((i) => i.dias_restantes < 0).length,
        proximos30: todos.filter((i) => i.dias_restantes >= 0 && i.dias_restantes <= 30).length,
        total: todos.length,
    };
};
