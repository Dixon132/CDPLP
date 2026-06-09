// Configuración global para las pruebas con Vitest + Testing Library.
// Extiende `expect` con los matchers de jest-dom (toBeInTheDocument, etc.)
// y limpia el DOM renderizado después de cada prueba.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
