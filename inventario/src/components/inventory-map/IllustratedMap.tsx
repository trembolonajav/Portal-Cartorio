import { useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInventoryStore } from '@/features/inventory-map/store/useInventoryStore';
import type { Asset, AssetCrop, Station, FurnitureItem, PartitionSide } from '@/features/inventory-map/types/inventoryMap.types';
import EnvironmentLayer from './EnvironmentLayer';
import WallLayer from './WallLayer';

const makeFurnId = () => `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

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
  /** Lado da divisória escolhido na edição (ainda não salvo). */
  partitionSideOverrides?: Record<string, PartitionSide | 'AUTO'>;
  onPartitionSide?: (stationId: string) => void;
  onStationClick: (stationId: string) => void;
  onAssetClick?: (assetId: string) => void;
  furniture?: FurnitureItem[];
  selectedFurnId?: string | null;
  onFurnitureChange?: (items: FurnitureItem[]) => void;
  onSelectFurn?: (id: string | null) => void;
  wallDraw?: boolean;
}

const GRID = 20;
const TILE_W = 210;
const snap = (v: number) => Math.round(v / GRID) * GRID;
const STORAGE_HINT = /arm[aá]rio|guarda|arquivo|estante|almox/i;
const P = (name: string) => `/pack/${name}`;
const BIOMETRIC_RE = /biom[eé]tr|hamster|fingertech|nitgen|hfdu06/i;
const SCANNER_RE = /scanner/i;

const assetText = (asset: Asset) => [asset.type, asset.manufacturer, asset.model, asset.description].filter(Boolean).join(' ');

const RE = {
  monitor: /monitor|tela|display/i,
  cpu: /cpu|gabinete|computador|desktop|torre/i,
  teclado: /teclado|keyboard/i,
  mouse: /mouse/i,
  printer: /impressora|printer/i,
  webcam: /webcam|web cam|c[aâ]mera usb/i,
  cadeira: /cadeira|poltrona|chair/i,
  mesa: /mesa|desk|bancada|escrivaninha/i,
  divisoria: /divis[oó]ria|partition/i,
};

const partsOf = (assets: Asset[]) => {
  const monitors = assets.filter((a) => RE.monitor.test(a.type)).length;
  const hasCpu = assets.some((a) => RE.cpu.test(a.type));
  const hasTeclado = assets.some((a) => RE.teclado.test(a.type));
  const hasMouse = assets.some((a) => RE.mouse.test(a.type));
  const hasWebcam = assets.some((a) => RE.webcam.test(a.type));
  const printers = assets.filter((a) => RE.printer.test(`${a.type} ${a.description}`));
  const biometrics = assets.filter((a) => BIOMETRIC_RE.test(assetText(a)));
  const scanners = assets.filter((a) => SCANNER_RE.test(a.type));
  const partitions = assets.filter((a) => RE.divisoria.test(`${a.type} ${a.description}`)).length;
  // Mesa, cadeira e divisória são o próprio móvel do desenho; não viram ícone sobre a mesa.
  const drawn = [RE.monitor, RE.cpu, RE.teclado, RE.mouse, RE.printer, RE.webcam, RE.cadeira, RE.mesa, RE.divisoria];
  const others = assets.filter(
    (a) => !drawn.some((re) => re.test(`${a.type} ${a.description}`))
      && !BIOMETRIC_RE.test(assetText(a))
      && !SCANNER_RE.test(a.type),
  );
  return { monitors, hasCpu, hasTeclado, hasMouse, hasWebcam, printers, biometrics, scanners, partitions, others };
};

// Periféricos com recorte próprio (aparecem como ícone; o resto vira chip de texto).
const ITEM_ICON: { re: RegExp; src: string }[] = [
  { re: /notebook|laptop/i, src: 'notebook.svg' },
  { re: /multifun|mfp/i, src: 's4-037.png' },
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
  color: '#3E4652', maxWidth: 42, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center',
  background: 'rgba(255,255,255,.92)', borderRadius: 3, padding: '0 2px', marginTop: 1,
};

const PRINTER_CROPS: Record<'common' | 'receipt' | 'seal', AssetCrop> = {
  common: { x: 48, y: 245, width: 500, height: 525, sourceWidth: 1536, sourceHeight: 1024 },
  receipt: { x: 565, y: 265, width: 440, height: 515, sourceWidth: 1536, sourceHeight: 1024 },
  seal: { x: 1040, y: 265, width: 435, height: 520, sourceWidth: 1536, sourceHeight: 1024 },
};

const printerCropFor = (asset: Asset) => {
  const text = assetText(asset);
  if (/argox/i.test(text)) return PRINTER_CROPS.seal;
  if (/epson/i.test(text)) return PRINTER_CROPS.receipt;
  return PRINTER_CROPS.common;
};

// Fundo da mesa: impressoras comuns e de recibo à esquerda; Argox à direita, ao lado do gabinete.
const printerSlots = (printers: Asset[]) => {
  let left = 0;
  let right = 0;
  return printers.slice(0, 4).map((printer) => {
    if (/argox/i.test(assetText(printer))) return { printer, left: 158 - 31 * right++, top: 12 };
    return { printer, left: 7 + 31 * left++, top: 12 };
  });
};

const CroppedPrinter = ({ asset }: { asset: Asset }) => {
  const crop = printerCropFor(asset);
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }} title={`${asset.assetCode} · ${asset.description}`}>
      <img
        src="/pack/ambiente/conjunto-impressoras-modernas.png"
        alt=""
        style={{
          position: 'absolute',
          left: `${-(crop.x / crop.width) * 100}%`,
          top: `${-(crop.y / crop.height) * 100}%`,
          width: `${(crop.sourceWidth / crop.width) * 100}%`,
          maxWidth: 'none',
          height: 'auto',
          display: 'block',
        }}
      />
    </div>
  );
};

/*
 * Mesa de atendimento vista de cima (200 px, frente curva para baixo):
 * fundo = impressoras, monitor com webcam e gabinete; frente = scanner, teclado,
 * mouse e biometria; a cadeira fica encostada na curva da frente.
 */
const PARTITION_SRC = '/pack/ambiente/divisoria-atendimento-bege.png';
const partitionStyle: CSSProperties = { position: 'absolute', top: -12, width: 15, height: 142, display: 'block', zIndex: 3 };
const Workstation = ({ assets, state, sides }: { assets: Asset[]; state: TileState; sides: { left: boolean; right: boolean } }) => {
  const { monitors, hasCpu, hasTeclado, hasMouse, hasWebcam, printers, biometrics, scanners } = partsOf(assets);
  const searchOutline: CSSProperties = state === 'search' ? { outline: '3px solid #8A6E32', outlineOffset: 2, borderRadius: 2 } : {};
  const attentionOutline: CSSProperties = state === 'attention' ? { outline: '3px solid #B4342B', outlineOffset: 2, borderRadius: 3 } : {};
  const slots = printerSlots(printers);
  const leftPrinters = slots.filter((s) => s.left < 80).length;
  const rightPrinters = slots.length - leftPrinters;
  // Monitores ocupam o vão entre as impressoras dos dois lados.
  const areaL = 7 + 31 * leftPrinters + 4;
  const areaR = (hasCpu ? 178 : 194) - 31 * rightPrinters - 4;
  const n = Math.min(monitors, 3);
  const gap = 4;
  const mW = n === 0 ? 0 : Math.min(n === 1 ? 96 : 76, Math.floor((areaR - areaL - gap * (n - 1)) / n));
  const startX = Math.round((areaL + areaR - (mW * n + gap * (n - 1))) / 2);

  return (
    <div style={{ position: 'relative', width: 200, height: 185, pointerEvents: 'none' }}>
      <img src={P('mesa-reta-recorte.png')} alt="" style={{ position: 'absolute', left: 0, top: 0, width: 200, display: 'block', ...attentionOutline }} />
      {/* Cadeira é mobília, desenhada sempre para dar contexto espacial. */}
      <img src={P('cadeira-giratoria.png')} alt="" style={{ position: 'absolute', left: 74, top: 126, width: 52, display: 'block' }} />
      {slots.map(({ printer, left, top }) => (
        <div key={printer.id} style={{ position: 'absolute', left, top, width: 29, height: 34, zIndex: 2 }}>
          <CroppedPrinter asset={printer} />
        </div>
      ))}
      {Array.from({ length: n }).map((_, i) => (
        <img key={i} src={P('monitor.png')} alt="" style={{ position: 'absolute', left: startX + i * (mW + gap), top: 18, width: mW, display: 'block', zIndex: 2, ...(i === 0 ? searchOutline : {}) }} />
      ))}
      {hasWebcam && n > 0 && (
        <div style={{ position: 'absolute', left: startX + Math.round(mW / 2) - 10, top: 10, width: 20, height: 9, borderRadius: 4, background: '#2B3138', boxShadow: '0 1px 1px rgba(0,0,0,.35)', zIndex: 3 }}>
          <div style={{ position: 'absolute', left: 8, top: 2.5, width: 4, height: 4, borderRadius: 4, background: '#7FA6C9' }} />
        </div>
      )}
      {hasCpu && <img src={P('gabinete-torre.png')} alt="" style={{ position: 'absolute', left: 181, top: 45, width: 17, display: 'block', zIndex: 2 }} />}
      {scanners.slice(0, 1).map((scanner) => (
        <img key={scanner.id} src="/pack/ambiente/scanner-ava6plus.png" alt="" title={`${scanner.assetCode} · ${scanner.description}`} style={{ position: 'absolute', left: 6, top: 68, width: 49, height: 30, objectFit: 'contain', display: 'block', zIndex: 2 }} />
      ))}
      {hasTeclado && <img src={P('teclado.png')} alt="" style={{ position: 'absolute', left: 58, top: 72, width: 92, display: 'block', zIndex: 2 }} />}
      {hasMouse && <img src={P('mouse.png')} alt="" style={{ position: 'absolute', left: 154, top: 71, width: 14, display: 'block', zIndex: 2 }} />}
      {biometrics.slice(0, 2).map((biometric, index) => (
        <img key={biometric.id} src="/pack/ambiente/leitor-biometrico-hamster-dx.png" alt="" title={`${biometric.assetCode} · ${biometric.description}`} style={{ position: 'absolute', left: 171 + index * 18, top: 68, width: 18, height: 28, objectFit: 'contain', display: 'block', zIndex: 2 }} />
      ))}
      {/* Divisória do guichê (lados já convertidos para o desenho antes da rotação). */}
      {sides.left && <img src={PARTITION_SRC} alt="" style={{ ...partitionStyle, left: -13 }} />}
      {sides.right && <img src={PARTITION_SRC} alt="" style={{ ...partitionStyle, left: 199, transform: 'scaleX(-1)' }} />}
    </div>
  );
};

// Itens sem desenho próprio: ficam fora da rotação para o texto nunca aparecer de cabeça para baixo.
const OtherItems = ({ assets }: { assets: Asset[] }) => {
  const { others } = partsOf(assets);
  if (others.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, width: 200, alignItems: 'flex-end', marginTop: 4, pointerEvents: 'none' }}>
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
  );
};

const Cabinet = () => <img src={P('armario-topo.svg')} alt="" style={{ width: 170, display: 'block', pointerEvents: 'none' }} />;
const EmptySlot = () => <div style={{ width: 170, height: 94, border: '2px dashed #B9B3A9', borderRadius: 6, background: 'rgba(255,255,255,.45)' }} />;

// Lados da divisória no desenho da mesa (antes de girar).
// Automático: 1 divisória à esquerda do desenho, 2 ou mais dos dois lados.
// Escolha manual é na tela: com a mesa girada 180°, esquerda e direita se invertem no desenho.
const partitionSides = (count: number, side: PartitionSide | undefined, rot: number) => {
  if (count === 0) return { left: false, right: false };
  if (!side) return { left: true, right: count >= 2 };
  const screen = { left: side === 'LEFT' || side === 'BOTH', right: side === 'RIGHT' || side === 'BOTH' };
  return ((rot % 360) + 360) % 360 === 180 ? { left: screen.right, right: screen.left } : screen;
};
const PARTITION_SIDE_LABEL: Record<PartitionSide | 'AUTO', string> = { AUTO: 'Automático', LEFT: 'Esquerda', RIGHT: 'Direita', BOTH: 'Dos dois lados', NONE: 'Sem divisória' };

// Rótulo + móvel girado — compartilhado pela planta e pela visão geral.
const TileBody = ({ st, kind, state, sub, assets, rot, animate, partitionSide }: { st: Station; kind: TileKind; state: TileState; sub: string; assets: Asset[]; rot: number; animate: boolean; partitionSide?: PartitionSide | 'AUTO' }) => (
  <>
    {/* Cartão branco: o rótulo precisa continuar legível sobre pisos escuros (carpete). */}
    <div className="mb-1.5 inline-block max-w-full rounded-md border border-[#DCD7CF] bg-white/95 px-2 py-0.5 shadow-sm">
      <div className="text-[12px] font-semibold leading-tight" style={{ color: state === 'search' ? '#5B4A28' : state === 'attention' ? '#B4342B' : '#1B2430' }}>{st.code}</div>
      <div className="truncate text-[11px] leading-tight" style={{ color: state === 'search' ? '#8A6E32' : state === 'attention' ? '#B4342B' : '#5C6675', fontFamily: state === 'search' ? "'IBM Plex Mono', monospace" : undefined }}>{sub}</div>
    </div>
    <div style={{ transform: `rotate(${rot}deg)`, transformOrigin: 'center', transition: animate ? 'transform .15s ease' : undefined }}>
      {kind === 'workstation' && <Workstation assets={assets} state={state} sides={partitionSides(partsOf(assets).partitions, partitionSide === 'AUTO' ? undefined : partitionSide ?? st.partitionSide, rot)} />}
      {kind === 'cabinet' && <Cabinet />}
      {kind === 'empty' && <EmptySlot />}
    </div>
    {kind === 'workstation' && <OtherItems assets={assets} />}
  </>
);

const IllustratedMap = ({ search = '', activeSpaceName, spaceId = null, editing = false, positions, rotations, onDragEnd, onRotate, partitionSideOverrides = {}, onPartitionSide, onStationClick, onAssetClick, furniture = [], selectedFurnId = null, onFurnitureChange, onSelectFurn, wallDraw = false }: Props) => {
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
  const linkedStationIds = new Set(furniture.map((item) => item.stationId).filter((id): id is string => !!id));
  const mapStations = allStations.filter((s) => s.spaceId === spaceId);
  const stations = mapStations.filter((s) => !linkedStationIds.has(s.id));
  const tiles = stations.map((st, idx) => {
    const t = makeTile(st);
    const pos: Pos = positions[st.id] ?? (st.positionX != null && st.positionY != null ? { x: st.positionX, y: st.positionY } : { x: 30 + (idx % 4) * 230, y: 60 + Math.floor(idx / 4) * 280 });
    return { ...t, pos };
  });

  const linkedFurniture = furniture.map((item) => {
    const station = item.stationId ? allStations.find((candidate) => candidate.id === item.stationId) : undefined;
    const stationAssets = station ? getAssetsForStation(station.id) : [];
    const furnitureAsset = item.assetId ? useInventoryStore.getState().assets.find((asset) => asset.id === item.assetId) : undefined;
    const employee = station ? getEmployeeForStation(station.id) : undefined;
    return { item, station, stationAssets, furnitureAsset, employee };
  }).filter((entry) => entry.station || entry.furnitureAsset);
  // Um móvel cujo patrimônio já está vinculado a uma estação não conta duas vezes.
  const assignedAssetIds = new Set(useInventoryStore.getState().assignments.filter((a) => a.status === 'ACTIVE').map((a) => a.assetId));
  const totalItems = tiles.reduce((s, t) => s + t.count, 0)
    + linkedFurniture.reduce((sum, entry) => sum + entry.stationAssets.length + (entry.furnitureAsset && !assignedAssetIds.has(entry.furnitureAsset.id) ? 1 : 0), 0);
  const canvasH = Math.max(560, ...tiles.map((t) => t.pos.y + 300), ...furniture.map((f) => f.y + f.height + 40));
  const canvasW = Math.max(1060, ...tiles.map((t) => t.pos.x + TILE_W + 60), ...furniture.map((f) => f.x + f.width + 60));

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
      {mapStations.length === 0 && !editing ? (
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
            style={{
              width: canvasW,
              height: canvasH,
              ...(editing ? {
                backgroundImage: [
                  'linear-gradient(rgba(0,35,75,.11) 1px, transparent 1px)',
                  'linear-gradient(90deg, rgba(0,35,75,.11) 1px, transparent 1px)',
                  'linear-gradient(rgba(0,35,75,.045) 1px, transparent 1px)',
                  'linear-gradient(90deg, rgba(0,35,75,.045) 1px, transparent 1px)',
                ].join(', '),
                backgroundSize: `${GRID * 5}px ${GRID * 5}px, ${GRID * 5}px ${GRID * 5}px, ${GRID}px ${GRID}px, ${GRID}px ${GRID}px`,
              } : {}),
            }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onClick={() => { if (editing) onSelectFurn?.(null); }}
          >
            {/* Camada de mobília do ambiente, atrás das estações */}
            <EnvironmentLayer items={furniture} editing={editing} selectedId={selectedFurnId} onSelect={(id) => onSelectFurn?.(id)} onChange={(its) => onFurnitureChange?.(its)} canvasRef={canvasRef} />
            {/* Paredes desenhadas por cantos (polilinha, emendas limpas + cotas) */}
            <WallLayer furniture={furniture} editing={editing} wallDraw={wallDraw} selectedId={selectedFurnId} canvasW={canvasW} canvasH={canvasH} newId={makeFurnId} onSelect={(id) => onSelectFurn?.(id)} onChange={(its) => onFurnitureChange?.(its)} />
            {!editing && linkedFurniture.map(({ item, station, stationAssets, furnitureAsset, employee }) => {
              const stationMatches = !!q && !!station && [station.code, station.name, employee?.fullName, ...stationAssets.flatMap((asset) => [asset.assetCode, asset.description])]
                .some((value) => value?.toLowerCase().includes(q));
              const assetMatches = !!q && !!furnitureAsset && [furnitureAsset.assetCode, furnitureAsset.description, furnitureAsset.type]
                .some((value) => value.toLowerCase().includes(q));
              const highlighted = stationMatches || assetMatches;
              const primaryAction = station ? () => onStationClick(station.id) : furnitureAsset && onAssetClick ? () => onAssetClick(furnitureAsset.id) : undefined;
              const occupant = employee?.fullName ?? (station?.name && station.name !== station.code ? station.name : undefined);
              // Área clicável = caixa do móvel já girado (ex.: divisória em pé, rotação 90°).
              const rad = ((item.rotation || 0) * Math.PI) / 180;
              const boxW = Math.abs(item.width * Math.cos(rad)) + Math.abs(item.height * Math.sin(rad));
              const boxH = Math.abs(item.width * Math.sin(rad)) + Math.abs(item.height * Math.cos(rad));
              const boxX = item.x + item.width / 2 - boxW / 2;
              const boxY = item.y + item.height / 2 - boxH / 2;
              return (
                <div key={`linked-${item.id}`} className="absolute z-[6]" style={{ left: boxX, top: boxY, width: boxW, height: boxH }}>
                  <button
                    type="button"
                    onClick={primaryAction}
                    className={cn('absolute inset-0 rounded-md border-2 border-transparent transition hover:border-[#8A6E32]/55 hover:bg-brass/[0.04]', highlighted && 'border-[#8A6E32] bg-brass/[0.08]')}
                    title={station ? `Abrir ${station.code}` : furnitureAsset ? `Abrir patrimônio ${furnitureAsset.assetCode}` : undefined}
                    aria-label={station ? `Abrir ponto de trabalho ${station.code}` : furnitureAsset ? `Abrir patrimônio ${furnitureAsset.assetCode}` : 'Abrir móvel'}
                  />
                  <div className="absolute bottom-full left-1/2 mb-1 min-w-max -translate-x-1/2 rounded-md border border-border bg-white/95 px-2 py-1 shadow-sm">
                    {station && <button type="button" onClick={() => onStationClick(station.id)} className="block text-left">
                      <span className="block text-[12px] font-semibold text-[#1B2430]">{station.code}</span>
                      <span className="block text-[10px] text-[#8A9099]">{stationAssets.length} {stationAssets.length === 1 ? 'item' : 'itens'}{occupant ? ` · ${occupant}` : ''}</span>
                    </button>}
                    {furnitureAsset && station && <button type="button" onClick={(event) => { event.stopPropagation(); onAssetClick?.(furnitureAsset.id); }} className="mt-0.5 block text-[9px] font-medium text-[#8A6E32] hover:underline">Móvel · patrimônio {furnitureAsset.assetCode}</button>}
                    {furnitureAsset && !station && <button type="button" onClick={(event) => { event.stopPropagation(); onAssetClick?.(furnitureAsset.id); }} className="block text-left" title={`${furnitureAsset.description} · patrimônio ${furnitureAsset.assetCode}`}>
                      <span className="block text-[11px] font-semibold leading-tight text-[#1B2430]">{furnitureAsset.assetCode}</span>
                      <span className="block text-[9px] leading-tight text-[#5C6675]">{furnitureAsset.description}</span>
                    </button>}
                  </div>
                </div>
              );
            })}
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
                {editing && kind === 'workstation' && partsOf(assets).partitions > 0 && (
                  <button
                    title="Trocar o lado da divisória"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); onPartitionSide?.(st.id); }}
                    className="absolute right-9 top-1 z-10 rounded-md border border-[#DCD7CF] bg-white/95 px-1.5 py-0.5 text-[10px] font-medium text-[#5C6675] shadow-sm hover:border-[#00234B]/40 hover:text-[#00234B]"
                  >
                    Divisória: {PARTITION_SIDE_LABEL[partitionSideOverrides[st.id] ?? st.partitionSide ?? 'AUTO']}
                  </button>
                )}
                <TileBody st={st} kind={kind} state={state} sub={sub} assets={assets} rot={rot} animate={dragId !== st.id} partitionSide={partitionSideOverrides[st.id]} />
              </div>
            ))}
          </div>

          <div className="mt-4 flex w-fit flex-wrap items-center gap-4 rounded-[9px] border border-[#DCD7CF] bg-white/95 px-4 py-2.5 text-[12px] text-[#5C6675]">
            <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-[3px] border-2 border-[#8A6E32]" />Resultado da busca</span>
            <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-[3px] border-2 border-[#B4342B]" />Requer atenção</span>
            <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-[3px] border-2 border-dashed border-[#B9B3A9]" />Vaga livre</span>
            {editing && !wallDraw && <span className="text-[#8A6E32]">Grade: 1 quadrado = 20 px · paredes e portas encaixam nas linhas · a planta cresce conforme você espalha</span>}
            {editing && wallDraw && <span className="text-[#8A6E32]">Clique em cada canto da parede · Shift libera o ângulo · Enter, duplo clique ou botão direito conclui · clique no 1º ponto fecha a sala · Esc sai</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default IllustratedMap;
