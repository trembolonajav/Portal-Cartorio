import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import StationResponsible from './StationResponsible';

const mock = vi.hoisted(() => ({
  role: 'ADMIN',
  state: {
    employees: [{ id: 'person', fullName: 'Pessoa Teste', status: 'ACTIVE', stationId: undefined as string | undefined }],
    stations: [{ id: '1', code: 'EST-1', responsibleEmployeeId: undefined as string | undefined }, { id: '2', code: 'EST-2', responsibleEmployeeId: undefined as string | undefined }],
    departments: [],
    changeStationResponsible: vi.fn(),
  },
}));
vi.mock('@/features/inventory-map/store/useInventoryStore', () => ({ useInventoryStore: () => mock.state }));
vi.mock('@/features/auth/store/useAuthStore', () => ({ useAuthStore: (selector: (s: unknown) => unknown) => selector({ user: { role: mock.role } }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));
beforeEach(() => {
  mock.role = 'ADMIN';
  mock.state.stations.forEach(s => { s.responsibleEmployeeId = undefined; });
  mock.state.employees[0].stationId = undefined;
  mock.state.changeStationResponsible.mockReset().mockResolvedValue(undefined);
});
afterEach(cleanup);

it('assigns a person only after saving', async () => {
  render(<StationResponsible stationId="1" />);
  fireEvent.click(screen.getByRole('button', { name: 'Vincular pessoa' }));
  fireEvent.change(screen.getByLabelText('Funcionário responsável'), { target: { value: 'person' } });
  expect(mock.state.changeStationResponsible).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Salvar responsável' }));
  await waitFor(() => expect(mock.state.changeStationResponsible).toHaveBeenCalledWith('1', 'person', false));
});

it('requires an explicit confirmation to move a person from another station', async () => {
  mock.state.stations[1].responsibleEmployeeId = 'person';
  render(<StationResponsible stationId="1" />);
  fireEvent.click(screen.getByRole('button', { name: 'Vincular pessoa' }));
  fireEvent.change(screen.getByLabelText('Funcionário responsável'), { target: { value: 'person' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar responsável' }));
  expect(mock.state.changeStationResponsible).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('EST-2');
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar mudança de estação' }));
  await waitFor(() => expect(mock.state.changeStationResponsible).toHaveBeenCalledWith('1', 'person', true));
});

it('removes responsibility without removing the person or station', async () => {
  mock.state.stations[0].responsibleEmployeeId = 'person';
  render(<StationResponsible stationId="1" />);
  fireEvent.click(screen.getByRole('button', { name: 'Alterar' }));
  fireEvent.change(screen.getByLabelText('Funcionário responsável'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar responsável' }));
  await waitFor(() => expect(mock.state.changeStationResponsible).toHaveBeenCalledWith('1', null, false));
});

it('shows responsibility read-only to non-admin users', () => {
  mock.role = 'OPERATOR';
  render(<StationResponsible stationId="1" />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
