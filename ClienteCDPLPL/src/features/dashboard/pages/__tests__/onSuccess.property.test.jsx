// Feature: mejoras-dashboard-cdplp, Property 2: onSuccess se llama inmediatamente tras submit exitoso
//
// Valida: Requisito 3.2
//
// Propiedad: Para cualquier formulario afectado (EditarCorrespondencia, CreateMemoria,
// EditMemoria, EditActInstitucional, CreateActInstitucional), cuando el submit es exitoso,
// onSuccess() debe ser invocado en el mismo ciclo de ejecución sin pasar por ningún setTimeout.
// Se verifica usando fake timers de Vitest: se deja que las Promises resuelvan y se avanza
// 0ms; onSuccess ya debe haber sido llamado en ese punto.

import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, fireEvent, act, within } from '@testing-library/react';
import * as fc from 'fast-check';

// ── Mocks de módulos de servicio ─────────────────────────────────────────────

vi.mock(
  '../../services/memorias',
  () => ({
    createMemoria: vi.fn(),
    updateMemoria: vi.fn(),
  })
);

vi.mock(
  '../../services/correspondencia',
  () => ({
    getCorrespondenciaById: vi.fn(),
    updateCorrespondenciaById: vi.fn(),
    usuariosCorrespondencia: vi.fn(),
  })
);

vi.mock(
  '../../services/ac-institucionales',
  () => ({
    createActividadInstitucional: vi.fn(),
    getActividadInstitucionalById: vi.fn(),
    updateActividadInstitucional: vi.fn(),
  })
);

// ── Importaciones de componentes (después de los mocks) ──────────────────────

import { createMemoria, updateMemoria } from '../../services/memorias';
import {
  getCorrespondenciaById,
  updateCorrespondenciaById,
  usuariosCorrespondencia,
} from '../../services/correspondencia';
import {
  createActividadInstitucional,
  getActividadInstitucionalById,
  updateActividadInstitucional,
} from '../../services/ac-institucionales';

import CreateMemoria from '../Memorias/components/CreateMemoria';
import EditMemoria from '../Memorias/components/EditMemoria';
import EditarCorrespondencia from '../Correspondencia/components/EditarCorrespondencia';
import CreateActInstitucional from '../Ac-Inst/components/CreateActInstitucional';
import EditActInstitucional from '../Ac-Inst/components/EditActInstitucional';

// ── Datos de base para los componentes que requieren props iniciales ─────────

const memoriaBase = {
  id: 1,
  titulo: 'Memoria Test',
  descripcion: 'Descripción test',
  categoria: 'Memorias Anuales',
  anio: 2024,
};

const correspondenciaBase = {
  id: 1,
  asunto: 'Asunto test',
  resumen: 'Resumen test',
  fecha_envio: '2024-01-01T00:00:00.000Z',
  fecha_recibido: '2024-01-02T00:00:00.000Z',
  remitente: 'Remitente test',
  id_destinatario: 1,
  estado: 'RECIBIDO',
};

const actividadBase = {
  id: 1,
  nombre: 'Actividad test',
  descripcion: 'Descripción test',
  tipo: 'Conferencia',
  fecha_programada: '2024-06-15T00:00:00.000Z',
  costo: 100,
  estado: 'EN_INSCRIPCION',
};

// ── Helpers de fast-check ────────────────────────────────────────────────────

/** Genera un título no-vacío con caracteres ASCII seguros */
const arbTitulo = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter(s => /^[\x20-\x7E]+$/.test(s) && s.trim().length > 0);

/** Genera un año razonable como string */
const arbAnio = fc.integer({ min: 2000, max: 2030 }).map(String);

/** Genera datos para CreateMemoria / EditMemoria */
const arbMemoriaData = fc.record({
  titulo: arbTitulo,
  anio: arbAnio,
});

/** Genera datos para CreateActInstitucional / EditActInstitucional */
const arbActInstData = fc.record({
  nombre: arbTitulo,
});

// ── Utilidad: esperar a que los useEffects async resuelvan ───────────────────

async function waitForEffects(times = 3) {
  await act(async () => {
    for (let i = 0; i < times; i++) {
      await Promise.resolve();
    }
  });
}

// ── Utilidad: verificar que onSuccess fue llamado sin setTimeout ─────────────
// Avanzamos 0ms con fake timers. Si onSuccess depende de un setTimeout(fn, N>0)
// no habrá disparado aún. Si fue llamado directamente (await api(); onSuccess())
// ya estará registrado.

async function assertOnSuccessCalledImmediately(onSuccess) {
  await act(async () => {
    vi.advanceTimersByTime(0);
  });
  expect(onSuccess).toHaveBeenCalledTimes(1);
}

// ── Utilidad: obtener input por nombre dentro de un container ────────────────

function getInputByName(container, name) {
  return container.querySelector(`[name="${name}"]`);
}

// ════════════════════════════════════════════════════════════════════════════════
// TESTS
// ════════════════════════════════════════════════════════════════════════════════

describe('Propiedad 2: onSuccess se llama inmediatamente tras submit exitoso', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(createMemoria).mockResolvedValue({ id: 1 });
    vi.mocked(updateMemoria).mockResolvedValue({ id: 1 });
    vi.mocked(createActividadInstitucional).mockResolvedValue({ id: 1 });
    vi.mocked(updateActividadInstitucional).mockResolvedValue({ id: 1 });
    vi.mocked(getActividadInstitucionalById).mockResolvedValue(actividadBase);
    vi.mocked(getCorrespondenciaById).mockResolvedValue(correspondenciaBase);
    vi.mocked(usuariosCorrespondencia).mockResolvedValue([
      { id_usuario: 1, nombre: 'Admin', apellido: 'Test' },
    ]);
    vi.mocked(updateCorrespondenciaById).mockResolvedValue({ id: 1 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ── 1. CreateMemoria ─────────────────────────────────────────────────────────

  it('CreateMemoria: onSuccess se llama inmediatamente para cualquier formData válido', async () => {
    await fc.assert(
      fc.asyncProperty(arbMemoriaData, async ({ titulo, anio }) => {
        const onSuccess = vi.fn();
        const onClose = vi.fn();

        const { container, unmount } = render(
          <CreateMemoria onSuccess={onSuccess} onClose={onClose} />
        );

        // Locate inputs by name attribute (labels have no htmlFor in this component)
        const inputTitulo = getInputByName(container, 'titulo');
        const inputAnio = getInputByName(container, 'anio');

        fireEvent.change(inputTitulo, { target: { name: 'titulo', value: titulo } });
        fireEvent.change(inputAnio, { target: { name: 'anio', value: anio } });

        const form = container.querySelector('form');
        await act(async () => {
          fireEvent.submit(form);
          await Promise.resolve();
          await Promise.resolve();
          await Promise.resolve();
        });

        await assertOnSuccessCalledImmediately(onSuccess);

        unmount();
        vi.mocked(createMemoria).mockClear();
        onSuccess.mockClear();
      }),
      { numRuns: 30, verbose: false }
    );
  });

  // ── 2. EditMemoria ───────────────────────────────────────────────────────────

  it('EditMemoria: onSuccess se llama inmediatamente para cualquier formData válido', async () => {
    await fc.assert(
      fc.asyncProperty(arbMemoriaData, async ({ titulo, anio }) => {
        const onSuccess = vi.fn();
        const onClose = vi.fn();

        const { container, unmount } = render(
          <EditMemoria
            memoria={{ ...memoriaBase, titulo, anio: parseInt(anio) }}
            onSuccess={onSuccess}
            onClose={onClose}
          />
        );

        const inputTitulo = getInputByName(container, 'titulo');
        fireEvent.change(inputTitulo, { target: { name: 'titulo', value: titulo } });

        const form = container.querySelector('form');
        await act(async () => {
          fireEvent.submit(form);
          await Promise.resolve();
          await Promise.resolve();
          await Promise.resolve();
        });

        await assertOnSuccessCalledImmediately(onSuccess);

        unmount();
        vi.mocked(updateMemoria).mockClear();
        onSuccess.mockClear();
      }),
      { numRuns: 30, verbose: false }
    );
  });

  // ── 3. CreateActInstitucional ────────────────────────────────────────────────
  // react-hook-form validates before submit — we must pre-set all required fields
  // via fireEvent.change on each input so that validation passes.

  it('CreateActInstitucional: onSuccess se llama inmediatamente para cualquier formData válido', async () => {
    await fc.assert(
      fc.asyncProperty(arbActInstData, async ({ nombre }) => {
        const onSuccess = vi.fn();
        const onClose = vi.fn();

        const { container, unmount } = render(
          <CreateActInstitucional onSuccess={onSuccess} onClose={onClose} />
        );

        // Fill all required fields so react-hook-form validation passes
        const inputNombre = getInputByName(container, 'nombre');
        fireEvent.change(inputNombre, { target: { value: nombre } });

        const inputFecha = getInputByName(container, 'fecha_programada');
        fireEvent.change(inputFecha, { target: { value: '2025-06-15' } });

        // Select required: tipo
        const selectTipo = getInputByName(container, 'tipo');
        fireEvent.change(selectTipo, { target: { value: 'Conferencia' } });

        // Select required: estado
        const selectEstado = getInputByName(container, 'estado');
        fireEvent.change(selectEstado, { target: { value: 'EN_INSCRIPCION' } });

        const form = container.querySelector('form');
        await act(async () => {
          fireEvent.submit(form);
          await Promise.resolve();
          await Promise.resolve();
          await Promise.resolve();
        });

        await assertOnSuccessCalledImmediately(onSuccess);

        unmount();
        vi.mocked(createActividadInstitucional).mockClear();
        onSuccess.mockClear();
      }),
      { numRuns: 30, verbose: false }
    );
  });

  // ── 4. EditActInstitucional ──────────────────────────────────────────────────

  it('EditActInstitucional: onSuccess se llama inmediatamente después de que la carga inicial resuelve y el submit es exitoso', async () => {
    await fc.assert(
      fc.asyncProperty(arbActInstData, async ({ nombre }) => {
        const onSuccess = vi.fn();
        const onClose = vi.fn();

        const { container, unmount } = render(
          <EditActInstitucional id={actividadBase.id} onSuccess={onSuccess} onClose={onClose} />
        );

        // Wait for the initial data load useEffect to resolve
        await waitForEffects(4);

        // Spinner should be gone now
        expect(container.querySelector('[role="progressbar"]')).toBeNull();

        const inputNombre = getInputByName(container, 'nombre');
        fireEvent.change(inputNombre, { target: { value: nombre } });

        // Ensure tipo and estado are still set (pre-filled by reset())
        const selectTipo = getInputByName(container, 'tipo');
        if (!selectTipo.value) {
          fireEvent.change(selectTipo, { target: { value: 'Conferencia' } });
        }

        const selectEstado = getInputByName(container, 'estado');
        if (!selectEstado.value) {
          fireEvent.change(selectEstado, { target: { value: 'EN_INSCRIPCION' } });
        }

        const inputFecha = getInputByName(container, 'fecha_programada');
        if (!inputFecha.value) {
          fireEvent.change(inputFecha, { target: { value: '2025-06-15' } });
        }

        const form = container.querySelector('form');
        await act(async () => {
          fireEvent.submit(form);
          await Promise.resolve();
          await Promise.resolve();
          await Promise.resolve();
        });

        await assertOnSuccessCalledImmediately(onSuccess);

        unmount();
        vi.mocked(updateActividadInstitucional).mockClear();
        vi.mocked(getActividadInstitucionalById).mockClear();
        onSuccess.mockClear();
      }),
      { numRuns: 20, verbose: false }
    );
  });

  // ── 5. EditarCorrespondencia ─────────────────────────────────────────────────

  it('EditarCorrespondencia: onSuccess se llama inmediatamente después de que la carga inicial resuelve y el submit es exitoso', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({ asunto: arbTitulo }),
        async ({ asunto }) => {
          const onSuccess = vi.fn();
          const onClose = vi.fn();

          const { container, unmount } = render(
            <EditarCorrespondencia
              id={correspondenciaBase.id}
              onSuccess={onSuccess}
              onClose={onClose}
            />
          );

          // Wait for both useEffects (getCorrespondenciaById + usuariosCorrespondencia)
          await waitForEffects(5);

          // Spinner should be gone
          expect(container.querySelector('[role="progressbar"]')).toBeNull();

          const inputAsunto = getInputByName(container, 'asunto');
          fireEvent.change(inputAsunto, { target: { value: asunto } });

          const form = container.querySelector('form');
          await act(async () => {
            fireEvent.submit(form);
            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();
          });

          await assertOnSuccessCalledImmediately(onSuccess);

          unmount();
          vi.mocked(updateCorrespondenciaById).mockClear();
          vi.mocked(getCorrespondenciaById).mockClear();
          vi.mocked(usuariosCorrespondencia).mockClear();
          onSuccess.mockClear();
        }
      ),
      { numRuns: 20, verbose: false }
    );
  });

  // ── Tests de ejemplo concretos (smoke) ───────────────────────────────────────

  it('[ejemplo] CreateMemoria llama onSuccess sin setTimeout', async () => {
    const onSuccess = vi.fn();

    const { container } = render(
      <CreateMemoria onSuccess={onSuccess} onClose={vi.fn()} />
    );

    const inputTitulo = getInputByName(container, 'titulo');
    fireEvent.change(inputTitulo, { target: { name: 'titulo', value: 'Memoria Anual 2024' } });

    const form = container.querySelector('form');
    await act(async () => {
      fireEvent.submit(form);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Avanzar 0ms: onSuccess ya debe haberse llamado (no usa setTimeout)
    act(() => { vi.advanceTimersByTime(0); });
    expect(onSuccess).toHaveBeenCalledTimes(1);

    // Confirmar que no depende de setTimeout: avanzar 5000ms no produce más llamadas
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('[ejemplo] EditMemoria llama onSuccess sin setTimeout', async () => {
    const onSuccess = vi.fn();

    const { container } = render(
      <EditMemoria
        memoria={memoriaBase}
        onSuccess={onSuccess}
        onClose={vi.fn()}
      />
    );

    const inputTitulo = getInputByName(container, 'titulo');
    fireEvent.change(inputTitulo, { target: { name: 'titulo', value: 'Memoria Editada' } });

    const form = container.querySelector('form');
    await act(async () => {
      fireEvent.submit(form);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => { vi.advanceTimersByTime(0); });
    expect(onSuccess).toHaveBeenCalledTimes(1);

    act(() => { vi.advanceTimersByTime(5000); });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('[ejemplo] CreateActInstitucional llama onSuccess sin setTimeout', async () => {
    const onSuccess = vi.fn();

    const { container } = render(
      <CreateActInstitucional onSuccess={onSuccess} onClose={vi.fn()} />
    );

    const inputNombre = getInputByName(container, 'nombre');
    fireEvent.change(inputNombre, { target: { value: 'Conferencia 2024' } });

    const inputFecha = getInputByName(container, 'fecha_programada');
    fireEvent.change(inputFecha, { target: { value: '2025-06-15' } });

    const selectTipo = getInputByName(container, 'tipo');
    fireEvent.change(selectTipo, { target: { value: 'Conferencia' } });

    const selectEstado = getInputByName(container, 'estado');
    fireEvent.change(selectEstado, { target: { value: 'EN_INSCRIPCION' } });

    const form = container.querySelector('form');
    await act(async () => {
      fireEvent.submit(form);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => { vi.advanceTimersByTime(0); });
    expect(onSuccess).toHaveBeenCalledTimes(1);

    act(() => { vi.advanceTimersByTime(5000); });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
