import type { LayoutElement } from '../types/inventoryMap.types';

// Convenções de medida do mapa (herdadas do editor de referência):
// 1 unidade do canvas = 1 cm. Snap das paredes a 10 cm; linha forte da grade = 1 m.
export const WALL_SNAP = 10;
export const WALL_MAGNET = 22;
export const DEFAULT_WALL_THICKNESS = 12;
const UNIT_CM = 1;

export type Point = [number, number];

export interface WallGeometry {
  points: Point[];
  thickness: number;
  closed: boolean;
}

export const snapValue = (v: number): number => Math.round(v / WALL_SNAP) * WALL_SNAP;

/** Comprimento formatado em metros, no padrão do editor de referência (vírgula decimal). */
export const fmtMeters = (units: number): string =>
  ((units * UNIT_CM) / 100).toFixed(2).replace('.', ',') + ' m';

export const isWall = (el: LayoutElement): boolean => el.elementType === 'WALL';

/** Converte uma parede-retângulo (modelo antigo) para a linha de centro (polilinha de 2 pontos). */
export const rectToPolyline = (el: LayoutElement): { points: Point[]; thickness: number } => {
  const { x, y, width, height, rotation } = el;
  const rad = ((rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const toWorld = (lx: number, ly: number): Point => [x + lx * cos - ly * sin, y + lx * sin + ly * cos];
  if (width >= height) {
    const hy = height / 2;
    return { points: [toWorld(0, hy), toWorld(width, hy)], thickness: Math.max(4, Math.round(height)) };
  }
  const hx = width / 2;
  return { points: [toWorld(hx, 0), toWorld(hx, height)], thickness: Math.max(4, Math.round(width)) };
};

/** Pontos da parede em coordenadas absolutas + espessura, seja polilinha (novo) ou retângulo (antigo). */
export const getWallGeometry = (el: LayoutElement): WallGeometry => {
  const meta = el.metadata || {};
  const raw = meta.points as unknown;
  if (Array.isArray(raw) && raw.length >= 2) {
    const points = (raw as unknown[][]).map((p) => [Number(p[0]), Number(p[1])] as Point);
    const thickness = Number(meta.thickness) || DEFAULT_WALL_THICKNESS;
    const last = points[points.length - 1];
    const closed = points.length > 2 && last[0] === points[0][0] && last[1] === points[0][1];
    return { points, thickness, closed };
  }
  const conv = rectToPolyline(el);
  return { points: conv.points, thickness: conv.thickness, closed: false };
};

export const wallPointsToFlat = (points: Point[]): number[] => points.flat();

export const boundingBox = (points: Point[]): { x: number; y: number; width: number; height: number } => {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
};

/** Garante que toda parede tenha metadata.points (converte as antigas retângulo in-place na cópia). */
export const withWallPolyline = (el: LayoutElement): LayoutElement => {
  if (el.elementType !== 'WALL') return el;
  const meta = el.metadata || {};
  if (Array.isArray(meta.points) && (meta.points as unknown[]).length >= 2) return el;
  const { points, thickness } = rectToPolyline(el);
  const bb = boundingBox(points);
  return {
    ...el,
    x: bb.x,
    y: bb.y,
    width: bb.width,
    height: bb.height,
    rotation: 0,
    metadata: { ...meta, points, thickness },
  };
};
