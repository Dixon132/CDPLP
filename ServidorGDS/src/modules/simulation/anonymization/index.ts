/**
 * `Servicio_Anonimizacion` (SHA-256 + salt) migrado al modulo `simulation`
 * (tarea 3.2). Punto unico de importacion: expone la interfaz estable, la clase
 * logica, la instancia reutilizable y el provider NestJS inyectable.
 */
export { ServicioAnonimizacionSha256, ServicioAnonimizacionService, servicioAnonimizacion } from "./servicioAnonimizacion";
export type { ServicioAnonimizacion } from "./interfaces";
