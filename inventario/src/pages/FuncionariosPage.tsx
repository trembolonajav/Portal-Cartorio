import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, UserCheck, Users, UserX } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { useInventoryStore } from "@/features/inventory-map/store/useInventoryStore";
import type { EmployeeStatus } from "@/features/inventory-map/types/inventoryMap.types";
import { toast } from "sonner";

const emptyForm = { fullName: "", cpf: "", status: "ACTIVE" as EmployeeStatus, departmentId: "", stationId: "" };
const formatCPF = (value: string) => value.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");

const FuncionariosPage = () => {
  const isAdmin = useAuthStore((state) => state.user?.role === "ADMIN");
  const { employees, departments, stations, addEmployee, updateEmployee, deleteEmployee } = useInventoryStore();
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const rows = useMemo(() => employees.filter((employee) => [employee.fullName, employee.cpf, departments.find((item) => item.id === employee.departmentId)?.name].some((value) => value?.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")))), [employees, departments, query]);
  const activeCount = employees.filter((employee) => employee.status === "ACTIVE").length;
  const getDepartment = (id?: string) => id ? departments.find((item) => item.id === id)?.name ?? "Sem departamento" : "Sem departamento";
  const getStation = (id?: string) => id ? stations.find((item) => item.id === id)?.code ?? "Sem estação" : "Sem estação";

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (id: string) => { const employee = employees.find((item) => item.id === id); if (!employee) return; setEditingId(id); setForm({ fullName: employee.fullName, cpf: employee.cpf, status: employee.status, departmentId: employee.departmentId || "", stationId: employee.stationId || "" }); setDialogOpen(true); };
  const handleSave = async () => {
    if (!form.fullName.trim() || !form.cpf.trim()) return void toast.error("Preencha nome e CPF");
    const data = { fullName: form.fullName.trim(), cpf: form.cpf.trim(), status: form.status, departmentId: form.departmentId || undefined, stationId: form.stationId || undefined };
    try { if (editingId) await updateEmployee(editingId, data); else await addEmployee(data); toast.success(editingId ? "Funcionário atualizado" : "Funcionário cadastrado"); setDialogOpen(false); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Erro ao salvar funcionário"); }
  };
  const handleDelete = async () => { if (!deleteId) return; try { await deleteEmployee(deleteId); toast.success("Funcionário excluído"); setDeleteId(null); } catch (error) { toast.error(error instanceof Error ? error.message : "Erro ao excluir funcionário"); } };
  const employeeToDelete = deleteId ? employees.find((employee) => employee.id === deleteId) : null;

  return <AppShell active="funcionarios"
    search={<div className="flex h-[38px] w-full max-w-[460px] items-center gap-2.5 rounded-lg border border-input bg-paper-2 px-3"><Search className="h-4 w-4 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70" placeholder="Buscar por nome, CPF ou departamento" /></div>}
    actions={isAdmin && <Button size="sm" onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" />Novo funcionário</Button>}>
    <section className="mx-auto w-full max-w-[1180px] px-5 py-7 md:px-8 md:py-9">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="label-mono mb-2 text-bronze">Pessoas e responsabilidades</p><h1 className="font-serif text-4xl font-semibold leading-none text-primary">Funcionários</h1><p className="mt-2 text-sm text-muted-foreground">Gerencie responsáveis, departamentos e estações de trabalho.</p></div><div className="flex gap-8 border-l border-border pl-6"><div><span className="num-mono text-2xl text-primary">{employees.length}</span><p className="label-mono mt-1 text-muted-foreground">Cadastrados</p></div><div><span className="num-mono text-2xl text-success">{activeCount}</span><p className="label-mono mt-1 text-muted-foreground">Ativos</p></div></div></div>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="grid grid-cols-[minmax(240px,1.4fr)_minmax(160px,1fr)_130px_90px_80px] border-b border-border bg-paper-2 px-5 py-3 text-muted-foreground"><span className="label-mono">Funcionário</span><span className="label-mono">Departamento</span><span className="label-mono">Estação</span><span className="label-mono">Status</span><span className="label-mono text-right">Ações</span></div>
        {rows.length === 0 ? <div className="py-16 text-center"><Users className="mx-auto mb-3 h-9 w-9 text-muted-foreground/35" /><p className="text-sm text-muted-foreground">{query ? "Nenhum resultado encontrado" : "Nenhum funcionário cadastrado"}</p></div> : rows.map((employee) => <div key={employee.id} className="grid grid-cols-[minmax(240px,1.4fr)_minmax(160px,1fr)_130px_90px_80px] items-center border-b border-border/70 px-5 py-4 last:border-0 hover:bg-paper-2/60">
          <div className="flex min-w-0 items-center gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${employee.status === "ACTIVE" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{employee.status === "ACTIVE" ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}</span><div className="min-w-0"><p className="truncate font-medium text-primary">{employee.fullName}</p><p className="num-mono mt-0.5 text-[11px] text-muted-foreground">{employee.cpf}</p></div></div>
          <span className="truncate text-sm text-muted-foreground">{getDepartment(employee.departmentId)}</span><span className="num-mono text-xs text-primary">{getStation(employee.stationId)}</span><Badge variant="outline" className={employee.status === "ACTIVE" ? "w-fit border-success/25 bg-success/10 text-success" : "w-fit"}>{employee.status === "ACTIVE" ? "Ativo" : "Inativo"}</Badge>
          <div className="flex justify-end gap-1">{isAdmin && <><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(employee.id)}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(employee.id)}><Trash2 className="h-3.5 w-3.5" /></Button></>}</div>
        </div>)}
      </div>
    </section>
    <Dialog open={dialogOpen && isAdmin} onOpenChange={setDialogOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle className="font-serif text-2xl">{editingId ? "Editar" : "Novo"} funcionário</DialogTitle><DialogDescription>Preencha os dados e vínculos do funcionário.</DialogDescription></DialogHeader><div className="grid gap-3 py-2"><div className="space-y-1.5"><Label>Nome completo *</Label><Input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} placeholder="Ex.: João da Silva" /></div><div className="space-y-1.5"><Label>CPF *</Label><Input value={form.cpf} onChange={(event) => setForm((current) => ({ ...current, cpf: formatCPF(event.target.value) }))} placeholder="000.000.000-00" maxLength={14} /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label>Status</Label><Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value as EmployeeStatus }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ACTIVE">Ativo</SelectItem><SelectItem value="INACTIVE">Inativo</SelectItem></SelectContent></Select></div><div className="space-y-1.5"><Label>Departamento</Label><Select value={form.departmentId || "_none"} onValueChange={(value) => setForm((current) => ({ ...current, departmentId: value === "_none" ? "" : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="_none">Sem departamento</SelectItem>{departments.map((department) => <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>)}</SelectContent></Select></div></div><div className="space-y-1.5"><Label>Estação atual</Label><Select value={form.stationId || "_none"} onValueChange={(value) => setForm((current) => ({ ...current, stationId: value === "_none" ? "" : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="_none">Sem estação</SelectItem>{stations.map((station) => <SelectItem key={station.id} value={station.id}>{station.code} — {station.name}</SelectItem>)}</SelectContent></Select></div></div><DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave}>{editingId ? "Salvar" : "Cadastrar"}</Button></DialogFooter></DialogContent></Dialog>
    <AlertDialog open={!!deleteId && isAdmin} onOpenChange={(open) => !open && setDeleteId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir funcionário?</AlertDialogTitle><AlertDialogDescription>{employeeToDelete?.stationId ? `${employeeToDelete.fullName} está vinculado a uma estação. Ao excluir, ela ficará sem responsável.` : "Esta ação não pode ser desfeita."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </AppShell>;
};

export default FuncionariosPage;
