/** Suma `anios` a una fecha, con aritmética nativa de `Date` (mismo estilo que `dashboard.ts`). */
export const sumarAnios = (fecha: Date, anios: number): Date =>
    new Date(fecha.getFullYear() + anios, fecha.getMonth(), fecha.getDate());

/** Suma `meses` a una fecha. */
export const sumarMeses = (fecha: Date, meses: number): Date =>
    new Date(fecha.getFullYear(), fecha.getMonth() + meses, fecha.getDate());

/** Días de diferencia entre `fecha` y hoy (negativo si `fecha` ya pasó). */
export const diasRestantes = (fecha: Date, hoy: Date = new Date()): number => {
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const inicioFecha = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    return Math.round((inicioFecha.getTime() - inicioHoy.getTime()) / 86_400_000);
};
