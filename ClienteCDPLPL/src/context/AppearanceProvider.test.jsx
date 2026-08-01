// La apariencia se guarda en localStorage; el DashboardLayout es quien la
// aplica al DOM (en su contenedor `.dashboard-shell`, no en <html>). Estas
// pruebas cubren la mecánica del provider: preferencia inicial, persistencia,
// alternar, restablecer y sincronización entre pestañas.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppearanceProvider, useAppearance, TEMAS, FUENTES } from './AppearanceProvider';

const CLAVE = 'cdplp_apariencia';

function Sonda() {
    const { tema, fuente, setTema, setFuente, alternarTema, restablecer } = useAppearance();
    return (
        <div>
            <span data-testid="estado">{tema}/{fuente}</span>
            <button onClick={() => setTema('durazno')}>durazno</button>
            <button onClick={() => setFuente('institucional')}>institucional</button>
            <button onClick={alternarTema}>alternar</button>
            <button onClick={restablecer}>restablecer</button>
        </div>
    );
}

const montar = () => render(<AppearanceProvider><Sonda /></AppearanceProvider>);

describe('Apariencia', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    it('arranca en claro + moderna, que es el aspecto por defecto', () => {
        montar();
        expect(screen.getByTestId('estado')).toHaveTextContent('claro/moderna');
    });

    it('no toca <html>: los data-* los aplica el DashboardLayout', () => {
        montar();
        expect(document.documentElement.dataset.theme).toBeUndefined();
        expect(document.documentElement.dataset.font).toBeUndefined();
    });

    it('persiste el tema en localStorage', async () => {
        const user = userEvent.setup();
        montar();
        await user.click(screen.getByText('durazno'));
        expect(JSON.parse(localStorage.getItem(CLAVE)).tema).toBe('durazno');
    });

    it('la tipografía es independiente del tema', async () => {
        const user = userEvent.setup();
        montar();
        await user.click(screen.getByText('durazno'));
        await user.click(screen.getByText('institucional'));

        expect(screen.getByTestId('estado')).toHaveTextContent('durazno/institucional');
    });

    it('recupera la preferencia guardada al montar', () => {
        localStorage.setItem(CLAVE, JSON.stringify({ tema: 'oscuro', fuente: 'tecnica' }));
        montar();
        expect(screen.getByTestId('estado')).toHaveTextContent('oscuro/tecnica');
    });

    it('ignora valores corruptos y cae a los de por defecto', () => {
        localStorage.setItem(CLAVE, '{ esto no es json');
        montar();
        expect(screen.getByTestId('estado')).toHaveTextContent('claro/moderna');
    });

    it('descarta un tema desconocido guardado a mano', () => {
        localStorage.setItem(CLAVE, JSON.stringify({ tema: 'neon', fuente: 'comic' }));
        montar();
        expect(screen.getByTestId('estado')).toHaveTextContent('claro/moderna');
    });

    it('alternar va de claro a oscuro y vuelve', async () => {
        const user = userEvent.setup();
        montar();
        await user.click(screen.getByText('alternar'));
        expect(screen.getByTestId('estado')).toHaveTextContent('oscuro/moderna');
        await user.click(screen.getByText('alternar'));
        expect(screen.getByTestId('estado')).toHaveTextContent('claro/moderna');
    });

    it('restablecer vuelve al aspecto original', async () => {
        const user = userEvent.setup();
        montar();
        await user.click(screen.getByText('durazno'));
        await user.click(screen.getByText('institucional'));
        await user.click(screen.getByText('restablecer'));

        expect(screen.getByTestId('estado')).toHaveTextContent('claro/moderna');
    });

    it('se sincroniza entre pestañas', async () => {
        montar();
        localStorage.setItem(CLAVE, JSON.stringify({ tema: 'oscuro', fuente: 'redonda' }));
        await act(async () => {
            window.dispatchEvent(new StorageEvent('storage', { key: CLAVE }));
        });
        expect(screen.getByTestId('estado')).toHaveTextContent('oscuro/redonda');
    });

    it('ofrece 3 temas y 4 tipografías', () => {
        expect(TEMAS.map((t) => t.id)).toEqual(['claro', 'oscuro', 'durazno']);
        expect(FUENTES).toHaveLength(4);
    });
});
