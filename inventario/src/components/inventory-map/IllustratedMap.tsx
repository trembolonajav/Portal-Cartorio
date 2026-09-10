import { useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInventoryStore } from '@/features/inventory-map/store/useInventoryStore';
import type { Asset, Station } from '@/features/inventory-map/types/inventoryMap.types';

/*
 * Mapa patrimonial ilustrado (artboard 4b).
 * Dois modos:
 *  - Planta (um Andar/Departamento): canvas absoluto, arrastar + girar, cresce
 *    nas duas direções conforme as estações se espalham.
 *  - Visão geral ("Todos os espaços"): agrupada por Unidade › Andar, em fluxo,
 *    somente leitura — some o amontoado de tudo numa grade só.
 * A estação é uma mesa base; cada patrimônio vinculado desenha só o seu recorte.
 */

type TileState = 'normal' | 'search' | 'attention';
type TileKind = 'workstation' | 'cabinet' | 'empty';
type Pos = { x: number; y: number };

interface Props {
  search?: string;
  activeSpaceName?: string;
  spaceId?: string | null;
  editing?: boolean;
  positions: Record<string, Pos>;
  rotations: Record<string, number>;
  onDragEnd?: (stationId: string, x: number, y: number) => void;
  onRotate?: (stationId: string) => void;
  onStationClick: (stationId: string) => void;
}

const GRID = 20;
const TILE_W = 210;
const snap = (v: number) => Math.round(v / GRID) * GRID;
const STORAGE_HINT = /arm[aá]rio|guarda|arquivo|estante|almox/i;
const P = (name: string) => `/pack/${name}`;

const RE = {
  monitor: /monitor|tela|display/i,
  cpu: /cpu|gabinete|computador|desktop|torre/i,
  teclado: /teclado|keyboard/i,
  mouse: /mouse/i,
  cadeira: /cadeira|poltrona|chair/i,
  mesa: /mesa|desk|bancada|escrivaninha/i,
};

const partsOf = (assets: Asset[]) => {
  const monitors = assets.filter((a) => RE.monitor.test(a.type)).length;
  const hasCpu = assets.some((a) => RE.cpu.test(a.type));
  const hasTeclado = assets.some((a) => RE.teclado.test(a.type));
  const hasMouse = assets.some((a) => RE.mouse.test(a.type));
  const others = assets.filter(
    (a) => ![RE.monitor, RE.cpu, RE.teclado, RE.mouse, RE.cadeira, RE.mesa].some((re) => re.test(a.type)),
  );
  return { monitors, hasCpu, hasTeclado, hasMouse, others };
};

// Periféricos com recorte próprio (aparecem como ícone; o resto vira chip de texto).
const ITEM_ICON: { re: RegExp; src: string }[] = [
  { re: /notebook|laptop/i, src: 'notebook.svg' },
  { re: /multifun|mfp/i, src: 'multifuncional.svg' },
  { re: /impressora|printer/i, src: 'impressora.svg' },
  { re: /scanner/i, src: 'scanner.svg' },
  { re: /switch|patch|rede/i, src: 'switch.svg' },
];
const itemIcon = (type: string) => ITEM_ICON.find((i) => i.re.test(type))?.src;

const chip: CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, lineHeight: '15px',
  padding: '0 5px', borderRadius: 4, border: '1px solid #DCD7CF',
  background: '#fff', color: '#5C6675', whiteSpace: 'nowrap',
};
const miniLabel: CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, lineHeight: '10px',
  color: '#8A9099', maxWidth: 42, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center',
};

const Workstation = ({ assets, state }: { assets: Asset[]; state: TileState }) => {
  const { monitors, hasCpu, hasTeclado, hasMouse, others } = partsOf(assets);
  const searchOutline: CSSProperties = state === 'search' ? { outline: '3px solid #8A6E32', outlineOffset: 2, borderRadius: 2 } : {};
  const attentionOutline: CSSProperties = state === 'attention' ? { outline: '3px solid #B4342B', outlineOffset: 2, borderRadius: 3 } : {};
  const n = Math.min(monitors, 4);
  const gap = 4;
  const mW = n <= 1 ? 84 : n === 2 ? 70 : Math.floor((162 - gap * (n - 1)) / n);
  const totalW = mW * n + gap * (n - 1);
  const startX = Math.round((170 - totalW) / 2);

  return (
    <div style={{ position: 'relative', width: 170, height: 150 + (others.length ? 46 : 0), pointerEvents: 'none' }}>
      <img src={P('mesa-reta-recorte.png')} alt="" style={{ position: 'absolute', left: 0, top: 0, width: 170, display: 'block', ...attentionOutline }} />
      {hasCpu && <img src={P('gabinete-torre.png')} alt="" style={{ position: 'absolute', left: 12, top: 30, width: 17, display: 'block' }} />}
      {Array.from({ length: n }).map((_, i) => (
        <img key={i} src={P('monitor.png')} alt="" style={{ position: 'absolute', left: startX + i * (mW + gap), top: 11, width: mW, display: 'block', ...(i === 0 ? searchOutline : {}) }} />
      ))}
      {hasTeclado && <img src={P('teclado.png')} alt="" style={{ position: 'absolute', left: 48, top: 44, width: 76, display: 'block' }} />}
      {hasMouse && <img src={P('mouse.png')} alt="" style={{ position: 'absolute', left: 132, top: 46, width: 15, display: 'block' }} />}
      {/* Cadeira é mobília (não é patrimônio), desenhada sempre para dar contexto espacial. */}
      <img src={P('cadeira-giratoria.png')} alt="" style={{ position: 'absolute', left: 62, top: 96, width: 48, display: 'block' }} />
      {others.length > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 150, display: 'flex', flexWrap: 'wrap', gap: 6, width: 170, alignItems: 'flex-end' }}>
          {others.map((o) => {
            const ic = itemIcon(o.type);
            return ic ? (
              <div key={o.id} title={`${o.type} · ${o.description}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 42 }}>
                <img src={P(ic)} alt="" style={{ height: 24, maxWidth: 42, objectFit: 'contain', display: 'block' }} />
                <span style={miniLabel}>{o.type}</span>
              </div>
            ) : (
              <span key={o.id} style={chip} title={o.description}>{o.type}</span>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Cabinet = () => <img src={P('armario-2portas-pastas.png')} alt="" style={{ width: 170, display: 'block', pointerEvents: 'none' }} />;
const EmptySlot = () => <div style={{ width: 170, height: 94, border: '2px dashed #B9B3A9', borderRadius: 6, background: 'rgba(255,255,255,.45)' }} />;

// Rótulo + móvel girado — compartilhado pela planta e pela visão geral.
const TileBody = ({ st, kind, state, sub, assets, rot, animate }: { st: Station; kind: TileKind; state: TileState; sub: string; assets: Asset[]; rot: number; animate: boolean }) => (
  <>
    <div className="text-[12px] font-semibold" style={{ color: state === 'search' ? '#5B4A28' : state === 'attention' ? '#B4342B' : '#1B2430' }}>{st.code}</div>
    <div className="mb-1.5 text-[11px]" style={{ color: state === 'search' ? '#8A6E32' : state === 'attention' ? '#B4342B' : '#8A9099', fontFamily: state === 'search' ? "'IBM Plex Mono', monospace" : undefined }}>{sub}</div>
    <div style={{ transform: `rotate(${rot}deg)`, transformOrigin: 'center', transition: animate ? 'transform .15s ease' : undefined }}>
      {kind === 'workstation' && <Workstation assets={assets} state={state} />}
      {kind === 'cabinet' && <Cabinet />}
      {kind === 'empty' && <EmptySlot />}
    </div>
  </>
);

const IllustratedMap = ({ search = '', activeSpaceName, spaceId = null, editing = false, positions, rotations, onDragEnd, onRotate, onStationClick }: Props) => {
  const allStations = useInventoryStore((s) => s.stations);
  const spaces = useInventoryStore((s) => s.spaces);
  const getEmployeeForStation = useInventoryStore((s) => s.getEmployeeForStation);
  const getAssetsForStation = useInventoryStore((s) => s.getAssetsForStation);
  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const q = search.trim().toLowerCase();
  const isOverview = !spaceId || spaceId === 'all';

  const makeTile = (st: Station) => {
    const assets = getAssetsForStation(st.id);
    const employee = getEmployeeForStation(st.id);
    const attention = assets.some((a) => a.status === 'MAINTENANCE');
    const storage = STORAGE_HINT.test(st.name) || STORAGE_HINT.test(st.code);
    const kind: TileKind = assets.length === 0 ? 'empty' : storage ? 'cabinet' : 'workstation';
    const matches = !!q && [st.code, st.name, employee?.fullName, ...assets.map((a) => a.assetCode), ...assets.map((a) => a.description)].some((v) => v?.toLowerCase().includes(q));
    const searchAsset = q ? assets.find((a) => a.assetCode.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)) : undefined;
    const state: TileState = matches ? 'search' : attention ? 'attention' : 'normal';
    // Ocupante: responsável cadastrado; senão o nome da estação (quando não é o próprio código).
    const occupant = employee?.fullName ?? (st.name && st.name.trim() && st.name !== st.code ? st.name : undefined);
    const sub = kind === 'empty' ? 'estação sem itens'
      : state === 'search' && searchAsset ? `${searchAsset.assetCode} está aqui`
      : attention ? `${assets.length} ${assets.length === 1 ? 'item' : 'itens'} · requer atenção`
      : `${assets.length} ${assets.length === 1 ? 'item' : 'itens'}${occupant ? ` · ${occupant}` : ''}`;
    const rot = rotations[st.id] ?? st.positionRotation ?? 0;
    return { st, kind, state, sub, assets, rot, count: assets.length };
  };

  const mono: CSSProperties = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: '.14em', color: '#8B939E' };

  /* ----------------------------- VISÃO GERAL ----------------------------- */
  const groups = useMemo(() => {
    if (!isOverview) return [];
    const byId = new Map(spaces.map((s) => [s.id, s]));
    const parentOf = (sp?: typeof spaces[number]) => (sp?.parentId ? byId.get(sp.parentId) : undefined);
    const rootUnit = (sp?: typeof spaces[number]) => { let cur = sp; while (cur && parentOf(cur)) cur = parentOf(cur); return cur; };
    const pathLabel = (sp?: typeof spaces[number]) => { const parts: string[] = []; let cur = sp; while (cur) { parts.unshift(cur.name); cur = parentOf(cur); } return parts.join(' › '); };
    const map = new Map<string, { key: string; unit: string; label: string; stations: Station[] }>();
    for (const st of allStations) {
      const key = st.spaceId ?? '__none__';
      if (!map.has(key)) {
        const sp = st.spaceId ? byId.get(st.spaceId) : undefined;
        const unit = rootUnit(sp)?.name ?? 'Sem unidade';
        const label = sp ? pathLabel(sp) : 'Sem espaço';
        map.set(key, { key, unit, label, stations: [] });
      }
      map.get(key)!.stations.push(st);
    }
    return [...map.values()].sort((a, b) => a.unit.localeCompare(b.unit) || a.label.localeCompare(b.label));
  }, [isOverview, allStations, spaces]);

  if (isOverview) {
    return (
      <div className="h-full overflow-auto p-6" style={{ background: '#F1EDE4', backgroundImage: 'linear-gradient(rgba(0,0,0,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.045) 1px, transparent 1px)', backgroundSize: '26px 26px' }}>
        {allStations.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <div className="mb-3 h-[94px] w-[170px] rounded-md border-2 border-dashed border-muted-foreground/40" />
            <p className="text-sm font-medium">Nenhuma estação cadastrada</p>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5">
            <div style={mono}>VISÃO GERAL · {allStations.length} {allStations.length === 1 ? 'ESTAÇÃO' : 'ESTAÇÕES'} · SELECIONE UM ANDAR PARA MONTAR A PLANTA</div>
            {groups.map((g) => {
              const items = g.stations.map(makeTile);
              const total = items.reduce((s, t) => s + t.count, 0);
              return (
                <section key={g.key} className="rounded-xl border border-[#DCD7CF] bg-white/70 p-4">
                  <div className="mb-3 flex items-baseline gap-2 border-b border-[#E7E2D9] pb-2">
                    <span className="text-[13px] font-semibold text-primary">{g.label}</span>
                    <span style={mono}>{g.stations.length} {g.stations.length === 1 ? 'ESTAÇÃO' : 'ESTAÇÕES'} · {total} {total === 1 ? 'ITEM' : 'ITENS'}</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {items.map(({ st, kind, state, sub, assets, rot }) => (
                      <div
                        key={st.id}
                        onClick={() => onStationClick(st.id)}
                        className={cn(
                          'cursor-pointer select-none rounded-xl border-2 border-transparent p-2 transition-shadow hover:border-border',
                          state === 'search' && 'border-[#8A6E32] bg-brass/[0.06]',
                          state === 'attention' && 'border-[#B4342B] bg-danger/[0.05]',
                        )}
                        style={{ width: TILE_W }}
                      >
                        <TileBody st={st} kind={kind} state={state} sub={sub} assets={assets} rot={rot} animate={false} />
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ------------------------------- PLANTA -------------------------------- */
  const stations = allStations.filter((s) => s.spaceId === spaceId);
  const tiles = stations.map((st, idx) => {
    const t = makeTile(st);
    const pos: Pos = positions[st.id] ?? (st.positionX != null && st.positionY != null ? { x: st.positionX, y: st.positionY } : { x: 30 + (idx % 4) * 230, y: 60 + Math.floor(idx / 4) * 210 });
    return { ...t, pos };
  });

  const totalItems = tiles.reduce((s, t) => s + t.count, 0);
  const canvasH = Math.max(560, ...tiles.map((t) => t.pos.y + 230));
  const canvasW = Math.max(1060, ...tiles.map((t) => t.pos.x + TILE_W + 60));

  const onPointerDown = (e: React.PointerEvent, id: string, pos: Pos) => {
    if (!editing) return;
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    drag.current = { id, dx: e.clientX - rect.left - pos.x, dy: e.clientY - rect.top - pos.y, moved: false };
    setDragId(id);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = snap(Math.max(0, e.clientX - rect.left - drag.current.dx));
    const y = snap(Math.max(0, e.clientY - rect.top - drag.current.dy));
    drag.current.moved = true;
    onDragEnd?.(drag.current.id, x, y);
  };
  const onPointerUp = () => { drag.current = null; setDragId(null); };

  return (
    <div className="h-full overflow-auto p-6" style={{ background: '#F1EDE4', backgroundImage: 'linear-gradient(rgba(0,0,0,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.045) 1px, transparent 1px)', backgroundSize: '26px 26px' }}>
      {stations.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
          <div className="mb-3 h-[94px] w-[170px] rounded-md border-2 border-dashed border-muted-foreground/40" />
          <p className="text-sm font-medium">Nenhuma estação neste mapa</p>
          <p className="mt-1 text-xs">Use “Nova estação” para começar a montar o ambiente</p>
        </div>
      ) : (
        <div className="mx-auto rounded-xl border-[9px] border-[#2C3542] bg-white/20 p-6" style={{ width: canvasW + 48 }}>
          <div style={{ ...mono, marginBottom: 14 }}>SETOR {(activeSpaceName ?? 'INVENTÁRIO').toUpperCase()} · {totalItems} {totalItems === 1 ? 'PATRIMÔNIO' : 'PATRIMÔNIOS'}{editing ? ' · EDITANDO PLANTA' : ''}</div>
          <div
            ref={canvasRef}
            className="relative"
            style={{ width: canvasW, height: canvasH, ...(editing ? { backgroundImage: 'linear-gradient(rgba(0,35,75,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,35,75,.06) 1px, transparent 1px)', backgroundSize: `${GRID}px ${GRID}px` } : {}) }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            {tiles.map(({ st, kind, state, sub, assets, rot, pos }) => (
              <div
                key={st.id}
                onPointerDown={(e) => onPointerDown(e, st.id, pos)}
                onClick={() => { if (!editing && !drag.current?.moved) onStationClick(st.id); }}
                className={cn(
                  'absolute select-none rounded-xl border-2 border-transparent p-2 transition-shadow',
                  state === 'search' && 'border-[#8A6E32] bg-brass/[0.06]',
                  state === 'attention' && 'border-[#B4342B] bg-danger/[0.05]',
                  editing ? 'cursor-move hover:border-[#00234B]/40' : 'cursor-pointer hover:border-border',
                  dragId === st.id && 'z-10 border-[#00234B] shadow-xl',
                )}
                style={{ left: pos.x, top: pos.y, width: TILE_W, touchAction: 'none' }}
              >
                {editing && (
                  <button
                    title="Girar mesa"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); onRotate?.(st.id); }}
                    className="absolute right-1 top-1 z-10 rounded-md border border-[#DCD7CF] bg-white/95 p-1 text-[#5C6675] shadow-sm hover:border-[#00234B]/40 hover:text-[#00234B]"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                )}
                <TileBody st={st} kind={kind} state={state} sub={sub} assets={assets} rot={rot} animate={dragId !== st.id} />
              </div>
            ))}
          </div>

          <div className="mt-4 flex w-fit flex-wrap items-center gap-4 rounded-[9px] border border-[#DCD7CF] bg-white/95 px-4 py-2.5 text-[12px] text-[#5C6675]">
            <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-[3px] border-2 border-[#8A6E32]" />Resultado da busca</span>
            <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-[3px] border-2 border-[#B4342B]" />Requer atenção</span>
            <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-[3px] border-2 border-dashed border-[#B9B3A9]" />Vaga livre</span>
            {editing && <span className="text-[#8A6E32]">Arraste para posicionar · botão girar muda o lado · a planta cresce conforme você espalha</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default IllustratedMap;
