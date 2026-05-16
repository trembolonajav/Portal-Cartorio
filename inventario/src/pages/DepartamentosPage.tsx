import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import SessionActions from '@/components/layout/SessionActions';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useInventoryStore } from '@/features/inventory-map/store/useInventoryStore';
import { toast } from 'sonner';

const DepartamentosPage = () => {
  const navigate = useNavigate();
  const isAdmin = useAuthStore(state => state.user?.role === 'ADMIN');
  const { departments, employees, addDepartment, updateDepartment, deleteDepartment } = useInventoryStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setDialogOpen(true);
  };

  const openEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setName(currentName);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Informe o nome do departamento');
      return;
    }

    try {
      if (editingId) {
        await updateDepartment(editingId, name.trim());
        toast.success('Departamento atualizado');
      } else {
        await addDepartment(name.trim());
        toast.success('Departamento criado');
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar departamento');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDepartment(deleteId);
      toast.success('Departamento excluído');
      setDeleteId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir departamento');
    }
  };

  const getEmployeeCount = (departmentId: string) => employees.filter(employee => employee.departmentId === departmentId).length;

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="h-14 bg-primary border-b-[3px] border-bronze flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-primary-foreground/70 hover:text-primary-foreground" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <Building2 className="h-5 w-5 text-bronze" />
          <h1 className="text-primary-foreground font-semibold text-sm tracking-wide">Departamentos</h1>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button size="sm" variant="secondary" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Novo Departamento
            </Button>
          )}
          <SessionActions />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-2">
          {departments.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">Nenhum departamento cadastrado</p>
              {isAdmin && (
                <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-1" />
                  Criar primeiro departamento
                </Button>
              )}
            </div>
          ) : (
            departments.map(department => (
              <div key={department.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors">
                <div>
                  <p className="font-medium text-foreground text-sm">{department.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{getEmployeeCount(department.id)} funcionário(s)</p>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(department.id, department.name)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteId(department.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={dialogOpen && isAdmin} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar' : 'Novo'} Departamento</DialogTitle>
            <DialogDescription>Informe o nome do departamento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label className="text-xs">Nome *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Financeiro" className="h-9 text-sm" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave}>{editingId ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId && isAdmin} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir departamento?</AlertDialogTitle>
            <AlertDialogDescription>Funcionários deste departamento ficarão sem departamento vinculado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DepartamentosPage;
