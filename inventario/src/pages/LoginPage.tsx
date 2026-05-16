import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import loginBackground from "@/assets/login-bg.jpg";
import logoCartorio from "@/assets/logo-cartorio.png";
import { useAuthStore } from "@/features/auth/store/useAuthStore";

const LoginPage = () => {
  const navigate = useNavigate();
  const { status, user, error, login } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setLocalError(null);
  }, [username, password]);

  if (status === "authenticated" && user) {
    return <Navigate to="/" replace />;
  }

  const isSubmitting = status === "loading";

  return (
    <div className="relative flex min-h-screen w-full bg-background">
      <div className="relative hidden overflow-hidden border-r border-border lg:flex lg:w-[45%] xl:w-[42%]">
        <div className="absolute inset-0 bg-slate-950" />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${loginBackground})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/92 via-slate-950/78 to-amber-950/60" />
        <div className="absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-white/15 to-transparent" />

        <div className="relative z-10 flex h-full w-full flex-col justify-between p-12 text-white">
          <div>
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-md border border-white/10 bg-amber-400/10">
                <img src={logoCartorio} alt="Logo do cartorio" className="h-7 w-7 object-contain" width={28} height={28} />
              </div>
              <div>
                <p className="text-[13px] font-semibold tracking-wide text-white">
                  Cartorio Indio Artiaga
                </p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-white/60">
                  4 Tabelionato de Notas
                </p>
              </div>
            </div>
          </div>

          <div className="max-w-md">
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.3em] text-amber-300">
              Plataforma Interna
            </p>
            <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-white xl:text-[32px]">
              Sistema de Gestao
              <br />
              <span className="text-amber-300">Patrimonial</span>
            </h1>
            <p className="mt-5 max-w-sm text-[13px] leading-relaxed text-white/70">
              Controle bens, estacoes e movimentacoes em uma unica plataforma operacional.
            </p>

            <div className="mt-10 flex gap-6">
              {[
                { number: "Mapa", label: "Visao visual do inventario" },
                { number: "Fluxo", label: "Vinculo e transferencia" },
                { number: "Base", label: "Persistencia centralizada" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-lg font-semibold text-white">{stat.number}</p>
                  <p className="mt-0.5 text-[10px] tracking-wide text-white/55">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] tracking-wider text-white/30">
            © 2026 Cartorio Indio Artiaga
          </p>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[360px]">
          <div className="mb-12 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md border border-border bg-amber-400/10">
              <img src={logoCartorio} alt="Logo" className="h-7 w-7 object-contain" width={28} height={28} />
            </div>
            <p className="text-sm font-semibold tracking-wide text-foreground">
              Cartorio Indio Artiaga
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Bem-vindo de volta
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Faca login para acessar o sistema
            </p>
          </div>

          <form
            className="mt-8 space-y-5"
            onSubmit={async (event) => {
              event.preventDefault();
              setLocalError(null);

              try {
                await login(username.trim(), password);
                navigate("/", { replace: true });
              } catch (err) {
                setLocalError(err instanceof Error ? err.message : "Falha ao autenticar");
              }
            }}
          >
            <div className="space-y-2">
              <label htmlFor="username" className="block text-xs font-medium tracking-wide text-muted-foreground">
                Usuario
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="admin"
                autoComplete="username"
                autoFocus
                required
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/40 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/15"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-medium tracking-wide text-muted-foreground">
                  Senha
                </label>
                <button type="button" className="text-[11px] text-muted-foreground transition-colors duration-200 hover:text-foreground">
                  Esqueceu a senha?
                </button>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/40 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/15"
              />
            </div>

            <label className="group flex cursor-pointer items-center gap-3">
              <div
                className={`flex h-[18px] w-[18px] items-center justify-center rounded border-[1.5px] transition-all duration-200 ${
                  rememberMe ? "border-amber-400 bg-amber-400" : "border-border group-hover:border-muted-foreground/40"
                }`}
              >
                {rememberMe ? (
                  <svg className="h-2.5 w-2.5 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : null}
              </div>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="sr-only"
              />
              <span className="text-xs text-muted-foreground transition-colors duration-200 group-hover:text-foreground">
                Manter conectado
              </span>
            </label>

            {(localError || error) ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {localError || error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || !username.trim() || !password}
              className="w-full rounded-lg bg-amber-400 py-3 text-sm font-semibold tracking-wide text-slate-950 transition-all duration-200 hover:brightness-105 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Autenticando...
                </span>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          <div className="mt-12 border-t border-border/40 pt-6">
            <p className="text-center text-[10px] tracking-wider text-muted-foreground/50">
              Acesso restrito a funcionarios autorizados
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
