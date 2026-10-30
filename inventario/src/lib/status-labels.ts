import type { AssetStatus } from '@/features/inventory-map/types/inventoryMap.types';

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  ACTIVE: 'Ativo',
  IN_STOCK: 'Em estoque',
  INACTIVE: 'Inativo',
  MAINTENANCE: 'Em manutenção',
  DISPOSED: 'Baixado',
  VOIDED: 'Anulado',
};

export const assetStatusLabel = (status: string): string =>
  ASSET_STATUS_LABELS[status as AssetStatus] ?? status;
