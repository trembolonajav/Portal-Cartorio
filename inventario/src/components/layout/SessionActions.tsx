import { ShieldCheck, UserCog, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/features/auth/store/useAuthStore";

const SessionActions = ({ dark = true }: { dark?: boolean }) => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  if (!user) {
    return null;
  }

  const roleIcon = user.role === "ADMIN"
    ? <ShieldCheck className="h-3.5 w-3.5" />
    : <UserCog className="h-3.5 w-3.5" />;

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] ${dark
        ? "border-primary-foreground/15 text-primary-foreground/75"
        : "border-border text-muted-foreground bg-card"
      }`}>
        {roleIcon}
        <span>{user.username}</span>
        <span className={dark ? "text-primary-foreground/35" : "text-muted-foreground/50"}>|</span>
        <span>{user.displayRole}</span>
      </div>
      <Button
        type="button"
        variant={dark ? "ghost" : "outline"}
        size="sm"
        className={dark ? "text-primary-foreground/70 hover:text-primary-foreground text-xs" : "text-xs"}
        onClick={() => {
          logout();
          window.location.href = "http://localhost:8080";
        }}
      >
        <LogOut className="h-3.5 w-3.5 mr-1.5" />
        Sair
      </Button>
    </div>
  );
};

export default SessionActions;
