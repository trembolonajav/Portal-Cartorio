export type AppRole = "admin" | "operador" | "usuario";
export type TicketStatus =
  | "aberto"
  | "em_analise"
  | "em_andamento"
  | "aguardando_solicitante"
  | "resolvido";
export type TicketPriority = "baixa" | "media" | "alta";

export interface AuthUser {
  id: string;
  username: string;
  nomeCompleto: string;
  email: string;
  roles: AppRole[];
  employee?: Employee | null;
}

export interface Ticket {
  id: string;
  numero: number;
  titulo: string;
  descricao: string;
  status: TicketStatus;
  prioridade: TicketPriority;
  criadoPor: AuthUser;
  atribuidoA: AuthUser | null;
  categoria: Categoria | null;
  setor: Setor | null;
  anexos: string | null;
  equipamentoRelacionado: string | null;
  prazo: string | null;
  createdAt: string;
  updatedAt: string;
  resolvidoEm: string | null;
}

export interface TicketComment {
  id: string;
  autor: AuthUser;
  mensagem: string;
  interno: boolean;
  createdAt: string;
}

export interface Setor {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface Department {
  id: string;
  name: string;
  active: boolean;
}

export type EmployeeStatus = "ACTIVE" | "INACTIVE";

export interface Employee {
  id: string;
  fullName: string;
  cpf: string | null;
  email: string | null;
  status: EmployeeStatus;
  department: Department | null;
  username: string | null;
  role: AppRole;
}

export interface Categoria {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface DashboardStats {
  aberto: number;
  emAndamento: number;
  aguardando: number;
  atrasados: number;
  resolvidosMes: number;
  semResponsavel: number;
}

export const STATUS_LABEL: Record<TicketStatus, string> = {
  aberto: "Aberto",
  em_analise: "Em análise",
  em_andamento: "Em andamento",
  aguardando_solicitante: "Aguardando solicitante",
  resolvido: "Resolvido",
};

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function isAtrasado(ticket: Pick<Ticket, "prazo" | "status">) {
  return (
    !!ticket.prazo && ticket.status !== "resolvido" && new Date(ticket.prazo).getTime() < Date.now()
  );
}

export function statusBadgeClass(status: TicketStatus) {
  switch (status) {
    case "aberto":
      return "bg-amber-100 text-amber-900 border-amber-200";
    case "em_analise":
      return "bg-violet-100 text-violet-900 border-violet-200";
    case "em_andamento":
      return "bg-blue-100 text-blue-900 border-blue-200";
    case "aguardando_solicitante":
      return "bg-orange-100 text-orange-900 border-orange-200";
    case "resolvido":
      return "bg-emerald-100 text-emerald-900 border-emerald-200";
  }
}

export function priorityBadgeClass(priority: TicketPriority) {
  switch (priority) {
    case "baixa":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "media":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "alta":
      return "bg-red-100 text-red-800 border-red-200";
  }
}
