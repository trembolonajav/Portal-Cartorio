import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Users, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import SessionActions from '@/components/layout/SessionActions';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useInventoryStore } from '@/features/inventory-map/store/useInventoryStore';
import type { EmployeeStatus } from '@/features/inventory-map/types/inventoryMap.types';
import { toast } from 'sonner';

const emptyForm = { fullName: '', cpf: '', status: 'ACTIVE' as EmployeeStatus, departmentId: '', stationId: '' };

const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const FuncionariosPage = () => {
  const navigate = useNavigate();
  const isAdmin = useAuthStore(state => state.user?.role === 'ADMIN');
  const { employees, departments, stations, addEmployee, updateEmployee, deleteEmployee } = useInventoryStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (id: string) => {
    const employee = employees.find(item => item.id === id);
    if (!employee) return;
    setEditingId(id);
    setForm({
      fullName: employee.fullName,
      cpf: employee.cpf,
      status: employee.status,
      departmentId: employee.departmentId || '',
      stationId: employee.stationId || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.fullName.trim() || !form.cpf.trim()) {
      toast.error('Preencha nome e CPF');
      return;
    }

    const data = {
      fullName: form.fullName.trim(),
      cpf: form.cpf.trim(),
      status: form.status,
      departmentId: form.departmentId || undefined,
      stationId: form.stationId || undefined,
    };

    try {
      if (editingId) {
        await updateEmployee(editingId, data);
        toast.success('Funcionário atualizado');
      } else {
        await addEmployee(data);
        toast.success('Funcionário cadastrado');
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar funcionário');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteEmployee(deleteId);
      toast.success('Funcionário excluído');
      setDeleteId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir funcionário');
    }
  };

  const getDeptName = (id?: string) => id ? departments.find(d => d.id === id)?.name || '-' : '-';
  const getStationCode = (id?: string) => id ? stations.find(s => s.id === id)?.code || '-' : 'Sem estação';

  const employeeToDelete = deleteId ? employees.find(e => e.id === deleteId) : null;
  const stationToDelete = employeeToDelete?.stationId ? stations.find(s => s.id === employeeToDelete.stationId) : null;

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="h-14 bg-primary border-b-[3px] border-bronze flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-primary-foreground/70 hover:text-primary-foreground" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <Users className="h-5 w-5 text-bronze" />
          <h1 className="text-primary-foreground font-semibold text-sm tracking-wide">Funcionários</h1>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button size="sm" variant="secondary" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Novo Funcionário
            </Button>
          )}
          <SessionActions />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-2">
          {employees.length === 0 ? (
            <div className="text-center py-16">
              <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">Nenhum funcionário cadastrado</p>
              {isAdmin && (
                <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-1" />
                  Cadastrar primeiro funcionário
                </Button>
              )}
            </div>
          ) : (
            employees.map(employee => (
              <div key={employee.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${employee.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                    {employee.status === 'ACTIVE' ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">{employee.fullName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-mono text-muted-foreground">{employee.cpf}</span>
                      <span className="text-[11px] text-muted-foreground">- {getDeptName(employee.departmentId)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px]">{getStationCode(employee.stationId)}</Badge>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(employee.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteId(employee.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={dialogOpen && isAdmin} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar' : 'Novo'} Funcionário</DialogTitle>
            <DialogDescription>Preencha os dados do funcionário.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome Completo *</Label>
              <Input value={form.fullName} onChange={e => setForm(current => ({ ...current, fullName: e.target.value }))} placeholder="Ex: João da Silva" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">CPF *</Label>
              <Input value={form.cpf} onChange={e => setForm(current => ({ ...current, cpf: formatCPF(e.target.value) }))} placeholder="000.000.000-00" className="h-9 text-sm" maxLength={14} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={value => setForm(current => ({ ...current, status: value as EmployeeStatus }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Ativo</SelectItem>
                  <SelectItem value="INACTIVE">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Departamento</Label>
              <Select value={form.departmentId || '_none'} onValueChange={value => setForm(current => ({ ...current, departmentId: value === '_none' ? '' : value }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sem departamento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sem departamento</SelectItem>
                  {departments.map(department => <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Estação Atual</Label>
              <Select value={form.stationId || '_none'} onValueChange={value => setForm(current => ({ ...current, stationId: value === '_none' ? '' : value }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sem estação" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sem estação</SelectItem>
                  {stations.map(station => <SelectItem key={station.id} value={station.id}>{station.code} - {station.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave}>{editingId ? 'Salvar' : 'Cadastrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId && isAdmin} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir funcionário?</AlertDialogTitle>
            <AlertDialogDescription>
              {stationToDelete
                ? `${employeeToDelete?.fullName} está vinculado à estação ${stationToDelete.code}. Ao excluir, a estação ficará sem responsável.`
                : 'Esta ação não pode ser desfeita.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FuncionariosPage;
