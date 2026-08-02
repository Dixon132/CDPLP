import { Request, Response } from "express";
import prismaClient from "../../../utils/prismaClient";
import { recursos } from "../../../../generated/prisma";

type NodoRecurso = recursos & { hijos: NodoRecurso[] };

/** GET /permisos/recursos — árbol completo de módulos/submódulos activos, ordenado. */
export const getArbolRecursos = async (req: Request, res: Response) => {
    const planos = await prismaClient.recursos.findMany({ where: { activo: true } });

    const porId = new Map<number, NodoRecurso>(planos.map((r) => [r.id_recurso, { ...r, hijos: [] }]));
    const raiz: NodoRecurso[] = [];

    for (const nodo of porId.values()) {
        if (nodo.id_padre && porId.has(nodo.id_padre)) {
            porId.get(nodo.id_padre)!.hijos.push(nodo);
        } else {
            raiz.push(nodo);
        }
    }

    const porOrden = (a: NodoRecurso, b: NodoRecurso) => a.orden - b.orden;
    raiz.sort(porOrden);
    raiz.forEach((nodo) => nodo.hijos.sort(porOrden));

    res.status(200).json(raiz);
};
