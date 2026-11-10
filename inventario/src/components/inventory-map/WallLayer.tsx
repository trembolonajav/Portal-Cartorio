import { useEffect, useRef, useState } from 'react';
import type { FurnitureItem } from '@/features/inventory-map/types/inventoryMap.types';
import { fmtMeters } from '@/features/inventory-map/lib/wallGeometry';

/*
 * Camada de paredes desenhadas por cantos (adaptada do editor de referência).
 * Paredes são polilinhas (FurnitureItem.points) renderizadas com emendas limpas
 * (miter join, contorno escuro + miolo claro = "módulo claro") e cotas por trecho.
 * Ferramenta de desenho: clique em cada canto, trava em 90° (Shift libera),
 * ímã nas pontas existentes, snap na grade; Enter/duplo clique/botão direito conclui,
 * clicar no 1º ponto fecha a sala. Esc sai/cancela.
 */

type Point = [number, number];

// Valores idênticos ao editor de referência (Mapa Patrimonial - Editor de Planta.dc.html).
// A grade visual usa células de 20 px. Paredes aceitam meia célula para que a
// linha central possa passar tanto na borda quanto no meio de um quadrado.
const GRID = 10;
const MAGNET = 22;
const DEFAULT_THICKNESS = 15;
const OUTER = '#4A525C';       // contorno da parede (módulo claro)
const INNER = '#ECEAE6';       // miolo claro
const SEL = '#A87413';         // realce/cotas da parede selecionada
const DRAW = '#00234B';        // rascunho em desenho

const snap = (v: number) => Math.round(v / GRID) * GRID;
const isWallPoly = (f: FurnitureItem) => f.kind === 'wall' && Array.isArray(f.points) && f.points.length >= 2;

const bbox = (pts: Point[]) => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
};

const toPath = (pts: Point[], closed: boolean) =>
  'M' + pts.map((p) => `${p[0]} ${p[1]}`).join(' L') + (closed ? ' Z' : '');

interface Props {
  furniture: FurnitureItem[];
  editing: boolean;
  wallDraw: boolean;
  selectedId: string | null;
  canvasW: number;
  canvasH: number;
  newId: () => string;
  onSelect: (id: string | null) => void;
  onChange: (items: FurnitureItem[]) => void;
}

const WallLayer = ({ furniture, editing, wallDraw, selectedId, canvasW, canvasH, newId, onSelect, onChange }: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draft, setDraft] = useState<Point[]>([]);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [shiftDown, setShiftDown] = useState(false);
  const draftRef = useRef<Point[]>(draft);
  draftRef.current = draft;

  const walls = furniture.filter(isWallPoly);

  const ptFromEvent = (e: { clientX: number; clientY: number }): Point | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    // svg é sobreposto 1:1 ao canvas (mesmas dimensões, sem escala interna).
    return [e.clientX - r.left, e.clientY - r.top];
  };

  const computeWallPoint = (raw: Point): Point => {
    let x = snap(raw[0]);
    let y = snap(raw[1]);
    const d = draftRef.current;
    if (d.length && !shiftDown) {
      const [lx, ly] = d[d.length - 1];
      if (Math.abs(x - lx) >= Math.abs(y - ly)) y = ly; else x = lx;
    }
    const cands: Point[] = [];
    walls.forEach((w) => (w.points as number[][]).forEach((p) => cands.push([p[0], p[1]])));
    if (d.length > 2) cands.push(d[0]);
    let best: { c: Point; dist: number } | null = null;
    cands.forEach((c) => {
      const dd = Math.hypot(c[0] - x, c[1] - y);
      if (dd < MAGNET && (!best || dd < best.dist)) best = { c, dist: dd };
    });
    return best ? [best.c[0], best.c[1]] : [x, y];
  };

  const finishDraft = (pts?: Point[]) => {
    const points = pts || draftRef.current;
    if (points.length >= 2) {
      const bb = bbox(points);
      const wall: FurnitureItem = {
        id: newId(),
        kind: 'wall',
        x: bb.x, y: bb.y, width: bb.width, height: bb.height, rotation: 0,
        points: points.map((p) => [p[0], p[1]]),
        thickness: DEFAULT_THICKNESS,
      };
      onChange([...furniture, wall]);
    }
    setDraft([]);
  };

  // Limpa rascunho ao sair do modo desenho.
  useEffect(() => {
    if (!wallDraw) { setDraft([]); setCursor(null); }
  }, [wallDraw]);

  // Teclas: Enter conclui, Esc conclui/cancela, Shift libera ângulo; Delete apaga parede selecionada.
  useEffect(() => {
    if (!editing) return;
    const kd = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Shift') { setShiftDown(true); return; }
      if (wallDraw) {
        if (e.key === 'Enter') { e.preventDefault(); finishDraft(); return; }
        if (e.key === 'Escape') { if (draftRef.current.length) finishDraft(); return; }
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && walls.some((w) => w.id === selectedId)) {
        e.preventDefault();
        onChange(furniture.filter((f) => f.id !== selectedId));
        onSelect(null);
      }
    };
    const ku = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftDown(false); };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, wallDraw, selectedId, furniture]);

  const handleClick = (e: React.MouseEvent) => {
    if (!wallDraw) return;
    e.stopPropagation();
    const raw = ptFromEvent(e);
    if (!raw) return;
    const q = computeWallPoint(raw);
    const d = draft;
    if (d.length) {
      const last = d[d.length - 1];
      if (last[0] === q[0] && last[1] === q[1]) return;
    }
    if (d.length > 2 && q[0] === d[0][0] && q[1] === d[0][1]) { finishDraft([...d, q]); return; }
    setDraft([...d, q]);
  };

  const handleMove = (e: React.MouseEvent) => {
    if (!wallDraw) return;
    const raw = ptFromEvent(e);
    if (raw) setCursor(raw);
  };

  // Cotas de cada trecho de uma parede.
  const cotas = (pts: Point[], T: number, keyPrefix: string) => {
    const nodes: JSX.Element[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy);
      if (!len) continue;
      const nx = -dy / len;
      const ny = dx / len;
      const mx = (a[0] + b[0]) / 2 + nx * (T / 2 + 12);
      const my = (a[1] + b[1]) / 2 + ny * (T / 2 + 12);
      nodes.push(
        <text key={`${keyPrefix}${i}`} x={mx} y={my + 4} textAnchor="middle"
          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fill: SEL, pointerEvents: 'none' }}>
          {fmtMeters(len)}
        </text>,
      );
    }
    return nodes;
  };

  const draftQ = wallDraw && cursor ? computeWallPoint(cursor) : null;
  const selectedWall = walls.find((w) => w.id === selectedId) || null;
  const selBb = selectedWall ? bbox(selectedWall.points as Point[]) : null;

  return (
    <>
      <svg
        ref={svgRef}
        width={canvasW}
        height={canvasH}
        style={{ position: 'absolute', left: 0, top: 0, width: canvasW, height: canvasH, pointerEvents: 'none', zIndex: wallDraw ? 30 : 6, overflow: 'visible' }}
      >
        {/* Retângulo de captura no modo desenho */}
        {wallDraw && (
          <rect
            x={0} y={0} width={canvasW} height={canvasH} fill="transparent"
            style={{ pointerEvents: 'auto', cursor: 'crosshair' }}
            onClick={handleClick}
            onMouseMove={handleMove}
            onDoubleClick={(e) => { e.stopPropagation(); finishDraft(); }}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); finishDraft(); }}
          />
        )}

        {walls.map((w) => {
          const pts = (w.points as Point[]).map((p) => [p[0], p[1]] as Point);
          let drawPts = pts;
          let closed = false;
          const last = pts[pts.length - 1];
          if (pts.length > 2 && last[0] === pts[0][0] && last[1] === pts[0][1]) { drawPts = pts.slice(0, -1); closed = true; }
          const T = w.thickness || DEFAULT_THICKNESS;
          const dPath = toPath(drawPts, closed);
          const selected = editing && selectedId === w.id;
          return (
            <g key={w.id}>
              {selected && <path d={dPath} fill="none" stroke={SEL} strokeWidth={T + 14} strokeOpacity={0.5} strokeLinejoin="miter" strokeLinecap="square" style={{ pointerEvents: 'none' }} />}
              <path d={dPath} fill="none" stroke={OUTER} strokeWidth={T} strokeLinejoin="miter" strokeLinecap="square" style={{ pointerEvents: 'none' }} />
              <path d={dPath} fill="none" stroke={INNER} strokeWidth={Math.max(1, T - 5)} strokeLinejoin="miter" strokeLinecap="square" style={{ pointerEvents: 'none' }} />
              {/* Alvo de clique para seleção (fora do modo desenho) */}
              <path
                d={dPath} fill="none" stroke="transparent" strokeWidth={T + 14} strokeLinecap="square"
                style={{ pointerEvents: editing && !wallDraw ? 'stroke' : 'none', cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); onSelect(w.id); }}
              />
              {selected && cotas(drawPts, T, `c-${w.id}-`)}
            </g>
          );
        })}

        {/* Rascunho em desenho */}
        {wallDraw && draft.length > 0 && draftQ && (
          <path d={toPath([...draft, draftQ], false)} fill="none" stroke={OUTER} strokeOpacity={0.55} strokeWidth={DEFAULT_THICKNESS} strokeLinejoin="miter" strokeLinecap="square" style={{ pointerEvents: 'none' }} />
        )}
        {wallDraw && draft.length > 0 && draftQ && (() => {
          const l = draft[draft.length - 1];
          const len = Math.hypot(draftQ[0] - l[0], draftQ[1] - l[1]);
          return len ? (
            <text x={draftQ[0] + 10} y={draftQ[1] - 12} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 500, fill: DRAW, pointerEvents: 'none' }}>{fmtMeters(len)}</text>
          ) : null;
        })()}
        {wallDraw && draft.map((p, i) => (
          <circle key={`dp${i}`} cx={p[0]} cy={p[1]} r={4.5} fill="#fff" stroke={DRAW} strokeWidth={2} style={{ pointerEvents: 'none' }} />
        ))}
        {wallDraw && draftQ && <circle cx={draftQ[0]} cy={draftQ[1]} r={5} fill={SEL} style={{ pointerEvents: 'none' }} />}
      </svg>

      {/* Propriedades da parede selecionada (trechos + total), como no editor de referência */}
      {selectedWall && selBb && !wallDraw && (() => {
        const pts = (selectedWall.points as Point[]).map((p) => [p[0], p[1]] as Point);
        const segs: number[] = [];
        let total = 0;
        for (let i = 0; i < pts.length - 1; i++) {
          const len = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
          if (len) { segs.push(len); total += len; }
        }
        const T = selectedWall.thickness || DEFAULT_THICKNESS;
        const cardW = 208;
        // Card logo abaixo da parede, alinhado ao início dela e sempre dentro do canvas.
        const left = Math.max(6, Math.min(canvasW - cardW - 6, selBb.x));
        const top = selBb.y + selBb.height + 12;
        return (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', left: Math.max(0, left), top, zIndex: 31, width: cardW,
              background: '#fff', border: '1px solid #E4E0DB', borderRadius: 10, padding: '11px 12px',
              boxShadow: '0 8px 22px -12px rgba(0,35,75,.5)', fontFamily: "'Instrument Sans', system-ui, sans-serif",
            }}
          >
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 18, fontWeight: 600, color: '#00234B', lineHeight: 1.1 }}>Parede</div>
            <div style={{ fontSize: 11.5, color: '#6B7480', marginBottom: 8 }}>{segs.length} {segs.length === 1 ? 'trecho' : 'trechos'} · {T} cm de espessura</div>
            {segs.map((len, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#3D4653', borderBottom: '1px dashed #E4E0DB', padding: '3px 0' }}>
                <span>Trecho {i + 1}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmtMeters(len)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#00234B', fontWeight: 600, padding: '5px 0 8px' }}>
              <span>Total</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmtMeters(total)}</span>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(furniture.filter((f) => f.id !== selectedWall.id)); onSelect(null); }}
              style={{ width: '100%', border: '1px solid #F0C9C5', background: '#FBEDEC', color: '#B4342B', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, padding: 8, borderRadius: 8, cursor: 'pointer' }}
            >
              Apagar parede
            </button>
          </div>
        );
      })()}
    </>
  );
};

export default WallLayer;
