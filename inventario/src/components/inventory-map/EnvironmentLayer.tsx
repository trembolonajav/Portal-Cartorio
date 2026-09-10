import { useRef } from 'react';
import type { CSSProperties } from 'react';
import type { FurnitureItem, FurnitureKind } from '@/features/inventory-map/types/inventoryMap.types';

/* Camada de mobília do ambiente (paredes, armários, mesas de reunião, etc.).
 * Visual, atrás das estações. Editável (arrastar/redimensionar/selecionar) no modo planta. */

const GRID = 20;
const snap = (v: number) => Math.round(v / GRID) * GRID;

const SRC: Partial<Record<FurnitureKind, string>> = {
  cabinet: 'armario-topo.svg',
  meeting: 's3-002.png',
  printer: 'impressora.svg',
  mfp: 'multifuncional.svg',
  phone: 'telefone.svg',
};

const FurnitureView = ({ f }: { f: FurnitureItem }) => {
  if (f.kind === 'wall') return <div style={{ width: '100%', height: '100%', background: '#4A5462', borderRadius: 1 }} />;
  if (f.kind === 'partition') return <div style={{ width: '100%', height: '100%', background: '#C2C9D1', opacity: 0.85, border: '1px solid #9AA1AA', borderRadius: 1 }} />;
  if (f.kind === 'label') {
    const fs = Math.max(9, Math.min(f.height * 0.5, 16));
    return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: fs, letterSpacing: '.1em', color: '#5C6675', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.1 }}>{f.label || 'SALA'}</div>;
  }
  return <img src={`/pack/${SRC[f.kind]}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />;
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
  const drag = useRef<null | { id: string; mode: 'move' | 'resize'; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number }>(null);

  const pt = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const down = (e: React.PointerEvent, f: FurnitureItem, mode: 'move' | 'resize') => {
    if (!editing) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect(f.id);
    const p = pt(e);
    drag.current = { id: f.id, mode, sx: p.x, sy: p.y, ox: f.x, oy: f.y, ow: f.width, oh: f.height };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const p = pt(e);
    const d = drag.current;
    onChange(items.map((it) => {
      if (it.id !== d.id) return it;
      if (d.mode === 'move') return { ...it, x: snap(Math.max(0, d.ox + (p.x - d.sx))), y: snap(Math.max(0, d.oy + (p.y - d.sy))) };
      return { ...it, width: Math.max(GRID, snap(d.ow + (p.x - d.sx))), height: Math.max(GRID, snap(d.oh + (p.y - d.sy))) };
    }));
  };
  const up = () => { drag.current = null; };

  const handle: CSSProperties = { position: 'absolute', right: -7, bottom: -7, width: 15, height: 15, borderRadius: 3, background: '#00234B', border: '2px solid #fff', cursor: 'nwse-resize', touchAction: 'none' };

  return (
    <>
      {items.map((f) => (
        <div
          key={f.id}
          onPointerDown={editing ? (e) => down(e, f, 'move') : undefined}
          onPointerMove={editing ? move : undefined}
          onPointerUp={editing ? up : undefined}
          style={{
            position: 'absolute', left: f.x, top: f.y, width: f.width, height: f.height,
            transform: `rotate(${f.rotation}deg)`, transformOrigin: 'center', touchAction: 'none',
            cursor: editing ? 'move' : 'default',
            outline: editing && selectedId === f.id ? '2px solid #00234B' : editing ? '1px dashed rgba(0,35,75,.28)' : undefined,
            outlineOffset: 1,
          }}
        >
          <FurnitureView f={f} />
          {editing && selectedId === f.id && (
            <div onPointerDown={(e) => down(e, f, 'resize')} onPointerMove={move} onPointerUp={up} style={handle} />
          )}
        </div>
      ))}
    </>
  );
};

export default EnvironmentLayer;
