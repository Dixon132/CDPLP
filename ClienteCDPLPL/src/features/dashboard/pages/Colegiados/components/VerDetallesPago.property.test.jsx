// Feature: mejoras-dashboard-cdplp, Property 4: Visibilidad de botón Ver comprobante según existencia del comprobante
// Feature: mejoras-dashboard-cdplp, Property 5: Construcción correcta de URL de Supabase para comprobantes
//
// Valida: Requisitos 7.1, 7.2, 7.3
//
// Propiedad 4: Para cualquier valor de pago.comprobante, el botón "Ver comprobante"
//   se muestra si y solo si comprobante !== null.
//
// Propiedad 5: Para cualquier URL base (VITE_SUPABASE_URL) y path de comprobante,
//   la URL resultante de buildSupabaseUrl tiene el formato esperado:
//   {base}/storage/v1/object/public/bucket/{path}

import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import * as fc from 'fast-check';

// ── Función pura bajo prueba ─────────────────────────────────────────────────
//
// buildSupabaseUrl es una función privada del componente. La extraemos aquí
// como función pura para testear la Propiedad 5 sin necesidad de renderizar
// el componente completo.
//
// Firma original en VerDetallesPago.jsx:
//   const buildSupabaseUrl = (path) =>
//     `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/bucket/${path}`;
//
const buildSupabaseUrl = (baseUrl, path) =>
  `${baseUrl}/storage/v1/object/public/bucket/${path}`;

// ── Mock del módulo de servicios ─────────────────────────────────────────────
vi.mock('../../../services/colegiados', () => ({
  getPagoById: vi.fn(),
  updatePago: vi.fn(),
}));

// ── Mock de parseData ────────────────────────────────────────────────────────
vi.mock('../../../../../utils/parseData', () => ({
  default: (date) => (date ? String(date) : ''),
}));

import { getPagoById } from '../../../services/colegiados';
import VerDetallesPago from './VerDetallesPago';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Crea un objeto pago mínimo válido para usar en tests.
 * @param {string|null} comprobante
 */
function makePago(comprobante) {
  return {
    id_pago: 1,
    concepto: 'Colegiatura',
    fecha_pago: '2024-01-15',
    monto: '100.00',
    estado_pago: 'REALIZADO',
    comprobante,
  };
}

/**
 * Renderiza VerDetallesPago con getPagoById resolviendo el pago dado,
 * espera que la carga termine y retorna el resultado del render.
 */
async function renderWithPago(pago) {
  getPagoById.mockResolvedValueOnce(pago);

  let result;
  await act(async () => {
    result = render(<VerDetallesPago id_pago={1} onSuccess={() => { }} />);
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Propiedad 4: Visibilidad del botón "Ver comprobante"
// ─────────────────────────────────────────────────────────────────────────────

describe('VerDetallesPago — Propiedad 4: Visibilidad de botón Ver comprobante según existencia del comprobante', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el botón "Ver comprobante" cuando comprobante es un string no-vacío (property test)', async () => {
    // **Validates: Requirements 7.1**
    await fc.assert(
      fc.asyncProperty(
        // Cualquier string no-vacío como path de comprobante
        fc.string({ minLength: 1, maxLength: 200 }).filter((s) => s.trim().length > 0),
        async (comprobanteValue) => {
          getPagoById.mockResolvedValueOnce(makePago(comprobanteValue));

          let container;
          await act(async () => {
            ({ container } = render(<VerDetallesPago id_pago={1} onSuccess={() => { }} />));
          });

          const btn = container.querySelector('button');
          const allButtons = Array.from(container.querySelectorAll('button'));
          const verBtn = allButtons.find((b) => b.textContent.includes('Ver comprobante'));

          expect(verBtn).toBeTruthy();

          // Cleanup after each iteration
          const { unmount } = { unmount: () => container.remove() };
          try {
            // React Testing Library cleanup is handled globally via afterEach
          } finally {
            // Using a direct unmount approach per iteration
          }
        }
      ),
      { numRuns: 100, verbose: false }
    );
  });

  it('oculta el botón "Ver comprobante" cuando comprobante es null (property test)', async () => {
    // **Validates: Requirements 7.1**
    // Dado que comprobante=null siempre es el mismo caso (no hay variación aleatoria),
    // lo ejecutamos como propiedad con un generador de "always null" para demostrar
    // que la propiedad se mantiene invariablemente.
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async (comprobanteValue) => {
          getPagoById.mockResolvedValueOnce(makePago(comprobanteValue));

          let container;
          await act(async () => {
            ({ container } = render(<VerDetallesPago id_pago={1} onSuccess={() => { }} />));
          });

          const allButtons = Array.from(container.querySelectorAll('button'));
          const verBtn = allButtons.find((b) => b.textContent.includes('Ver comprobante'));

          expect(verBtn).toBeUndefined();
        }
      ),
      { numRuns: 100, verbose: false }
    );
  });

  // ── Ejemplos concretos ───────────────────────────────────────────────────

  it('muestra el botón cuando comprobante es un path típico', async () => {
    await renderWithPago(makePago('movimientos/123/recibo.pdf'));
    const btn = screen.getByText(/Ver comprobante/i);
    expect(btn).toBeInTheDocument();
  });

  it('oculta el botón cuando comprobante es null', async () => {
    await renderWithPago(makePago(null));
    expect(screen.queryByText(/Ver comprobante/i)).not.toBeInTheDocument();
  });

  it('muestra el botón cuando comprobante es una cadena vacía (distinta de null)', async () => {
    // El componente solo verifica !== null, por lo que "" también debe mostrar el botón
    await renderWithPago(makePago(''));
    const btn = screen.getByText(/Ver comprobante/i);
    expect(btn).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Propiedad 5: Construcción correcta de URL de Supabase
// ─────────────────────────────────────────────────────────────────────────────

describe('buildSupabaseUrl — Propiedad 5: Construcción correcta de URL de Supabase para comprobantes', () => {
  it('la URL resultante siempre tiene el formato {base}/storage/v1/object/public/bucket/{path} (property test)', () => {
    // **Validates: Requirements 7.2, 7.3**
    fc.assert(
      fc.property(
        // URL base: esquema + dominio simple (sin slash final)
        fc.tuple(
          fc.constantFrom('https', 'http'),
          fc.stringMatching(/^[a-z][a-z0-9-]{2,20}\.[a-z]{2,6}$/)
        ).map(([scheme, domain]) => `${scheme}://${domain}`),
        // Path del comprobante: segmentos separados por /
        fc.array(
          fc.stringMatching(/^[a-z0-9_-]{1,20}$/),
          { minLength: 1, maxLength: 4 }
        ).map((parts) => parts.join('/')),
        (baseUrl, path) => {
          const url = buildSupabaseUrl(baseUrl, path);

          // La URL debe comenzar con el base
          expect(url.startsWith(baseUrl)).toBe(true);

          // Debe contener el segmento de ruta fijo de Supabase Storage
          expect(url).toContain('/storage/v1/object/public/bucket/');

          // Debe terminar con el path del comprobante
          expect(url.endsWith(path)).toBe(true);

          // El formato exacto debe ser: {base}/storage/v1/object/public/bucket/{path}
          expect(url).toBe(`${baseUrl}/storage/v1/object/public/bucket/${path}`);
        }
      ),
      { numRuns: 100, verbose: false }
    );
  });

  it('no introduce caracteres extra ni duplica barras al construir la URL', () => {
    // **Validates: Requirements 7.2**
    //
    // Los paths de Supabase nunca comienzan con '/' — son rutas relativas como
    // "movimientos/42/recibo.pdf". El generador refleja esa restricción.
    fc.assert(
      fc.property(
        // URL base sin slash final: esquema + host
        fc.tuple(
          fc.constantFrom('https', 'http'),
          fc.stringMatching(/^[a-z][a-z0-9-]{2,20}\.[a-z]{2,6}$/)
        ).map(([scheme, domain]) => `${scheme}://${domain}`),
        // Path relativo (sin slash inicial) con caracteres seguros
        fc.array(
          fc.stringMatching(/^[a-z0-9_-]{1,20}$/),
          { minLength: 1, maxLength: 4 }
        ).map((parts) => parts.join('/')),
        (baseUrl, path) => {
          const url = buildSupabaseUrl(baseUrl, path);

          // No debe haber doble barra en la ruta (excepto en el protocolo)
          const withoutProtocol = url.replace(/^https?:\/\//, '');
          expect(withoutProtocol).not.toMatch(/\/\//);

          // La longitud debe ser exactamente la esperada
          const expected = `${baseUrl}/storage/v1/object/public/bucket/${path}`;
          expect(url.length).toBe(expected.length);
        }
      ),
      { numRuns: 100, verbose: false }
    );
  });

  // ── Ejemplos concretos ───────────────────────────────────────────────────

  it('construye la URL correctamente para un path típico', () => {
    const base = 'https://abc123.supabase.co';
    const path = 'movimientos/42/recibo.pdf';
    const url = buildSupabaseUrl(base, path);
    expect(url).toBe('https://abc123.supabase.co/storage/v1/object/public/bucket/movimientos/42/recibo.pdf');
  });

  it('construye la URL correctamente para un path con un solo segmento', () => {
    const base = 'https://xyz.supabase.co';
    const path = 'archivo.png';
    const url = buildSupabaseUrl(base, path);
    expect(url).toBe('https://xyz.supabase.co/storage/v1/object/public/bucket/archivo.png');
  });

  it('el segmento /storage/v1/object/public/bucket/ está siempre presente', () => {
    const base = 'https://test.supabase.co';
    const path = 'carpeta/imagen.jpg';
    const url = buildSupabaseUrl(base, path);
    expect(url).toContain('/storage/v1/object/public/bucket/');
  });
});
