import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '@/App';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useInventoryStore } from '@/features/inventory-map/store/useInventoryStore';
import { loginDestination } from '@/lib/login-destination';

const mock = vi.hoisted(() => ({ me: vi.fn() }));
vi.mock('@/lib/inventory-api', async importOriginal => {
  const original = await importOriginal<typeof import('@/lib/inventory-api')>();
  return { ...original, inventoryApi: { ...original.inventoryApi, me: mock.me } };
});
vi.mock('@/pages/ConferenciaPage', () => ({ default: () => <div>Conferência aberta</div> }));
vi.mock('@/pages/ConferenciaEstacaoPage', () => ({ default: () => <div>Estação aberta</div> }));
vi.mock('@/pages/InventoryMapPage', () => ({ default: () => <div>Mapa geral aberto</div> }));

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  document.cookie = 'cart_rio_auth=; Max-Age=0; path=/';
  useAuthStore.setState({ status: 'loading', user: null, error: null });
  useInventoryStore.setState({ init: vi.fn().mockResolvedValue(undefined) });
  mock.me.mockReset().mockResolvedValue({ username: 'teste', role: 'ADMIN', roles: ['ADMIN'], displayRole: 'Administrador' });
});
afterEach(cleanup);

it('returns an administrator to conference immediately after first login', async () => {
  window.history.replaceState({}, '', '/conferencia');
  render(<App />);
  fireEvent.change(await screen.findByPlaceholderText('Seu usuário'), { target: { value: 'teste' } });
  fireEvent.change(screen.getByPlaceholderText('Sua senha'), { target: { value: 'senha-teste' } });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByText('Conferência aberta')).toBeInTheDocument();
  expect(window.location.pathname).toBe('/conferencia');
  expect(screen.queryByText('Mapa geral aberto')).not.toBeInTheDocument();
});

it('retains a station deep link through login', async () => {
  window.history.replaceState({}, '', '/conferencia/estacao/41');
  render(<App />);
  fireEvent.change(await screen.findByPlaceholderText('Seu usuário'), { target: { value: 'teste' } });
  fireEvent.change(screen.getByPlaceholderText('Sua senha'), { target: { value: 'senha-teste' } });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByText('Estação aberta')).toBeInTheDocument();
  expect(window.location.pathname).toBe('/conferencia/estacao/41');
});

it('keeps remembered login on the conference entry point', async () => {
  localStorage.setItem('cart-rio-auth', JSON.stringify({ username: 'teste', token: 'Basic test' }));
  window.history.replaceState({}, '', '/conferencia');
  render(<App />);
  expect(await screen.findByText('Conferência aberta')).toBeInTheDocument();
  expect(screen.queryByPlaceholderText('Sua senha')).not.toBeInTheDocument();
});

it('keeps user and standalone defaults on conference and only accepts local return paths', () => {
  expect(loginDestination(undefined, 'ADMIN', true)).toBe('/conferencia');
  expect(loginDestination('/', 'USER')).toBe('/conferencia');
  expect(loginDestination('//other.example', 'ADMIN')).toBe('/');
  expect(loginDestination('/login', 'ADMIN')).toBe('/');
});
