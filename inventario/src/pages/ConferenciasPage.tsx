import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { AuthImage } from "@/components/AuthImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { inventoryApi, type ApiPhysicalCheck, type ApiConferenceFinalization, type CheckResult, type DivergenceType } from "@/lib/inventory-api";
import { useInventoryStore } from "@/features/inventory-map/store/useInventoryStore";
import { RefreshCw, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

const RESULT_META: Record<CheckResult, { label: string; cls: string; dot: string }> = {
  FOUND: { label: "Encontrado", cls: "bg-success/12 text-success border-success/30", dot: "#2F7A54" },
  DIVERGENCE: { label: "Divergência", cls: "bg-brass/12 text-brass border-brass/30", dot: "#A87413" },
  NOT_FOUND: { label: "Não localizado", cls: "bg-danger/12 text-danger border-danger/30", dot: "#B4342B" },
};

const DIVERGENCE_LABEL: Record<DivergenceType, string> = {
  WRONG_LOCATION: "Local diferente",
  WRONG_OWNER: "Responsável diferente",
  WRONG_DESCRIPTION: "Descrição incorreta",
  NO_TAG: "Sem etiqueta",
  DAMAGED: "Danificado",
  DISPOSED_FOUND: "Baixado mas encontrado",
  NEW_UNREGISTERED: "Novo / não cadastrado",
};

const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

type Tab = "checks" | "finalizations";

const ConferenciasPage = () => {
  const stations = useInventoryStore((s) => s.stations);
  const stationsSorted = useMemo(
    () => [...stations].sort((a, b) => a.code.localeCompare(b.code, "pt-BR")),
    [stations],
  );

  const [tab, setTab] = useState<Tab>("checks");
  const [rows, setRows] = useState<ApiPhysicalCheck[]>([]);
  const [finals, setFinals] = useState<ApiConferenceFinalization[]>([]);
  const [loading, setLoading] = useState(true);

  const [stationId, setStationId] = useState<string>("ALL");
  const [result, setResult] = useState<string>("ALL");
  const [checkedBy, setCheckedBy] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [lightbox, setLightbox] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [checks, finalizations] = await Promise.all([
        inventoryApi.conferenceChecks({
          stationId: stationId === "ALL" ? null : Number(stationId),
          result: result === "ALL" ? null : (result as CheckResult),
          checkedBy: checkedBy.trim() || null,
          from: from || null,
          to: to || null,
        }),
        inventoryApi.conferenceAllFinalizations(),
      ]);
      setRows(checks);
      setFinals(finalizations);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar conferências");
    } finally {
      setLoading(false);
    }
  };

  // Carrega na montagem. Filtros são aplicados pelo botão "Aplicar".
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const clearFilters = () => {
    setStationId("ALL"); setResult("ALL"); setCheckedBy(""); setFrom(""); setTo("");
  };

  const counts = useMemo(() => ({
    total: rows.length,
    found: rows.filter((r) => r.result === "FOUND").length,
    divergence: rows.filter((r) => r.result === "DIVERGENCE").length,
    notFound: rows.filter((r) => r.result === "NOT_FOUND").length,
    photos: rows.reduce((acc, r) => acc + (r.photos?.length ?? 0), 0),
  }), [rows]);

  return (
    <AppShell
      active="conferencias"
      actions={
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Atualizar
        </Button>
      }
    >
      <div className="mx-auto max-w-[1200px] space-y-4 p-4 md:p-6">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-primary">Conferências</h1>
          <p className="text-sm text-muted-foreground">Auditoria da conferência física — quem conferiu, quando, resultado e fotos.</p>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Conferências", value: counts.total, color: "text-primary" },
            { label: "Encontrados", value: counts.found, color: "text-success" },
            { label: "Divergências", value: counts.divergence, color: "text-brass" },
            { label: "Não localizados", value: counts.notFound, color: "text-danger" },
            { label: "Fotos", value: counts.photos, color: "text-primary" },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-border bg-card p-3">
              <div className={`num-mono text-2xl font-semibold ${c.color}`}>{c.value.toLocaleString("pt-BR")}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Abas */}
        <div className="flex gap-2 border-b border-border">
          {([["checks", "Itens conferidos"], ["finalizations", "Estações finalizadas"]] as [Tab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-ink"}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "checks" && (
          <>
            {/* Filtros */}
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-card p-3 sm:grid-cols-2 lg:grid-cols-6">
              <div className="space-y-1.5 lg:col-span-2">
                <Label className="text-xs">Estação</Label>
                <Select value={stationId} onValueChange={setStationId}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas</SelectItem>
                    {stationsSorted.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.code}{s.name && s.name !== s.code ? ` · ${s.name}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Resultado</Label>
                <Select value={result} onValueChange={setResult}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="FOUND">Encontrado</SelectItem>
                    <SelectItem value="DIVERGENCE">Divergência</SelectItem>
                    <SelectItem value="NOT_FOUND">Não localizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Conferente</Label>
                <Input value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void load()} placeholder="usuário" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">De</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Até</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
              </div>
              <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
                <Button size="sm" onClick={() => void load()} disabled={loading}>Aplicar filtros</Button>
                <Button size="sm" variant="outline" onClick={() => { clearFilters(); }}>Limpar</Button>
              </div>
            </div>

            {/* Lista */}
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="hidden grid-cols-[150px_1fr_130px_140px_1fr_120px] gap-3 border-b border-border bg-paper-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:grid">
                <span>Data</span><span>Patrimônio</span><span>Estação</span><span>Resultado</span><span>Observação</span><span>Conferente</span>
              </div>
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
              ) : rows.length === 0 ? (
                <p className="py-12 text-center text-sm italic text-muted-foreground">Nenhuma conferência encontrada com esses filtros.</p>
              ) : (
                rows.map((r) => (
                  <div key={r.id} className="grid grid-cols-1 gap-2 border-b border-border/60 px-4 py-3 last:border-0 lg:grid-cols-[150px_1fr_130px_140px_1fr_120px] lg:items-start lg:gap-3">
                    <div className="num-mono text-[12px] text-muted-foreground">{fmtDateTime(r.checkedAt)}</div>
                    <div className="min-w-0">
                      <div className="num-mono text-[13px] font-semibold text-primary">{r.assetCode}</div>
                      <div className="truncate text-[12px] text-muted-foreground">{r.assetDescription}</div>
                      {r.photos?.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {r.photos.map((p) => (
                            <button key={p.id} onClick={() => setLightbox(`/check-photos/${p.id}/file`)}
                              className="h-12 w-12 overflow-hidden rounded-md border border-border transition hover:ring-2 hover:ring-primary/40">
                              <AuthImage path={`/check-photos/${p.id}/file`} className="h-full w-full object-cover" alt={`foto ${r.assetCode}`} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-[12px]">
                      <span className="num-mono font-medium text-ink">{r.stationCode ?? "—"}</span>
                      {r.expectedStationCode && r.expectedStationCode !== r.stationCode && (
                        <div className="text-[11px] text-brass">esperado: {r.expectedStationCode}</div>
                      )}
                    </div>
                    <div>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${RESULT_META[r.result].cls}`}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: RESULT_META[r.result].dot }} />
                        {RESULT_META[r.result].label}
                      </span>
                      {r.result === "DIVERGENCE" && r.divergenceType && (
                        <div className="mt-1 text-[11px] text-brass">{DIVERGENCE_LABEL[r.divergenceType]}</div>
                      )}
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                      {r.note || <span className="italic opacity-60">—</span>}
                      {r.photos?.length > 0 && (
                        <span className="ml-1 inline-flex items-center gap-0.5 align-middle text-[11px] text-primary"><Camera className="h-3 w-3" />{r.photos.length}</span>
                      )}
                    </div>
                    <div className="text-[12px] font-medium text-ink">{r.checkedBy}</div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {tab === "finalizations" && (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="hidden grid-cols-[1fr_200px_200px] gap-3 border-b border-border bg-paper-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
              <span>Estação</span><span>Finalizada por</span><span>Data</span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
            ) : finals.length === 0 ? (
              <p className="py-12 text-center text-sm italic text-muted-foreground">Nenhuma estação finalizada ainda.</p>
            ) : (
              finals.map((f) => (
                <div key={f.id} className="grid grid-cols-1 gap-1 border-b border-border/60 px-4 py-3 last:border-0 sm:grid-cols-[1fr_200px_200px] sm:items-center sm:gap-3">
                  <div>
                    <span className="num-mono text-[13px] font-semibold text-primary">{f.stationCode ?? "—"}</span>
                    {f.stationName && f.stationName !== f.stationCode && <span className="ml-2 text-[12px] text-muted-foreground">{f.stationName}</span>}
                  </div>
                  <div className="text-[12px] font-medium text-ink">{f.checkedBy}</div>
                  <div className="num-mono text-[12px] text-muted-foreground">{fmtDateTime(f.checkedAt)}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-2xl p-2">
          {lightbox && <AuthImage path={lightbox} className="max-h-[80vh] w-full rounded-md object-contain" alt="foto da conferência" />}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default ConferenciasPage;
