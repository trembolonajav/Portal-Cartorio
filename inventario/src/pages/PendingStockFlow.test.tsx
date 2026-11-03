import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import ConferenciaEstoquePage from '@/pages/ConferenciaEstoquePage';
import ConferenciasPage from '@/pages/ConferenciasPage';

const mock = vi.hoisted(() => ({
  listUnregisteredStockItems: vi.fn(),
  createUnregisteredStockItem: vi.fn(),
  uploadUnregisteredStockItemPhoto: vi.fn(),
  resolveUnregisteredStockItem: vi.fn(),
  conferenceChecks: vi.fn(),
  conferenceAllFinalizations: vi.fn(),
  stockChecks: vi.fn(),
  stockFinalizations: vi.fn(),
}));

vi.mock('@/lib/inventory-api', async importOriginal => {
  const original = await importOriginal<typeof import('@/lib/inventory-api')>();
  return { ...original, inventoryApi: { ...original.inventoryApi, ...mock } };
});
vi.mock('@/components/layout/AppShell', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/AuthImage', () => ({ AuthImage: ({ alt }: { alt: string }) => <img alt={alt} /> }));

const pending = {
  id: 7, provisionalCode: 'PEND-00007', type: 'Teclado', description: 'Teclado USB preto',
  manufacturer: null, model: null, serialNumber: null, notes: null,
  conditionGrade: 'FAIR', functionalStatus: 'WORKING', conditionNotes: 'Teclas ok',
  status: 'PENDING', registeredAssetId: null, registeredAssetCode: null,
  foundBy: 'estagiario', foundAt: '2026-11-03T22:01:31', resolvedBy: null, resolvedAt: null, photos: [],
};

const setRole = (role: 'ADMIN' | 'USER') =>
  useAuthStore.setState({ status: 'authenticated', error: null, user: { username: 'teste', role, roles: [role], displayRole: role } });

const renderStock = () => render(
  <MemoryRouter initialEntries={['/conferencia/estoque']}>
    <Routes>
      <Route path="/conferencia/estoque" element={<ConferenciaEstoquePage />} />
      <Route path="/conferencias" element={<div>Tela de conferências</div>} />
    </Routes>
  </MemoryRouter>,
);

const submitNewItem = async (container: HTMLElement) => {
  fireEvent.click(await screen.findByRole('button', { name: /Item sem cadastro/ }));
  fireEvent.change(await screen.findByPlaceholderText('Teclado USB preto'), { target: { value: 'Teclado novo' } });
  fireEvent.change(screen.getByPlaceholderText(/todas as teclas funcionam/), { target: { value: 'Testado' } });
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [new File(['x'], 'foto.jpg', { type: 'image/jpeg' })] } });
  fireEvent.click(await screen.findByRole('button', { name: /Salvar pendente/ }));
};

beforeEach(() => {
  Object.values(mock).forEach(fn => fn.mockReset());
  URL.createObjectURL = vi.fn(() => 'blob:foto');
  mock.listUnregisteredStockItems.mockResolvedValue([pending]);
  mock.createUnregisteredStockItem.mockResolvedValue(pending);
  mock.uploadUnregisteredStockItemPhoto.mockResolvedValue({});
  mock.resolveUnregisteredStockItem.mockResolvedValue({ ...pending, status: 'REGISTERED' });
  mock.conferenceChecks.mockResolvedValue([]);
  mock.conferenceAllFinalizations.mockResolvedValue([]);
  mock.stockChecks.mockResolvedValue([]);
  mock.stockFinalizations.mockResolvedValue([]);
  setRole('ADMIN');
});
afterEach(cleanup);

it('does not list or manage pending items on the stock conference screen', async () => {
  renderStock();
  expect(await screen.findByRole('button', { name: /Item sem cadastro/ })).toBeInTheDocument();
  await waitFor(() => expect(mock.stockChecks).toHaveBeenCalled());
  expect(screen.queryByText(/PEND-00007/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Vincular cadastro/ })).not.toBeInTheDocument();
  expect(mock.listUnregisteredStockItems).not.toHaveBeenCalled();
});

it('sends an administrator to the conferences screen after saving', async () => {
  const { container } = renderStock();
  await submitNewItem(container);
  expect(await screen.findByText('Tela de conferências')).toBeInTheDocument();
  expect(mock.uploadUnregisteredStockItemPhoto).toHaveBeenCalledTimes(1);
});

it('keeps the intern on the stock screen after saving', async () => {
  setRole('USER');
  const { container } = renderStock();
  await submitNewItem(container);
  await waitFor(() => expect(mock.uploadUnregisteredStockItemPhoto).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.queryByRole('button', { name: /Salvar pendente/ })).not.toBeInTheDocument());
  expect(screen.queryByText('Tela de conferências')).not.toBeInTheDocument();
});

it('does not allow a duplicate when the photo upload fails after creating the item', async () => {
  mock.uploadUnregisteredStockItemPhoto.mockRejectedValue(new Error('falha'));
  const { container } = renderStock();
  await submitNewItem(container);
  await waitFor(() => expect(screen.queryByRole('button', { name: /Salvar pendente/ })).not.toBeInTheDocument());
  expect(mock.createUnregisteredStockItem).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Tela de conferências')).not.toBeInTheDocument();
});

it('opens the pending tab from the link and links the item to its asset', async () => {
  render(<MemoryRouter initialEntries={['/conferencias?tab=pendentes']}><ConferenciasPage /></MemoryRouter>);
  expect(await screen.findByText('PEND-00007')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cadastros pendentes · 1' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Vincular cadastro/ }));
  fireEvent.change(await screen.findByPlaceholderText('Ex.: 2041'), { target: { value: '2041' } });
  mock.listUnregisteredStockItems.mockResolvedValue([{ ...pending, status: 'REGISTERED', registeredAssetCode: '2041' }]);
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar vínculo' }));
  await waitFor(() => expect(mock.resolveUnregisteredStockItem).toHaveBeenCalledWith(7, '2041'));
  expect(await screen.findByText('Nenhum cadastro pendente.')).toBeInTheDocument();
  expect(screen.getByText(/Já vinculados · 1/)).toBeInTheDocument();
});
