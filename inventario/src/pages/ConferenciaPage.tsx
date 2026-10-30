import { conferenceDate } from "@/components/ConferenceHistory";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronRight, CheckCircle2, LogOut, Warehouse } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useInventoryStore } from "@/features/inventory-map/store/useInventoryStore";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import type { Asset, Station } from "@/features/inventory-map/types/inventoryMap.types";
import { inventoryApi, type ApiHistoryEvent, type ApiPhysicalCheck } from "@/lib/inventory-api";

type StationStat = { checked: number; total: number; issues: number };

const statOf = (assets: Asset[]): StationStat => {
  const total = assets.length;
  const checked = assets.filter((a) => a.lastCheckResult).length;
  const issues = assets.filter((a) => a.lastCheckResult === "NOT_FOUND" || a.lastCheckResult === "DIVERGENCE").length;
  return { checked, total, issues };
};

const dotColor = (s: StationStat) => {
  if (s.total === 0 || s.checked === 0) return "#B9B3A9"; // pendente / vazio
  if (s.issues > 0) return "#B4342B"; // atenção
  if (s.checked >= s.total) return "#2F7A54"; // ok
  return "#A87413"; // em andamento
};

const ConferenciaPage = () => {
  const navigate = useNavigate();
  const spaces = useInventoryStore((s) => s.spaces);
  const stations = useInventoryStore((s) => s.stations);
  const assets = useInventoryStore((s) => s.assets);
  const getAssetsForStation = useInventoryStore((s) => s.getAssetsForStation);
  const getEmployeeForStation = useInventoryStore((s) => s.getEmployeeForStation);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [q, setQ] = useState("");
  const [stockChecks, setStockChecks] = useState<ApiPhysicalCheck[]>([]);
  const [stockFinalizations, setStockFinalizations] = useState<ApiHistoryEvent[]>([]);

  const stockAssets = useMemo(() => assets.filter((asset) =>
    asset.status !== "DISPOSED" && asset.status !== "VOIDED"
      && (asset.status === "IN_STOCK" || !asset.stationId)), [assets]);
  const latestStockFinalization = stockFinalizations[0];
  const stockChecksInCycle = useMemo(() => {
    const cutoff = latestStockFinalization?.timestamp ? new Date(latestStockFinalization.timestamp).getTime() : 0;
    const ids = new Set(stockAssets.map((asset) => asset.id));
    const latest = new Map<number, ApiPhysicalCheck>();
    stockChecks.forEach((check) => {
      if (!ids.has(String(check.assetId)) || new Date(check.checkedAt).getTime() <= cutoff || latest.has(check.assetId)) return;
      latest.set(check.assetId, check);
    });
    return latest;
  }, [latestStockFinalization?.timestamp, stockAssets, stockChecks]);

  useEffect(() => {
    let active = true;
    void Promise.all([inventoryApi.stockChecks(), inventoryApi.stockFinalizations()]).then(([checks, finalizations]) => {
      if (!active) return;
      setStockChecks(checks);
      setStockFinalizations(finalizations);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const groups = useMemo(() => {
    const spById = new Map(spaces.map((s) => [s.id, s]));
    const rootUnit = (id?: string): string => {
      let cur = id ? spById.get(id) : undefined;
      while (cur?.parentId && spById.get(cur.parentId)) cur = spById.get(cur.parentId);
      return cur?.name ?? "Sem unidade";
    };
    const floorName = (id?: string): string => {
      const sp = id ? spById.get(id) : undefined;
      const parent = sp?.parentId ? spById.get(sp.parentId) : undefined;
      return parent?.name ?? "";
    };
    // departamentos = espaços que têm estações
    const withStations = new Map<string, Station[]>();
    for (const st of stations) {
      const key = st.spaceId ?? "__none__";
      if (!withStations.has(key)) withStations.set(key, []);
      withStations.get(key)!.push(st);
    }
    const items = [...withStations.entries()].map(([spaceId, sts]) => {
      const sp = spaceId === "__none__" ? undefined : spById.get(spaceId);
      return {
        spaceId,
        unit: sp ? rootUnit(sp.id) : "Sem unidade",
        floor: sp ? floorName(sp.id) : "",
        name: sp?.name ?? "Sem departamento",
        stations: sts.sort((a, b) => a.code.localeCompare(b.code)),
      };
    });
    return items.sort((a, b) => a.unit.localeCompare(b.unit) || a.floor.localeCompare(b.floor) || a.name.localeCompare(b.name));
  }, [spaces, stations]);

  const query = q.trim().toLowerCase();
  const matchStation = (st: Station) => {
    if (!query) return true;
    const emp = getEmployeeForStation(st.id);
    const assets = getAssetsForStation(st.id);
    return [st.code, st.name, emp?.fullName, ...assets.map((a) => a.assetCode), ...assets.map((a) => a.description)]
      .some((v) => v?.toLowerCase().includes(query));
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-paper">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-primary px-4 py-3 text-white">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-widest text-champagne">Conferência</div>
          <div className="truncate text-sm font-semibold">Inventário Índio Artiaga</div>
        </div>
        <span className="text-xs text-white/70">{user?.username}</span>
        <button onClick={logout} className="rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white" title="Sair">
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      <div className="sticky top-[52px] z-10 border-b border-border bg-card px-4 py-2.5">
        <div className="relative flex h-10 items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground/70" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar estação, pessoa ou patrimônio"
            className="h-10 bg-paper-2 pl-9 text-sm" />
        </div>
      </div>

      <main className="flex-1 space-y-4 p-3">
        <section className="overflow-hidden rounded-xl border-2 border-brass/40 bg-card">
          <button onClick={() => navigate("/conferencia/estoque")} className="flex w-full items-center gap-3 px-3 py-3 text-left active:bg-paper-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brass/10 text-brass-ink"><Warehouse className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Local especial</div>
              <div className="text-sm font-semibold text-primary">ESTOQUE TI</div>
              <div className="text-[12px] text-muted-foreground">Em estoque e sem vínculo · sem mover para estação</div>
            </div>
            <div className="text-right text-[11px] text-muted-foreground">
              <div>{stockChecksInCycle.size}/{stockAssets.length} conferidos</div>
              {latestStockFinalization && <div>Finalizado em {conferenceDate(latestStockFinalization.timestamp)}</div>}
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
          </button>
        </section>
        {groups.map((g) => {
          const visibleStations = g.stations.filter(matchStation);
          if (visibleStations.length === 0) return null;
          return (
            <section key={g.spaceId} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border bg-paper-2 px-3 py-2">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{g.unit}{g.floor ? ` · ${g.floor}` : ""}</div>
                <div className="text-sm font-semibold text-primary">{g.name}</div>
              </div>
              <ul className="divide-y divide-border/60">
                {visibleStations.map((st) => {
                  const assets = getAssetsForStation(st.id);
                  const emp = getEmployeeForStation(st.id);
                  const stat = statOf(assets);
                  const sealed = !!st.lastConferenceAt;
                  return (
                    <li key={st.id}>
                      <button onClick={() => navigate(`/conferencia/estacao/${st.id}`)}
                        className="flex w-full items-center gap-3 px-3 py-3 text-left active:bg-paper-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: dotColor(stat) }} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="num-mono text-[13px] font-semibold text-primary">{st.code}</span>
                            {sealed && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                          </div>
                          <div className="truncate text-[12px] text-muted-foreground">
                            {emp?.fullName ?? (st.name && st.name !== st.code ? st.name : "sem responsável")}
                          </div>
                        </div>
                        <div className="text-right text-[11px] text-muted-foreground">
                          <div>{stat.checked}/{stat.total} conferidos · {stat.issues} pendências</div>
                          {st.lastConferenceAt && <div>Finalizada em {conferenceDate(st.lastConferenceAt)}<br />por {st.lastConferenceBy}</div>}
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </main>
    </div>
  );
};

export default ConferenciaPage;
