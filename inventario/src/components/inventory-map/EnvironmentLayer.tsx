import { useRef } from 'react';
import type { CSSProperties } from 'react';
import { RotateCw, X } from 'lucide-react';
import type { FurnitureItem, FurnitureKind } from '@/features/inventory-map/types/inventoryMap.types';

/* Camada de mobília do ambiente (paredes, armários, mesas de reunião, etc.).
 * Visual, atrás das estações. No modo planta fica por cima e editável
 * (arrastar / redimensionar / girar / remover). */

const GRID = 20;
const snap = (v: number) => Math.round(v / GRID) * GRID;
const rotatedSize = (width: number, height: number, rotation: number) => {
  const angle = rotation * Math.PI / 180;
  return {
    width: Math.abs(width * Math.cos(angle)) + Math.abs(height * Math.sin(angle)),
    height: Math.abs(width * Math.sin(angle)) + Math.abs(height * Math.cos(angle)),
  };
};

const SRC: Partial<Record<FurnitureKind, string>> = {
  cabinet: 'armario-topo.svg',
  meeting: 's3-002.png',
  printer: 'impressora.svg',
  mfp: 's4-037.png',
  phone: 'telefone.svg',
};

const isDoor = (kind: FurnitureKind) => kind === 'door-left' || kind === 'door-right';
const isStructural = (kind: FurnitureKind) => kind === 'wall' || kind === 'partition' || kind === 'wall-module' || isDoor(kind);
const isHorizontalWall = (f: Pick<FurnitureItem, 'width' | 'height'>) => f.width >= f.height;

const DoorView = ({ mirrored }: { mirrored: boolean }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    style={{
      width: '100%',
      height: '100%',
      display: 'block',
      overflow: 'visible',
      transform: mirrored ? 'scaleX(-1)' : undefined,
    }}
  >
    {/* A máscara clara recorta a parede; os demais traços formam batentes, folha e arco. */}
    <rect x="0" y="-7" width="100" height="14" fill="#F5F2EC" />
    <path d="M 0 -5 V 5 M 100 -5 V 5" fill="none" stroke="#20262B" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    <path d="M 100 0 V 98" fill="none" stroke="#20262B" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    <path d="M 0 0 A 100 100 0 0 1 100 98" fill="none" stroke="#4D565D" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    <circle cx="100" cy="0" r="2.4" fill="#20262B" />
  </svg>
);

const FurnitureView = ({ f }: { f: FurnitureItem }) => {
  if (f.kind === 'wall') return <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', background: '#AEB4B8', border: '1px solid #252B30', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.35)', borderRadius: 1 }} />;
  if (f.kind === 'door-left') return <DoorView mirrored={false} />;
  if (f.kind === 'door-right') return <DoorView mirrored />;
  if (f.kind === 'partition') return <div style={{ width: '100%', height: '100%', background: '#C2C9D1', opacity: 0.85, border: '1px solid #9AA1AA', borderRadius: 1 }} />;
  if (f.kind === 'label') {
    const fs = Math.max(9, Math.min(f.height * 0.5, 16));
    return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: fs, letterSpacing: '.1em', color: '#5C6675', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.1 }}>{f.label || 'SALA'}</div>;
  }
  const src = f.assetKey ? `/pack/ambiente/${f.assetKey}` : `/pack/${SRC[f.kind]}`;
  return <img src={src} alt={f.label || ''} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} draggable={false} />;
};

interface Props {
  items: FurnitureItem[];
  editing: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (items: FurnitureItem[]) => void;
  canvasRef: React.RefObject<HTMLDivElement>;
}

const EnvironmentLayer = ({ items, editing, selectedId, onSelect, onChange, canvasRef }: Props) => {
  const drag = useRef<null | { id: string; mode: 'move' | 'resize' | 'resize-length' | 'resize-thickness'; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number; rotation: number }>(null);

  const pt = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (e: React.PointerEvent, f: FurnitureItem, mode: 'move' | 'resize' | 'resize-length' | 'resize-thickness') => {
    if (!editing) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect(f.id);
    const p = pt(e);
    drag.current = { id: f.id, mode, sx: p.x, sy: p.y, ox: f.x, oy: f.y, ow: f.width, oh: f.height, rotation: f.rotation };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const p = pt(e);
    const d = drag.current;
    onChange(items.map((it) => {
      if (it.id !== d.id) return it;
      if (d.mode === 'move') {
        const rawX = d.ox + (p.x - d.sx);
        const rawY = d.oy + (p.y - d.sy);
        if (it.kind === 'wall' && it.rotation % 180 === 0) {
          if (isHorizontalWall(it)) {
            const centerY = Math.max(0, snap(rawY + it.height / 2));
            return { ...it, x: Math.max(0, snap(rawX)), y: centerY - it.height / 2 };
          }
          const centerX = Math.max(0, snap(rawX + it.width / 2));
          return { ...it, x: centerX - it.width / 2, y: Math.max(0, snap(rawY)) };
        }
        const bounds = rotatedSize(d.ow, d.oh, d.rotation);
        // O ponto x/y pertence à caixa não rotacionada. Permitir o deslocamento
        // negativo necessário mantém a borda visual encostada no limite do mapa.
        const minX = (bounds.width - d.ow) / 2;
        const minY = (bounds.height - d.oh) / 2;
        return {
          ...it,
          x: Math.max(minX, snap(rawX)),
          y: Math.max(minY, snap(rawY)),
        };
      }
      const angle = d.rotation * Math.PI / 180;
      const screenDx = p.x - d.sx;
      const screenDy = p.y - d.sy;
      const localDx = screenDx * Math.cos(angle) + screenDy * Math.sin(angle);
      const localDy = -screenDx * Math.sin(angle) + screenDy * Math.cos(angle);
      // Elementos de planta: resize livre. Móveis com imagem: escala mantendo a proporção.
      if (it.kind === 'wall') {
        const horizontal = d.ow >= d.oh;
        if (d.mode === 'resize-length') {
          return horizontal
            ? { ...it, width: Math.max(GRID, snap(d.ow + localDx)) }
            : { ...it, height: Math.max(GRID, snap(d.oh + localDy)) };
        }
        if (d.mode === 'resize-thickness') {
          if (horizontal) {
            const height = Math.max(6, Math.round((d.oh + localDy) / 2) * 2);
            return { ...it, y: d.oy + (d.oh - height) / 2, height };
          }
          const width = Math.max(6, Math.round((d.ow + localDx) / 2) * 2);
          return { ...it, x: d.ox + (d.ow - width) / 2, width };
        }
        return {
          ...it,
          width: Math.max(GRID, snap(d.ow + localDx)),
          height: Math.max(6, Math.round((d.oh + localDy) / 2) * 2),
        };
      }
      const free = it.kind === 'partition' || it.kind === 'label' || isDoor(it.kind);
      if (free) {
        return { ...it, width: Math.max(GRID, snap(d.ow + localDx)), height: Math.max(GRID, snap(d.oh + localDy)) };
      }
      const scale = Math.max((d.ow + localDx) / d.ow, (d.oh + localDy) / d.oh, GRID / d.ow, GRID / d.oh);
      const width = snap(d.ow * scale);
      const height = Math.round(width * (d.oh / d.ow));
      return { ...it, width, height };
    }));
  };
  const up = () => { drag.current = null; };
  const rotate = (id: string) => onChange(items.map((it) => {
    if (it.id !== id) return it;
    if (it.kind === 'wall') {
      const currentBounds = rotatedSize(it.width, it.height, it.rotation);
      const horizontal = currentBounds.width >= currentBounds.height;
      if (horizontal) {
        const startX = snap(it.x);
        const startY = snap(it.y + it.height / 2);
        return { ...it, x: startX - currentBounds.height / 2, y: startY, width: currentBounds.height, height: currentBounds.width, rotation: 0 };
      }
      const startX = snap(it.x + it.width / 2);
      const startY = snap(it.y);
      return { ...it, x: startX, y: startY - currentBounds.width / 2, width: currentBounds.height, height: currentBounds.width, rotation: 0 };
    }
    return { ...it, rotation: (it.rotation + (isStructural(it.kind) ? 90 : 45)) % 360 };
  }));
  const remove = (id: string) => { onChange(items.filter((it) => it.id !== id)); onSelect(null); };

  const handle: CSSProperties = { position: 'absolute', right: -9, bottom: -9, width: 18, height: 18, borderRadius: 4, background: '#00234B', border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,.35)', cursor: 'nwse-resize', touchAction: 'none' };
  const tbBtn: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, background: '#fff', border: '1px solid #C7CDD4', boxShadow: '0 1px 3px rgba(0,0,0,.2)', cursor: 'pointer' };

  return (
    <>
      {items.map((f) => {
        // Paredes desenhadas por cantos (polilinha) são renderizadas pelo WallLayer (SVG).
        if (f.points && f.points.length >= 2) return null;
        const sel = editing && selectedId === f.id;
        const z = editing ? (sel ? 13 : 12) : 0;
        const visualBounds = rotatedSize(f.width, f.height, f.rotation);
        const visualLeft = f.x + (f.width - visualBounds.width) / 2;
        const visualTop = f.y + (f.height - visualBounds.height) / 2;
        const horizontalWall = f.kind === 'wall' && isHorizontalWall(f);
        const wallLengthHandle: CSSProperties = horizontalWall
          ? { ...handle, right: -9, bottom: 'auto', top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' }
          : { ...handle, right: 'auto', bottom: -9, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' };
        const wallThicknessHandle: CSSProperties = horizontalWall
          ? { ...handle, right: 'auto', bottom: -7, left: '50%', transform: 'translateX(-50%)', width: 14, height: 14, cursor: 'ns-resize' }
          : { ...handle, right: -7, bottom: 'auto', top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, cursor: 'ew-resize' };
        const baseZ = isDoor(f.kind) ? 4 : f.kind === 'wall' || f.kind === 'partition' || f.kind === 'wall-module' ? 1 : 2;
        return (
          <div key={f.id}>
            <div
              onPointerDown={editing ? (e) => down(e, f, 'move') : undefined}
              onPointerMove={editing ? move : undefined}
              onPointerUp={editing ? up : undefined}
              onClick={editing ? (e) => { e.stopPropagation(); onSelect(f.id); } : undefined}
              style={{
                position: 'absolute', left: f.x, top: f.y, width: f.width, height: f.height,
                transform: `rotate(${f.rotation}deg)`, transformOrigin: 'center', touchAction: 'none',
                cursor: editing ? 'move' : 'default', zIndex: sel ? z : baseZ,
                outline: sel ? '2px solid #00234B' : editing ? '1px dashed rgba(0,35,75,.32)' : undefined, outlineOffset: 2,
              }}
            >
              <FurnitureView f={f} />
              {sel && f.kind === 'wall' && (
                <>
                  <div title="Esticar comprimento" onPointerDown={(e) => down(e, f, 'resize-length')} onPointerMove={move} onPointerUp={up} style={wallLengthHandle} />
                  <div title="Ajustar espessura" onPointerDown={(e) => down(e, f, 'resize-thickness')} onPointerMove={move} onPointerUp={up} style={wallThicknessHandle} />
                </>
              )}
              {sel && f.kind !== 'wall' && <div onPointerDown={(e) => down(e, f, 'resize')} onPointerMove={move} onPointerUp={up} style={handle} />}
            </div>
            {sel && (
              <div style={{ position: 'absolute', left: Math.max(0, visualLeft), top: Math.max(0, visualTop - 32), zIndex: 20, display: 'flex', gap: 5 }}>
                <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); rotate(f.id); }} style={tbBtn} title={`Girar ${isStructural(f.kind) ? 90 : 45}°`}><RotateCw size={15} color="#00234B" /></div>
                <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); remove(f.id); }} style={tbBtn} title="Remover"><X size={15} color="#B4342B" /></div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};

export default EnvironmentLayer;
