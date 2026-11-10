import type { AssetCrop, FurnitureKind } from '../types/inventoryMap.types';

export interface EnvironmentPaletteItem {
  id: string;
  kind: FurnitureKind;
  label: string;
  w: number;
  h: number;
  assetKey?: string;
  assetCrop?: AssetCrop;
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
  { id: 'mesa-reuniao-seis-lugares', kind: 'meeting', label: 'Mesa de reunião — 6 lugares', w: 300, h: 200, assetKey: 'mesa-reuniao-seis-lugares.png' },
  { id: 'mesa-reuniao-tres-lugares', kind: 'meeting', label: 'Mesa oval de reunião — 3 lugares', w: 220, h: 222, assetKey: 'mesa-reuniao-tres-lugares.png', assetCrop: { x: 278, y: 280, width: 694, height: 700, sourceWidth: 1254, sourceHeight: 1254 } },
  { id: 'poltrona-minimalista-topo', kind: 'asset', label: 'Poltrona individual', w: 90, h: 88, assetKey: 'poltrona-minimalista-topo.png', assetCrop: { x: 394, y: 280, width: 602, height: 591, sourceWidth: 1393, sourceHeight: 1129 } },
  { id: 'cadeira-escritorio-topo', kind: 'asset', label: 'Cadeira de escritório', w: 76, h: 100, assetKey: 'cadeira-escritorio-topo.png', assetCrop: { x: 463, y: 260, width: 466, height: 611, sourceWidth: 1393, sourceHeight: 1129 } },
  { id: 'banco-espera-cinco-assentos', kind: 'asset', label: 'Banco de espera — 5 assentos', w: 330, h: 85, assetKey: 'banco-espera-cinco-assentos.png', assetCrop: { x: 135, y: 198, width: 1788, height: 462, sourceWidth: 2048, sourceHeight: 768 } },
  { id: 'banco-espera-tres-assentos', kind: 'asset', label: 'Banco de espera — 3 assentos', w: 280, h: 120, assetKey: 'banco-espera-tres-assentos.png', assetCrop: { x: 105, y: 124, width: 1564, height: 668, sourceWidth: 1774, sourceHeight: 887 } },
  { id: 'televisor-parede', kind: 'asset', label: 'Televisor de parede', w: 220, h: 60, assetKey: 'televisor-parede.png' },
  { id: 'aparador-moderno-amplo', kind: 'asset', label: 'Armário baixo / aparador amplo', w: 280, h: 58, assetKey: 'aparador-moderno-amplo.png' },
  { id: 'divisoria-atendimento-bege', kind: 'partition', label: 'Divisória de atendimento (bege)', w: 24, h: 230, assetKey: 'divisoria-atendimento-bege.png' },
  { id: 'divisoria-vidro-madeira-marrom', kind: 'partition', label: 'Divisória de vidro e madeira', w: 300, h: 50, assetKey: 'divisoria-vidro-madeira-marrom.png' },
  { id: 'impressora-mesa', kind: 'printer', label: 'Impressora de mesa comum', w: 86, h: 90, assetKey: 'conjunto-impressoras-modernas.png', assetCrop: { x: 48, y: 245, width: 500, height: 525, sourceWidth: 1536, sourceHeight: 1024 } },
  { id: 'impressora-recibo', kind: 'printer', label: 'Impressora de recibo', w: 77, h: 90, assetKey: 'conjunto-impressoras-modernas.png', assetCrop: { x: 565, y: 265, width: 440, height: 515, sourceWidth: 1536, sourceHeight: 1024 } },
  { id: 'impressora-selo', kind: 'printer', label: 'Impressora de selo', w: 76, h: 90, assetKey: 'conjunto-impressoras-modernas.png', assetCrop: { x: 1040, y: 265, width: 435, height: 520, sourceWidth: 1536, sourceHeight: 1024 } },
  { id: 'leitor-biometrico-hamster-dx', kind: 'asset', label: 'Leitor biométrico Hamster DX', w: 52, h: 70, assetKey: 'leitor-biometrico-hamster-dx.png' },
  { id: 'scanner-ava6plus', kind: 'asset', label: 'Scanner de mesa AVA6PLUS', w: 120, h: 60, assetKey: 'scanner-ava6plus.png' },
  { id: 'gaveteiro-largo', kind: 'asset', label: 'Gaveteiro largo', w: 160, h: 120, assetKey: 'gaveteiro-largo.png' },
  { id: 'armario-baixo-longo', kind: 'asset', label: 'Armário baixo longo', w: 220, h: 65, assetKey: 'armario-baixo-longo.png' },
  { id: 'gaveteiro-estreito', kind: 'asset', label: 'Gaveteiro estreito', w: 90, h: 124, assetKey: 'gaveteiro-estreito.png' },
];

export const FLOOR_ITEMS: EnvironmentPaletteItem[] = [
  { id: 'carpete-boucle-azul-marinho', kind: 'floor', label: 'Carpete bouclé azul-marinho', w: 480, h: 320, assetKey: 'carpete-boucle-azul-marinho.png' },
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
