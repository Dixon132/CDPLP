// Feature: mejoras-dashboard-cdplp, Property 1: Renderizado correcto según props de ConfirmDeleteModal
//
// Valida: Requisitos 1.1, 1.2, 1.3
//
// Propiedad: Para cualquier combinación de confirmLabel (string no-vacío) y
// confirmColor ("red" | "amber" | "emerald"), el botón de confirmación renderizado
// en el paso 2 del modal debe mostrar el label correcto y las clases CSS
// correspondientes al color especificado en el colorMap.

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import * as fc from 'fast-check';

import ConfirmDeleteModal from './ConfirmDeleteModal';

// Mapa de colores definido en el componente (espejado aquí para las aserciones)
const colorMap = {
  red: 'bg-red-600 hover:bg-red-700 text-white',
  amber: 'bg-amber-500 hover:bg-amber-600 text-white',
  emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white',
};

/**
 * El botón de confirmación en el paso 2 siempre tiene la clase base
 * "flex items-center justify-center gap-2" mientras que el botón "Cancelar"
 * tiene "py-4 px-6 font-black" (viene del componente <Button variant="secondary">).
 * Usamos esa distinción para identificar unívocamente el botón de acción.
 */
const CONFIRM_BTN_BASE_CLASS = 'flex items-center justify-center gap-2';

/**
 * Renderiza ConfirmDeleteModal y lo avanza hasta el paso 2.
 * Retorna { container, unmount } para queries aisladas.
 *
 * El componente tiene 2 pasos:
 *  - Paso 1: overlay amber — "Continuar" habilitado tras 2s
 *  - Paso 2: modal con botón coloreable — habilitado tras waitSeconds
 *
 * waitSeconds=1 para minimizar el tiempo de avance en tests.
 */
async function renderEnPaso2(confirmLabel, confirmColor) {
  vi.useFakeTimers();

  const { container, unmount } = render(
    <ConfirmDeleteModal
      isOpen={true}
      onClose={() => { }}
      onConfirm={() => { }}
      message="Mensaje de prueba"
      waitSeconds={1}
      confirmLabel={confirmLabel}
      confirmColor={confirmColor}
    />
  );

  // Avanzar 2.5s para habilitar "Continuar" en paso 1 (countdown de 2s)
  await act(async () => {
    vi.advanceTimersByTime(2500);
  });

  // Clic en Continuar → avanza a paso 2
  const btnContinuar = within(container).getByText('Continuar');
  await act(async () => {
    fireEvent.click(btnContinuar);
  });

  // Avanzar 1.5s para que el countdown de paso 2 (waitSeconds=1) expire
  await act(async () => {
    vi.advanceTimersByTime(1500);
  });

  return { container, unmount };
}

/**
 * Obtiene el botón de confirmación (acción) del paso 2 dentro del container dado.
 * Se distingue del botón Cancelar por su clase base.
 */
function getConfirmButton(container) {
  const buttons = within(container).getAllByRole('button');
  return buttons.find(btn => btn.className.includes(CONFIRM_BTN_BASE_CLASS));
}

describe('ConfirmDeleteModal — Propiedad 1: Renderizado correcto según props', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra label y clases de color correctos para cualquier combinación válida (property test)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          confirmLabel: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          confirmColor: fc.constantFrom('red', 'amber', 'emerald'),
        }),
        async ({ confirmLabel, confirmColor }) => {
          const { container, unmount } = await renderEnPaso2(confirmLabel, confirmColor);

          // Obtener el botón de confirmación por su clase base distintiva
          const confirmBtn = getConfirmButton(container);
          expect(confirmBtn).toBeTruthy();

          // El label debe aparecer en el texto del botón
          expect(confirmBtn.textContent).toContain(confirmLabel);

          // Las clases del colorMap para el color dado deben estar aplicadas
          const expectedClasses = colorMap[confirmColor];
          expectedClasses.split(' ').forEach((cls) => {
            expect(confirmBtn.className).toContain(cls);
          });

          // No debe estar en estado deshabilitado (countdown expiró)
          expect(confirmBtn).not.toBeDisabled();
          expect(confirmBtn.className).not.toContain('cursor-not-allowed');

          unmount();
          vi.useRealTimers();
        }
      ),
      { numRuns: 50, verbose: false }
    );
  });

  // ── Tests de ejemplo concretos ──────────────────────────────────────────

  it('usa clases rojas (default) con confirmColor="red"', async () => {
    const { container, unmount } = await renderEnPaso2('Eliminar', 'red');

    const btn = getConfirmButton(container);
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('Eliminar');
    colorMap.red.split(' ').forEach((cls) => {
      expect(btn.className).toContain(cls);
    });

    unmount();
  });

  it('aplica clases emerald cuando confirmColor="emerald"', async () => {
    const { container, unmount } = await renderEnPaso2('Activar', 'emerald');

    const btn = getConfirmButton(container);
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('Activar');
    colorMap.emerald.split(' ').forEach((cls) => {
      expect(btn.className).toContain(cls);
    });

    unmount();
  });

  it('aplica clases amber cuando confirmColor="amber"', async () => {
    const { container, unmount } = await renderEnPaso2('Desactivar', 'amber');

    const btn = getConfirmButton(container);
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('Desactivar');
    colorMap.amber.split(' ').forEach((cls) => {
      expect(btn.className).toContain(cls);
    });

    unmount();
  });

  it('el botón de confirmación está deshabilitado mientras el countdown del paso 2 no expira', async () => {
    vi.useFakeTimers();

    const { container, unmount } = render(
      <ConfirmDeleteModal
        isOpen={true}
        onClose={() => { }}
        onConfirm={() => { }}
        confirmLabel="Eliminar"
        waitSeconds={5}
      />
    );

    // Avanzar el paso 1
    await act(async () => { vi.advanceTimersByTime(2500); });
    fireEvent.click(within(container).getByText('Continuar'));

    // Paso 2 recién iniciado: countdown aún no ha expirado
    const btn = getConfirmButton(container);
    expect(btn).toBeDisabled();
    expect(btn.className).toContain('cursor-not-allowed');
    expect(btn.className).not.toContain('bg-red-600');

    unmount();
  });

  it('no renderiza nada cuando isOpen=false', () => {
    render(
      <ConfirmDeleteModal
        isOpen={false}
        onClose={() => { }}
        onConfirm={() => { }}
      />
    );

    expect(screen.queryByText('Confirmar acción')).not.toBeInTheDocument();
    expect(screen.queryByText('¿Estás completamente seguro?')).not.toBeInTheDocument();
  });
});
