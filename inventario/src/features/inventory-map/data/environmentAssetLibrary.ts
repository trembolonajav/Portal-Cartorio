import type { FurnitureKind } from '../types/inventoryMap.types';

export interface EnvironmentPaletteItem {
  id: string;
  kind: FurnitureKind;
  label: string;
  w: number;
  h: number;
  assetKey?: string;
}

export const BASIC_ENVIRONMENT_ITEMS: EnvironmentPaletteItem[] = [
  { id: 'wall', kind: 'wall', label: 'Parede de planta', w: 240, h: 8 },
  { id: 'door-left', kind: 'door-left', label: 'Porta esquerda', w: 100, h: 100 },
  { id: 'door-right', kind: 'door-right', label: 'Porta direita', w: 100, h: 100 },
  { id: 'partition', kind: 'partition', label: 'Divisória', w: 180, h: 10 },
  { id: 'cabinet', kind: 'cabinet', label: 'Armário', w: 150, h: 46 },
  { id: 'meeting', kind: 'meeting', label: 'Mesa reunião', w: 200, h: 130 },
  { id: 'printer', kind: 'printer', label: 'Impressora', w: 46, h: 40 },
  { id: 'mfp', kind: 'mfp', label: 'Multifuncional', w: 60, h: 56 },
  { id: 'phone', kind: 'phone', label: 'Telefone', w: 30, h: 28 },
  { id: 'label', kind: 'label', label: 'Rótulo', w: 140, h: 26 },
];

export const CUSTOM_FURNITURE_ITEMS: EnvironmentPaletteItem[] = [
  { id: 'gaveteiro-largo', kind: 'asset', label: 'Gaveteiro largo', w: 160, h: 120, assetKey: 'gaveteiro-largo.png' },
  { id: 'armario-baixo-longo', kind: 'asset', label: 'Armário baixo longo', w: 220, h: 65, assetKey: 'armario-baixo-longo.png' },
  { id: 'gaveteiro-estreito', kind: 'asset', label: 'Gaveteiro estreito', w: 90, h: 124, assetKey: 'gaveteiro-estreito.png' },
];

// Dimensões dos recortes originais. A escala única preserva a proporção relativa
// entre retas, cantos, curvas, junções e acabamentos do pack.
const WALL_MODULE_SOURCE_SIZES: [number, number][] = [
  [77, 445], [229, 83], [77, 368], [77, 295], [344, 87], [79, 219],
  [517, 89], [76, 144], [783, 84], [77, 118], [67, 90], [69, 83],
  [115, 72], [110, 72], [124, 127], [143, 122], [127, 130], [125, 129],
  [116, 125], [125, 120], [126, 120], [114, 120], [190, 183], [183, 129],
  [125, 174], [134, 134], [139, 142], [133, 136], [125, 132], [207, 125],
  [331, 76], [345, 73], [239, 44], [336, 44], [487, 42], [168, 42],
];

export const WALL_MODULE_ITEMS: EnvironmentPaletteItem[] = WALL_MODULE_SOURCE_SIZES.map(([width, height], index) => {
  const number = String(index + 1).padStart(2, '0');
  return {
    id: `parede-modular-${number}`,
    kind: 'wall-module',
    label: `Módulo de parede ${number}`,
    w: Math.max(12, Math.round(width * 0.3)),
    h: Math.max(12, Math.round(height * 0.3)),
    assetKey: `parede-modular-${number}.png`,
  };
});
