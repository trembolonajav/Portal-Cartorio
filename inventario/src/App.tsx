import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { useInventoryStore } from "@/features/inventory-map/store/useInventoryStore";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import InventoryMapPage from "./pages/InventoryMapPage";
import PatrimoniosPage from "./pages/PatrimoniosPage";
import EspacosPage from "./pages/EspacosPage";
import ImportarPage from "./pages/ImportarPage";
import BaixasPatrimoniaisPage from "./pages/BaixasPatrimoniaisPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-600 text-sm">
    Carregando sistema...
  </div>
);

const RedirectToPortalLogin = () => {
  useEffect(() => {
    window.location.href = "http://localhost:8080";
  }, []);

  return <LoadingScreen />;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const status = useAuthStore((state) => state.status);

  if (status === "loading") {
    return <LoadingScreen />;
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const status = useAuthStore((state) => state.status);
  const isAdmin = useAuthStore((state) => state.user?.role === "ADMIN");

  if (status === "loading") {
    return <LoadingScreen />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppInit = ({ children }: { children: React.ReactNode }) => {
  const init = useInventoryStore(s => s.init);
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const status = useAuthStore((state) => state.status);
  const [inventoryReady, setInventoryReady] = useState(false);

  useEffect(() => { void restoreSession(); }, [restoreSession]);

  useEffect(() => {
    if (status !== "authenticated") {
      setInventoryReady(false);
      return;
    }

    let active = true;
    setInventoryReady(false);
    void init().finally(() => {
      if (active) {
        setInventoryReady(true);
      }
    });

    return () => {
      active = false;
    };
  }, [status, init]);

  if (status === "loading" || (status === "authenticated" && !inventoryReady)) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppInit>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<RedirectToPortalLogin />} />
            <Route path="/" element={<ProtectedRoute><InventoryMapPage /></ProtectedRoute>} />
            <Route path="/patrimonios" element={<ProtectedRoute><PatrimoniosPage /></ProtectedRoute>} />
            <Route path="/baixas-patrimoniais" element={<ProtectedRoute><BaixasPatrimoniaisPage /></ProtectedRoute>} />
            <Route path="/departamentos" element={<Navigate to="/" replace />} />
            <Route path="/funcionarios" element={<Navigate to="/" replace />} />
            <Route path="/espacos" element={<ProtectedRoute><EspacosPage /></ProtectedRoute>} />
            <Route path="/importar" element={<ProtectedRoute><AdminRoute><ImportarPage /></AdminRoute></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AppInit>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
