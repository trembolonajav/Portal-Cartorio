import { useMemo, useState } from "react";
import { Building2, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { useInventoryStore } from "@/features/inventory-map/store/useInventoryStore";
import { toast } from "sonner";

const DepartamentosPage = () => {
  const isAdmin = useAuthStore((state) => state.user?.role === "ADMIN");
  const { departments, employees, addDepartment, updateDepartment, deleteDepartment } = useInventoryStore();
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const rows = useMemo(() => departments.map((department) => ({ ...department, employeeCount: employees.filter((employee) => employee.departmentId === department.id).length })).filter((department) => department.name.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))), [departments, employees, query]);

  const openCreate = () => { setEditingId(null); setName(""); setDialogOpen(true); };
  const openEdit = (id: string, currentName: string) => { setEditingId(id); setName(currentName); setDialogOpen(true); };
  const handleSave = async () => {
    if (!name.trim()) return void toast.error("Informe o nome do departamento");
    try { if (editingId) await updateDepartment(editingId, name.trim()); else await addDepartment(name.trim()); toast.success(editingId ? "Departamento atualizado" : "Departamento criado"); setDialogOpen(false); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Erro ao salvar departamento"); }
  };
  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteDepartment(deleteId); toast.success("Departamento excluído"); setDeleteId(null); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Erro ao excluir departamento"); }
  };

  return <AppShell active="departamentos"
    search={<div className="flex h-[38px] w-full max-w-[460px] items-center gap-2.5 rounded-lg border border-input bg-paper-2 px-3"><Search className="h-4 w-4 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70" placeholder="Buscar departamento" /></div>}
    actions={isAdmin && <Button size="sm" onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" />Novo departamento</Button>}>
    <section className="mx-auto w-full max-w-[1180px] px-5 py-7 md:px-8 md:py-9">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="label-mono mb-2 text-bronze">Estrutura organizacional</p><h1 className="font-serif text-4xl font-semibold leading-none text-primary">Departamentos</h1><p className="mt-2 text-sm text-muted-foreground">Organize equipes e vínculos do inventário patrimonial.</p></div>
        <div className="flex gap-8 border-l border-border pl-6"><div><span className="num-mono text-2xl text-primary">{departments.length}</span><p className="label-mono mt-1 text-muted-foreground">Departamentos</p></div><div><span className="num-mono text-2xl text-primary">{employees.length}</span><p className="label-mono mt-1 text-muted-foreground">Funcionários</p></div></div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="grid grid-cols-[1fr_150px_100px] border-b border-border bg-paper-2 px-5 py-3 text-muted-foreground"><span className="label-mono">Departamento</span><span className="label-mono">Equipe</span><span className="label-mono text-right">Ações</span></div>
        {rows.length === 0 ? <div className="py-16 text-center"><Building2 className="mx-auto mb-3 h-9 w-9 text-muted-foreground/35" /><p className="text-sm text-muted-foreground">{query ? "Nenhum resultado encontrado" : "Nenhum departamento cadastrado"}</p></div> : rows.map((department) => <div key={department.id} className="grid grid-cols-[1fr_150px_100px] items-center border-b border-border/70 px-5 py-4 last:border-0 hover:bg-paper-2/60">
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-champagne/35 text-bronze"><Building2 className="h-4 w-4" /></span><span className="font-medium text-primary">{department.name}</span></div>
          <span className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" />{department.employeeCount} {department.employeeCount === 1 ? "pessoa" : "pessoas"}</span>
          <div className="flex justify-end gap-1">{isAdmin && <><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(department.id, department.name)}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(department.id)}><Trash2 className="h-3.5 w-3.5" /></Button></>}</div>
        </div>)}
      </div>
    </section>
    <Dialog open={dialogOpen && isAdmin} onOpenChange={setDialogOpen}><DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle className="font-serif text-2xl">{editingId ? "Editar" : "Novo"} departamento</DialogTitle><DialogDescription>Informe o nome que identifica a equipe.</DialogDescription></DialogHeader><div className="space-y-1.5 py-2"><Label htmlFor="department-name">Nome *</Label><Input id="department-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Financeiro" autoFocus onKeyDown={(event) => { if (event.key === "Enter") void handleSave(); }} /></div><DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave}>{editingId ? "Salvar" : "Criar"}</Button></DialogFooter></DialogContent></Dialog>
    <AlertDialog open={!!deleteId && isAdmin} onOpenChange={(open) => !open && setDeleteId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir departamento?</AlertDialogTitle><AlertDialogDescription>Funcionários deste departamento ficarão sem departamento vinculado.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </AppShell>;
};

export default DepartamentosPage;
