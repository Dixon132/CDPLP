// Pruebas del componente `PanelModoEjecucion` (control de `Modo_Ejecucion`,
// Req. 32). Verifican el render, la selección de modo (mostrar el intervalo en
// Tiempo_Real), el disparo de las acciones contra la API (mockeada), las reglas
// de habilitación de botones según estado y la degradación con elegancia.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import PanelModoEjecucion from './PanelModoEjecucion';
import * as ejecucionApi from '../api/ejecucionApi';

vi.mock('../api/ejecucionApi', async (importActual) => {
    const actual = await (importActual as () => Promise<Record<string, unknown>>)();
    return {
        ...actual,
        seleccionarModo: vi.fn(),
        avanzar: vi.fn(),
        pausar: vi.fn(),
        reanudar: vi.fn(),
    };
});

const seleccionarModoMock = vi.mocked(ejecucionApi.seleccionarModo);
const avanzarMock = vi.mocked(ejecucionApi.avanzar);
const pausarMock = vi.mocked(ejecucionApi.pausar);

function renderPanel(props: Parameters<typeof PanelModoEjecucion>[0] = {}) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const Wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return render(<PanelModoEjecucion {...props} />, { wrapper: Wrapper });
}

describe('PanelModoEjecucion (Req. 32)', () => {
    beforeEach(() => {
        seleccionarModoMock.mockReset();
        avanzarMock.mockReset();
        pausarMock.mockReset();
    });
    afterEach(() => vi.clearAllMocks());

    it('muestra aviso y deshabilita acciones sin análisis seleccionado', () => {
        renderPanel({});
        expect(screen.getByText(/selecciona un análisis/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /aplicar modo/i })).toBeDisabled();
    });

    it('ofrece los tres modos de ejecución (Req. 32.1)', () => {
        renderPanel({ analisis: { id: 'a1', modo: 'MANUAL', estado: 'DETENIDO' } });
        expect(screen.getByText('Automático')).toBeInTheDocument();
        expect(screen.getByText('Manual')).toBeInTheDocument();
        expect(screen.getByText('Tiempo real')).toBeInTheDocument();
    });

    it('muestra el campo de intervalo solo en Tiempo_Real (Req. 32.5)', async () => {
        const user = userEvent.setup();
        renderPanel({ analisis: { id: 'a1', modo: 'MANUAL', estado: 'DETENIDO' } });

        expect(screen.queryByLabelText(/intervalo por semana simulada/i)).not.toBeInTheDocument();

        await user.click(screen.getByRole('radio', { name: /tiempo real/i }));
        expect(screen.getByLabelText(/intervalo por semana simulada/i)).toBeInTheDocument();
    });

    it('aplica el modo seleccionado llamando a la API y notifica onCambio', async () => {
        const user = userEvent.setup();
        seleccionarModoMock.mockResolvedValue({ ok: true, data: null });
        const onCambio = vi.fn();

        renderPanel({ analisis: { id: 'a1', modo: 'MANUAL', estado: 'DETENIDO' }, onCambio });

        await user.click(screen.getByRole('button', { name: /aplicar modo/i }));

        await waitFor(() => expect(seleccionarModoMock).toHaveBeenCalledWith('a1', 'MANUAL', expect.any(Number)));
        expect(onCambio).toHaveBeenCalledWith(expect.objectContaining({ accion: 'modo' }));
        expect(await screen.findByRole('status')).toHaveTextContent(/modo de ejecución actualizado/i);
    });

    it('avanza en modo Manual (Req. 32.2)', async () => {
        const user = userEvent.setup();
        avanzarMock.mockResolvedValue({
            ok: true,
            data: { analisisId: 'a1', modoEjecucion: 'MANUAL', estadoEjecucion: 'DETENIDO', encolados: [] },
        });

        renderPanel({ analisis: { id: 'a1', modo: 'MANUAL', estado: 'DETENIDO' } });

        await user.click(screen.getByRole('button', { name: /avanzar semana/i }));
        await waitFor(() => expect(avanzarMock).toHaveBeenCalledWith('a1'));
    });

    it('habilita Pausar solo en modo continuo en ejecución (Req. 32.6)', async () => {
        const user = userEvent.setup();
        pausarMock.mockResolvedValue({ ok: true, data: null });

        renderPanel({ analisis: { id: 'a1', modo: 'AUTOMATICO', estado: 'EN_EJECUCION' } });

        const pausarBtn = screen.getByRole('button', { name: /pausar/i });
        expect(pausarBtn).toBeEnabled();
        // Avanzar/Iniciar está deshabilitado mientras está EN_EJECUCION.
        expect(screen.getByRole('button', { name: /iniciar/i })).toBeDisabled();

        await user.click(pausarBtn);
        await waitFor(() => expect(pausarMock).toHaveBeenCalledWith('a1'));
    });

    it('habilita Reanudar solo cuando está pausado (Req. 32.8)', () => {
        renderPanel({ analisis: { id: 'a1', modo: 'TIEMPO_REAL', estado: 'PAUSADO' } });
        expect(screen.getByRole('button', { name: /reanudar/i })).toBeEnabled();
        expect(screen.getByRole('button', { name: /pausar/i })).toBeDisabled();
    });

    it('degrada con elegancia cuando el endpoint no está disponible', async () => {
        const user = userEvent.setup();
        seleccionarModoMock.mockResolvedValue({ ok: false, noDisponible: true });

        renderPanel({ analisis: { id: 'a1', modo: 'MANUAL', estado: 'DETENIDO' } });

        await user.click(screen.getByRole('button', { name: /aplicar modo/i }));
        expect(await screen.findByRole('status')).toHaveTextContent(/aún no está disponible/i);
    });
});
