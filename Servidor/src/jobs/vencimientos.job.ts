import cron from "node-cron";
import prismaClient from "../utils/prismaClient";
import { obtenerVencimientos } from "../modules/vencimientos/services";
import { emitirNotificacion } from "../modules/notificaciones/services";
import { Modulos } from "../types/auditoria";

/** Umbrales exactos: como el job corre una vez al día, cada entidad los cruza una sola vez — no hace falta una tabla de "ya notificado" para evitar spam. */
const UMBRALES_DIAS = [30, 15, 7, 1, 0];

/**
 * 1) Marca como VENCIDO los documentos cuya fecha ya pasó.
 * 2) Notifica colegiaturas/documentos que hoy cruzan uno de los umbrales.
 */
export const ejecutarRevisionVencimientos = async () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    await prismaClient.documentos_colegiados.updateMany({
        where: { estado: "VIGENTE", fecha_vencimiento: { lt: hoy } },
        data: { estado: "VENCIDO" },
    });

    const items = await obtenerVencimientos({});
    const porNotificar = items.filter((i) => UMBRALES_DIAS.includes(i.dias_restantes));

    for (const item of porNotificar) {
        const titulo = item.dias_restantes < 0
            ? `${item.dominio === "colegiado" ? "Colegiatura" : "Documento"} vencido`
            : item.dias_restantes === 0
                ? `${item.dominio === "colegiado" ? "Colegiatura" : "Documento"} vence hoy`
                : `${item.dominio === "colegiado" ? "Colegiatura" : "Documento"} vence en ${item.dias_restantes} día(s)`;

        await emitirNotificacion({
            modulo: Modulos.COLEGIADOS,
            tipo: item.dias_restantes < 0 ? "error" : "aviso",
            titulo,
            descripcion: `${item.titulo} · ${item.subtitulo}`,
            enlace: "/dashboard/vencimientos",
        });
    }

    return { documentosMarcadosVencidos: true, notificacionesEmitidas: porNotificar.length };
};

/** Corre todos los días a las 07:00 (America/La_Paz). */
export const iniciarJobVencimientos = () => {
    cron.schedule("0 7 * * *", () => {
        ejecutarRevisionVencimientos().catch((e) => console.error("Error en job de vencimientos:", e));
    }, { timezone: "America/La_Paz" });
};
