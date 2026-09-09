import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Pencil, Trash2, Package, MapPin, Plus, Unlink, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useInventoryStore } from '@/features/inventory-map/store/useInventoryStore';
import type { StationStatus } from '@/features/inventory-map/types/inventoryMap.types';
import { toast } from 'sonner';
import StationResponsible from './StationResponsible';

const STATUS_LABELS: Record<StationStatus, string> = { ACTIVE: 'Ativa', INACTIVE: 'Inativa', MAINTENANCE: 'Manutenção' };
const STATUS_BADGE: Record<StationStatus, string> = {
  ACTIVE: 'border-success/30 bg-success/10 text-success',
  INACTIVE: 'border-border bg-muted text-muted-foreground',
  MAINTENANCE: 'border-brass/30 bg-brass/10 text-brass',
};
const ASSET_STATUS: Record<string, string> = { ACTIVE: 'Ativo', IN_STOCK: 'Em estoque', INACTIVE: 'Inativo', MAINTENANCE: 'Manutenção', DISPOSED: 'Baixado' };

const StationSheet = ({ stationId, onClose }: { stationId: string; onClose: () => void }) => {
  const navigate = useNavigate();
  const stations = useInventoryStore((s) => s.stations);
  const spaces = useInventoryStore((s) => s.spaces);
  const getAssetsForStation = useInventoryStore((s) => s.getAssetsForStation);
  const getEmployeeForStation = useInventoryStore((s) => s.getEmployeeForStation);
  const updateStation = useInventoryStore((s) => s.updateStation);
  const deleteStation = useInventoryStore((s) => s.deleteStation);
  const allAssets = useInventoryStore((s) => s.assets);
  const getStationForAsset = useInventoryStore((s) => s.getStationForAsset);
  const linkAsset = useInventoryStore((s) => s.linkAsset);
  const unlinkAsset = useInventoryStore((s) => s.unlinkAsset);

  const station = useMemo(() => stations.find((s) => s.id === stationId), [stations, stationId]);
  const assets = station ? getAssetsForStation(station.id) : [];
  const employee = station ? getEmployeeForStation(station.id) : null;

  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    code: station?.code ?? '', name: station?.name ?? '',
    status: (station?.status ?? 'ACTIVE') as StationStatus, spaceId: station?.spaceId ?? '',
  }));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [linking, setLinking] = useState<string | null>(null);

  // Só patrimônios sem estação: o mesmo item não pode estar vinculado a duas mesas.
  const available = useMemo(() => {
    const pq = pickerSearch.trim().toLowerCase();
    return allAssets
      .filter((a) => a.status !== 'DISPOSED' && !getStationForAsset(a.id))
      .filter((a) => !pq || a.assetCode.toLowerCase().includes(pq) || a.description.toLowerCase().includes(pq))
      .slice(0, 60);
  }, [allAssets, pickerSearch, getStationForAsset]);

  const place = async (assetId: string) => {
    setLinking(assetId);
    try {
      const res = await linkAsset(assetId, stationId);
      if (res && res.ok === false) toast.error(res.error || 'Falha ao vincular');
      else toast.success('Patrimônio vinculado');
    } finally { setLinking(null); }
  };
  const removeItem = async (assetId: string) => {
    try { await unlinkAsset(assetId); toast.success('Patrimônio desvinculado'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Falha ao desvincular'); }
  };

  if (!station) return null;

  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) { toast.error('Preencha código e nome'); return; }
    setSaving(true);
    try {
      await updateStation(station.id, { code: form.code.trim(), name: form.name.trim(), status: form.status, spaceId: form.spaceId || undefined });
      toast.success('Estação atualizada');
      setEditing(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha ao salvar'); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    try { await deleteStation(station.id); toast.success('Estação removida'); setConfirmDel(false); onClose(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Falha ao remover'); }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-primary/30" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[420px] flex-col border-l border-border bg-card shadow-2xl">
        <header className="flex items-center gap-3 border-b border-border bg-primary px-5 py-4 text-white">
          <MapPin className="h-4 w-4 text-champagne" />
          <div className="min-w-0 flex-1">
            <div className="num-mono text-[13px] text-champagne">{station.code}</div>
            <div className="truncate text-sm font-semibold">{station.name}</div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
        </header>

        <div className="flex-1 overflow-auto p-5">
          {editing ? (
            <div className="flex flex-col gap-4">
              <span className="label-mono">Editar estação</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Código</Label><Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Situação</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as StationStatus }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{(Object.keys(STATUS_LABELS) as StationStatus[]).map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Nome</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Espaço / mapa</Label>
                <Select value={form.spaceId || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, spaceId: v === 'none' ? '' : v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sem espaço" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Sem espaço</SelectItem>{spaces.map((sp) => <SelectItem key={sp.id} value={sp.id}>{sp.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={save} disabled={saving}>Salvar</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={STATUS_BADGE[station.status]}>{STATUS_LABELS[station.status]}</Badge>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" className="h-8" onClick={() => setEditing(true)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Editar</Button>
                  <Button size="sm" variant="outline" className="h-8 text-destructive hover:text-destructive" onClick={() => setConfirmDel(true)}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Remover</Button>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-[13px]">
                <div className="flex justify-between"><span className="text-muted-foreground">Espaço</span><span className="text-ink">{spaces.find((s) => s.id === station.spaceId)?.name ?? '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Itens</span><span className="text-ink">{assets.length}</span></div>
              </div>

              <StationResponsible key={station.id} stationId={station.id} />
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="label-mono">Patrimônios nesta estação</span>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPickerOpen((v) => !v)}><Plus className="mr-1 h-3 w-3" />Vincular</Button>
                </div>

                {pickerOpen && (
                  <div className="flex flex-col gap-2 rounded-lg border border-champagne/50 bg-brass/[0.04] p-2.5">
                    <div className="relative flex h-8 items-center">
                      <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground/70" />
                      <Input autoFocus placeholder="Buscar patrimônio para vincular" value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} className="h-8 bg-card pl-8 text-[13px]" />
                    </div>
                    <div className="max-h-52 overflow-auto">
                      {available.length === 0 && <p className="px-1 py-2 text-[12px] italic text-muted-foreground">Nenhum patrimônio livre — todos já estão vinculados a alguma estação. Desvincule em outra estação ou cadastre um novo.</p>}
                      {available.map((a) => (
                        <div key={a.id} className="flex items-center gap-2 border-b border-border/50 py-1.5 text-[12px] last:border-0">
                          <span className="num-mono text-primary">{a.assetCode}</span>
                          <span className="min-w-0 flex-1 truncate text-ink">{a.description}</span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">{a.type}</span>
                          <Button size="sm" variant="outline" className="h-6 shrink-0 px-2 text-[11px]" disabled={linking === a.id} onClick={() => place(a.id)}>Vincular</Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {assets.length === 0 && !pickerOpen && <p className="text-[13px] italic text-muted-foreground">Nenhum item vinculado — use “Vincular”.</p>}
                {assets.map((a) => (
                  <div key={a.id} className="flex items-center gap-2.5 rounded-lg border border-border bg-paper-2 px-3 py-2 text-[13px]">
                    <Package className="h-3.5 w-3.5 shrink-0 text-brass-ink" />
                    <button onClick={() => navigate(`/patrimonios/${a.id}`)} className="flex min-w-0 flex-1 items-center gap-2 text-left hover:text-primary">
                      <span className="num-mono text-primary">{a.assetCode}</span>
                      <span className="truncate text-ink">{a.description}</span>
                    </button>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{ASSET_STATUS[a.status] ?? a.status}</span>
                    <button title="Desvincular" onClick={() => removeItem(a.id)} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"><Unlink className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover estação {station.code}?</AlertDialogTitle>
            <AlertDialogDescription>Os itens vinculados serão desvinculados. Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default StationSheet;
