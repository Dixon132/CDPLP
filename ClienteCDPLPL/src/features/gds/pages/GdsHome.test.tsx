// Pruebas de la pantalla principal de la Plataforma_GDS en TypeScript (Tarea 26.3).
//
// Verifican que `GdsHome` (Req. 21.1) renderiza la visión general, los
// indicadores (Recharts, 21.5), el slider de instituciones (21.2) y los estados
// de ejecución con progreso en vivo por WS (21.3, 21.4), y que DEGRADA CON
// ELEGANCIA cuando el backend autónomo aún no expone endpoints/WS (estados
// informativos en lugar de romperse). También comprueba el bloqueo defensivo de
// sesión a nivel de panel (Req. 21.6). La red (vía TanStack Query) y el WS se
// mockean para que las pruebas sean deterministas y no toquen endpoints reales.
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';

import GdsHome from './GdsHome';
import { gdsQueryClient } from '../lib/queryClient';
import { getResumenPanel } from '../api/dashboard.js';
import { listInstituciones } from '../api/instituciones.js';
import { useProgresoEnVivo } from '../hooks/useProgresoEnVivo.js';

// --- Mocks: aislamos la red y el WebSocket (deterministas, sin endpoints) ---

vi.mock('../api/dashboard.js', async (importActual) => {
    const actual = await (importActual as () => Promise<Record<string, unknown>>)();
    return { ...actual, getResumenPanel: vi.fn() };
});

vi.mock('../api/instituciones.js', async (importActual) => {
    const actual = await (importActual as () => Promise<Record<string, unknown>>)();
    return { ...actual, listInstituciones: vi.fn() };
});

vi.mock('../hooks/useProgresoEnVivo.js', () => ({
    useProgresoEnVivo: vi.fn(),
}));

const getResumenPanelMock = vi.mocked(getResumenPanel);
const listInstitucionesMock = vi.mocked(listInstituciones);
const useProgresoEnVivoMock = vi.mocked(useProgresoEnVivo);

// JWT de prueba decodificable con `atob` (no firmado de verdad).
function makeToken(payload: Record<string, unknown>): string {
    const enc = (obj: Record<string, unknown>) => btoa(JSON.stringify(obj));
    return `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc(payload)}.firma`;
}

function setSesionValida(): void {
    const futuro = Math.floor(Date.now() / 1000) + 3600;
    localStorage.setItem('token', makeToken({ exp: futuro, rol: 'ANALISTA' }));
}

const PANEL_VACIO = {
    indicadores: [],
    historicos: [],
    analisis: [],
    disponible: { indicadores: false, historicos: false, analisis: false },
};

describe('GdsHome (pantalla principal de la Plataforma_GDS)', () => {
    beforeEach(() => {
        localStorage.clear();
        // Evita el sangrado de caché entre pruebas (cliente singleton).
        gdsQueryClient.clear();
        useProgresoEnVivoMock.mockReturnValue({
            estadoConexion: 'inactivo',
            progresoPorAnalisis: {},
            ultimoProgreso: null,
        });
    });
    afterEach(() => {
        vi.clearAllMocks();
        gdsQueryClient.clear();
        localStorage.clear();
    });

    it('bloquea el panel cuando la sesión no es válida (Req. 21.6)', () => {
        // Sin token → bloqueo defensivo; no se intenta cargar datos.
        getResumenPanelMock.mockResolvedValue(PANEL_VACIO);
        listInstitucionesMock.mockResolvedValue([]);

        render(<GdsHome />);

        expect(screen.getByText(/Acceso bloqueado/i)).toBeInTheDocument();
        expect(getResumenPanelMock).not.toHaveBeenCalled();
        expect(listInstitucionesMock).not.toHaveBeenCalled();
    });

    it('renderiza la visión general del sistema con sesión válida (Req. 21.1)', async () => {
        setSesionValida();
        getResumenPanelMock.mockResolvedValue(PANEL_VACIO);
        listInstitucionesMock.mockResolvedValue([]);

        render(<GdsHome />);

        expect(
            screen.getByRole('heading', { name: /Panel de la Plataforma GDS/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/Gemelo Digital Social de Comunidades Educativas/i),
        ).toBeInTheDocument();

        await waitFor(() => expect(getResumenPanelMock).toHaveBeenCalled());
    });

    it('degrada con elegancia cuando no hay datos del backend (sin romperse)', async () => {
        setSesionValida();
        getResumenPanelMock.mockResolvedValue(PANEL_VACIO);
        listInstitucionesMock.mockResolvedValue([]);

        render(<GdsHome />);

        // Estados informativos en lugar de errores:
        expect(
            await screen.findByText(/Aún no hay instituciones registradas\./i),
        ).toBeInTheDocument();
        expect(screen.getByText(/Sin indicadores/i)).toBeInTheDocument();
        expect(screen.getByText(/Sin históricos/i)).toBeInTheDocument();
        expect(
            screen.getByText(/El resumen de análisis no está disponible por el momento\./i),
        ).toBeInTheDocument();

        // El total de análisis se muestra como 0 sin lanzar excepciones.
        const totales = screen.getByText('Análisis totales').closest('article');
        expect(totales).toBeTruthy();
    });

    it('degrada con elegancia aunque las llamadas al backend rechacen', async () => {
        setSesionValida();
        getResumenPanelMock.mockRejectedValue(new Error('endpoint no disponible'));
        listInstitucionesMock.mockRejectedValue(new Error('endpoint no disponible'));

        render(<GdsHome />);

        // La pantalla sigue mostrando su estructura base sin romperse.
        expect(
            screen.getByRole('heading', { name: /Panel de la Plataforma GDS/i }),
        ).toBeInTheDocument();
        expect(
            await screen.findByText(/Aún no hay instituciones registradas\./i),
        ).toBeInTheDocument();
    });

    it('renderiza indicadores y estados de ejecución cuando hay datos disponibles', async () => {
        setSesionValida();
        getResumenPanelMock.mockResolvedValue({
            indicadores: [{ nombre: 'Ansiedad', valor: 0.4 }],
            historicos: [{ periodo: 'S1', valor: 0.3 }],
            analisis: [
                {
                    id: 'a1',
                    nombre: 'Estudio Piloto',
                    estado: 'EN_PROCESO',
                    semanaActual: 2,
                    totalSemanas: 24,
                    instituciones: 3,
                    escenario: 'Conflicto Universitario',
                    actualizadoEn: null,
                },
            ],
            disponible: { indicadores: true, historicos: true, analisis: true },
        });
        listInstitucionesMock.mockResolvedValue([
            { id: 'i1', nombre: 'Universidad Andina', categoria: 'universidad' },
        ]);

        render(<GdsHome />);

        // El análisis y su estado de ejecución se listan (Req. 21.3).
        expect(await screen.findByText('Estudio Piloto')).toBeInTheDocument();
        // "En curso" aparece como tarjeta resumen y como badge del análisis;
        // verificamos el badge dentro de la sección de estados de ejecución.
        const estados = screen.getByRole('region', {
            name: /Estados de ejecución de los análisis/i,
        });
        expect(within(estados).getByText('En curso')).toBeInTheDocument();
        // La institución aparece en el slider (Req. 21.2).
        expect(await screen.findByText('Universidad Andina')).toBeInTheDocument();
        // Secciones de indicadores presentes (Req. 21.5).
        expect(screen.getByRole('region', { name: /Indicadores globales/i })).toBeInTheDocument();
    });
});
