import { ReactNode, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Package,
  Map as MapIcon,
  LayoutGrid,
  ArrowLeftRight,
  FileMinus2,
  Archive,
  Shapes,
  Upload,
  Building2,
  Users,
  Search,
  Menu,
  LogOut,
  X,
} from "lucide-react";
import logo from "@/assets/logo-cartorio.png";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { useInventoryStore } from "@/features/inventory-map/store/useInventoryStore";

type NavKey =
  | "patrimonios"
  | "mapa"
  | "espacos"
  | "catalogo"
  | "departamentos"
  | "funcionarios"
  | "movimentacoes"
  | "baixas"
  | "arquivo"
  | "importar";

interface NavItem {
  key: NavKey;
  label: string;
  to: string;
  icon: typeof Package;
  count?: number;
  adminOnly?: boolean;
  disabled?: boolean;
}

interface AppShellProps {
  active: NavKey;
  /** Conteúdo à direita da barra superior (ações da página). */
  actions?: ReactNode;
  /** Slot de busca da barra superior. Se ausente, mostra um campo estático. */
  search?: ReactNode;
  children: ReactNode;
}

const chamadosUrl = () =>
  `${window.location.protocol}//${window.location.hostname}:8080`;

const initialsOf = (name?: string) =>
  (name ?? "?")
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";

const AppShell = ({ active, actions, search, children }: AppShellProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");
  const assets = useInventoryStore((s) => s.assets);
  const employeeCount = useInventoryStore((s) => s.employees.length);
  const [mobileOpen, setMobileOpen] = useState(false);

  const disposedCount = useMemo(
    () => assets.filter((a) => a.status === "DISPOSED").length,
    [assets],
  );

  const navItems: NavItem[] = [
    { key: "patrimonios", label: "Patrimônios", to: "/patrimonios", icon: Package, count: assets.length },
    { key: "mapa", label: "Mapa patrimonial", to: "/", icon: MapIcon },
    { key: "espacos", label: "Espaços e estações", to: "/espacos", icon: LayoutGrid },
    { key: "catalogo", label: "Catálogo", to: "/catalogo", icon: Shapes },
    { key: "departamentos", label: "Departamentos", to: "/departamentos", icon: Building2 },
    { key: "funcionarios", label: "Funcionários", to: "/funcionarios", icon: Users, count: employeeCount || undefined },
    { key: "movimentacoes", label: "Movimentações", to: "#", icon: ArrowLeftRight, disabled: true },
    { key: "baixas", label: "Baixas patrimoniais", to: "/baixas-patrimoniais", icon: FileMinus2, count: disposedCount || undefined },
    { key: "arquivo", label: "Arquivo", to: "/arquivo", icon: Archive, adminOnly: true },
    { key: "importar", label: "Importar planilha", to: "/importar", icon: Upload, adminOnly: true },
  ];

  const handleLogout = () => {
    logout();
    window.location.href = chamadosUrl();
  };

  const Sidebar = (
    <aside className="flex h-full w-[248px] shrink-0 flex-col bg-primary text-primary-foreground">
      {/* Marca */}
      <div className="flex items-center gap-3 border-b border-champagne/20 px-5 py-5">
        <img src={logo} alt="Cartório Índio Artiaga" className="h-[42px] w-[30px] object-contain" />
        <div className="flex flex-col gap-0.5">
          <span className="font-serif text-[19px] font-semibold leading-none text-white">Índio Artiaga</span>
          <span className="text-[11px] tracking-wide text-champagne">4º Tabelionato de Notas</span>
        </div>
      </div>

      {/* Alternador de módulo */}
      <div className="flex flex-col gap-2 px-3.5 pb-2.5 pt-4">
        <span className="label-mono px-2 !text-[10px] !tracking-[0.14em] text-primary-foreground/45">Módulo</span>
        <div className="grid grid-cols-2 gap-1.5 rounded-[9px] bg-white/[0.07] p-1">
          <button
            type="button"
            onClick={() => { window.location.href = chamadosUrl(); }}
            className="rounded-md py-2 text-center text-[13px] font-medium text-primary-foreground/70 transition-colors hover:text-primary-foreground"
          >
            Chamados
          </button>
          <button
            type="button"
            className="rounded-md bg-champagne py-2 text-center text-[13px] font-semibold text-primary"
          >
            Inventário
          </button>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3.5 py-3">
        {navItems.map((item, idx) => {
          if (item.adminOnly && !isAdmin) return null;
          const isActive = active === item.key;
          const showDivider = item.key === "importar";
          return (
            <div key={item.key} className="contents">
              {showDivider && <div className="mx-1 my-3 h-px bg-champagne/20" />}
              <button
                type="button"
                disabled={item.disabled}
                onClick={() => { if (!item.disabled && item.to !== "#") navigate(item.to); setMobileOpen(false); }}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition-colors",
                  isActive
                    ? "bg-champagne/[0.16] font-semibold text-white shadow-[inset_3px_0_0_hsl(var(--champagne))]"
                    : "text-primary-foreground/70 hover:bg-white/5 hover:text-primary-foreground",
                  item.disabled && "cursor-not-allowed opacity-45 hover:bg-transparent",
                )}
              >
                <span
                  className={cn(
                    "h-[7px] w-[7px] rounded-[2px]",
                    isActive ? "bg-champagne" : "bg-primary-foreground/35",
                  )}
                />
                {item.label}
                {item.count != null && (
                  <span className={cn("num-mono ml-auto text-[12px]", isActive ? "text-champagne" : "text-primary-foreground/50")}>
                    {item.count.toLocaleString("pt-BR")}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </nav>

      {/* Rodapé — usuário */}
      <div className="mt-auto flex items-center gap-3 border-t border-champagne/20 p-4">
        <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-champagne/20 text-[13px] font-semibold text-champagne">
          {initialsOf(user?.username)}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[13px] font-semibold text-white">{user?.username ?? "—"}</span>
          <span className="truncate text-[11px] text-primary-foreground/55">{user?.displayRole ?? "Operador"}</span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          title="Sair"
          className="ml-auto rounded-md p-1.5 text-primary-foreground/60 transition-colors hover:bg-white/10 hover:text-primary-foreground"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-paper text-foreground">
      {/* Sidebar desktop */}
      <div className="hidden md:flex">{Sidebar}</div>

      {/* Sidebar mobile (overlay) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-primary/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-md p-1 text-primary-foreground/70 hover:text-primary-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            {Sidebar}
          </div>
        </div>
      )}

      {/* Coluna principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-card px-4 md:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          {search ?? (
            <div className="flex h-[38px] w-full max-w-[460px] items-center gap-2.5 rounded-lg border border-input bg-paper-2 px-3">
              <Search className="h-4 w-4 text-muted-foreground/70" />
              <span className="text-sm text-muted-foreground/70">Buscar chamado, patrimônio ou pessoa</span>
              <span className="num-mono ml-auto rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground/70">⌘K</span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2.5">{actions}</div>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
};

export default AppShell;
