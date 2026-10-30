import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { inventoryApi, type ApiMovement } from "@/lib/inventory-api";

type TypeFilter = "ALL" | "LINKED" | "UNLINKED" | "TRANSFERRED";

const TYPE_META: Record<string, { label: string; cls: string }> = {
  LINKED: { label: "Entrada", cls: "bg-success/12 text-success border-success/30" },
  UNLINKED: { label: "Saída", cls: "bg-bronze/12 text-bronze border-bronze/30" },
  TRANSFERRED: { label: "Transferência", cls: "bg-primary/10 text-primary border-primary/25" },
  EXCHANGED: { label: "Troca", cls: "bg-primary/10 text-primary border-primary/25" },
};

const STOCK_LABEL = "Estoque da T.I.";

const place = (code?: string | null, name?: string | null) =>
  code ? `${name ? `${name} ` : ""}(${code})` : STOCK_LABEL;

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const MovimentacoesPage = () => {
  const [rows, setRows] = useState<ApiMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");

  useEffect(() => {
    inventoryApi.movements()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    return rows.filter((m) => {
      if (typeFilter !== "ALL" && m.movementType !== typeFilter) return false;
      if (!q) return true;
      const hay = [
        m.assetCode, m.assetType, m.assetDescription, m.movementType,
        m.fromStationCode, m.fromStationName, m.toStationCode, m.toStationName,
        m.fromEmployeeName, m.toEmployeeName, m.performedBy, m.reason,
      ].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
      return hay.includes(q);
    });
  }, [rows, query, typeFilter]);

  const counts = useMemo(() => ({
    total: rows.length,
    entradas: rows.filter((m) => m.movementType === "LINKED").length,
    saidas: rows.filter((m) => m.movementType === "UNLINKED").length,
    transf: rows.filter((m) => m.movementType === "TRANSFERRED" || m.movementType === "EXCHANGED").length,
  }), [rows]);

  const chips: { key: TypeFilter; label: string }[] = [
    { key: "ALL", label: "Todas" },
    { key: "LINKED", label: "Entradas" },
    { key: "UNLINKED", label: "Saídas" },
    { key: "TRANSFERRED", label: "Transferências" },
  ];

  return (
    <AppShell
      active="movimentacoes"
      search={
        <div className="flex h-[38px] w-full max-w-[460px] items-center gap-2.5 rounded-lg border border-input bg-paper-2 px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            placeholder="Buscar por patrimônio, pessoa, estação ou motivo"
          />
        </div>
      }
    >
      <section className="mx-auto w-full max-w-[1180px] px-5 py-7 md:px-8 md:py-9">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-mono mb-2 text-bronze">Rastreio patrimonial</p>
            <h1 className="font-serif text-4xl font-semibold leading-none text-primary">Movimentações</h1>
            <p className="mt-2 text-sm text-muted-foreground">Entradas, saídas e transferências dos bens entre estações e o estoque da T.I. — de onde saiu e para onde foi.</p>
          </div>
          <div className="flex gap-8 border-l border-border pl-6">
            <div><span className="num-mono text-2xl text-primary">{counts.total}</span><p className="label-mono mt-1 text-muted-foreground">Registros</p></div>
            <div><span className="num-mono text-2xl text-success">{counts.entradas}</span><p className="label-mono mt-1 text-muted-foreground">Entradas</p></div>
            <div><span className="num-mono text-2xl text-bronze">{counts.saidas}</span><p className="label-mono mt-1 text-muted-foreground">Saídas</p></div>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => setTypeFilter(c.key)}
              className={`h-8 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
                typeFilter === c.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-paper-2 text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Carregando movimentações…</p>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Nenhuma movimentação encontrada.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="hidden grid-cols-[150px_1fr_1.25fr_120px] gap-4 border-b border-border bg-secondary/25 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:grid">
              <span>Data</span><span>Patrimônio</span><span>De → Para</span><span className="text-right">Tipo</span>
            </div>
            <ul className="divide-y divide-border">
              {filtered.map((m) => {
                const meta = TYPE_META[m.movementType] ?? { label: m.movementType, cls: "bg-secondary text-muted-foreground border-border" };
                return (
                  <li key={m.id} className="grid grid-cols-1 gap-2 px-5 py-4 md:grid-cols-[150px_1fr_1.25fr_120px] md:items-start md:gap-4">
                    <div className="num-mono text-xs leading-tight text-muted-foreground">{fmtDate(m.movedAt)}</div>

                    <div className="min-w-0">
                      {m.assetId ? (
                        <Link to={`/patrimonios/${m.assetId}`} className="text-sm font-semibold text-primary hover:underline">
                          {m.assetCode} · {m.assetType}
                        </Link>
                      ) : (
                        <span className="text-sm font-semibold text-primary">{m.assetCode} · {m.assetType}</span>
                      )}
                      {m.assetDescription && <p className="mt-0.5 truncate text-xs text-muted-foreground">{m.assetDescription}</p>}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
                        <span className="rounded-md border border-border bg-secondary/40 px-2 py-0.5">{place(m.fromStationCode, m.fromStationName)}</span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-bronze" />
                        <span className="rounded-md border border-border bg-secondary/40 px-2 py-0.5">{place(m.toStationCode, m.toStationName)}</span>
                      </div>
                      {m.reason && <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{m.reason}{m.performedBy ? <span className="text-muted-foreground/70"> · por {m.performedBy}</span> : null}</p>}
                    </div>

                    <div className="md:text-right">
                      <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.cls}`}>{meta.label}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </AppShell>
  );
};

export default MovimentacoesPage;
