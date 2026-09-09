import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, Lock } from "lucide-react";

const LoginPage = () => {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setBusy(true);
    setError(null);
    try {
      await login(username.trim(), password, remember);
      const role = useAuthStore.getState().user?.role;
      navigate(role === "USER" ? "/conferencia" : "/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao autenticar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-primary text-white">
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-champagne/40 bg-white/5">
            <svg viewBox="0 0 24 40" className="h-9 w-9 text-champagne" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2C6 10 6 24 12 38C18 24 18 10 12 2Z" />
              <path d="M12 6V34M12 12L7 15M12 12L17 15M12 20L7 23M12 20L17 23" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl font-semibold tracking-wide">PORTAL ÍNDIO ARTIAGA</h1>
          <p className="mt-1 text-sm text-champagne">Conferência de Patrimônio</p>
        </div>

        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-white/70">Usuário</Label>
            <div className="relative flex items-center">
              <User className="pointer-events-none absolute left-3 h-4 w-4 text-white/40" />
              <Input
                autoFocus autoCapitalize="none" autoCorrect="off"
                value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="Seu usuário"
                className="h-12 border-white/15 bg-white/10 pl-10 text-base text-white placeholder:text-white/40"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-white/70">Senha</Label>
            <div className="relative flex items-center">
              <Lock className="pointer-events-none absolute left-3 h-4 w-4 text-white/40" />
              <Input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                className="h-12 border-white/15 bg-white/10 pl-10 text-base text-white placeholder:text-white/40"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-champagne" />
            Manter conectado neste aparelho
          </label>

          {error && <p className="rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-sm text-white">{error}</p>}

          <Button type="submit" disabled={busy || !username.trim() || !password}
            className="h-12 w-full bg-champagne text-base font-semibold text-primary hover:bg-champagne/90">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar"}
          </Button>
        </form>
      </div>
      <p className="pb-6 text-center text-xs text-white/40">Uso interno · Acesso restrito</p>
    </div>
  );
};

export default LoginPage;
