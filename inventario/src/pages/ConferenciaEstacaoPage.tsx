import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Search, Check, AlertTriangle, X, Plus, Loader2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInventoryStore } from "@/features/inventory-map/store/useInventoryStore";
import type { Asset, AssetStatus, CheckResult, DivergenceType } from "@/features/inventory-map/types/inventoryMap.types";
import { toast } from "sonner";

const DIVERGENCIAS: { value: DivergenceType; label: string }[] = [
  { value: "WRONG_LOCATION", label: "Local diferente" },
  { value: "WRONG_OWNER", label: "Responsável diferente" },
  { value: "WRONG_DESCRIPTION", label: "Descrição incorreta" },
  { value: "NO_TAG", label: "Sem etiqueta" },
  { value: "DAMAGED", label: "Danificado" },
  { value: "DISPOSED_FOUND", label: "Baixado mas encontrado" },
  { value: "NEW_UNREGISTERED", label: "Novo / não cadastrado" },
];
const SITUACOES: { value: AssetStatus; label: string }[] = [
  { value: "ACTIVE", label: "Ativo" },
  { value: "IN_STOCK", label: "Em estoque" },
  { value: "MAINTENANCE", label: "Manutenção" },
  { value: "INACTIVE", label: "Inativo" },
];

const resultDot = (r?: CheckResult) =>
  r === "FOUND" ? "#2F7A54" : r === "DIVERGENCE" ? "#A87413" : r === "NOT_FOUND" ? "#B4342B" : "#D8D3CA";

const ConferenciaEstacaoPage = () => {
  const navigate = useNavigate();
  const { stationId = "" } = useParams();
  const stations = useInventoryStore((s) => s.stations);
  const getAssetsForStation = useInventoryStore((s) => s.getAssetsForStation);
  const getEmployeeForStation = useInventoryStore((s) => s.getEmployeeForStation);
  const recordCheck = useInventoryStore((s) => s.recordCheck);
  const finalizeConference = useInventoryStore((s) => s.finalizeConference);
  const addAsset = useInventoryStore((s) => s.addAsset);
  const linkAsset = useInventoryStore((s) => s.linkAsset);

  const station = useMemo(() => stations.find((s) => s.id === stationId), [stations, stationId]);
  const assets = station ? getAssetsForStation(station.id) : [];
  const employee = station ? getEmployeeForStation(station.id) : null;

  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  const [divAsset, setDivAsset] = useState<Asset | null>(null);
  const [divType, setDivType] = useState<DivergenceType>("WRONG_LOCATION");
  const [divNote, setDivNote] = useState("");
  const [divMove, setDivMove] = useState(false);

  const [novoOpen, setNovoOpen] = useState(false);
  const emptyNovo = { assetCode: "", type: "", manufacturer: "", model: "", serialNumber: "", status: "ACTIVE" as AssetStatus, notes: "" };
  const [novo, setNovo] = useState(emptyNovo);
  const [savingNovo, setSavingNovo] = useState(false);

  if (!station) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 bg-paper p-6 text-muted-foreground">
        <p className="text-sm">Estação não encontrada.</p>
        <Button variant="outline" onClick={() => navigate("/conferencia")}>Voltar</Button>
      </div>
    );
  }

  const checked = assets.filter((a) => a.lastCheckResult).length;
  const total = assets.length;
  const pct = total ? Math.round((checked / total) * 100) : 0;
  const query = q.trim().toLowerCase();
  const list = assets.filter((a) => !query || a.assetCode.toLowerCase().includes(query) || a.description.toLowerCase().includes(query));

  const mark = async (asset: Asset, result: CheckResult) => {
    setBusyId(asset.id);
    try {
      const res = await recordCheck(asset.id, { result, stationId: station.id });
      if (res.ok) toast.success(result === "FOUND" ? `${asset.assetCode} encontrado` : `${asset.assetCode} · não localizado`);
      else toast.error(res.error || "Falha ao registrar");
    } finally { setBusyId(null); }
  };

  const confirmDivergence = async () => {
    if (!divAsset) return;
    setBusyId(divAsset.id);
    try {
      const res = await recordCheck(divAsset.id, {
        result: "DIVERGENCE", divergenceType: divType, stationId: station.id,
        registerMovement: divMove, note: divNote.trim() || undefined,
      });
      if (res.ok) toast.success(`Divergência registrada para ${divAsset.assetCode}`);
      else toast.error(res.error || "Falha ao registrar divergência");
      setDivAsset(null); setDivNote(""); setDivMove(false); setDivType("WRONG_LOCATION");
    } finally { setBusyId(null); }
  };

  const createNovo = async () => {
    if (!novo.assetCode.trim() || !novo.type.trim()) { toast.error("Informe ao menos código e categoria"); return; }
    setSavingNovo(true);
    try {
      const description = [novo.type, novo.manufacturer, novo.model].map((s) => s.trim()).filter(Boolean).join(" ") || novo.type.trim();
      const id = await addAsset({
        assetCode: novo.assetCode.trim(), type: novo.type.trim(), description,
        manufacturer: novo.manufacturer.trim() || undefined, model: novo.model.trim() || undefined,
        serialNumber: novo.serialNumber.trim() || undefined, status: novo.status,
        notes: novo.notes.trim() || undefined,
      } as Omit<Asset, "id">);
      const linked = await linkAsset(id, station.id);
      if (!linked.ok) { toast.error(linked.error || "Patrimônio criado, mas falha ao vincular"); }
      await recordCheck(id, { result: "FOUND", stationId: station.id, note: "Cadastrado na conferência" });
      toast.success(`${novo.assetCode.trim()} cadastrado e vinculado`);
      setNovoOpen(false); setNovo(emptyNovo);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao cadastrar patrimônio");
    } finally { setSavingNovo(false); }
  };

  const finalize = async () => {
    setFinalizing(true);
    try {
      await finalizeConference(station.id);
      toast.success(`${station.code} conferida`);
      navigate("/conferencia");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao finalizar");
    } finally { setFinalizing(false); }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-paper pb-20">
      <header className="sticky top-0 z-10 bg-primary px-3 py-3 text-white">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/conferencia")} className="rounded-md p-1.5 text-white/80 hover:bg-white/10"><ArrowLeft className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1">
            <div className="num-mono text-[13px] font-semibold text-champagne">{station.code}</div>
            <div className="truncate text-[12px] text-white/80">{employee?.fullName ?? (station.name !== station.code ? station.name : "sem responsável")}</div>
          </div>
          <div className="text-right text-[13px] font-semibold">{checked}/{total}</div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-champagne transition-all" style={{ width: `${pct}%` }} />
        </div>
      </header>

      <div className="sticky top-[76px] z-10 border-b border-border bg-card px-3 py-2">
        <div className="relative flex h-10 items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground/70" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} inputMode="search"
            placeholder="Buscar patrimônio (código ou descrição)" className="h-10 bg-paper-2 pl-9 text-sm" />
        </div>
      </div>

      <main className="flex-1 space-y-2 p-3">
        {list.length === 0 && <p className="py-8 text-center text-sm italic text-muted-foreground">Nenhum patrimônio {query ? "encontrado" : "nesta estação"}.</p>}
        {list.map((a) => (
          <div key={a.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-start gap-2.5">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: resultDot(a.lastCheckResult) }} />
              <div className="min-w-0 flex-1">
                <div className="num-mono text-[13px] font-semibold text-primary">{a.assetCode}</div>
                <div className="text-[12px] text-muted-foreground">{a.description}</div>
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <button disabled={busyId === a.id} onClick={() => mark(a, "FOUND")}
                className={`flex items-center justify-center gap-1 rounded-lg border py-2 text-[12px] font-medium ${a.lastCheckResult === "FOUND" ? "border-success bg-success/10 text-success" : "border-border text-ink active:bg-paper-2"}`}>
                <Check className="h-3.5 w-3.5" />Encontrado
              </button>
              <button disabled={busyId === a.id} onClick={() => { setDivAsset(a); setDivType("WRONG_LOCATION"); setDivNote(""); setDivMove(false); }}
                className={`flex items-center justify-center gap-1 rounded-lg border py-2 text-[12px] font-medium ${a.lastCheckResult === "DIVERGENCE" ? "border-brass bg-brass/10 text-brass" : "border-border text-ink active:bg-paper-2"}`}>
                <AlertTriangle className="h-3.5 w-3.5" />Divergência
              </button>
              <button disabled={busyId === a.id} onClick={() => mark(a, "NOT_FOUND")}
                className={`flex items-center justify-center gap-1 rounded-lg border py-2 text-[12px] font-medium ${a.lastCheckResult === "NOT_FOUND" ? "border-danger bg-danger/10 text-danger" : "border-border text-ink active:bg-paper-2"}`}>
                <X className="h-3.5 w-3.5" />Não achado
              </button>
            </div>
          </div>
        ))}

        <button onClick={() => setNovoOpen(true)}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brass/40 py-3 text-sm font-medium text-brass-ink active:bg-brass/[0.05]">
          <Plus className="h-4 w-4" />Novo patrimônio
        </button>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md border-t border-border bg-card p-3">
        <Button onClick={finalize} disabled={finalizing} className="h-12 w-full text-base font-semibold">
          {finalizing ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="mr-2 h-5 w-5" />Finalizar estação · {checked}/{total}</>}
        </Button>
      </footer>

      {/* Divergência */}
      <Dialog open={!!divAsset} onOpenChange={(o) => !o && setDivAsset(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Divergência · {divAsset?.assetCode}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de divergência</Label>
              <Select value={divType} onValueChange={(v) => setDivType(v as DivergenceType)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>{DIVERGENCIAS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observação</Label>
              <Textarea value={divNote} onChange={(e) => setDivNote(e.target.value)} rows={2} placeholder="Detalhe a divergência (opcional)" />
            </div>
            {divType === "WRONG_LOCATION" && (
              <label className="flex items-center gap-2 rounded-lg border border-border bg-paper-2 px-3 py-2 text-[13px]">
                <input type="checkbox" checked={divMove} onChange={(e) => setDivMove(e.target.checked)} className="h-4 w-4 accent-primary" />
                Registrar movimentação para <strong>{station.code}</strong>
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDivAsset(null)}>Cancelar</Button>
            <Button size="sm" onClick={confirmDivergence} disabled={busyId === divAsset?.id}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Novo patrimônio */}
      <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-sm">
          <DialogHeader><DialogTitle>Novo patrimônio · {station.code}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Código *</Label><Input value={novo.assetCode} onChange={(e) => setNovo((f) => ({ ...f, assetCode: e.target.value }))} className="h-10" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Categoria *</Label><Input value={novo.type} onChange={(e) => setNovo((f) => ({ ...f, type: e.target.value }))} placeholder="Monitor, CPU…" className="h-10" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Fabricante</Label><Input value={novo.manufacturer} onChange={(e) => setNovo((f) => ({ ...f, manufacturer: e.target.value }))} className="h-10" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Modelo</Label><Input value={novo.model} onChange={(e) => setNovo((f) => ({ ...f, model: e.target.value }))} className="h-10" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Nº de série</Label><Input value={novo.serialNumber} onChange={(e) => setNovo((f) => ({ ...f, serialNumber: e.target.value }))} className="h-10" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Situação</Label>
                <Select value={novo.status} onValueChange={(v) => setNovo((f) => ({ ...f, status: v as AssetStatus }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>{SITUACOES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Observação</Label><Textarea value={novo.notes} onChange={(e) => setNovo((f) => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNovoOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={createNovo} disabled={savingNovo}>{savingNovo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cadastrar e vincular"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConferenciaEstacaoPage;
