import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ConferenceHistory } from './ConferenceHistory';
import { inventoryApi } from '@/lib/inventory-api';

vi.mock('@/lib/inventory-api', () => ({ inventoryApi: {
  checkHistory: vi.fn(), stationChecks: vi.fn(), stationHistory: vi.fn(), conferenceFinalizations: vi.fn(),
} }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(inventoryApi.stationHistory).mockResolvedValue([{ type: 'TRANSFERRED', description: 'P001 transferido de A para B · por maria', timestamp: '2026-09-11T10:01:00' }]);
  vi.mocked(inventoryApi.conferenceFinalizations).mockResolvedValue([{ type: 'CONFERENCE_FINALIZED', description: 'Estação finalizada por maria', timestamp: '2026-09-11T10:02:00' }]);
});
afterEach(cleanup);

it('shows saved checks, missing items, original location, author, notes and movements', async () => {
  vi.mocked(inventoryApi.stationChecks).mockResolvedValue([{
    id: 1, assetId: 1, assetCode: 'P001', assetDescription: 'Monitor', stationId: 3, stationCode: 'B', expectedStationId: 2,
    expectedStationCode: 'A', result: 'DIVERGENCE', divergenceType: 'WRONG_LOCATION', note: 'Transferido durante conferência', checkedBy: 'maria', checkedAt: '2026-09-11T10:00:00',
  }, {
    id: 2, assetId: 2, assetCode: 'P002', assetDescription: 'Mouse', stationId: 3, stationCode: 'B', expectedStationId: 3,
    expectedStationCode: 'B', result: 'NOT_FOUND', divergenceType: null, note: null, checkedBy: 'joao', checkedAt: '2026-09-11T09:00:00',
  }]);
  render(<ConferenceHistory stationId="3" movements />);
  expect(await screen.findByText('P001 · Divergência')).toBeInTheDocument();
  expect(screen.getByText('P002 · Não encontrado')).toBeInTheDocument();
  expect(screen.getByText('Local cadastrado antes: A')).toBeInTheDocument();
  expect(screen.getByText('Local errado')).toBeInTheDocument();
  expect(screen.getByText('Transferido durante conferência')).toBeInTheDocument();
  expect(screen.getByText('P001 transferido de A para B · por maria')).toBeInTheDocument();
  expect(screen.getByText('Estação finalizada por maria')).toBeInTheDocument();
  expect(screen.getByText(/11\/09\/2026.*por joao/)).toBeInTheDocument();
});

it('shows a load failure instead of claiming there are no saved checks, and allows retry', async () => {
  vi.mocked(inventoryApi.checkHistory).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
  render(<ConferenceHistory assetId="1" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar');
  expect(screen.queryByText('Nenhum registro de conferência.')).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('Tentar novamente'));
  expect(await screen.findByText('Nenhum registro de conferência.')).toBeInTheDocument();
});
