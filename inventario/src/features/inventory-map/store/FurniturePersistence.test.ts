import { beforeEach, expect, it, vi } from 'vitest';
import { inventoryApi } from '@/lib/inventory-api';
import { useInventoryStore } from './useInventoryStore';

vi.mock('@/lib/inventory-api', () => ({
  inventoryApi: {
    getLayout: vi.fn(),
    saveLayout: vi.fn(),
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  useInventoryStore.setState({
    spaces: [{ id: '10', name: 'Reconhecimento', type: 'SECTOR', order: 0 }],
  });
});

it('saves station and furniture patrimony as independent links', async () => {
  vi.mocked(inventoryApi.saveLayout).mockResolvedValue({} as never);

  await useInventoryStore.getState().saveFurniture('10', [{
    id: 'armario-painel',
    kind: 'asset',
    x: 100,
    y: 200,
    width: 220,
    height: 65,
    rotation: 0,
    assetKey: 'armario-baixo-longo.png',
    assetCrop: { x: 1, y: 2, width: 3, height: 4, sourceWidth: 10, sourceHeight: 10 },
    stationId: '55',
    assetId: '1949',
  }]);

  expect(inventoryApi.saveLayout).toHaveBeenCalledWith('10', expect.objectContaining({
    elements: [expect.objectContaining({
      id: 'armario-painel',
      stationId: '55',
      metadata: expect.objectContaining({
        stationId: '55', assetId: '1949',
        assetCrop: { x: 1, y: 2, width: 3, height: 4, sourceWidth: 10, sourceHeight: 10 },
      }),
    })],
  }));
});

it('restores both links when the map is reopened', async () => {
  vi.mocked(inventoryApi.getLayout).mockResolvedValue({
    id: '1', name: 'Reconhecimento', code: 'ENV-10', width: 2000, height: 1400, spaceId: 10,
    elements: [{
      id: 'armario-painel', elementType: 'ROOM_BLOCK', layer: 'furniture',
      x: 100, y: 200, width: 220, height: 65, rotation: 0, zIndex: 0,
      stationId: '55', metadata: { kind: 'asset', assetId: '1949', assetKey: 'armario-baixo-longo.png' },
    }],
  });

  const items = await useInventoryStore.getState().loadFurniture('10');

  expect(items).toEqual([expect.objectContaining({
    id: 'armario-painel', stationId: '55', assetId: '1949', kind: 'asset',
  })]);
});
