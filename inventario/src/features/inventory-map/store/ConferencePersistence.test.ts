import { beforeEach, expect, it, vi } from 'vitest';
import { useInventoryStore } from './useInventoryStore';
import { inventoryApi } from '@/lib/inventory-api';
import { toast } from 'sonner';

vi.mock('@/lib/inventory-api', () => ({ inventoryApi: { recordCheck: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { warning: vi.fn() } }));
beforeEach(() => {
  vi.resetAllMocks();
  useInventoryStore.setState({ assets: [{ id: '1', assetCode: 'P001', description: 'Monitor', type: 'Monitor', status: 'ACTIVE' }], refreshAll: vi.fn() });
});

it('keeps the saved result if refreshing the inventory fails after persistence', async () => {
  vi.mocked(inventoryApi.recordCheck).mockResolvedValue({ id: 1, assetId: 1, assetCode: 'P001', assetDescription: 'Monitor', stationId: 2, stationCode: 'A', expectedStationId: 2, expectedStationCode: 'A', result: 'NOT_FOUND', divergenceType: null, note: null, checkedBy: 'maria', checkedAt: '2026-09-11T10:00:00' });
  useInventoryStore.setState({ refreshAll: vi.fn().mockRejectedValue(new Error('offline')) });
  const result = await useInventoryStore.getState().recordCheck('1', { result: 'NOT_FOUND', stationId: '2' });
  expect(result.ok).toBe(true);
  expect(useInventoryStore.getState().assets[0]).toMatchObject({ lastCheckResult: 'NOT_FOUND', lastCheckBy: 'maria', lastCheckAt: '2026-09-11T10:00:00' });
  expect(toast.warning).toHaveBeenCalled();
});

it('does not mark an item as checked when saving fails', async () => {
  vi.mocked(inventoryApi.recordCheck).mockRejectedValue(new Error('Falha ao salvar'));
  expect((await useInventoryStore.getState().recordCheck('1', { result: 'FOUND', stationId: '2' })).ok).toBe(false);
  expect(useInventoryStore.getState().assets[0].lastCheckResult).toBeUndefined();
});
