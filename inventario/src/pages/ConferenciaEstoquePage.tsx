import { checkLabel, conferenceDate } from "@/components/ConferenceHistory";
import { AuthImage } from "@/components/AuthImage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useInventoryStore } from "@/features/inventory-map/store/useInventoryStore";
import type { Asset, CheckResult, DivergenceType } from "@/features/inventory-map/types/inventoryMap.types";
import { inventoryApi, type ApiHistoryEvent, type ApiPhysicalCheck, type ApiUnregisteredStockItem } from "@/lib/inventory-api";
import { AlertTriangle, ArrowLeft, Camera, Check, CheckCircle2, Link2, Loader2, PackagePlus, Plus, Search, Trash2, Warehouse, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const DIVERGENCIAS: { value: DivergenceType; label: string }[] = [
  { value: "WRONG_LOCATION", label: "Localização/cadastro incorreto" },
  { value: "WRONG_DESCRIPTION", label: "Descrição incorreta" },
  { value: "NO_TAG", label: "Sem etiqueta" },
  { value: "DAMAGED", label: "Danificado" },
  { value: "DISPOSED_FOUND", label: "Baixado mas encontrado" },
  { value: "NEW_UNREGISTERED", label: "Novo / não cadastrado" },
];

const resultDot = (result?: CheckResult) =>
  result === "FOUND" ? "#2F7A54" : result === "DIVERGENCE" ? "#A87413" : result === "NOT_FOUND" ? "#B4342B" : "#D8D3CA";

const ConferenciaEstoquePage = () => {
  const navigate = useNavigate();
  const assets = useInventoryStore((state) => state.assets);
  const recordCheck = useInventoryStore((state) => state.recordCheck);
  const [checks, setChecks] = useState<ApiPhysicalCheck[]>([]);
  const [finalizations, setFinalizations] = useState<ApiHistoryEvent[]>([]);
  const [unregisteredItems, setUnregisteredItems] = useState<ApiUnregisteredStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(60);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [foundAsset, setFoundAsset] = useState<Asset | null>(null);
  const [divAsset, setDivAsset] = useState<Asset | null>(null);
  const [divType, setDivType] = useState<DivergenceType>("WRONG_LOCATION");
  const [divNote, setDivNote] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [newItemType, setNewItemType] = useState("Teclado");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemManufacturer, setNewItemManufacturer] = useState("");
  const [newItemModel, setNewItemModel] = useState("");
  const [newItemSerial, setNewItemSerial] = useState("");
  const [newItemNotes, setNewItemNotes] = useState("");
  const [resolveItem, setResolveItem] = useState<ApiUnregisteredStockItem | null>(null);
  const [resolveCode, setResolveCode] = useState("");
  const [pendingPhotoTarget, setPendingPhotoTarget] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingPhotoInputRef = useRef<HTMLInputElement>(null);

  const stockAssets = useMemo(() => assets
    .filter((asset) => asset.status !== "DISPOSED" && asset.status !== "VOIDED")
    .filter((asset) => asset.status === "IN_STOCK" || !asset.stationId)
    .sort((a, b) => a.assetCode.localeCompare(b.assetCode, "pt-BR", { numeric: true })), [assets]);

  const latestFinalization = finalizations[0];
  const currentChecks = useMemo(() => {
    const cutoff = latestFinalization?.timestamp ? new Date(latestFinalization.timestamp).getTime() : 0;
    const stockIds = new Set(stockAssets.map((asset) => Number(asset.id)));
    const latest = new Map<number, ApiPhysicalCheck>();
    checks.forEach((check) => {
      if (!stockIds.has(check.assetId) || new Date(check.checkedAt).getTime() <= cutoff || latest.has(check.assetId)) return;
      latest.set(check.assetId, check);
    });
    return latest;
  }, [checks, latestFinalization?.timestamp, stockAssets]);

  const reloadHistory = useCallback(async () => {
    const [nextChecks, nextFinalizations, nextUnregistered] = await Promise.all([
      inventoryApi.stockChecks(),
      inventoryApi.stockFinalizations(),
      inventoryApi.listUnregisteredStockItems(),
    ]);
    setChecks(nextChecks);
    setFinalizations(nextFinalizations);
    setUnregisteredItems(nextUnregistered);
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([inventoryApi.stockChecks(), inventoryApi.stockFinalizations(), inventoryApi.listUnregisteredStockItems()])
      .then(([nextChecks, nextFinalizations, nextUnregistered]) => {
        if (!active) return;
        setChecks(nextChecks);
        setFinalizations(nextFinalizations);
        setUnregisteredItems(nextUnregistered);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Falha ao carregar o estoque"))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filteredAssets = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return stockAssets;
    return stockAssets.filter((asset) => [asset.assetCode, asset.description, asset.manufacturer, asset.model]
      .some((value) => value?.toLowerCase().includes(needle)));
  }, [query, stockAssets]);
  const visibleAssets = filteredAssets.slice(0, visibleLimit);
  const pendingItems = useMemo(() => unregisteredItems.filter((item) => item.status === "PENDING"), [unregisteredItems]);
  const registeredItems = useMemo(() => unregisteredItems.filter((item) => item.status === "REGISTERED"), [unregisteredItems]);
  const filteredPendingItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return pendingItems;
    return pendingItems.filter((item) => [item.provisionalCode, item.type, item.description, item.manufacturer, item.model, item.serialNumber]
      .some((value) => value?.toLowerCase().includes(needle)));
  }, [pendingItems, query]);

  useEffect(() => setVisibleLimit(60), [query]);

  const triggerCamera = () => fileInputRef.current?.click();
  const onPickPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length) setPhotos((current) => [...current, ...files]);
    event.target.value = "";
  };
  const removePhoto = (index: number) => setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index));
  const closeDialogs = () => {
    setFoundAsset(null);
    setDivAsset(null);
    setDivNote("");
    setDivType("WRONG_LOCATION");
    setPhotos([]);
  };
  const uploadPhotos = async (checkId?: number) => {
    if (!checkId) return;
    for (const photo of photos) await inventoryApi.uploadCheckPhoto(checkId, photo);
  };

  const resetNewItem = () => {
    setNewItemOpen(false);
    setNewItemType("Teclado");
    setNewItemDescription("");
    setNewItemManufacturer("");
    setNewItemModel("");
    setNewItemSerial("");
    setNewItemNotes("");
    setPhotos([]);
  };

  const createUnregisteredItem = async () => {
    if (!newItemType.trim() || !newItemDescription.trim() || photos.length === 0) return;
    setUploading(true);
    try {
      const item = await inventoryApi.createUnregisteredStockItem({
        type: newItemType.trim(),
        description: newItemDescription.trim(),
        manufacturer: newItemManufacturer.trim() || undefined,
        model: newItemModel.trim() || undefined,
        serialNumber: newItemSerial.trim() || undefined,
        notes: newItemNotes.trim() || undefined,
      });
      for (const photo of photos) await inventoryApi.uploadUnregisteredStockItemPhoto(item.id, photo);
      await reloadHistory();
      toast.success(`${item.provisionalCode} salvo como cadastro pendente · ${photos.length} foto(s)`);
      resetNewItem();
    } catch (error) {
      await reloadHistory().catch(() => undefined);
      toast.error(error instanceof Error ? error.message : "Falha ao salvar item sem cadastro");
    } finally {
      setUploading(false);
    }
  };

  const addPendingPhotos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!pendingPhotoTarget || files.length === 0) return;
    setBusyId(`pending-${pendingPhotoTarget}`);
    try {
      for (const file of files) await inventoryApi.uploadUnregisteredStockItemPhoto(pendingPhotoTarget, file);
      await reloadHistory();
      toast.success(`${files.length} foto(s) adicionada(s)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao enviar fotos");
    } finally {
      setBusyId(null);
      setPendingPhotoTarget(null);
    }
  };

  const confirmResolve = async () => {
    if (!resolveItem || !resolveCode.trim()) return;
    setBusyId(`pending-${resolveItem.id}`);
    try {
      await inventoryApi.resolveUnregisteredStockItem(resolveItem.id, resolveCode.trim());
      await reloadHistory();
      toast.success(`${resolveItem.provisionalCode} vinculado ao patrimônio ${resolveCode.trim()}`);
      setResolveItem(null);
      setResolveCode("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao vincular patrimônio");
    } finally {
      setBusyId(null);
    }
  };

  const confirmFound = async () => {
    if (!foundAsset || photos.length === 0) return;
    setBusyId(foundAsset.id);
    setUploading(true);
    try {
      const result = await recordCheck(foundAsset.id, {
        result: "FOUND",
        stationId: null,
        note: foundAsset.status === "IN_STOCK"
          ? "Conferência física do Estoque TI"
          : "Conferência do Estoque TI: patrimônio sem vínculo ativo",
      });
      if (!result.ok) throw new Error(result.error || "Falha ao registrar conferência");
      await uploadPhotos(result.checkId);
      await reloadHistory();
      toast.success(`${foundAsset.assetCode} encontrado no Estoque TI · ${photos.length} foto(s)`);
      closeDialogs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao registrar conferência");
    } finally {
      setUploading(false);
      setBusyId(null);
    }
  };

  const confirmDivergence = async () => {
    if (!divAsset || photos.length === 0) return;
    setBusyId(divAsset.id);
    setUploading(true);
    try {
      const result = await recordCheck(divAsset.id, {
        result: "DIVERGENCE",
        divergenceType: divType,
        stationId: null,
        note: divNote.trim() || "Divergência identificada no Estoque TI",
      });
      if (!result.ok) throw new Error(result.error || "Falha ao registrar divergência");
      await uploadPhotos(result.checkId);
      await reloadHistory();
      toast.success(`Divergência registrada para ${divAsset.assetCode}`);
      closeDialogs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao registrar divergência");
    } finally {
      setUploading(false);
      setBusyId(null);
    }
  };

  const markNotFound = async (asset: Asset) => {
    setBusyId(asset.id);
    try {
      const result = await recordCheck(asset.id, {
        result: "NOT_FOUND",
        stationId: null,
        note: "Não localizado durante a conferência do Estoque TI",
      });
      if (!result.ok) throw new Error(result.error || "Falha ao registrar");
      await reloadHistory();
      toast.success(`${asset.assetCode} marcado como não localizado`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao registrar");
    } finally {
      setBusyId(null);
    }
  };

  const finalize = async () => {
    setFinalizing(true);
    try {
      await inventoryApi.finalizeStockConference();
      toast.success("Conferência do Estoque TI finalizada");
      navigate("/conferencia");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao finalizar estoque");
    } finally {
      setFinalizing(false);
    }
  };

  const photoSection = (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Fotos (prova)</Label>
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-[12px]" onClick={triggerCamera}>
          <Camera className="h-4 w-4" />Tirar foto
        </Button>
      </div>
      {photos.length === 0 ? <p className="text-[11px] font-medium text-brass">Foto obrigatória: equipamento e etiqueta patrimonial.</p> : (
        <div className="flex flex-wrap gap-2">
          {photos.map((photo, index) => (
            <div key={`${photo.name}-${index}`} className="relative h-16 w-16 overflow-hidden rounded-md border border-border">
              <img src={URL.createObjectURL(photo)} alt={`foto ${index + 1}`} className="h-full w-full object-cover" />
              <button type="button" onClick={() => removePhoto(index)} aria-label="Remover foto" className="absolute right-0 top-0 rounded-bl bg-black/60 p-0.5 text-white">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-paper pb-20">
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={onPickPhoto} />
      <input ref={pendingPhotoInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(event) => void addPendingPhotos(event)} />
      <header className="sticky top-0 z-10 bg-primary px-3 py-3 text-white">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/conferencia")} className="rounded-md p-1.5 text-white/80 hover:bg-white/10"><ArrowLeft className="h-5 w-5" /></button>
          <Warehouse className="h-5 w-5 text-champagne" />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-champagne">ESTOQUE TI</div>
            <div className="truncate text-[12px] text-white/80">Em estoque e patrimônios sem vínculo</div>
          </div>
          <div className="text-right text-[13px] font-semibold">{currentChecks.size}/{stockAssets.length}</div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-champagne transition-all" style={{ width: `${stockAssets.length ? Math.round(currentChecks.size / stockAssets.length * 100) : 0}%` }} />
        </div>
      </header>

      <div className="sticky top-[76px] z-10 border-b border-border bg-card px-3 py-2">
        <div className="relative flex h-10 items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground/70" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar patrimônio no estoque" className="h-10 bg-paper-2 pl-9 text-sm" />
        </div>
      </div>

      <main className="flex-1 space-y-2 p-3">
        <div className="rounded-lg border border-brass/30 bg-brass/[0.06] p-2.5 text-[11px] text-muted-foreground">
          A conferência aqui não vincula nem transfere o patrimônio para uma estação. Itens sem vínculo aparecem para você corrigir o cadastro depois.
        </div>
        <Button
          variant="outline"
          className="h-12 w-full justify-start border-brass/50 bg-brass/[0.07] text-left"
          onClick={() => { setPhotos([]); setNewItemOpen(true); }}
        >
          <PackagePlus className="mr-2 h-5 w-5 text-brass" />
          <span><strong>Item sem cadastro</strong><span className="block text-[11px] font-normal text-muted-foreground">Fotografar agora e cadastrar o patrimônio depois</span></span>
          {pendingItems.length > 0 && <span className="ml-auto rounded-full bg-brass px-2 py-0.5 text-xs text-white">{pendingItems.length}</span>}
        </Button>
        {filteredPendingItems.map((item) => (
          <div key={`pending-${item.id}`} className="rounded-xl border border-brass/40 bg-brass/[0.04] p-3">
            <div className="flex items-start gap-2.5">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brass" />
              <div className="min-w-0 flex-1">
                <div className="num-mono text-[13px] font-semibold text-brass">{item.provisionalCode} · CADASTRO PENDENTE</div>
                <div className="text-[12px] font-medium text-ink">{item.type} · {item.description}</div>
                {(item.manufacturer || item.model) && <div className="text-[11px] text-muted-foreground">{[item.manufacturer, item.model].filter(Boolean).join(" · ")}</div>}
                <div className="mt-1 text-[11px] text-muted-foreground">{item.photos.length} foto(s) · encontrado por {item.foundBy || "sistema"} em {conferenceDate(item.foundAt)}</div>
                {item.photos.length > 0 && (
                  <div className="mt-2 flex gap-1.5 overflow-x-auto">
                    {item.photos.map((photo) => (
                      <AuthImage key={photo.id} path={`/unregistered-stock-item-photos/${photo.id}/file`} alt={photo.fileName} className="h-14 w-14 shrink-0 rounded-md border border-border object-cover" />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" disabled={busyId === `pending-${item.id}`} onClick={() => { setPendingPhotoTarget(item.id); setTimeout(() => pendingPhotoInputRef.current?.click(), 0); }}>
                <Camera className="mr-1.5 h-3.5 w-3.5" />Adicionar foto
              </Button>
              <Button variant="outline" size="sm" disabled={busyId === `pending-${item.id}`} onClick={() => { setResolveItem(item); setResolveCode(""); }}>
                <Link2 className="mr-1.5 h-3.5 w-3.5" />Vincular cadastro
              </Button>
            </div>
          </div>
        ))}
        {registeredItems.length > 0 && (
          <details className="rounded-xl border bg-card p-3">
            <summary className="cursor-pointer text-sm font-semibold">Itens pendentes já cadastrados · {registeredItems.length}</summary>
            <div className="mt-2 space-y-2">
              {registeredItems.slice(0, 20).map((item) => (
                <button key={item.id} type="button" className="w-full rounded-lg border p-2 text-left text-xs" onClick={() => item.registeredAssetId && navigate(`/patrimonios/${item.registeredAssetId}`)}>
                  <strong>{item.provisionalCode}</strong> → patrimônio <strong>{item.registeredAssetCode}</strong>
                  <span className="block text-muted-foreground">{item.type} · {item.description} · {item.photos.length} foto(s)</span>
                </button>
              ))}
            </div>
          </details>
        )}
        {latestFinalization && <p className="text-xs text-muted-foreground">Última finalização: {conferenceDate(latestFinalization.timestamp)}</p>}
        <details className="rounded-xl border bg-card p-3">
          <summary className="cursor-pointer text-sm font-semibold">Histórico do Estoque TI</summary>
          <div className="mt-2 space-y-2 text-xs text-muted-foreground">
            {finalizations.slice(0, 5).map((item) => <p key={`${item.timestamp}-${item.description}`}><strong>{item.description}</strong><br />{conferenceDate(item.timestamp)}</p>)}
            {finalizations.length === 0 && <p>Nenhuma finalização registrada.</p>}
          </div>
        </details>
        {loading && <p className="py-8 text-center text-sm text-muted-foreground">Carregando estoque...</p>}
        {!loading && visibleAssets.length === 0 && <p className="py-8 text-center text-sm italic text-muted-foreground">Nenhum patrimônio encontrado.</p>}
        {visibleAssets.map((asset) => {
          const check = currentChecks.get(Number(asset.id));
          const inconsistency = asset.status !== "IN_STOCK" || !!asset.stationId;
          return (
            <div key={asset.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start gap-2.5">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: resultDot(check?.result) }} />
                <div className="min-w-0 flex-1">
                  <div className="num-mono text-[13px] font-semibold text-primary">{asset.assetCode}</div>
                  <div className="text-[12px] text-muted-foreground">{asset.description}</div>
                  {inconsistency && <div className="mt-1 text-[11px] font-medium text-brass">{asset.stationId ? "Marcado em estoque, mas ainda vinculado" : "Sem vínculo ativo — revisar situação cadastral"}</div>}
                  <div className="mt-1 text-xs text-muted-foreground">{check ? `${checkLabel[check.result]} · ${conferenceDate(check.checkedAt)} · ${check.checkedBy}` : "Ainda não conferido neste ciclo"}</div>
                </div>
              </div>
              <div className="mt-2.5 grid grid-cols-3 gap-2">
                <button disabled={busyId === asset.id} onClick={() => { setFoundAsset(asset); setPhotos([]); }} className={`flex items-center justify-center gap-1 rounded-lg border py-2 text-[12px] font-medium ${check?.result === "FOUND" ? "border-success bg-success/10 text-success" : "border-border text-ink active:bg-paper-2"}`}>
                  <Check className="h-3.5 w-3.5" />Encontrado
                </button>
                <button disabled={busyId === asset.id} onClick={() => { setDivAsset(asset); setDivNote(""); setDivType("WRONG_LOCATION"); setPhotos([]); }} className={`flex items-center justify-center gap-1 rounded-lg border py-2 text-[12px] font-medium ${check?.result === "DIVERGENCE" ? "border-brass bg-brass/10 text-brass" : "border-border text-ink active:bg-paper-2"}`}>
                  <AlertTriangle className="h-3.5 w-3.5" />Divergência
                </button>
                <button disabled={busyId === asset.id} onClick={() => void markNotFound(asset)} className={`flex items-center justify-center gap-1 rounded-lg border py-2 text-[12px] font-medium ${check?.result === "NOT_FOUND" ? "border-danger bg-danger/10 text-danger" : "border-border text-ink active:bg-paper-2"}`}>
                  <X className="h-3.5 w-3.5" />Não achado
                </button>
              </div>
            </div>
          );
        })}
        {visibleAssets.length < filteredAssets.length && (
          <Button variant="outline" className="w-full" onClick={() => setVisibleLimit((current) => current + 60)}>
            Carregar mais · {visibleAssets.length}/{filteredAssets.length}
          </Button>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md border-t border-border bg-card p-3">
        <Button onClick={() => void finalize()} disabled={finalizing || !!busyId || uploading} className="h-12 w-full text-base font-semibold">
          {finalizing ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="mr-2 h-5 w-5" />Finalizar estoque · {currentChecks.size}/{stockAssets.length}</>}
        </Button>
      </footer>

      <Dialog open={!!foundAsset} onOpenChange={(open) => !open && closeDialogs()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Encontrado no estoque · {foundAsset?.assetCode}</DialogTitle></DialogHeader>
          <p className="text-[12px] text-muted-foreground">{foundAsset?.description}</p>
          {photoSection}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={closeDialogs} disabled={uploading}>Cancelar</Button>
            <Button size="sm" onClick={() => void confirmFound()} disabled={uploading || photos.length === 0}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar encontrado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!divAsset} onOpenChange={(open) => !open && closeDialogs()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Divergência no estoque · {divAsset?.assetCode}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de divergência</Label>
              <Select value={divType} onValueChange={(value) => setDivType(value as DivergenceType)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>{DIVERGENCIAS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Observação</Label><Textarea value={divNote} onChange={(event) => setDivNote(event.target.value)} rows={2} /></div>
            {photoSection}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={closeDialogs} disabled={uploading}>Cancelar</Button>
            <Button size="sm" onClick={() => void confirmDivergence()} disabled={uploading || photos.length === 0}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar divergência"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newItemOpen} onOpenChange={(open) => !open && !uploading && resetNewItem()}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-sm">
          <DialogHeader><DialogTitle>Novo item sem cadastro</DialogTitle></DialogHeader>
          <p className="text-[11px] text-muted-foreground">Será criado um código provisório. Nenhum número patrimonial será inventado.</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5"><Label className="text-xs">Tipo *</Label><Input value={newItemType} onChange={(event) => setNewItemType(event.target.value)} placeholder="Teclado" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Descrição *</Label><Input value={newItemDescription} onChange={(event) => setNewItemDescription(event.target.value)} placeholder="Teclado USB preto" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5"><Label className="text-xs">Fabricante</Label><Input value={newItemManufacturer} onChange={(event) => setNewItemManufacturer(event.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Modelo</Label><Input value={newItemModel} onChange={(event) => setNewItemModel(event.target.value)} /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Número de série</Label><Input value={newItemSerial} onChange={(event) => setNewItemSerial(event.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Observações</Label><Textarea value={newItemNotes} onChange={(event) => setNewItemNotes(event.target.value)} rows={2} placeholder="Estado, defeitos, etiqueta apagada..." /></div>
            {photoSection}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={resetNewItem} disabled={uploading}>Cancelar</Button>
            <Button size="sm" onClick={() => void createUnregisteredItem()} disabled={uploading || !newItemType.trim() || !newItemDescription.trim() || photos.length === 0}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 h-4 w-4" />Salvar pendente</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resolveItem} onOpenChange={(open) => { if (!open) { setResolveItem(null); setResolveCode(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Vincular cadastro · {resolveItem?.provisionalCode}</DialogTitle></DialogHeader>
          <p className="text-[12px] text-muted-foreground">Depois de cadastrar o patrimônio normalmente, informe aqui o número definitivo. As fotos e o histórico provisório serão preservados.</p>
          <div className="space-y-1.5"><Label className="text-xs">Número do patrimônio cadastrado</Label><Input value={resolveCode} onChange={(event) => setResolveCode(event.target.value)} placeholder="Ex.: 2041" autoFocus /></div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setResolveItem(null)}>Cancelar</Button>
            <Button size="sm" onClick={() => void confirmResolve()} disabled={!resolveCode.trim() || busyId === `pending-${resolveItem?.id}`}>
              {busyId === `pending-${resolveItem?.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar vínculo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConferenciaEstoquePage;
