// Feature: mejoras-dashboard-cdplp, Property 3: Badge de actividades institucionales siempre válido
import React from "react";

export const ESTADOS_ACTIVIDAD = [
  { value: "EN_INSCRIPCION", label: "En Inscripción" },
  { value: "EN_CURSO",       label: "En Curso" },
  { value: "TERMINADO",      label: "Terminado" },
];

const colorMap = {
  EN_INSCRIPCION: "bg-blue-100 text-blue-800",
  EN_CURSO:       "bg-green-100 text-green-800",
  TERMINADO:      "bg-gray-100 text-gray-700",
};

/**
 * Badge de estado para Actividades Institucionales.
 * Muestra el label legible y el color correspondiente al estado.
 *
 * @param {{ estado: string }} props
 */
export default function ActividadEstadoBadge({ estado }) {
  const estadoConfig = ESTADOS_ACTIVIDAD.find((e) => e.value === estado);
  const label  = estadoConfig?.label ?? estado ?? "—";
  const colors = colorMap[estado] ?? "bg-gray-100 text-gray-700";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors}`}
    >
      {label}
    </span>
  );
}
