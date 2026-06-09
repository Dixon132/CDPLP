// Prueba trivial para validar la configuración de vitest y que el cliente API
// del feature `gds` apunta al backend autónomo mediante `VITE_GDS_API_URL`.
import { describe, it, expect } from 'vitest';
import gdsApiClient, {
  GDS_API_URL,
  GDS_API_PREFIX,
} from './client.js';

describe('cliente API del feature gds (configuración)', () => {
  it('resuelve una URL base de cadena no vacía desde VITE_GDS_API_URL', () => {
    expect(typeof GDS_API_URL).toBe('string');
    expect(GDS_API_URL.length).toBeGreaterThan(0);
  });

  it('expone una instancia de axios cuya baseURL apunta al prefijo /api/gds del servicio autónomo', () => {
    expect(gdsApiClient).toBeDefined();
    expect(gdsApiClient.defaults.baseURL).toBe(`${GDS_API_URL}${GDS_API_PREFIX}`);
    expect(gdsApiClient.defaults.baseURL).toContain(GDS_API_PREFIX);
  });
});
