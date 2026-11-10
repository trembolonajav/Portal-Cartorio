import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Boxes, Search, Plus, Map as MapIcon, Pencil, Check, X, Link2 } from 'lucide-react';
import StationSheet from '@/components/inventory-map/StationSheet';
import IllustratedMap from '@/components/inventory-map/IllustratedMap';
import MapSelector, { isSelectableMap, spaceAncestors } from '@/components/inventory-map/MapSelector';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInventoryStore } from '@/features/inventory-map/store/useInventoryStore';
import { inventoryApi } from '@/lib/inventory-api';
import type { SpaceType, StationStatus, FurnitureItem, PartitionSide } from '@/features/inventory-map/types/inventoryMap.types';
import {
  BASIC_ENVIRONMENT_ITEMS,
  CUSTOM_FURNITURE_ITEMS,
  FLOOR_ITEMS,
  WALL_MODULE_ITEMS,
  type EnvironmentPaletteItem,
} from '@/features/inventory-map/data/environmentAssetLibrary';
import { toast } from 'sonner';

const SPACE_TYPE_LABELS: Record<SpaceType, string> = { UNIT: 'Unidade', BUILDING: 'Prédio', FLOOR: 'Andar', SECTOR: 'Departamento' };
const emptyStation = { code: '', name: '', status: 'ACTIVE' as StationStatus };
const defaultPos = (idx: number) => ({ x: 30 + (idx % 4) * 230, y: 60 + Math.floor(idx / 4) * 280 });

const newFurnId = () => `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const LINKABLE_FURNITURE = new Set(['cabinet', 'meeting', 'printer', 'mfp', 'phone', 'asset', 'partition']);
// Divisória só recebe o próprio patrimônio; não faz sentido usá-la como ponto de trabalho.
const ASSET_ONLY_FURNITURE = new Set(['partition']);
const PARTITION_ASSET_HINT = /divis[oó]ria|biombo|painel divis/i;
const FURNITURE_ASSET_HINT = /m[oó]vel|mobili[aá]rio|arm[aá]rio|mesa|cadeira|gaveteiro|estante|balc[aã]o|arquivo|rack|equipamento de escrit[oó]rio/i;
const TELEVISION_ASSET_HINT = /televisor|televis[aã]o|smart\s*tv|\btv\b|painel/i;
const PRINTER_ASSET_HINT = /impressora|printer|t[eé]rmica|recibo|selo|etiqueta/i;
const BIOMETRIC_ASSET_HINT = /biometr|hamster|fingertech|nitgen|hfdu06/i;
const AVA6_SCANNER_ASSET_HINT = /scanner.*ava\s*6|ava\s*6.*scanner|\bava6(?:plus)?\b/i;

const InventoryMapPage = () => {
  const spaces = useInventoryStore((s) => s.spaces);
  const stations = useInventoryStore((s) => s.stations);
  const assets = useInventoryStore((s) => s.assets);
  const assignments = useInventoryStore((s) => s.assignments);
  const addStation = useInventoryStore((s) => s.addStation);
  const updateStation = useInventoryStore((s) => s.updateStation);
  const refreshAll = useInventoryStore((s) => s.refreshAll);
  const loadFurniture = useInventoryStore((s) => s.loadFurniture);
  const saveFurniture = useInventoryStore((s) => s.saveFurniture);
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const [activeMap, setActiveMap] = useState<string>('all');
  const [search, setSearch] = useState('');

  // "Ver mapa deste espaço" (tela Espaços) abre já filtrado neste Andar/Departamento.
  useEffect(() => {
    const sid = searchParams.get('spaceId');
    setActiveMap(current => {
      const candidate = sid ?? current;
      return spaces.some(s => s.id === candidate && isSelectableMap(s)) ? candidate : 'all';
    });
  }, [searchParams, spaces]);
  const [sheetStationId, setSheetStationId] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [rotations, setRotations] = useState<Record<string, number>>({});
  const [partitionSides, setPartitionSides] = useState<Record<string, PartitionSide | 'AUTO'>>({});
  const [savingLayout, setSavingLayout] = useState(false);
  const [furniture, setFurniture] = useState<FurnitureItem[]>([]);
  const [selectedFurn, setSelectedFurn] = useState<string | null>(null);
  const [assetLibraryOpen, setAssetLibraryOpen] = useState(false);
  const [wallDraw, setWallDraw] = useState(false);

  // Mobília do ambiente por departamento (some no "Todos os espaços").
  useEffect(() => {
    if (activeMap === 'all') { setFurniture([]); return; }
    let alive = true;
    loadFurniture(activeMap).then((items) => {
      if (!alive) return;
      const currentStations = useInventoryStore.getState().stations;
      setFurniture(items.map((item) => ({
        ...item,
        stationId: item.stationId ?? currentStations.find((station) => station.layoutElementId === item.id)?.id,
      })));
    });
    return () => { alive = false; };
  }, [activeMap, loadFurniture]);

  const [mapOpen, setMapOpen] = useState(false);
  const [mapForm, setMapForm] = useState({ name: '', type: 'SECTOR' as SpaceType, parentId: '' });
  const [stationOpen, setStationOpen] = useState(false);
  const [stationForm, setStationForm] = useState(emptyStation);
  const [stationSpace, setStationSpace] = useState<string>('none');
  const [busy, setBusy] = useState(false);

  const activeSpaceName = activeMap === 'all' ? undefined : spaces.find((s) => s.id === activeMap)?.name;
  const visibleStations = useMemo(
    () => (activeMap === 'all' ? stations : stations.filter((s) => s.spaceId === activeMap)),
    [stations, activeMap],
  );

  const enterEdit = () => {
    const seed: Record<string, { x: number; y: number }> = {};
    const seedRot: Record<string, number> = {};
    visibleStations.forEach((st, idx) => {
      seed[st.id] = st.positionX != null && st.positionY != null ? { x: st.positionX, y: st.positionY } : defaultPos(idx);
      seedRot[st.id] = st.positionRotation ?? 0;
    });
    setPositions(seed);
    setRotations(seedRot);
    setEditing(true);
    setSheetStationId(null);
  };
  const cancelEdit = () => {
    setEditing(false); setPositions({}); setRotations({}); setPartitionSides({}); setSelectedFurn(null); setWallDraw(false);
    if (activeMap !== 'all') loadFurniture(activeMap).then(setFurniture);
  };
  const PARTITION_CYCLE: (PartitionSide | 'AUTO')[] = ['AUTO', 'LEFT', 'RIGHT', 'BOTH', 'NONE'];
  const cyclePartitionSide = (id: string) => setPartitionSides((current) => {
    const now = current[id] ?? stations.find((st) => st.id === id)?.partitionSide ?? 'AUTO';
    return { ...current, [id]: PARTITION_CYCLE[(PARTITION_CYCLE.indexOf(now) + 1) % PARTITION_CYCLE.length] };
  });
  const rotate = (id: string) => setRotations((r) => ({ ...r, [id]: ((r[id] ?? 0) + 90) % 360 }));

  // Mobília
  const addFurniture = (spec: EnvironmentPaletteItem) => {
    const id = newFurnId();
    const initialX = 40;
    const initialY = spec.kind === 'wall' ? 40 - spec.h / 2 : 40;
    setFurniture((f) => [...f, {
      id,
      kind: spec.kind,
      x: initialX,
      y: initialY,
      width: spec.w,
      height: spec.h,
      rotation: 0,
      label: spec.kind === 'label' ? 'SALA' : spec.label,
      assetKey: spec.assetKey,
      assetCrop: spec.assetCrop,
    }]);
    setSelectedFurn(id);
  };
  const setFurnLabel = (text: string) => setFurniture((f) => f.map((it) => (it.id === selectedFurn ? { ...it, label: text } : it)));
  const selectedFurnItem = furniture.find((it) => it.id === selectedFurn) || null;
  const selectedFurnitureIsLinkable = !!selectedFurnItem && LINKABLE_FURNITURE.has(selectedFurnItem.kind);
  const selectedFurnitureAsset = selectedFurnItem?.assetId ? assets.find((asset) => asset.id === selectedFurnItem.assetId) : undefined;
  const linkedStationIds = new Set(furniture.filter((item) => item.id !== selectedFurn).map((item) => item.stationId).filter(Boolean));
  const linkedFurnitureAssetIds = new Set(furniture.filter((item) => item.id !== selectedFurn).map((item) => item.assetId).filter(Boolean));
  const availableStations = visibleStations.filter((station) => !linkedStationIds.has(station.id));
  const selectedAssetHint = selectedFurnItem?.kind === 'partition'
    ? PARTITION_ASSET_HINT
    : selectedFurnItem?.assetKey === 'televisor-parede.png'
    ? TELEVISION_ASSET_HINT
    : selectedFurnItem?.assetKey === 'leitor-biometrico-hamster-dx.png'
      ? BIOMETRIC_ASSET_HINT
      : selectedFurnItem?.assetKey === 'scanner-ava6plus.png'
        ? AVA6_SCANNER_ASSET_HINT
    : selectedFurnItem?.kind === 'printer'
      ? PRINTER_ASSET_HINT
      : FURNITURE_ASSET_HINT;
  const availableFurnitureAssets = assets.filter((asset) => {
    if (asset.id === selectedFurnItem?.assetId) return true;
    if (asset.status === 'DISPOSED' || asset.status === 'VOIDED' || linkedFurnitureAssetIds.has(asset.id)) return false;
    // Mobiliário pode estar vinculado à estação (ex.: divisória do guichê) e ainda ser desenhado como móvel.
    const isFurnitureAsset = /mobili[aá]rio/i.test(asset.type);
    if (!isFurnitureAsset && assignments.some((assignment) => assignment.assetId === asset.id && assignment.status === 'ACTIVE')) return false;
    return selectedAssetHint.test(`${asset.type} ${asset.description}`);
  }).sort((a, b) => a.assetCode.localeCompare(b.assetCode));
  const assetStationCode = (assetId: string) => {
    const assignment = assignments.find((item) => item.assetId === assetId && item.status === 'ACTIVE');
    const station = assignment ? stations.find((item) => item.id === assignment.stationId) : undefined;
    return station ? (station.locationCode || station.code) : undefined;
  };
  const updateSelectedFurniture = (updates: Partial<FurnitureItem>) => {
    if (!selectedFurn) return;
    setFurniture((items) => items.map((item) => item.id === selectedFurn ? { ...item, ...updates } : item));
  };

  const saveLayout = async () => {
    setSavingLayout(true);
    try {
      // O layout é a fonte primária do vínculo. Salvá-lo primeiro evita que uma
      // estação aponte para um elemento ainda inexistente se a segunda etapa falhar.
      if (activeMap !== 'all') await saveFurniture(activeMap, furniture);
      for (const st of visibleStations) {
        const p = positions[st.id];
        const linkedFurniture = furniture.find((item) => item.stationId === st.id);
        if (p || linkedFurniture || st.layoutElementId || partitionSides[st.id]) await inventoryApi.updateStation(st.id, {
          code: st.code, name: st.name, locationCode: st.locationCode, description: st.description,
          status: st.status, observation: st.observation, spaceId: st.spaceId ? Number(st.spaceId) : null,
          layoutElementRef: linkedFurniture?.id ?? null,
          positionX: p?.x ?? st.positionX ?? null,
          positionY: p?.y ?? st.positionY ?? null,
          positionRotation: rotations[st.id] ?? st.positionRotation ?? 0,
          partitionSide: partitionSides[st.id],
        });
      }
      await refreshAll();
      toast.success('Planta salva');
      setEditing(false); setPositions({}); setRotations({}); setPartitionSides({}); setSelectedFurn(null); setWallDraw(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha ao salvar planta'); }
    finally { setSavingLayout(false); }
  };

  const createMap = async () => {
    if (!mapForm.name.trim()) { toast.error('Dê um nome ao mapa'); return; }
    if (!mapForm.parentId) { toast.error('Selecione o andar do mapa'); return; }
    setBusy(true);
    try {
      const created = await inventoryApi.createSpace({ name: mapForm.name.trim(), type: mapForm.type, parentId: mapForm.parentId ? Number(mapForm.parentId) : undefined });
      await refreshAll();
      setActiveMap(String(created.id));
      setMapOpen(false); setMapForm({ name: '', type: 'SECTOR', parentId: '' });
      toast.success('Mapa criado');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha ao criar mapa'); }
    finally { setBusy(false); }
  };

  const openNewStation = () => { setStationForm(emptyStation); setStationSpace(activeMap !== 'all' ? activeMap : 'none'); setStationOpen(true); };
  const createStation = async () => {
    if (!stationForm.code.trim() || !stationForm.name.trim()) { toast.error('Preencha código e nome'); return; }
    setBusy(true);
    try {
      await addStation({ code: stationForm.code.trim(), name: stationForm.name.trim(), status: stationForm.status, spaceId: stationSpace === 'none' ? undefined : stationSpace });
      setStationOpen(false);
      toast.success('Estação criada');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha ao criar estação'); }
    finally { setBusy(false); }
  };

  return (
    <AppShell
      active="mapa"
      search={
        <div className="relative flex h-[38px] w-full max-w-[420px] items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground/70" />
          <Input placeholder="Buscar patrimônio, estação ou pessoa no mapa" value={search} onChange={(e) => setSearch(e.target.value)} className="h-[38px] rounded-lg border-input bg-paper-2 pl-9 text-sm" />
        </div>
      }
      actions={
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Boxes className="h-4 w-4 text-brass-ink" />
          <span>{visibleStations.length} {visibleStations.length === 1 ? 'estação' : 'estações'}</span>
        </div>
      }
    >
      <div className="flex h-full flex-col">
        {/* Barra de ferramentas do mapa */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border bg-card px-4 py-2.5 md:px-6">
          <MapIcon className="h-4 w-4 text-brass-ink" />
          <span className="text-[13px] font-medium text-muted-foreground">Mapa:</span>
          <MapSelector spaces={spaces} value={activeMap} onChange={setActiveMap} disabled={editing} />

          {editing ? (
            <div className="flex flex-1 flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant={wallDraw ? 'default' : 'outline'}
                className={`h-8 px-2.5 text-[12px] ${wallDraw ? '' : 'border-brass/60 text-brass-ink'}`}
                onClick={() => { setWallDraw((v) => !v); setSelectedFurn(null); }}
                title="Desenhe paredes clicando em cada canto; elas se emendam e mostram as metragens"
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />{wallDraw ? 'Desenhando parede…' : 'Desenhar parede'}
              </Button>
              <span className="mx-1 h-5 w-px bg-border" />
              <span className="mr-1 text-[12px] font-medium text-muted-foreground">Mobília:</span>
              {BASIC_ENVIRONMENT_ITEMS.filter((p) => p.kind !== 'wall').map((p) => (
                <Button key={p.id} size="sm" variant="outline" className="h-8 px-2 text-[12px]" onClick={() => addFurniture(p)}>+ {p.label}</Button>
              ))}
              <Button size="sm" variant="outline" className="h-8 border-brass/60 px-2 text-[12px] text-brass-ink" onClick={() => setAssetLibraryOpen(true)}>
                <Boxes className="mr-1.5 h-3.5 w-3.5" />Biblioteca de ambiente
              </Button>
              <span className="hidden text-[11px] text-muted-foreground xl:inline">Encaixe: itens em 1 quadrado · paredes em ½ quadrado</span>
              {selectedFurnItem?.kind === 'label' && (
                <Input value={selectedFurnItem.label ?? ''} onChange={(e) => setFurnLabel(e.target.value)} placeholder="Nome da sala" className="h-8 w-36 text-xs" />
              )}
              <Button size="sm" variant="outline" className="ml-auto h-9" onClick={cancelEdit}><X className="mr-1.5 h-3.5 w-3.5" />Cancelar</Button>
              <Button size="sm" className="h-9" onClick={saveLayout} disabled={savingLayout}><Check className="mr-1.5 h-3.5 w-3.5" />Salvar planta</Button>
            </div>
          ) : (
            <>
              <Button size="sm" variant="outline" className="h-9" onClick={() => setMapOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />Novo mapa</Button>
              <Button size="sm" variant="outline" className="ml-auto h-9" onClick={enterEdit} disabled={activeMap === 'all'} title={activeMap === 'all' ? 'Selecione um mapa para editar a planta' : undefined}><Pencil className="mr-1.5 h-3.5 w-3.5" />Editar planta</Button>
              <Button size="sm" className="h-9" onClick={openNewStation}><Plus className="mr-1.5 h-3.5 w-3.5" />Nova estação</Button>
            </>
          )}
        </div>

        {editing && selectedFurnitureIsLinkable && selectedFurnItem && (
          <div className="flex flex-wrap items-end gap-3 border-b border-border bg-paper-2 px-4 py-3 md:px-6">
            {!ASSET_ONLY_FURNITURE.has(selectedFurnItem.kind) && <div className="min-w-[190px] flex-1 space-y-1.5">
              <Label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Link2 className="h-3.5 w-3.5" />Usar móvel como ponto de trabalho
              </Label>
              <Select value={selectedFurnItem.stationId ?? '_none'} onValueChange={(value) => updateSelectedFurniture({ stationId: value === '_none' ? undefined : value })}>
                <SelectTrigger className="h-9 bg-card text-sm"><SelectValue placeholder="Sem estação vinculada" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Somente móvel (sem estação)</SelectItem>
                  {availableStations.map((station) => <SelectItem key={station.id} value={station.id}>{station.code} — {station.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">A estação deixa de aparecer como mesa separada; este móvel passa a abrir seus itens.</p>
            </div>}
            <div className="min-w-[240px] flex-[1.4] space-y-1.5">
              <Label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Link2 className="h-3.5 w-3.5" />Patrimônio do próprio item
              </Label>
              <Select value={selectedFurnItem.assetId ?? '_none'} onValueChange={(value) => updateSelectedFurniture({ assetId: value === '_none' ? undefined : value })}>
                <SelectTrigger className="h-9 bg-card text-sm"><SelectValue placeholder="Sem patrimônio vinculado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sem patrimônio do item</SelectItem>
                  {availableFurnitureAssets.map((asset) => {
                    const where = assetStationCode(asset.id);
                    return <SelectItem key={asset.id} value={asset.id}>{asset.assetCode} — {asset.description}{where ? ` · ${where}` : ''}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {selectedFurnitureAsset ? `${selectedFurnitureAsset.assetCode} · ${selectedFurnitureAsset.type}` : availableFurnitureAssets.length ? 'Selecione o cadastro patrimonial correspondente ao item.' : 'Nenhum patrimônio compatível e livre foi encontrado.'}
              </p>
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1">
          <IllustratedMap
            search={search}
            spaceId={activeMap}
            activeSpaceName={activeSpaceName}
            editing={editing}
            positions={positions}
            rotations={rotations}
            onDragEnd={(id, x, y) => setPositions((p) => ({ ...p, [id]: { x, y } }))}
            onRotate={rotate}
            partitionSideOverrides={partitionSides}
            onPartitionSide={cyclePartitionSide}
            onStationClick={setSheetStationId}
            onAssetClick={(assetId) => navigate(`/patrimonios/${assetId}`)}
            furniture={furniture}
            selectedFurnId={selectedFurn}
            onFurnitureChange={setFurniture}
            onSelectFurn={setSelectedFurn}
            wallDraw={wallDraw}
          />
        </div>
      </div>

      {sheetStationId && <StationSheet stationId={sheetStationId} onClose={() => setSheetStationId(null)} />}

      {/* Biblioteca de móveis e módulos estruturais */}
      <Dialog open={assetLibraryOpen} onOpenChange={setAssetLibraryOpen}>
        <DialogContent className="max-h-[88vh] sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Biblioteca de ambiente</DialogTitle>
            <DialogDescription>Escolha um item para inserir no canto superior da planta. Depois, arraste, redimensione e gire livremente.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[64vh] pr-4">
            <div className="space-y-7 pb-3">
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Móveis</h3>
                    <p className="text-xs text-muted-foreground">Móveis e equipamentos recortados para montar a planta</p>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{CUSTOM_FURNITURE_ITEMS.length} itens</span>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {CUSTOM_FURNITURE_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { addFurniture(item); setAssetLibraryOpen(false); }}
                      className="group rounded-xl border border-border bg-card p-3 text-left transition hover:border-brass hover:bg-brass/5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-brass/50"
                    >
                      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border bg-paper-2 p-3">
                        {item.assetCrop ? (
                          <div
                            className="relative max-h-full w-24 overflow-hidden"
                            style={{ aspectRatio: `${item.assetCrop.width} / ${item.assetCrop.height}` }}
                          >
                            <img
                              src={`/pack/ambiente/${item.assetKey}`}
                              alt={item.label}
                              className="absolute h-auto max-w-none"
                              style={{
                                left: `${-(item.assetCrop.x / item.assetCrop.width) * 100}%`,
                                top: `${-(item.assetCrop.y / item.assetCrop.height) * 100}%`,
                                width: `${(item.assetCrop.sourceWidth / item.assetCrop.width) * 100}%`,
                              }}
                            />
                          </div>
                        ) : item.assetKey === 'televisor-parede.png' ? (
                          <div className="relative h-16 w-full overflow-hidden">
                            <img src={`/pack/ambiente/${item.assetKey}`} alt={item.label} className="absolute left-0 top-0 w-full transition-transform group-hover:scale-[1.03]" style={{ transform: 'translateY(-39.6%)' }} />
                          </div>
                        ) : item.assetKey === 'aparador-moderno-amplo.png' ? (
                          <div className="relative h-16 w-full overflow-hidden">
                            <img src={`/pack/ambiente/${item.assetKey}`} alt={item.label} className="absolute left-0 top-0 w-full" style={{ transform: 'translateY(-23.5%)' }} />
                          </div>
                        ) : item.assetKey === 'divisoria-vidro-madeira-marrom.png' ? (
                          <div className="relative h-16 w-full overflow-hidden">
                            <img src={`/pack/ambiente/${item.assetKey}`} alt={item.label} className="absolute left-0 top-0 w-full" style={{ transform: 'translateY(-42.35%)' }} />
                          </div>
                        ) : (
                          <img src={`/pack/ambiente/${item.assetKey}`} alt={item.label} className="max-h-full max-w-full object-contain transition-transform group-hover:scale-[1.03]" />
                        )}
                      </div>
                      <span className="mt-2 block text-xs font-medium text-foreground">{item.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Pisos</h3>
                    <p className="text-xs text-muted-foreground">Redimensione o piso para cobrir a área de cada sala</p>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{FLOOR_ITEMS.length} item</span>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {FLOOR_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { addFurniture(item); setAssetLibraryOpen(false); }}
                      className="group rounded-xl border border-border bg-card p-3 text-left transition hover:border-brass hover:bg-brass/5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-brass/50"
                    >
                      <div className="h-32 rounded-lg border border-border bg-[#071B31]" style={{ backgroundImage: `url(/pack/ambiente/${item.assetKey})`, backgroundRepeat: 'repeat', backgroundSize: '192px 128px' }} />
                      <span className="mt-2 block text-xs font-medium text-foreground">{item.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Paredes modulares</h3>
                    <p className="text-xs text-muted-foreground">Retas, cantos, curvas, junções e acabamentos independentes</p>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">36 módulos</span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {WALL_MODULE_ITEMS.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { addFurniture(item); setAssetLibraryOpen(false); }}
                      className="group rounded-lg border border-border bg-card p-2 text-center transition hover:border-brass hover:bg-brass/5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-brass/50"
                    >
                      <div className="flex h-20 items-center justify-center rounded-md bg-paper-2 p-2">
                        <img src={`/pack/ambiente/${item.assetKey}`} alt={item.label} className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105" />
                      </div>
                      <span className="mt-1.5 block text-[11px] font-medium text-muted-foreground">Módulo {String(index + 1).padStart(2, '0')}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Novo mapa */}
      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo mapa</DialogTitle>
            <DialogDescription>Um mapa é um espaço (setor, andar, unidade) com suas estações. Ex.: Procuração, Registro Civil.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5"><Label className="text-xs">Nome do mapa *</Label><Input value={mapForm.name} onChange={(e) => setMapForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex.: Procuração" className="h-9 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Andar *</Label>
              <Select value={mapForm.parentId} onValueChange={(parentId) => setMapForm(f => ({ ...f, parentId }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione o andar" /></SelectTrigger>
                <SelectContent>{spaces.filter(s => s.type === 'FLOOR').map(s => <SelectItem key={s.id} value={s.id}>{[...spaceAncestors(s, spaces).map(p => p.name), s.name].join(' › ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setMapOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={createMap} disabled={busy}>Criar mapa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nova estação */}
      <Dialog open={stationOpen} onOpenChange={setStationOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova estação</DialogTitle>
            <DialogDescription>Cadastre uma estação e vincule ao mapa. Ela entra como espaço tracejado; depois arraste os patrimônios para ela.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Código *</Label><Input value={stationForm.code} onChange={(e) => setStationForm((f) => ({ ...f, code: e.target.value }))} placeholder="INV-01" className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Situação</Label>
                <Select value={stationForm.status} onValueChange={(v) => setStationForm((f) => ({ ...f, status: v as StationStatus }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="ACTIVE">Ativa</SelectItem><SelectItem value="INACTIVE">Inativa</SelectItem><SelectItem value="MAINTENANCE">Em manutenção</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Nome *</Label><Input value={stationForm.name} onChange={(e) => setStationForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex.: Balcão 03" className="h-9 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Mapa / espaço</Label>
              <Select value={stationSpace} onValueChange={setStationSpace}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sem espaço" /></SelectTrigger>
                <SelectContent><SelectItem value="none">Sem espaço</SelectItem>{spaces.filter(isSelectableMap).map((sp) => <SelectItem key={sp.id} value={sp.id}>{sp.name} · {SPACE_TYPE_LABELS[sp.type]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setStationOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={createStation} disabled={busy}>Criar estação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default InventoryMapPage;
