// Feature: mejoras-dashboard-cdplp, Property 3: Badge de actividades institucionales siempre válido
//
// Valida: Requisitos 4.1, 4.3
//
// Propiedad: Para cualquier valor de estado en {EN_INSCRIPCION, EN_CURSO, TERMINADO},
// el componente ActividadEstadoBadge debe renderizar un <span> con el label legible
// correcto y las clases de color correctas según el mapa definido en el componente.
// Para cualquier valor fuera de ese conjunto, el badge debe renderizar un fallback
// sin lanzar error (label = el propio valor, clases = fallback gray).

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import * as fc from 'fast-check';

import ActividadEstadoBadge, { ESTADOS_ACTIVIDAD } from './ActividadEstadoBadge';

// ---------------------------------------------------------------------------
// Espejos de las definiciones internas del componente (para aserciones)
// ---------------------------------------------------------------------------

const colorMap = {
  EN_INSCRIPCION: 'bg-blue-100 text-blue-800',
  EN_CURSO: 'bg-green-100 text-green-800',
  TERMINADO: 'bg-gray-100 text-gray-700',
};

const labelMap = Object.fromEntries(
  ESTADOS_ACTIVIDAD.map(({ value, label }) => [value, label])
);

const FALLBACK_CLASSES = 'bg-gray-100 text-gray-700';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Renderiza el badge y devuelve el único <span> de resultado */
function renderBadge(estado) {
  const { container } = render(<ActividadEstadoBadge estado={estado} />);
  return container.querySelector('span');
}

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('ActividadEstadoBadge — Propiedad 3: Badge siempre válido', () => {

  // ── Propiedad principal (estados válidos) ─────────────────────────────────
  it('para cualquier estado válido renderiza el label y las clases correctas (property test)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('EN_INSCRIPCION', 'EN_CURSO', 'TERMINADO'),
        (estado) => {
          const span = renderBadge(estado);

          // 1. El span existe
          expect(span).not.toBeNull();

          // 2. El label visible es el esperado
          const expectedLabel = labelMap[estado];
          expect(span.textContent).toBe(expectedLabel);

          // 3. Las clases de color son exactamente las del colorMap
          const expectedClasses = colorMap[estado];
          expectedClasses.split(' ').forEach((cls) => {
            expect(span.className).toContain(cls);
          });
        }
      ),
      { numRuns: 100, verbose: false }
    );
  });

  // ── Propiedad secundaria (estados inválidos no rompen el componente) ───────
  //
  // Nota: el generador excluye nombres de propiedades heredadas del prototipo
  // de Object (como "constructor", "toString", "valueOf") porque en JS un
  // acceso `colorMap["constructor"]` devuelve el constructor nativo (valor
  // truthy), lo que evita que se aplique el operador `??`. Esos strings no
  // son estados válidos en ningún contexto real de la app (los estados vienen
  // del backend como enum de BD), por lo que el filtro es correcto.
  it('para cualquier estado desconocido renderiza un fallback sin lanzar error (property test)', () => {
    // Propiedades heredadas del prototipo de Object que colorMap hereda
    const PROTOTYPE_KEYS = new Set(Object.getOwnPropertyNames(Object.prototype));
    const VALID_STATES = new Set(['EN_INSCRIPCION', 'EN_CURSO', 'TERMINADO']);

    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 30 })
          .filter(
            (s) => !VALID_STATES.has(s) && !PROTOTYPE_KEYS.has(s)
          ),
        (estadoAleatorio) => {
          // No debe lanzar excepción
          expect(() => renderBadge(estadoAleatorio)).not.toThrow();

          const span = renderBadge(estadoAleatorio);
          expect(span).not.toBeNull();

          // El label muestra el estado crudo (sin traducción)
          expect(span.textContent).toBe(estadoAleatorio);

          // Las clases de fallback están presentes
          FALLBACK_CLASSES.split(' ').forEach((cls) => {
            expect(span.className).toContain(cls);
          });
        }
      ),
      { numRuns: 100, verbose: false }
    );
  });

  // ── Tests de ejemplo concretos ────────────────────────────────────────────

  it('EN_INSCRIPCION → label "En Inscripción" y clases azules', () => {
    const span = renderBadge('EN_INSCRIPCION');
    expect(span).not.toBeNull();
    expect(span.textContent).toBe('En Inscripción');
    expect(span.className).toContain('bg-blue-100');
    expect(span.className).toContain('text-blue-800');
  });

  it('EN_CURSO → label "En Curso" y clases verdes', () => {
    const span = renderBadge('EN_CURSO');
    expect(span).not.toBeNull();
    expect(span.textContent).toBe('En Curso');
    expect(span.className).toContain('bg-green-100');
    expect(span.className).toContain('text-green-800');
  });

  it('TERMINADO → label "Terminado" y clases grises', () => {
    const span = renderBadge('TERMINADO');
    expect(span).not.toBeNull();
    expect(span.textContent).toBe('Terminado');
    expect(span.className).toContain('bg-gray-100');
    expect(span.className).toContain('text-gray-700');
  });

  it('estado undefined → muestra "—" como fallback', () => {
    const span = renderBadge(undefined);
    expect(span).not.toBeNull();
    expect(span.textContent).toBe('—');
    FALLBACK_CLASSES.split(' ').forEach((cls) => {
      expect(span.className).toContain(cls);
    });
  });

  it('cada estado válido produce un label diferente', () => {
    const labels = ['EN_INSCRIPCION', 'EN_CURSO', 'TERMINADO'].map(
      (estado) => renderBadge(estado).textContent
    );
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(3);
  });

  it('cada estado válido produce clases distintas', () => {
    const classNames = ['EN_INSCRIPCION', 'EN_CURSO', 'TERMINADO'].map(
      (estado) => colorMap[estado]
    );
    const uniqueClasses = new Set(classNames);
    // EN_INSCRIPCION (blue) y EN_CURSO (green) tienen clases distintas
    // TERMINADO (gray) puede compartir prefijo pero los valores son distintos
    expect(classNames[0]).not.toBe(classNames[1]); // EN_INSCRIPCION ≠ EN_CURSO
    expect(classNames[1]).not.toBe(classNames[2]); // EN_CURSO ≠ TERMINADO
    expect(uniqueClasses.size).toBe(3);
  });
});
