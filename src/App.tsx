import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Grid2X2,
  LayoutDashboard,
  List,
  Lock,
  LogOut,
  Menu,
  MoreVertical,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  TicketIcon,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast, Toaster } from "sonner";

import {
  api,
  isAtrasado,
  PRIORITY_LABEL,
  STATUS_LABEL,
  type AuthUser,
  type Categoria,
  type DashboardStats,
  type Department,
  type Employee,
  type AppRole,
  type Setor,
  type Ticket,
  type TicketComment,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/api";

type View = "dashboard" | "chamados" | "usuarios" | "setores" | "configuracoes" | "relatorios";
type TabKey = "todos" | "sem_responsavel" | "meus" | "atrasados" | "aguardando";

const NAV_ITEMS: Array<{
  key: View | "inventario";
  label: string;
  icon: LucideIcon;
  placeholder?: boolean;
  externalUrl?: string;
  externalPort?: number;
}> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "chamados", label: "Chamados", icon: TicketIcon },
  { key: "relatorios", label: "Relatórios", icon: BarChart3 },
  { key: "inventario", label: "Inventário", icon: Package, externalPort: 8082 },
  { key: "usuarios", label: "Funcionarios", icon: Users },
  { key: "setores", label: "Departamentos", icon: Grid2X2 },
  { key: "configuracoes", label: "Configurações", icon: Settings },
];

const VIEW_TITLES: Record<View, string> = {
  dashboard: "Dashboard",
  chamados: "Gestão de Chamados",
  relatorios: "Relatórios",
  usuarios: "Funcionarios",
  setores: "Departamentos",
  configuracoes: "Configurações",
};

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador",
  operador: "Operador",
  usuario: "Funcionario",
};

function canOperate(user: AuthUser) {
  return user.roles.includes("admin") || user.roles.includes("operador");
}

function canAdmin(user: AuthUser) {
  return user.roles.includes("admin");
}

function sameHostUrl(port: number, path = "") {
  if (typeof window === "undefined") return path || "/";
  return `${window.location.protocol}//${window.location.hostname}:${port}${path}`;
}

function inventoryApiUrl(path: string) {
  if (typeof window !== "undefined" && window.location.port === "8080") {
    return `/inventory-api/v1${path}`;
  }
  return sameHostUrl(8083, `/api/v1${path}`);
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem("cart-rio-user");
    if (!raw) return null;
    if (!getSharedAuthToken()) {
      localStorage.removeItem("cart-rio-user");
      return null;
    }
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      localStorage.removeItem("cart-rio-user");
      return null;
    }
  });

  function onLogin(nextUser: AuthUser) {
    localStorage.setItem("cart-rio-user", JSON.stringify(nextUser));
    setUser(nextUser);
  }

  function onLogout() {
    localStorage.removeItem("cart-rio-user");
    localStorage.removeItem("cart-rio-auth");
    document.cookie = "cart_rio_auth=; Max-Age=0; path=/; SameSite=Lax";
    setUser(null);
  }

  if (!user) return <LoginPage onLogin={onLogin} />;
  return <Shell user={user} onLogout={onLogout} />;
}

function LoginPage({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [keepConnected, setKeepConnected] = useState(true);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await api<{ user: AuthUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      const token = `Basic ${btoa(`${result.user.username}:${password}`)}`;
      localStorage.setItem("cart-rio-auth", JSON.stringify({ username: result.user.username, token }));
      document.cookie = `cart_rio_auth=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
      onLogin(result.user);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-[#f7f5f2] text-[#071936] lg:grid-cols-[1fr_1.1fr]">
      <section className="relative flex min-h-[44vh] overflow-hidden bg-[#00234B] px-8 py-10 text-white lg:min-h-screen lg:px-20">
        <div className="absolute inset-y-0 right-0 w-px bg-[#d8bd83]" />
        <img
          src="/favicon.png"
          alt=""
          className="pointer-events-none absolute -left-28 top-28 h-[620px] w-[620px] opacity-[0.08]"
        />
        <div className="relative m-auto w-full max-w-xl text-center">
          <img
            src="/favicon.png"
            alt=""
            className="mx-auto h-32 w-32 rounded-full object-cover lg:h-36 lg:w-36"
          />
          <h1 className="mt-8 text-4xl font-semibold tracking-wide text-white">
            PORTAL ÍNDIO ARTIAGA
          </h1>
          <p className="mt-2 text-2xl text-[#d8bd83]">4º Tabelionato de Notas</p>
          <div className="mx-auto my-12 h-px w-28 bg-[#d8bd83]" />
          <h2
            className="text-4xl font-medium text-[#d8bd83]"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Central de Gestão Interna
          </h2>
          <p className="mx-auto mt-6 max-w-md text-xl leading-relaxed text-white/90">
            Sistema interno para controle operacional, suporte técnico e gestão administrativa da
            serventia.
          </p>
          <p className="mt-24 text-lg text-[#d8bd83]">Uso interno · Acesso restrito</p>
        </div>
      </section>

      <section className="relative grid min-h-[56vh] place-items-center overflow-hidden px-6 py-12 lg:min-h-screen">
        <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full border border-[#d8bd83]/50" />
        <div className="pointer-events-none absolute -bottom-24 left-0 h-80 w-80 rounded-full border border-[#d8bd83]/40" />
        <form
          onSubmit={submit}
          className="w-full max-w-[620px] rounded-2xl bg-white/95 p-10 shadow-[0_24px_70px_-34px_rgba(7,25,54,0.45)] lg:p-14"
        >
          <div className="text-center">
            <h2 className="text-4xl font-medium text-[#071936]">Acessar o sistema</h2>
            <p className="mt-4 text-lg text-slate-500">
              Entre com suas credenciais para continuar.
            </p>
          </div>
          <div className="mt-10 space-y-6">
            <TextField
              label="Usuário ou e-mail"
              value={username}
              onChange={setUsername}
              placeholder="Digite seu usuário ou e-mail"
              icon={User}
            />
            <TextField
              label="Senha"
              value={password}
              onChange={setPassword}
              placeholder="Digite sua senha"
              icon={Lock}
              type="password"
            />
            <label className="flex items-center gap-3 text-base text-[#071936]">
              <input
                type="checkbox"
                checked={keepConnected}
                onChange={(event) => setKeepConnected(event.target.checked)}
                className="h-5 w-5 rounded border-slate-300"
              />
              Manter conectado
            </label>
            <button
              className="h-14 w-full rounded-xl bg-[#00234B] text-lg font-semibold text-white shadow-[0_14px_24px_-16px_rgba(6,36,73,0.8)] transition hover:bg-[#0a315f]"
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </div>
          <div className="mt-10 border-t border-slate-200 pt-8 text-center">
            <div className="mx-auto flex max-w-md items-start justify-center gap-3 text-left text-sm text-slate-500">
              <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-[#b99b5f]" />
              <p>Ambiente restrito a colaboradores autorizados do Portal Índio Artiaga.</p>
            </div>
            <p className="mt-6 text-sm text-slate-400">v1.0.0</p>
          </div>
        </form>
      </section>
      <Toaster richColors />
    </main>
  );
}

function Shell({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [view, setView] = useState<View>("chamados");
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);
  const [globalTicketSearch, setGlobalTicketSearch] = useState("");
  const allowedNavItems = NAV_ITEMS.filter((item) => {
    if (item.key === "dashboard" || item.key === "usuarios" || item.key === "setores" || item.key === "configuracoes" || item.key === "relatorios") return canAdmin(user);
    if (item.key === "inventario") return canOperate(user);
    return true;
  });

  return (
    <div className="flex min-h-screen bg-[#F5F3F1] text-[#071936]">
      <aside className="hidden w-[260px] shrink-0 flex-col bg-[#00234B] text-white md:flex">
        <div className="px-4 py-6 text-center">
          <img src="/favicon.png" alt="" className="mx-auto h-20 w-20 rounded-full object-cover" />
          <p className="mt-4 text-base font-semibold tracking-wide">PORTAL ÍNDIO ARTIAGA</p>
          <p className="mt-1 text-sm text-[#d8bd83]">4º Tabelionato de Notas</p>
        </div>
        <nav className="mt-6 flex-1 space-y-1 px-3">
          {allowedNavItems.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                if (item.externalUrl || item.externalPort) {
                  if (!getSharedAuthToken()) {
                    toast.error("Sua sessao expirou. Entre novamente para abrir o inventario.");
                    onLogout();
                    return;
                  }
                  window.location.href = item.externalUrl ?? sameHostUrl(item.externalPort!);
                  return;
                }
                const nextView = item.key as View;
                if (view === nextView) {
                  if (nextView === "chamados") setSelectedTicket(null);
                  return;
                }
                setSelectedTicket(null);
                setView(nextView);
              }}
              className={`flex h-12 w-full items-center gap-3 rounded-lg px-4 text-left text-[15px] transition ${
                view === item.key && !item.externalUrl && !item.externalPort
                  ? "bg-white/10 text-[#f2cf74] shadow-[inset_3px_0_0_#e0b646]"
                  : "text-white/90 hover:bg-white/8"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="space-y-4 px-5 py-6 text-sm text-white/80">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#f2cf74]" />
            <span>Uso interno · Acesso restrito</span>
          </div>
          <p>© 2026 Portal Índio Artiaga</p>
          <p>v1.0.0</p>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
          <div className="flex items-center gap-5">
            <button className="grid h-10 w-10 place-items-center rounded-lg hover:bg-slate-100">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-3xl font-semibold tracking-[-0.01em]">{VIEW_TITLES[view]}</h1>
          </div>
          <div className="flex items-center gap-5">
            <div className="relative hidden lg:block">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={globalTicketSearch}
                onChange={(event) => {
                  setGlobalTicketSearch(event.target.value);
                  setSelectedTicket(null);
                  if (event.target.value.trim() && view !== "chamados") setView("chamados");
                }}
                className="h-12 w-72 rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm outline-none focus:border-[#00234B]"
                placeholder="Buscar chamado..."
              />
            </div>
            <div className="relative">
              <Bell className="h-6 w-6" />
              <span className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-[#00234B] text-[11px] font-bold text-white">
                3
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-slate-100">
                <User className="h-6 w-6" />
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="font-semibold">{user.nomeCompleto}</p>
                <p className="text-sm text-slate-500">{ROLE_LABEL[user.roles[0] ?? "usuario"]}</p>
              </div>
              <ChevronDown className="h-4 w-4" />
            </div>
            <button
              onClick={onLogout}
              className="grid h-10 w-10 place-items-center rounded-lg hover:bg-slate-100"
              title="Sair"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>
        <main className="p-7">
          {view === "dashboard" && canAdmin(user) && (
            <Dashboard
              onOpenTicket={(numero) => {
                setSelectedTicket(numero);
                setView("chamados");
              }}
            />
          )}
          {view === "chamados" && (
            <TicketsPage
              user={user}
              selected={selectedTicket}
              onSelect={setSelectedTicket}
              globalQuery={globalTicketSearch}
              onGlobalQueryChange={setGlobalTicketSearch}
            />
          )}
          {view === "relatorios" && canAdmin(user) && <ReportsPage />}
          {(view === "configuracoes" || view === "setores" || view === "usuarios") && canAdmin(user) && <ConfigPage view={view} />}
        </main>
      </div>
      <Toaster richColors />
    </div>
  );
}

function Dashboard({ onOpenTicket }: { onOpenTicket: (numero: number) => void }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    Promise.all([api<Ticket[]>("/tickets"), api<DashboardStats>("/dashboard")])
      .then(([ticketData, statData]) => {
        setTickets(ticketData);
        setStats(statData);
      })
      .catch((error) => toast.error(error.message));
  }, []);

  return (
    <div className="space-y-7">
      <p className="text-lg text-slate-600">Resumo operacional com dados vindos do backend Java.</p>
      <StatsRow stats={stats} tickets={tickets} />
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold">Chamados atrasados</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {tickets
            .filter(isAtrasado)
            .slice(0, 6)
            .map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => onOpenTicket(ticket.numero)}
                className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50"
              >
                <div>
                  <p className="font-semibold">
                    #{ticket.numero} · {ticket.titulo}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {ticket.criadoPor.nomeCompleto} · {ticket.setor?.nome}
                  </p>
                </div>
                <StatusBadge status={ticket.status} />
              </button>
            ))}
          {tickets.filter(isAtrasado).length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              Nenhum chamado atrasado no momento.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function TicketsPage({
  user,
  selected,
  onSelect,
  globalQuery,
  onGlobalQueryChange,
}: {
  user: AuthUser;
  selected: number | null;
  onSelect: (numero: number | null) => void;
  globalQuery: string;
  onGlobalQueryChange: (value: string) => void;
}) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TicketStatus | "all">("all");
  const [priority, setPriority] = useState<TicketPriority | "all">("all");
  const [setorId, setSetorId] = useState("all");
  const [responsavelId, setResponsavelId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tab, setTab] = useState<TabKey>("todos");
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const isStaff = canOperate(user);
  const visibleTickets = useMemo(
    () => tickets.filter((ticket) => isStaff || ticket.criadoPor.id === user.id),
    [tickets, isStaff, user.id],
  );

  async function load() {
    const [ticketData, statData] = await Promise.all([
      api<Ticket[]>("/tickets"),
      api<DashboardStats>("/dashboard"),
    ]);
    setTickets(ticketData);
    setStats(statData);
  }

  useEffect(() => {
    load().catch((error) => toast.error(error.message));
  }, []);

  const setores = useMemo(
    () =>
      uniqueBy(
        visibleTickets.flatMap((ticket) => (ticket.setor ? [ticket.setor] : [])),
        "id",
      ),
    [visibleTickets],
  );
  const responsaveis = useMemo(
    () =>
      uniqueBy(
        visibleTickets.flatMap((ticket) => (ticket.atribuidoA ? [ticket.atribuidoA] : [])),
        "id",
      ),
    [visibleTickets],
  );

  const tabCounts = useMemo(
    () => ({
      todos: visibleTickets.length,
      sem_responsavel: visibleTickets.filter(
        (ticket) => !ticket.atribuidoA && ticket.status !== "resolvido",
      ).length,
      meus: visibleTickets.filter((ticket) => isStaff ? ticket.atribuidoA?.id === user.id : ticket.criadoPor.id === user.id).length,
      atrasados: visibleTickets.filter(isAtrasado).length,
      aguardando: visibleTickets.filter((ticket) => ticket.status === "aguardando_solicitante").length,
    }),
    [visibleTickets, user.id, isStaff],
  );

  const filtered = useMemo(() => {
    const searchTerms = [query, globalQuery]
      .flatMap((value) => value.trim().toLowerCase().split(/\s+/))
      .filter(Boolean);
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

    return visibleTickets.filter((ticket) => {
      if (tab === "sem_responsavel" && (ticket.atribuidoA || ticket.status === "resolvido"))
        return false;
      if (tab === "meus" && (isStaff ? ticket.atribuidoA?.id !== user.id : ticket.criadoPor.id !== user.id)) return false;
      if (tab === "atrasados" && !isAtrasado(ticket)) return false;
      if (tab === "aguardando" && ticket.status !== "aguardando_solicitante") return false;
      if (status !== "all" && ticket.status !== status) return false;
      if (priority !== "all" && ticket.prioridade !== priority) return false;
      if (setorId !== "all" && ticket.setor?.id !== setorId) return false;
      if (responsavelId !== "all" && ticket.atribuidoA?.id !== responsavelId) return false;
      if (from && new Date(ticket.createdAt) < from) return false;
      if (to && new Date(ticket.createdAt) > to) return false;
      if (!searchTerms.length) return true;
      const searchable = [
        ticket.titulo,
        ticket.descricao,
        String(ticket.numero),
        ticket.criadoPor.nomeCompleto,
        ticket.atribuidoA?.nomeCompleto ?? "",
        ticket.setor?.nome ?? "",
        ticket.categoria?.nome ?? "",
      ].join(" ").toLowerCase();
      return searchTerms.every((term) => searchable.includes(term));
    });
  }, [visibleTickets, tab, status, priority, setorId, responsavelId, dateFrom, dateTo, query, globalQuery, user.id, isStaff]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const pageStart = (currentPage - 1) * itemsPerPage;
  const pageEnd = Math.min(pageStart + itemsPerPage, filtered.length);
  const paginatedTickets = filtered.slice(pageStart, pageEnd);

  useEffect(() => {
    setCurrentPage(1);
  }, [tab, status, priority, setorId, responsavelId, dateFrom, dateTo, query, globalQuery]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const selectedTicket = tickets.find((ticket) => ticket.numero === selected && (isStaff || ticket.criadoPor.id === user.id)) ?? null;
  if (selectedTicket) {
    return (
      <TicketDetail
        user={user}
        ticket={selectedTicket}
        onBack={() => onSelect(null)}
        onChanged={load}
      />
    );
  }

  function clearFilters() {
    setQuery("");
    onGlobalQueryChange("");
    setStatus("all");
    setPriority("all");
    setSetorId("all");
    setResponsavelId("all");
    setDateFrom("");
    setDateTo("");
    setTab("todos");
  }

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between gap-4">
        <p className="text-lg text-slate-600">
          {isStaff ? "Acompanhe solicitações internas, prazos, responsáveis e status de atendimento." : "Abra chamados e acompanhe o andamento das suas solicitações."}
        </p>
        <button
          onClick={() => setNewTicketOpen(true)}
          className="flex h-12 items-center gap-2 rounded-md bg-[#00234B] px-6 font-semibold text-white shadow-sm hover:bg-[#0a315f]"
        >
          <Plus className="h-5 w-5" />
          Novo chamado
        </button>
      </div>

      {isStaff ? <StatsRow stats={stats} tickets={tickets} /> : <EmployeeStatsRow tickets={visibleTickets} />}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className={`grid gap-5 ${isStaff ? "xl:grid-cols-[1.7fr_0.75fr_0.8fr_0.8fr_0.8fr_0.85fr_0.85fr_auto]" : "xl:grid-cols-[1.7fr_0.8fr_0.8fr_0.8fr_0.85fr_0.85fr_auto]"}`}>
          <FilterSearch value={query} onChange={setQuery} />
          <FilterSelect
            label="Status"
            value={status}
            onChange={(value) => setStatus(value as TicketStatus | "all")}
            options={[["all", "Todos"], ...Object.entries(STATUS_LABEL)]}
          />
          <FilterSelect
            label="Prioridade"
            value={priority}
            onChange={(value) => setPriority(value as TicketPriority | "all")}
            options={[["all", "Todas"], ...Object.entries(PRIORITY_LABEL)]}
          />
          <FilterSelect
            label="Setor"
            value={setorId}
            onChange={setSetorId}
            options={[
              ["all", "Todos"],
              ...setores.map((setor) => [setor.id, setor.nome] as [string, string]),
            ]}
          />
          {isStaff && (
            <FilterSelect
              label="Responsável"
              value={responsavelId}
              onChange={setResponsavelId}
              options={[
                ["all", "Todos"],
                ...responsaveis.map(
                  (responsavel) => [responsavel.id, responsavel.nomeCompleto] as [string, string],
                ),
              ]}
            />
          )}
          <DateField label="De" value={dateFrom} onChange={setDateFrom} />
          <DateField label="Até" value={dateTo} onChange={setDateTo} />
          <button
            onClick={clearFilters}
            className="mt-6 flex h-11 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-medium"
          >
            <RefreshCw className="h-4 w-4" />
            Limpar filtros
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5">
          <div className="flex gap-8 overflow-x-auto">
            <Tab
              active={tab === "todos"}
              label={isStaff ? "Todos" : "Meus chamados"}
              count={tabCounts.todos}
              onClick={() => setTab("todos")}
            />
            {isStaff && (
            <Tab
              active={tab === "sem_responsavel"}
              label="Sem responsável"
              count={tabCounts.sem_responsavel}
              onClick={() => setTab("sem_responsavel")}
            />
            )}
            {isStaff && (
              <Tab
                active={tab === "meus"}
                label="Meus chamados"
                count={tabCounts.meus}
                onClick={() => setTab("meus")}
              />
            )}
            {isStaff && (
            <Tab
              active={tab === "atrasados"}
              label="Atrasados"
              count={tabCounts.atrasados}
              onClick={() => setTab("atrasados")}
            />
            )}
            {isStaff && (
            <Tab
              active={tab === "aguardando"}
              label="Aguardando resposta"
              count={tabCounts.aguardando}
              onClick={() => setTab("aguardando")}
            />
            )}
          </div>
          <div className="flex items-center gap-3 py-4">
            <span className="text-sm font-medium">Visualização</span>
            <div className="flex rounded-md border border-slate-200 p-1">
              <button className="rounded bg-[#00234B] p-2 text-white">
                <List className="h-4 w-4" />
              </button>
              <button className="p-2 text-slate-500">
                <Grid2X2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-6 py-4 font-medium">Nº</th>
                <th className="px-6 py-4 font-medium">Título</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Prioridade</th>
                <th className="px-6 py-4 font-medium">Setor</th>
                <th className="px-6 py-4 font-medium">Solicitante</th>
                <th className="px-6 py-4 font-medium">Responsável</th>
                <th className="px-6 py-4 font-medium">Aberto em</th>
                <th className="px-6 py-4 font-medium">Prazo</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-slate-50">
                  <td className="px-6 py-5 font-mono text-base">#{ticket.numero}</td>
                  <td className="max-w-[320px] px-6 py-5">
                    <button
                      onClick={() => onSelect(ticket.numero)}
                      className="block text-left font-semibold hover:underline"
                    >
                      {ticket.titulo}
                    </button>
                    <p className="mt-1 truncate text-xs text-slate-500">{ticket.descricao}</p>
                  </td>
                  <td className="px-6 py-5">
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td className="px-6 py-5">
                    <PriorityBadge priority={ticket.prioridade} />
                  </td>
                  <td className="px-6 py-5">{ticket.setor?.nome ?? "-"}</td>
                  <td className="px-6 py-5">{ticket.criadoPor.nomeCompleto}</td>
                  <td className="px-6 py-5">{ticket.atribuidoA?.nomeCompleto ?? "—"}</td>
                  <td className="px-6 py-5">{formatDateShort(ticket.createdAt)}</td>
                  <td
                    className={`px-6 py-5 ${isAtrasado(ticket) ? "font-semibold text-red-600" : ""}`}
                  >
                    {formatDue(ticket.prazo)}
                  </td>
                  <td className="px-6 py-5">
                    <MoreVertical className="h-5 w-5 text-slate-500" />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
                    Nenhum chamado encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-sm text-slate-600">
          <span>
            Mostrando {filtered.length ? pageStart + 1 : 0} a {pageEnd} de{" "}
            {filtered.length} chamados
          </span>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`h-9 w-9 rounded-md border ${page === currentPage ? "border-[#00234B] bg-[#00234B] text-white" : "border-slate-200 bg-white"}`}
              >
                {page}
              </button>
            ))}
          </div>
          <button className="rounded-md border border-slate-200 px-4 py-2">{itemsPerPage} por página</button>
        </div>
      </section>

      {newTicketOpen && (
        <NewTicketModal
          user={user}
          setores={setores}
          onClose={() => setNewTicketOpen(false)}
          onCreated={(ticket) => {
            setNewTicketOpen(false);
            load();
            onSelect(ticket.numero);
          }}
        />
      )}
    </div>
  );
}

function TicketDetail({
  user,
  ticket,
  onBack,
  onChanged,
}: {
  user: AuthUser;
  ticket: Ticket;
  onBack: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [publicMessage, setPublicMessage] = useState("");
  const [internalMessage, setInternalMessage] = useState("");
  const [showInternal, setShowInternal] = useState(false);
  const [resolutionOpen, setResolutionOpen] = useState(false);
  const [resolutionForm, setResolutionForm] = useState({
    causa: "",
    acaoRealizada: "",
  });
  const isStaff = canOperate(user);
  const isAdmin = canAdmin(user);
  const isResolved = ticket.status === "resolvido";
  const canInteract = !isResolved || isAdmin;
  const canSendPublicComment = canInteract && (isStaff || !isResolved);

  const loadComments = useCallback(async () => {
    setComments(await api<TicketComment[]>(`/tickets/${ticket.numero}/comments`));
  }, [ticket.numero]);

  useEffect(() => {
    loadComments().catch((error) => toast.error(error.message));
  }, [loadComments]);

  async function patchTicket(
    payload: Partial<{ status: TicketStatus; prioridade: TicketPriority; atribuidoAId: string }>,
  ) {
    await api<Ticket>(`/tickets/${ticket.numero}`, {
      method: "PATCH",
      body: JSON.stringify({ ...payload, autorId: user.id }),
    });
    await onChanged();
  }

  async function assumeTicket() {
    await patchTicket({ atribuidoAId: user.id });
    toast.success("Chamado assumido e movido para Em andamento.");
  }

  async function submitResolution() {
    const missing = Object.values(resolutionForm).some((value) => !value.trim());
    if (missing) {
      toast.error("Preencha causa identificada e acao realizada.");
      return;
    }
    await api<Ticket>(`/tickets/${ticket.numero}/resolve`, {
      method: "POST",
      body: JSON.stringify({ ...resolutionForm, autorId: user.id }),
    });
    setResolutionOpen(false);
    setResolutionForm({ causa: "", acaoRealizada: "" });
    await loadComments();
    await onChanged();
    toast.success("Chamado resolvido com registro da solucao.");
  }

  async function sendComment(interno: boolean) {
    if (!canInteract) return;
    const text = interno ? internalMessage : publicMessage;
    if (!text.trim()) return;
    await api<TicketComment>(`/tickets/${ticket.numero}/comments`, {
      method: "POST",
      body: JSON.stringify({ mensagem: text.trim(), interno, autorId: user.id }),
    });
    if (interno) {
      setInternalMessage("");
    } else {
      setPublicMessage("");
    }
    await loadComments();
  }

  const publicComments = comments.filter((comment) => !comment.interno);
  const internalComments = comments.filter((comment) => comment.interno);

  const inic = (n?: string) => (n ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
  const atrasado = isAtrasado(ticket);
  const kicker: CSSProperties = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "#8A6E32" };

  return (
    <div className="overflow-hidden rounded-xl border border-[#D6D1CA] bg-[#F5F3F1]" style={{ boxShadow: "0 24px 60px -40px rgba(0,35,75,.5)" }}>
      {/* Barra navy — artboard 1b */}
      <div className="flex flex-wrap items-center gap-4 bg-[#00234B] px-6 py-4 text-white">
        <button onClick={onBack} className="text-sm text-white/70 transition-colors hover:text-white">← Fila de chamados</button>
        <span className="font-mono text-sm text-[#D7C5AC]">#{ticket.numero}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{ticket.titulo}</span>
      </div>

      <div className="flex flex-col xl:flex-row">
        {/* ---------- conversa (esquerda) ---------- */}
        <div className="flex min-w-0 flex-1 flex-col gap-5 p-7">
          <div className="flex flex-wrap items-center gap-2.5">
            {atrasado && <span className="rounded-md border border-[#F0D4D1] bg-[#FBEDEC] px-2.5 py-1 text-[13px] font-semibold text-[#B4342B]">Atrasado</span>}
            <StatusBadge status={ticket.status} />
            <span className="text-[13px] text-[#6B7480]">Aberto em {formatDateTime(ticket.createdAt)} · {ticket.setor?.nome ?? "—"} · Categoria {ticket.categoria?.nome ?? "—"}</span>
          </div>

          <h2 className="text-[36px] font-semibold leading-tight text-[#00234B]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{ticket.titulo}</h2>

          {/* card do solicitante */}
          <div className="flex flex-col gap-3 rounded-xl border border-[#E4E0DB] bg-white p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#E9E4DA] text-[12px] font-semibold text-[#5B4A28]">{inic(ticket.criadoPor.nomeCompleto)}</span>
              <strong className="text-sm text-[#1B2430]">{ticket.criadoPor.nomeCompleto}</strong>
              <span className="text-[13px] text-[#8A9099]">abriu o chamado · {formatDateTime(ticket.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[#3D4653]">{ticket.descricao}</p>
          </div>

          {/* thread */}
          <div className="flex flex-col gap-3.5">
            {publicComments.length === 0 && <p className="text-[13px] italic text-[#8A9099]">Sem respostas ainda.</p>}
            {publicComments.map((c) => {
              const requester = c.autor.id === ticket.criadoPor.id;
              return (
                <div key={c.id} className="flex gap-3">
                  <span className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${requester ? "bg-[#E9E4DA] text-[#5B4A28]" : "bg-[#00234B] text-[#D7C5AC]"}`}>{inic(c.autor.nomeCompleto)}</span>
                  <div className="flex max-w-[640px] flex-col gap-1.5 rounded-xl border border-[#E4E0DB] bg-white p-4">
                    <div className="flex items-center gap-2"><strong className="text-[13px] text-[#1B2430]">{c.autor.nomeCompleto}</strong><span className="text-[12px] text-[#8A9099]">{formatDateTime(c.createdAt)}</span></div>
                    <p className="text-sm leading-relaxed text-[#3D4653]">{c.mensagem}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* reply bar */}
          <div className="mt-auto flex flex-col gap-3 rounded-xl border border-[#E4E0DB] bg-white p-4">
            <textarea
              value={publicMessage}
              onChange={(e) => setPublicMessage(e.target.value)}
              disabled={!canSendPublicComment}
              placeholder={`Escreva uma resposta para ${ticket.criadoPor.nomeCompleto.split(" ")[0]}…`}
              className="min-h-[64px] w-full resize-none text-sm text-[#3D4653] outline-none placeholder:text-[#9AA1AB] disabled:opacity-60"
            />
            <div className="flex items-center gap-2.5">
              <button onClick={() => toast.message("Anexar", { description: "Anexos em breve." })} className="flex h-8 items-center rounded-md border border-[#DEDAD3] px-3 text-[13px] text-[#3D4653]">Anexar</button>
              {isStaff && (
                <button onClick={() => setShowInternal((v) => !v)} className={`flex h-8 items-center rounded-md border px-3 text-[13px] ${showInternal ? "border-[#C9BCA5] bg-[#FBF7F0] text-[#5B4A28]" : "border-[#DEDAD3] text-[#3D4653]"}`}>Nota interna</button>
              )}
              <button onClick={() => sendComment(false)} disabled={!canSendPublicComment} className="ml-auto flex h-9 items-center rounded-lg bg-[#00234B] px-[18px] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Responder</button>
            </div>
            {isStaff && showInternal && (
              <div className="flex flex-col gap-2 border-t border-[#EDEAE5] pt-3">
                <textarea value={internalMessage} onChange={(e) => setInternalMessage(e.target.value)} disabled={!canInteract} placeholder="Anotação interna (operador/admin)" className="min-h-[56px] w-full resize-none rounded-lg border border-[#DEDAD3] p-2.5 text-sm outline-none focus:border-[#00234B] disabled:bg-slate-50" />
                {internalComments.length > 0 && <div className="flex flex-col gap-1 text-[12px] text-[#6B7480]">{internalComments.slice(-3).map((c) => <div key={c.id}><strong className="text-[#1B2430]">{c.autor.nomeCompleto}:</strong> {c.mensagem}</div>)}</div>}
                <button onClick={() => sendComment(true)} disabled={!canInteract} className="w-fit rounded-md border border-[#DEDAD3] px-3 py-1.5 text-[13px] font-medium text-[#3D4653] disabled:opacity-50">Salvar nota interna</button>
              </div>
            )}
          </div>
        </div>

        {/* ---------- contexto (direita) ---------- */}
        <aside className="flex w-full shrink-0 flex-col gap-[22px] border-t border-[#E4E0DB] bg-white p-6 xl:w-[392px] xl:border-l xl:border-t-0">
          <div className="flex flex-col gap-2.5">
            <button onClick={() => setResolutionOpen(true)} disabled={isResolved} className="flex h-11 items-center justify-center rounded-[9px] bg-[#2F7A54] text-[15px] font-semibold text-white disabled:opacity-50">Resolver chamado</button>
            <div className="flex gap-2.5">
              {isStaff && ticket.atribuidoA?.id !== user.id ? (
                <button onClick={assumeTicket} disabled={!canInteract} className="flex h-10 flex-1 items-center justify-center rounded-[9px] border border-[#DEDAD3] text-sm font-medium text-[#3D4653] disabled:opacity-50">Assumir</button>
              ) : (
                <button onClick={() => toast.message("Transferir", { description: "Transferência em breve." })} className="flex h-10 flex-1 items-center justify-center rounded-[9px] border border-[#DEDAD3] text-sm font-medium text-[#3D4653]">Transferir</button>
              )}
              <button onClick={() => toast.message("Reagendar SLA", { description: "Em breve." })} className="flex h-10 flex-1 items-center justify-center rounded-[9px] border border-[#DEDAD3] text-sm font-medium text-[#3D4653]">Reagendar SLA</button>
            </div>
          </div>

          {/* ATENDIMENTO */}
          <div className="flex flex-col gap-3">
            <span style={kicker}>Atendimento</span>
            <div className="flex items-center justify-between text-sm"><span className="text-[#6B7480]">Responsável</span><strong className="font-semibold text-[#1B2430]">{ticket.atribuidoA?.nomeCompleto ?? "Não atribuído"}</strong></div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6B7480]">Prioridade</span>
              {isStaff && canInteract ? (
                <select value={ticket.prioridade} onChange={(e) => patchTicket({ prioridade: e.target.value as TicketPriority })} className="cursor-pointer bg-transparent text-right text-sm font-semibold text-[#B4342B] outline-none">
                  {Object.entries(PRIORITY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ) : <strong className="font-semibold text-[#B4342B]">{PRIORITY_LABEL[ticket.prioridade]}</strong>}
            </div>
            <div className="flex items-center justify-between text-sm"><span className="text-[#6B7480]">Prazo</span><strong className={`font-semibold ${atrasado ? "text-[#B4342B]" : "text-[#1B2430]"}`}>{formatDateTime(ticket.prazo)}</strong></div>
            <div className="flex items-center justify-between text-sm"><span className="text-[#6B7480]">Setor</span><strong className="font-semibold text-[#1B2430]">{ticket.setor?.nome ?? "—"}</strong></div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6B7480]">Status</span>
              {isStaff && canInteract ? (
                <select value={ticket.status} onChange={(e) => patchTicket({ status: e.target.value as TicketStatus })} className="cursor-pointer bg-transparent text-right text-sm font-semibold text-[#00234B] outline-none">
                  {Object.entries(STATUS_LABEL).filter(([v]) => v !== "resolvido" || isResolved).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ) : <strong className="font-semibold text-[#00234B]">{STATUS_LABEL[ticket.status]}</strong>}
            </div>
          </div>

          <div className="h-px bg-[#EDEAE5]" />

          {/* PATRIMÔNIO VINCULADO */}
          <div className="flex flex-col gap-3">
            <span style={kicker}>Patrimônio vinculado</span>
            {ticket.equipamentoRelacionado ? (
              <>
                <div className="flex flex-col gap-2.5 rounded-[10px] border border-[#E4E0DB] bg-[#FAF9F7] p-3.5">
                  <strong className="text-sm text-[#1B2430]">{ticket.equipamentoRelacionado}</strong>
                  <div className="flex gap-2">
                    <button onClick={() => window.open(sameHostUrl(8082), "_blank")} className="flex h-[30px] items-center rounded-[7px] border border-[#C9BCA5] bg-[#FBF7F0] px-3 text-[13px] font-medium text-[#5B4A28]">Ver no mapa</button>
                    <button onClick={() => toast.message("Histórico", { description: "Abra o patrimônio no Inventário." })} className="flex h-[30px] items-center rounded-[7px] border border-[#DEDAD3] px-3 text-[13px] text-[#3D4653]">Histórico</button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-[13px] text-[#6B7480]">Nenhum equipamento vinculado.</p>
            )}
          </div>

          <div className="h-px bg-[#EDEAE5]" />

          {/* LINHA DO TEMPO */}
          <div className="flex flex-col gap-3.5">
            <span style={kicker}>Linha do tempo</span>
            <div className="flex gap-3"><span className="mt-[5px] h-[9px] w-[9px] rounded-full bg-[#00234B]" /><div className="flex flex-col"><span className="text-[13px] text-[#1B2430]">Chamado aberto</span><span className="text-[12px] text-[#8A9099]">{formatDateTime(ticket.createdAt)} · {ticket.criadoPor.nomeCompleto.split(" ")[0]}</span></div></div>
            {ticket.atribuidoA && <div className="flex gap-3"><span className="mt-[5px] h-[9px] w-[9px] rounded-full bg-[#00234B]" /><div className="flex flex-col"><span className="text-[13px] text-[#1B2430]">Assumido pelo operador</span><span className="text-[12px] text-[#8A9099]">{ticket.atribuidoA.nomeCompleto.split(" ")[0]}</span></div></div>}
            <div className="flex gap-3"><span className="mt-[5px] h-[9px] w-[9px] rounded-full bg-[#D7C5AC]" /><div className="flex flex-col"><span className="text-[13px] text-[#1B2430]">Status atual: {STATUS_LABEL[ticket.status]}</span><span className="text-[12px] text-[#8A9099]">{formatDateTime(ticket.updatedAt)}</span></div></div>
            {atrasado && <div className="flex gap-3"><span className="mt-[5px] h-[9px] w-[9px] rounded-full bg-[#B4342B]" /><div className="flex flex-col"><span className="text-[13px] text-[#B4342B]">Prazo estourado</span><span className="text-[12px] text-[#8A9099]">{formatDateTime(ticket.prazo)}</span></div></div>}
          </div>
        </aside>
      </div>
      {resolutionOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">Resolver chamado #{ticket.numero}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Registre o problema encontrado e como ele foi resolvido.
                </p>
              </div>
              <button
                onClick={() => setResolutionOpen(false)}
                className="rounded-md border border-slate-200 px-3 py-1 text-sm font-medium"
              >
                Fechar
              </button>
            </div>
            <div className="mt-5 grid gap-4">
              <ResolutionField
                label="Causa identificada"
                value={resolutionForm.causa}
                onChange={(value) => setResolutionForm((current) => ({ ...current, causa: value }))}
                placeholder="Ex.: driver da impressora estava corrompido apos atualizacao."
              />
              <ResolutionField
                label="Acao realizada"
                value={resolutionForm.acaoRealizada}
                onChange={(value) => setResolutionForm((current) => ({ ...current, acaoRealizada: value }))}
                placeholder="Ex.: removido driver antigo, instalado pacote atualizado e reiniciado spooler."
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setResolutionOpen(false)}
                className="h-11 rounded-md border border-slate-200 px-4 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={submitResolution}
                className="h-11 rounded-md bg-[#2F7A54] px-5 text-sm font-semibold text-white"
              >
                Confirmar resolucao
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type ReportKind = "tickets_detailed" | "tickets_by_responsible" | "employees" | "assets_by_responsible" | "assets_detailed_by_department" | "assets_without_responsible";
type ReportRow = Record<string, string | number | null>;

interface InventoryAssetReport {
  assetId: number;
  assetCode: string;
  assetType: string;
  assetDescription: string;
  serialNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  assetStatus: string;
  stationCode: string | null;
  stationName: string | null;
  employeeName: string | null;
  departmentId: string | null;
  departmentName: string | null;
}

const REPORT_LABELS: Record<ReportKind, string> = {
  tickets_detailed: "Chamados detalhados",
  assets_detailed_by_department: "Inventario detalhado por departamento",
  tickets_by_responsible: "Chamados por responsável",
  employees: "Funcionários",
  assets_by_responsible: "Patrimônios por responsável",
  assets_without_responsible: "Patrimônios sem responsável",
};


function ReportsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assets, setAssets] = useState<InventoryAssetReport[]>([]);
  const [reportKind, setReportKind] = useState<ReportKind>("tickets_detailed");
  const [status, setStatus] = useState<TicketStatus | "all">("all");
  const [departmentId, setDepartmentId] = useState("all");
  const [responsible, setResponsible] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getSharedAuthToken();
    Promise.all([
      api<Ticket[]>("/tickets"),
      api<Employee[]>("/employees"),
      token
        ? fetch(inventoryApiUrl("/assets-flat"), { headers: { Authorization: token } }).then((response) => response.ok ? response.json() : [])
        : Promise.resolve([]),
    ])
      .then(([nextTickets, nextEmployees, nextAssets]) => {
        setTickets(nextTickets);
        setEmployees(nextEmployees);
        setAssets(nextAssets as InventoryAssetReport[]);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Falha ao carregar relatórios"))
      .finally(() => setLoading(false));
  }, []);

  const departments = useMemo(
    () => uniqueBy(employees.flatMap((employee) => employee.department ? [employee.department] : []), "id"),
    [employees],
  );

  const responsibleOptions = useMemo(
    () => uniqueBy(tickets.flatMap((ticket) => ticket.atribuidoA ? [ticket.atribuidoA] : []), "id"),
    [tickets],
  );

  const isInventoryReport = reportKind === "assets_by_responsible" || reportKind === "assets_detailed_by_department" || reportKind === "assets_without_responsible";

  const inventoryDepartments = useMemo(
    () => uniqueBy(assets.flatMap((asset) => asset.departmentId && asset.departmentName ? [{ id: asset.departmentId, name: asset.departmentName }] : []), "id"),
    [assets],
  );

  const assetResponsibleOptions = useMemo(
    () => Array.from(new Set(assets.flatMap((asset) => asset.employeeName ? [asset.employeeName] : []))).sort((a, b) => a.localeCompare(b)),
    [assets],
  );

  const departmentFilterOptions = isInventoryReport ? inventoryDepartments : departments;
  const responsibleFilterOptions: Array<[string, string]> = isInventoryReport
    ? [["all", "Todos"], ...assetResponsibleOptions.map((name) => [name, name] as [string, string])]
    : [["all", "Todos"], ...responsibleOptions.map((item) => [item.id, item.nomeCompleto] as [string, string])];

  const filteredTickets = useMemo(() => {
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null;
    return tickets.filter((ticket) => {
      if (status !== "all" && ticket.status !== status) return false;
      if (responsible !== "all" && ticket.atribuidoA?.id !== responsible) return false;
      if (departmentId !== "all" && ticket.criadoPor.employee?.department?.id !== departmentId) return false;
      if (from && new Date(ticket.createdAt) < from) return false;
      if (to && new Date(ticket.createdAt) > to) return false;
      return true;
    });
  }, [tickets, status, responsible, departmentId, dateFrom, dateTo]);

  const rows = useMemo<ReportRow[]>(() => {
    if (reportKind === "tickets_detailed") {
      return filteredTickets.map((ticket) => ({
        Número: ticket.numero,
        Título: ticket.titulo,
        Status: STATUS_LABEL[ticket.status],
        Prioridade: PRIORITY_LABEL[ticket.prioridade],
        Setor: ticket.setor?.nome ?? "",
        Categoria: ticket.categoria?.nome ?? "",
        Solicitante: ticket.criadoPor.nomeCompleto,
        Responsável: ticket.atribuidoA?.nomeCompleto ?? "",
        Aberto_em: formatDateTime(ticket.createdAt),
        Prazo: formatDateTime(ticket.prazo),
        Resolvido_em: formatDateTime(ticket.resolvidoEm),
      }));
    }

    if (reportKind === "tickets_by_responsible") {
      const groups = new Map<string, { nome: string; total: number; resolvidos: number; pendentes: number; atrasados: number }>();
      filteredTickets.forEach((ticket) => {
        const key = ticket.atribuidoA?.id ?? "sem-responsavel";
        const current = groups.get(key) ?? { nome: ticket.atribuidoA?.nomeCompleto ?? "Sem responsável", total: 0, resolvidos: 0, pendentes: 0, atrasados: 0 };
        current.total++;
        if (ticket.status === "resolvido") current.resolvidos++;
        if (ticket.status !== "resolvido") current.pendentes++;
        if (isAtrasado(ticket)) current.atrasados++;
        groups.set(key, current);
      });
      return Array.from(groups.values()).map((item) => ({
        Responsável: item.nome,
        Total: item.total,
        Resolvidos: item.resolvidos,
        Pendentes: item.pendentes,
        Atrasados: item.atrasados,
      }));
    }

    if (reportKind === "employees") {
      return employees
        .filter((employee) => departmentId === "all" || employee.department?.id === departmentId)
        .map((employee) => ({
          Nome: employee.fullName,
          Usuário: employee.username ?? "",
          Email: employee.email ?? "",
          CPF: employee.cpf ?? "",
          Departamento: employee.department?.name ?? "",
          Status: employee.status === "ACTIVE" ? "Ativo" : "Inativo",
          Papel: ROLE_LABEL[employee.role ?? "usuario"],
        }));
    }

    const filteredAssets = assets.filter((asset) => {
      if (departmentId !== "all" && asset.departmentId !== departmentId) return false;
      if (responsible !== "all" && asset.employeeName !== responsible) return false;
      return true;
    });
    const selectedAssets = filteredAssets.filter((asset) => reportKind === "assets_without_responsible" ? !asset.employeeName : true);
    const grouped = new Map<string, { responsavel: string; departamento: string; total: number }>();
    selectedAssets.forEach((asset) => {
      const key = asset.employeeName ?? "Sem responsável";
      const current = grouped.get(key) ?? { responsavel: key, departamento: asset.departmentName ?? "", total: 0 };
      current.total++;
      grouped.set(key, current);
    });
    if (reportKind === "assets_by_responsible") {
      return Array.from(grouped.values()).map((item) => ({
        Responsável: item.responsavel,
        Departamento: item.departamento,
        Patrimônios: item.total,
      }));
    }
    if (reportKind === "assets_detailed_by_department") {
      return [...selectedAssets]
        .sort((first, second) => `${first.departmentName ?? ""}${first.employeeName ?? ""}${first.assetCode}`.localeCompare(`${second.departmentName ?? ""}${second.employeeName ?? ""}${second.assetCode}`))
        .map((asset) => ({
          Departamento: asset.departmentName ?? "Sem departamento",
          Responsavel: asset.employeeName ?? "Sem responsavel",
          Patrimonio: asset.assetCode,
          Tipo: asset.assetType,
          Descricao: asset.assetDescription,
          Modelo: asset.model ?? "",
          Fabricante: asset.manufacturer ?? "",
          Serie: asset.serialNumber ?? "",
          Estacao: asset.stationCode ?? "",
          Local: asset.stationName ?? "",
          Status: asset.assetStatus,
        }));
    }
    return selectedAssets.map((asset) => ({
      Código: asset.assetCode,
      Tipo: asset.assetType,
      Descrição: asset.assetDescription,
      Status: asset.assetStatus,
      Estação: asset.stationCode ?? "",
      Local: asset.stationName ?? "",
      Departamento: asset.departmentName ?? "",
    }));
  }, [reportKind, filteredTickets, employees, assets, departmentId, responsible]);

  const columns = rows.length ? Object.keys(rows[0]) : [];
  const filename = REPORT_LABELS[reportKind].toLowerCase().replaceAll(" ", "-").normalize("NFD").replaceAll(/\p{M}/gu, "");

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr_0.9fr_0.9fr_0.75fr_0.75fr_auto_auto]">
          <FilterSelect
            label="Relatório"
            value={reportKind}
            onChange={(value) => {
              setReportKind(value as ReportKind);
              setResponsible("all");
            }}
            options={Object.entries(REPORT_LABELS)}
          />
          <FilterSelect label="Status" value={status} onChange={(value) => setStatus(value as TicketStatus | "all")} options={[["all", "Todos"], ...Object.entries(STATUS_LABEL)]} />
          <FilterSelect label="Departamento" value={departmentId} onChange={setDepartmentId} options={[["all", "Todos"], ...departmentFilterOptions.map((department) => [department.id, department.name] as [string, string])]} />
          <FilterSelect label="Responsavel" value={responsible} onChange={setResponsible} options={responsibleFilterOptions} />
          <DateField label="De" value={dateFrom} onChange={setDateFrom} />
          <DateField label="Até" value={dateTo} onChange={setDateTo} />
          <button type="button" onClick={() => exportRows(rows, `${filename}.csv`, "csv")} className="mt-6 h-11 rounded-md border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50">CSV</button>
          <button type="button" onClick={() => exportRows(rows, `${filename}.xls`, "xls")} className="mt-6 h-11 rounded-md bg-[#00234B] px-4 text-sm font-semibold text-white">Excel</button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <h3 className="font-semibold">{REPORT_LABELS[reportKind]}</h3>
            <p className="mt-1 text-sm text-slate-500">{loading ? "Carregando..." : `${rows.length} registro(s) encontrado(s)`}</p>
          </div>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>{columns.map((column) => <th key={column} className="px-5 py-3 font-medium">{column}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.slice(0, 100).map((row, index) => (
                <tr key={index} className="hover:bg-slate-50">
                  {columns.map((column) => <td key={column} className="px-5 py-3">{row[column] ?? ""}</td>)}
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={Math.max(columns.length, 1)} className="px-5 py-12 text-center text-slate-500">Nenhum registro para os filtros selecionados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ConfigPage({ view }: { view: View }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [inventoryEmployees, setInventoryEmployees] = useState<Array<{ id: string; stationId: number | null }>>([]);
  const [stations, setStations] = useState<Array<{ id: number; code: string; name: string }>>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
  const [departmentForm, setDepartmentForm] = useState({ id: "", name: "" });
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({
    id: "",
    fullName: "",
    cpf: "",
    email: "",
    username: "",
    status: "ACTIVE" as Employee["status"],
    departmentId: "",
    stationId: "",
    role: "usuario" as AppRole,
    password: "",
    passwordConfirmation: "",
  });

  const loadAdminData = useCallback(() => {
    const authToken = getSharedAuthToken();
    Promise.all([
      api<Department[]>("/departments"),
      api<Employee[]>("/employees"),
      api<Categoria[]>("/categorias"),
      authToken
        ? fetch(inventoryApiUrl("/employees"), { headers: { Authorization: authToken } }).then((response) => response.ok ? response.json() : [])
        : Promise.resolve([]),
      authToken
        ? fetch(inventoryApiUrl("/stations"), { headers: { Authorization: authToken } }).then((response) => response.ok ? response.json() : [])
        : Promise.resolve([]),
    ])
      .then(([nextDepartments, nextEmployees, nextCategorias, nextInventoryEmployees, nextStations]) => {
        setDepartments(nextDepartments);
        setEmployees(nextEmployees);
        setCategorias(nextCategorias);
        setInventoryEmployees(nextInventoryEmployees as Array<{ id: string; stationId: number | null }>);
        setStations(nextStations as Array<{ id: number; code: string; name: string }>);
      })
      .catch((error) => toast.error(error.message));
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  async function saveDepartment(event: FormEvent) {
    event.preventDefault();
    const name = departmentForm.name.trim();
    if (!name) {
      toast.error("Informe o nome do departamento.");
      return;
    }
    try {
      if (departmentForm.id) {
        await api<Department>(`/departments/${departmentForm.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name }),
        });
        toast.success("Departamento atualizado.");
      } else {
        await api<Department>("/departments", {
          method: "POST",
          body: JSON.stringify({ name, active: true }),
        });
        toast.success("Departamento cadastrado.");
      }
      closeDepartmentModal();
      loadAdminData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar departamento");
    }
  }

  async function toggleDepartment(department: Department) {
    await api<Department>(`/departments/${department.id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: !department.active }),
    });
    loadAdminData();
  }

  function editEmployee(employee: Employee) {
    setEmployeeForm({
      id: employee.id,
      fullName: employee.fullName,
      cpf: employee.cpf ?? "",
      email: employee.email ?? "",
      username: employee.username ?? "",
      status: employee.status,
      departmentId: employee.department?.id ?? "",
      stationId: inventoryEmployees.find((item) => item.id === employee.id)?.stationId?.toString() ?? "",
      role: employee.role ?? "usuario",
      password: "",
      passwordConfirmation: "",
    });
    setEmployeeModalOpen(true);
  }

  function clearEmployeeForm() {
    setEmployeeForm({ id: "", fullName: "", cpf: "", email: "", username: "", status: "ACTIVE", departmentId: "", stationId: "", role: "usuario", password: "", passwordConfirmation: "" });
  }

  function openNewEmployeeModal() {
    clearEmployeeForm();
    setEmployeeModalOpen(true);
  }

  function closeEmployeeModal() {
    setEmployeeModalOpen(false);
    clearEmployeeForm();
  }

  function openDepartmentModal(department?: Department) {
    setDepartmentForm({ id: department?.id ?? "", name: department?.name ?? "" });
    setDepartmentModalOpen(true);
  }

  function closeDepartmentModal() {
    setDepartmentModalOpen(false);
    setDepartmentForm({ id: "", name: "" });
  }

  async function saveEmployee(event: FormEvent) {
    event.preventDefault();
    if (!employeeForm.fullName.trim()) {
      toast.error("Informe o nome do funcionario.");
      return;
    }
    if (employeeForm.password !== employeeForm.passwordConfirmation) {
      toast.error("A confirmacao da senha nao confere.");
      return;
    }
    const payload = {
      fullName: employeeForm.fullName.trim(),
      cpf: employeeForm.cpf.trim() || null,
      email: employeeForm.email.trim() || null,
      username: employeeForm.username.trim() || null,
      status: employeeForm.status,
      departmentId: employeeForm.departmentId || null,
      role: employeeForm.role,
      password: employeeForm.password.trim() || null,
    };
    try {
      const previousStationId = employeeForm.id
        ? inventoryEmployees.find((item) => item.id === employeeForm.id)?.stationId?.toString() ?? ""
        : "";
      let savedEmployee: Employee;
      if (employeeForm.id) {
        savedEmployee = await api<Employee>(`/employees/${employeeForm.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Funcionario atualizado.");
      } else {
        savedEmployee = await api<Employee>("/employees", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Funcionario cadastrado.");
      }
      await syncStationResponsibility(savedEmployee.id, previousStationId, employeeForm.stationId);
      closeEmployeeModal();
      loadAdminData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar funcionario");
    }
  }

  const showDepartments = view === "setores";
  const showEmployees = view === "usuarios";

  return (
    <div className="space-y-6">
      {showDepartments && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
            <h3 className="font-semibold">Departamentos</h3>
            <button type="button" onClick={() => openDepartmentModal()} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#00234B] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a315f]">
              <Plus className="h-4 w-4" />
              Cadastrar departamento
            </button>
          </header>
          <AdminList
            items={departments.map((department) => ({
              id: department.id,
              label: department.name,
              active: department.active,
              detail: `${employees.filter((employee) => employee.department?.id === department.id).length} funcionario(s)`,
              onEdit: () => openDepartmentModal(department),
              onToggle: () => void toggleDepartment(department),
            }))}
          />
        </section>
      )}

      {showEmployees && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
            <h3 className="font-semibold">Funcionarios</h3>
            <button type="button" onClick={openNewEmployeeModal} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#00234B] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a315f]">
              <Plus className="h-4 w-4" />
              Cadastrar funcionario
            </button>
          </header>
          <AdminList
            items={employees.map((employee) => ({
              id: employee.id,
              label: `${employee.fullName}${employee.username ? ` (${employee.username})` : ""}`,
              active: employee.status === "ACTIVE",
              detail: `${employee.department?.name ?? "Sem departamento"}${employee.email ? ` · ${employee.email}` : ""}${stationLabel(inventoryEmployees.find((item) => item.id === employee.id)?.stationId, stations)}`,
              onEdit: () => editEmployee(employee),
              onToggle: () => {
                void api<Employee>(`/employees/${employee.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({ status: employee.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }),
                }).then(loadAdminData);
              },
            }))}
          />
        </section>
      )}

      {departmentModalOpen && (
        <AdminModal
          title={departmentForm.id ? "Editar departamento" : "Cadastrar departamento"}
          description="Mantenha os departamentos usados para organizar funcionarios, inventario e relatorios."
          onClose={closeDepartmentModal}
        >
          <form onSubmit={saveDepartment} className="space-y-5">
            <FormField label="Nome do departamento">
              <input
                autoFocus
                value={departmentForm.name}
                onChange={(event) => setDepartmentForm((current) => ({ ...current, name: event.target.value }))}
                className="h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-[#00234B]"
                placeholder="Reconhecimento de firma"
              />
            </FormField>
            <ModalActions onClose={closeDepartmentModal} submitLabel={departmentForm.id ? "Salvar alteracoes" : "Cadastrar departamento"} />
          </form>
        </AdminModal>
      )}

      {employeeModalOpen && (
        <AdminModal
          title={employeeForm.id ? "Editar funcionario" : "Cadastrar funcionario"}
          description="Dados do cadastro interno e da conta usada para acessar o Portal."
          onClose={closeEmployeeModal}
        >
          <form onSubmit={saveEmployee} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Nome completo">
                <input autoFocus value={employeeForm.fullName} onChange={(event) => setEmployeeForm((current) => ({ ...current, fullName: event.target.value }))} className="h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-[#00234B]" placeholder="Nome completo" />
              </FormField>
              <FormField label="Login do sistema" hint={employeeForm.id ? "Pode ser alterado." : "Se vazio, o sistema gera pelo nome ou e-mail."}>
                <input value={employeeForm.username} onChange={(event) => setEmployeeForm((current) => ({ ...current, username: event.target.value }))} className="h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-[#00234B]" placeholder="robson-ferreira-ramos" />
              </FormField>
              <FormField label="E-mail">
                <input type="email" value={employeeForm.email} onChange={(event) => setEmployeeForm((current) => ({ ...current, email: event.target.value }))} className="h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-[#00234B]" placeholder="funcionario@cartorio.local" />
              </FormField>
              <FormField label="CPF" hint="Opcional">
                <input value={employeeForm.cpf} onChange={(event) => setEmployeeForm((current) => ({ ...current, cpf: event.target.value }))} className="h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-[#00234B]" placeholder="CPF" />
              </FormField>
              <FormField label="Departamento">
                <select value={employeeForm.departmentId} onChange={(event) => setEmployeeForm((current) => ({ ...current, departmentId: event.target.value }))} className="h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-[#00234B]">
                  <option value="">Sem departamento</option>
                  {departments.filter((department) => department.active || department.id === employeeForm.departmentId).map((department) => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Estacao">
                <select value={employeeForm.stationId} onChange={(event) => setEmployeeForm((current) => ({ ...current, stationId: event.target.value }))} className="h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-[#00234B]">
                  <option value="">Sem estacao</option>
                  {stations.map((station) => (
                    <option key={station.id} value={station.id}>{station.code} - {station.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Status">
                <select value={employeeForm.status} onChange={(event) => setEmployeeForm((current) => ({ ...current, status: event.target.value as Employee["status"] }))} className="h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-[#00234B]">
                  <option value="ACTIVE">Ativo</option>
                  <option value="INACTIVE">Inativo</option>
                </select>
              </FormField>
              <FormField label="Cargo no sistema">
                <select value={employeeForm.role} onChange={(event) => setEmployeeForm((current) => ({ ...current, role: event.target.value as AppRole }))} className="h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-[#00234B]">
                  <option value="usuario">Funcionario</option>
                  <option value="operador">Operador</option>
                  <option value="admin">Administrador</option>
                </select>
              </FormField>
              <FormField label={employeeForm.id ? "Nova senha" : "Senha inicial"} hint={employeeForm.id ? "Deixe vazio para manter a senha atual." : "Se vazio, sera usada a senha padrao 123456."}>
                <input type="password" value={employeeForm.password} onChange={(event) => setEmployeeForm((current) => ({ ...current, password: event.target.value }))} className="h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-[#00234B]" placeholder={employeeForm.id ? "Nova senha" : "Senha inicial"} />
              </FormField>
              <FormField label="Confirmar senha">
                <input type="password" value={employeeForm.passwordConfirmation} onChange={(event) => setEmployeeForm((current) => ({ ...current, passwordConfirmation: event.target.value }))} className="h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-[#00234B]" placeholder="Repita a senha" />
              </FormField>
            </div>
            <ModalActions onClose={closeEmployeeModal} submitLabel={employeeForm.id ? "Salvar alteracoes" : "Cadastrar funcionario"} />
          </form>
        </AdminModal>
      )}

      {view === "configuracoes" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <ListCard
            title="Categorias de chamado"
            items={categorias.map((categoria) => ({
              id: categoria.id,
              label: categoria.nome,
              active: categoria.ativo,
            }))}
          />
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-200 p-5">
              <h3 className="font-semibold">Parâmetros do sistema</h3>
            </header>
            <div className="space-y-4 p-5 text-sm text-slate-600">
              <Info label="Prazo padrão de novo chamado" value="2 dias" />
              <Info label="Senha inicial de funcionário" value="123456" />
              <Info label="Acesso ao inventário" value="Operador e administrador" />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function AdminModal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <header className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </header>
        <div className="max-h-[82vh] overflow-y-auto p-6">{children}</div>
      </section>
    </div>
  );
}

function FormField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="flex flex-wrap items-baseline justify-between gap-2 text-sm font-medium">
        {label}
        {hint && <span className="text-xs font-normal text-slate-500">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function ModalActions({ onClose, submitLabel }: { onClose: () => void; submitLabel: string }) {
  return (
    <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
      <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50">
        Cancelar
      </button>
      <button className="h-10 rounded-md bg-[#00234B] px-4 text-sm font-semibold text-white transition hover:bg-[#0a315f]">
        {submitLabel}
      </button>
    </div>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-3 text-slate-500">
        Placeholder visual. Falta a especificação desta área para substituir por uma tela final.
      </p>
    </section>
  );
}

function AdminList({
  items,
}: {
  items: Array<{
    id: string;
    label: string;
    active: boolean;
    detail?: string;
    onEdit: () => void;
    onToggle: () => void;
  }>;
}) {
  return (
    <ul className="divide-y divide-slate-100 p-5">
      {items.length === 0 && <li className="py-8 text-center text-sm text-slate-500">Nenhum registro cadastrado.</li>}
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm">
          <span className="min-w-0">
            <span className="block truncate font-medium">{item.label}</span>
            {item.detail && <span className="block truncate text-xs text-slate-500">{item.detail}</span>}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <Badge className={item.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}>
              {item.active ? "Ativo" : "Inativo"}
            </Badge>
            <button type="button" onClick={item.onEdit} className="h-9 rounded-md border border-slate-200 px-3 font-medium hover:bg-slate-50">
              Editar
            </button>
            <button type="button" onClick={item.onToggle} className="h-9 rounded-md border border-slate-200 px-3 font-medium hover:bg-slate-50">
              {item.active ? "Inativar" : "Ativar"}
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}

function exportRows(rows: ReportRow[], filename: string, format: "csv" | "xls") {
  if (!rows.length) {
    toast.error("Não há dados para exportar.");
    return;
  }
  const columns = Object.keys(rows[0]);
  const escapeCell = (value: string | number | null | undefined) => `"${String(value ?? "").replaceAll('"', '""')}"`;

  if (format === "csv") {
    const csv = [
      columns.map(escapeCell).join(";"),
      ...rows.map((row) => columns.map((column) => escapeCell(row[column])).join(";")),
    ].join("\r\n");
    downloadBlob(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }), filename);
    return;
  }

  const table = `<table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  downloadBlob(new Blob([`\uFEFF${table}`], { type: "application/vnd.ms-excel;charset=utf-8" }), filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string | number | null) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getSharedAuthToken() {
  const cookieToken = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("cart_rio_auth="))
    ?.slice("cart_rio_auth=".length);
  if (cookieToken) return decodeURIComponent(cookieToken);

  const raw = localStorage.getItem("cart-rio-auth");
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as { token?: string }).token ?? null;
  } catch {
    return null;
  }
}

async function syncStationResponsibility(employeeId: string, previousStationId: string, nextStationId: string) {
  const token = getSharedAuthToken();
  if (!token || previousStationId === nextStationId) return;
  const headers = { "Content-Type": "application/json", Authorization: token };
  if (previousStationId) {
    await fetch(inventoryApiUrl(`/stations/${previousStationId}/responsible`), {
      method: "PUT",
      headers,
      body: JSON.stringify({ employeeId: null }),
    });
  }
  if (nextStationId) {
    await fetch(inventoryApiUrl(`/stations/${nextStationId}/responsible`), {
      method: "PUT",
      headers,
      body: JSON.stringify({ employeeId }),
    });
  }
}

function stationLabel(stationId: number | null | undefined, stations: Array<{ id: number; code: string; name: string }>) {
  if (!stationId) return "";
  const station = stations.find((item) => item.id === stationId);
  return station ? ` · Estacao ${station.code}` : "";
}

function NewTicketModal({
  user,
  setores,
  onClose,
  onCreated,
}: {
  user: AuthUser;
  setores: Setor[];
  onClose: () => void;
  onCreated: (ticket: Ticket) => void;
}) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [titulo, setTitulo] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [setorId, setSetorId] = useState(setores[0]?.id ?? "");
  const [prioridade, setPrioridade] = useState<TicketPriority>("media");
  const [descricao, setDescricao] = useState("");
  const [anexos, setAnexos] = useState("");
  const [equipamentoRelacionado, setEquipamentoRelacionado] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api<Categoria[]>("/categorias")
      .then((data) => {
        setCategorias(data);
        setCategoriaId(data[0]?.id ?? "");
      })
      .catch((error) => toast.error(error.message));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!titulo.trim() || !descricao.trim()) {
      toast.error("Informe título e descrição.");
      return;
    }
    setSubmitting(true);
    try {
      const ticket = await api<Ticket>("/tickets", {
        method: "POST",
        body: JSON.stringify({
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          prioridade,
          categoriaId: categoriaId || null,
          setorId: setorId || null,
          criadoPorId: user.id,
          anexos: anexos.trim() || null,
          equipamentoRelacionado: equipamentoRelacionado.trim() || null,
        }),
      });
      toast.success("Chamado aberto com status Aberto.");
      onCreated(ticket);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao abrir chamado");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <form
        onSubmit={submit}
        className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white shadow-2xl"
      >
        <header className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-2xl font-semibold">Novo chamado</h2>
          <p className="mt-1 text-sm text-slate-500">
            Solicitante, data/hora e status inicial são automáticos.
          </p>
        </header>

        <div className="grid gap-5 p-6 md:grid-cols-2">
          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium">Título</span>
            <input
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              className="h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-[#00234B]"
              placeholder="Impressora da procuração não imprime"
            />
          </label>
          <FilterSelect
            label="Categoria"
            value={categoriaId}
            onChange={setCategoriaId}
            options={[
              ["", "Selecione"],
              ...categorias.map((categoria) => [categoria.id, categoria.nome] as [string, string]),
            ]}
          />
          <FilterSelect
            label="Setor"
            value={setorId}
            onChange={setSetorId}
            options={[
              ["", "Selecione"],
              ...setores.map((setor) => [setor.id, setor.nome] as [string, string]),
            ]}
          />
          <FilterSelect
            label="Prioridade"
            value={prioridade}
            onChange={(value) => setPrioridade(value as TicketPriority)}
            options={Object.entries(PRIORITY_LABEL)}
          />
          <label className="space-y-1">
            <span className="text-sm font-medium">Equipamento relacionado</span>
            <input
              value={equipamentoRelacionado}
              onChange={(event) => setEquipamentoRelacionado(event.target.value)}
              className="h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-[#00234B]"
              placeholder="Impressora Konica - PROC-02"
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium">Descrição do problema</span>
            <textarea
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              className="min-h-36 w-full rounded-md border border-slate-200 p-3 outline-none focus:border-[#00234B]"
              placeholder="Explique o que está acontecendo, quando começou e se aparece alguma mensagem de erro."
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium">Anexos</span>
            <input
              value={anexos}
              onChange={(event) => setAnexos(event.target.value)}
              className="h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-[#00234B]"
              placeholder="imagem-erro.jpg, log.pdf"
            />
          </label>
        </div>

        <footer className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md border border-slate-200 px-4 font-medium"
          >
            Cancelar
          </button>
          <button
            className="h-10 rounded-md bg-[#00234B] px-5 font-semibold text-white"
            disabled={submitting}
          >
            {submitting ? "Abrindo..." : "Abrir chamado"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function DetailCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-medium text-slate-800">{value}</p>
    </div>
  );
}

function ResolutionField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-semibold text-slate-800">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-20 w-full rounded-lg border border-slate-200 p-3 outline-none focus:border-[#00234B]"
        placeholder={placeholder}
      />
    </label>
  );
}

function TimelineItem({ date, text }: { date: string | null; text: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[#00234B]" />
      <p className="text-sm text-slate-700">
        <span className="font-medium text-slate-900">{formatDateTime(date)}</span> — {text}
      </p>
    </div>
  );
}

function CommentList({ comments }: { comments: TicketComment[] }) {
  if (comments.length === 0)
    return (
      <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Nenhum comentário ainda.</p>
    );
  return (
    <div className="max-h-72 space-y-2 overflow-auto">
      {comments.map((comment) => (
        <div key={comment.id} className="rounded-lg bg-slate-50 p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">{comment.autor.nomeCompleto}</span>
            <span className="text-xs text-slate-500">{formatDateTime(comment.createdAt)}</span>
          </div>
          <p className="mt-1 text-slate-700">{comment.mensagem}</p>
        </div>
      ))}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  icon: Icon,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: LucideIcon;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-base font-medium text-[#071936]">{label}</span>
      <div className="mt-2 flex h-14 items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 shadow-sm">
        <Icon className="h-5 w-5 text-slate-400" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type={type}
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-400"
          placeholder={placeholder}
        />
      </div>
    </label>
  );
}

function StatsRow({ stats, tickets }: { stats: DashboardStats | null; tickets: Ticket[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
      <StatCard
        label="Abertos"
        value={stats?.aberto ?? 0}
        suffix="chamados"
        icon={FileText}
        tone="blue"
      />
      <StatCard
        label="Em andamento"
        value={stats?.emAndamento ?? 0}
        suffix="chamados"
        icon={TicketIcon}
        tone="amber"
      />
      <StatCard
        label="Atrasados"
        value={stats?.atrasados ?? 0}
        suffix="chamados"
        icon={Clock}
        tone="red"
      />
      <StatCard
        label="Resolvidos (mês)"
        value={stats?.resolvidosMes ?? 0}
        suffix="chamados"
        icon={CheckCircle2}
        tone="emerald"
      />
      <StatCard
        label="Tempo médio"
        value={tickets.length ? "4h 35m" : "0h"}
        suffix="de resolução"
        icon={Clock}
        tone="violet"
      />
    </div>
  );
}

function EmployeeStatsRow({ tickets }: { tickets: Ticket[] }) {
  const aberto = tickets.filter((ticket) => ticket.status === "aberto").length;
  const emAndamento = tickets.filter((ticket) => ticket.status === "em_andamento" || ticket.status === "em_analise" || ticket.status === "aguardando_solicitante").length;
  const resolvido = tickets.filter((ticket) => ticket.status === "resolvido").length;
  const atrasado = tickets.filter(isAtrasado).length;

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Abertos" value={aberto} suffix="chamados" icon={FileText} tone="blue" />
      <StatCard label="Em andamento" value={emAndamento} suffix="chamados" icon={TicketIcon} tone="amber" />
      <StatCard label="Resolvidos" value={resolvido} suffix="chamados" icon={CheckCircle2} tone="emerald" />
      <StatCard label="Atrasados" value={atrasado} suffix="chamados" icon={Clock} tone="red" />
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  suffix: string;
  icon: LucideIcon;
  tone: "blue" | "amber" | "red" | "emerald" | "violet";
}) {
  const toneColor = {
    blue: "#2E5AAC",
    amber: "#A87413",
    red: "#B4342B",
    emerald: "#2F7A54",
    violet: "#6854AA",
  }[tone];
  const valueColor = tone === "red" ? "#B4342B" : "#00234B";
  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5"
      style={{ boxShadow: `inset 3px 0 0 ${toneColor}` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">{label}</span>
        <Icon className="h-4 w-4" style={{ color: toneColor }} />
      </div>
      <span
        className="font-mono text-[32px] font-medium leading-none"
        style={{ color: valueColor, fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </span>
      <span className="text-xs text-slate-500">{suffix}</span>
    </div>
  );
}

function FilterSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1 text-sm">
      <span className="invisible font-medium">Busca</span>
      <div className="flex h-11 items-center gap-3 rounded-md border border-slate-200 px-3">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 outline-none"
          placeholder="Buscar por título, nº ou solicitante..."
        />
        <Search className="h-5 w-5 text-slate-500" />
      </div>
    </label>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 outline-none"
      >
        {options.map(([optionValue, label]) => (
          <option key={optionValue} value={optionValue}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <div className="flex h-11 items-center gap-2 rounded-md border border-slate-200 px-3">
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent outline-none"
        />
        <CalendarDays className="h-4 w-4 text-slate-500" />
      </div>
    </label>
  );
}

function Tab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative h-16 whitespace-nowrap px-1 text-sm font-medium ${active ? "text-[#071936]" : "text-slate-600"}`}
    >
      {label}
      {typeof count === "number" && (
        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">{count}</span>
      )}
      {active && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-[#071936]" />}
    </button>
  );
}

function StatusBadge({ status }: { status: TicketStatus }) {
  const classes = {
    aberto: "border-[#D2DEF3] bg-[#EDF2FB] text-[#2E5AAC]",
    em_analise: "border-[#D2DEF3] bg-[#EDF2FB] text-[#2E5AAC]",
    em_andamento: "border-[#EBDCBB] bg-[#FBF4E6] text-[#A87413]",
    aguardando_solicitante: "border-violet-200 bg-violet-50 text-violet-700",
    resolvido: "border-[#CFE5D8] bg-[#EDF6F0] text-[#2F7A54]",
  };
  return <Badge className={classes[status]}>{STATUS_LABEL[status]}</Badge>;
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const classes = {
    baixa: "border-[#E4E0DB] bg-[#F3F1EE] text-[#5C6675]",
    media: "border-[#EBDCBB] bg-[#FBF4E6] text-[#A87413]",
    alta: "border-[#F0D4D1] bg-[#FBEDEC] text-[#B4342B]",
  };
  return <Badge className={classes[priority]}>{PRIORITY_LABEL[priority]}</Badge>;
}

function Badge({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

function ListCard({
  title,
  items,
}: {
  title: string;
  items: Array<{ id: string; label: string; active: boolean; detail?: string }>;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 p-5">
        <h3 className="font-semibold">{title}</h3>
      </header>
      <ul className="divide-y divide-slate-100 p-5">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between py-3 text-sm">
            <span>
              <span className="block font-medium">{item.label}</span>
              {item.detail && <span className="block text-xs text-slate-500">{item.detail}</span>}
            </span>
            <Badge
              className={
                item.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
              }
            >
              {item.active ? "Ativo" : "Inativo"}
            </Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}

function uniqueBy<T extends { id: string }>(items: T[], key: keyof T) {
  return Array.from(new Map(items.map((item) => [item[key], item])).values());
}

function formatDateShort(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDue(value: string | null) {
  if (!value) return "—";
  if (new Date(value).getTime() < Date.now()) return "Hoje";
  return formatDateShort(value);
}
