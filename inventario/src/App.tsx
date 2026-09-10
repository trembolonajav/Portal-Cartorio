import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
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
import DepartamentosPage from "./pages/DepartamentosPage";
import FuncionariosPage from "./pages/FuncionariosPage";
import ArquivoPage from "./pages/ArquivoPage";
import FichaPatrimonioPage from "./pages/FichaPatrimonioPage";
import CatalogoPage from "./pages/CatalogoPage";
import LoginPage from "./pages/LoginPage";
import ConferenciaPage from "./pages/ConferenciaPage";
import ConferenciaEstacaoPage from "./pages/ConferenciaEstacaoPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-600 text-sm">
    Carregando sistema...
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const status = useAuthStore((state) => state.status);

  if (status === "loading") {
    return <LoadingScreen />;
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" state={{ returnTo: location.pathname + location.search + location.hash }} replace />;
  }

  return <>{children}</>;
};

// Páginas administrativas/desktop: exigem ADMIN ou OPERATOR.
// O estagiário (USER) é enviado direto para a Conferência (mobile).
const InventoryRoute = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.user?.role);

  if (status === "loading") {
    return <LoadingScreen />;
  }
  if (status !== "authenticated") {
    return <Navigate to="/login" state={{ returnTo: location.pathname + location.search + location.hash }} replace />;
  }
  if (role === "USER") {
    return <Navigate to="/conferencia" replace />;
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
      <BrowserRouter>
        <AppInit>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/conferencia" element={<ProtectedRoute><ConferenciaPage /></ProtectedRoute>} />
            <Route path="/conferencia/estacao/:stationId" element={<ProtectedRoute><ConferenciaEstacaoPage /></ProtectedRoute>} />
            <Route path="/" element={<InventoryRoute><InventoryMapPage /></InventoryRoute>} />
            <Route path="/patrimonios" element={<InventoryRoute><PatrimoniosPage /></InventoryRoute>} />
            <Route path="/patrimonios/:id" element={<InventoryRoute><FichaPatrimonioPage /></InventoryRoute>} />
            <Route path="/baixas-patrimoniais" element={<InventoryRoute><BaixasPatrimoniaisPage /></InventoryRoute>} />
            <Route path="/departamentos" element={<InventoryRoute><DepartamentosPage /></InventoryRoute>} />
            <Route path="/funcionarios" element={<InventoryRoute><FuncionariosPage /></InventoryRoute>} />
            <Route path="/espacos" element={<InventoryRoute><EspacosPage /></InventoryRoute>} />
            <Route path="/catalogo" element={<InventoryRoute><CatalogoPage /></InventoryRoute>} />
            <Route path="/arquivo" element={<InventoryRoute><AdminRoute><ArquivoPage /></AdminRoute></InventoryRoute>} />
            <Route path="/importar" element={<InventoryRoute><AdminRoute><ImportarPage /></AdminRoute></InventoryRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppInit>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
