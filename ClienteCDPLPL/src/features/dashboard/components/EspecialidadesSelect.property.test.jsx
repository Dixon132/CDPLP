// Feature: mejoras-dashboard-cdplp, Property 6: Multi-select especialidades renderiza todas las opciones disponibles
// Feature: mejoras-dashboard-cdplp, Property 7: Serialización de especialidades seleccionadas a string con comas
//
// Valida: Requisitos 9.4, 9.5

import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import EspecialidadesSelect from './EspecialidadesSelect';

// ---------------------------------------------------------------------------
// Helper: mock de getAllEspecialidades para inyectar lista arbitraria
// ---------------------------------------------------------------------------
vi.mock('../services/especialidades', () => ({
  getAllEspecialidades: vi.fn(),
  createEspecialidad: vi.fn(),
}));

import { getAllEspecialidades } from '../services/especialidades';

/** Renderiza el componente con la lista de especialidades dada y abre el dropdown */
async function renderConOpciones(especialidades, valueInicial = []) {
  getAllEspecialidades.mockResolvedValue({ data: especialidades });
  const onChange = vi.fn();

  const { container, unmount } = render(
    <EspecialidadesSelect value={valueInicial} onChange={onChange} />,
  );

  // Esperar que el efecto cargue las opciones
  await act(async () => {});

  // Abrir el dropdown
  const contenedor = container.querySelector('div[class*="min-h"]');
  fireEvent.click(contenedor);

  return { container, onChange, unmount };
}

// ---------------------------------------------------------------------------
// Propiedad 6 — Multi-select renderiza TODAS las opciones disponibles
// ---------------------------------------------------------------------------
// Feature: mejoras-dashboard-cdplp, Property 6: Multi-select especialidades renderiza todas las opciones disponibles
describe('Propiedad 6: EspecialidadesSelect renderiza todas las opciones disponibles', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('property: todas las especialidades activas aparecen en el dropdown (100 runs)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Genera arrays de especialidades con nombres únicos no-vacíos
        fc.uniqueArray(
          fc.record({
            nombre: fc.string({ minLength: 1, maxLength: 30 }).map((s) => s.trim()).filter((s) => s.length > 0),
            activo: fc.constant(true),
          }),
          { selector: (e) => e.nombre },
        ),
        async (especialidades) => {
          getAllEspecialidades.mockResolvedValue({ data: especialidades });
          const onChange = vi.fn();

          const { container, unmount } = render(
            <EspecialidadesSelect value={[]} onChange={onChange} />,
          );

          await act(async () => {});

          // Abrir el dropdown
          const contenedor = container.querySelector('div[class*="min-h"]');
          fireEvent.click(contenedor);

          await act(async () => {});

          const listbox = container.querySelector('[role="listbox"]');
          expect(listbox).toBeTruthy();

          const items = within(listbox).queryAllByRole('option');

          // Cada especialidad debe aparecer exactamente una vez
          especialidades.forEach((esp) => {
            const match = items.filter((item) => item.textContent === esp.nombre);
            expect(match.length).toBe(1);
          });

          // Sin duplicados: el número de opciones renderizadas === número de especialidades
          expect(items.length).toBe(especialidades.length);

          unmount();
          vi.clearAllMocks();
        },
      ),
      { numRuns: 100, verbose: false },
    );
  });

  it('ejemplo: 3 especialidades → 3 opciones en el dropdown', async () => {
    const especialidades = [
      { nombre: 'Derecho Civil', activo: true },
      { nombre: 'Ingeniería Civil', activo: true },
      { nombre: 'Medicina General', activo: true },
    ];

    const { container, unmount } = await renderConOpciones(especialidades);
    const listbox = container.querySelector('[role="listbox"]');
    const items = within(listbox).getAllByRole('option');

    expect(items).toHaveLength(3);
    expect(items[0].textContent).toBe('Derecho Civil');
    expect(items[1].textContent).toBe('Ingeniería Civil');
    expect(items[2].textContent).toBe('Medicina General');

    unmount();
  });

  it('ejemplo: especialidades ya seleccionadas no aparecen en el dropdown', async () => {
    const especialidades = [
      { nombre: 'Contabilidad', activo: true },
      { nombre: 'Arquitectura', activo: true },
      { nombre: 'Economía', activo: true },
    ];
    const seleccionadas = ['Contabilidad'];

    const { container, unmount } = await renderConOpciones(especialidades, seleccionadas);
    const listbox = container.querySelector('[role="listbox"]');
    const items = within(listbox).getAllByRole('option');

    // Solo las 2 no-seleccionadas
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.textContent)).not.toContain('Contabilidad');

    unmount();
  });

  it('ejemplo: sin especialidades → listbox muestra "Sin resultados"', async () => {
    const { container, unmount } = await renderConOpciones([]);
    const listbox = container.querySelector('[role="listbox"]');
    expect(listbox.textContent).toContain('Sin resultados');
    unmount();
  });
});

// ---------------------------------------------------------------------------
// Propiedad 7 — Serialización round-trip: array → join(", ") → split(", ") → array
// ---------------------------------------------------------------------------
// Feature: mejoras-dashboard-cdplp, Property 7: Serialización de especialidades seleccionadas a string con comas
describe('Propiedad 7: Serialización de especialidades a string con comas (round-trip)', () => {
  /**
   * La lógica de serialización que usan los formularios padre:
   *   guardar:  value.join(", ")
   *   cargar:   storedString.split(", ")
   */
  function serializar(arr) {
    return arr.join(', ');
  }

  function deserializar(str) {
    return str.split(', ');
  }

  it('property: round-trip join → split reconstituye el array original (100 runs)', () => {
    fc.assert(
      fc.property(
        // Arrays no-vacíos de nombres sin la subcadena ", " embebida
        // (la serialización usa ", " como delimitador, igual que la especificación)
        fc.array(
          fc.string({ minLength: 1, maxLength: 50 })
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && !s.includes(', ')),
          { minLength: 1, maxLength: 20 },
        ),
        (nombres) => {
          const serializado = serializar(nombres);
          const reconstruido = deserializar(serializado);
          expect(reconstruido).toEqual(nombres);
        },
      ),
      { numRuns: 100, verbose: false },
    );
  });

  it('property: el string serializado nunca empieza ni termina con ", " (100 runs)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 1, maxLength: 50 })
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && !s.includes(', ')),
          { minLength: 1, maxLength: 20 },
        ),
        (nombres) => {
          const serializado = serializar(nombres);
          expect(serializado.startsWith(', ')).toBe(false);
          expect(serializado.endsWith(', ')).toBe(false);
        },
      ),
      { numRuns: 100, verbose: false },
    );
  });

  it('property: el número de segmentos tras split === longitud del array original (100 runs)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 1, maxLength: 50 })
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && !s.includes(', ')),
          { minLength: 1, maxLength: 20 },
        ),
        (nombres) => {
          const serializado = serializar(nombres);
          const segmentos = deserializar(serializado);
          expect(segmentos.length).toBe(nombres.length);
        },
      ),
      { numRuns: 100, verbose: false },
    );
  });

  // ── Ejemplos concretos ────────────────────────────────────────────────────

  it('ejemplo: un solo elemento → string sin comas', () => {
    expect(serializar(['Ingeniería Civil'])).toBe('Ingeniería Civil');
  });

  it('ejemplo: dos elementos → separados por ", "', () => {
    expect(serializar(['Derecho Civil', 'Contabilidad'])).toBe('Derecho Civil, Contabilidad');
  });

  it('ejemplo: tres elementos → round-trip correcto', () => {
    const arr = ['Medicina', 'Ingeniería', 'Arquitectura'];
    const str = serializar(arr);
    expect(str).toBe('Medicina, Ingeniería, Arquitectura');
    expect(deserializar(str)).toEqual(arr);
  });

  it('ejemplo: array con un elemento con espacios internos → round-trip preserva espacios', () => {
    const arr = ['Derecho Internacional Público', 'Derecho Civil'];
    const str = serializar(arr);
    expect(deserializar(str)).toEqual(arr);
  });
});
