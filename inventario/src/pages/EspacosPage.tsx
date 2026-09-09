import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, MapPin, Building, Layers, LayoutGrid, ChevronRight, ChevronDown, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import AppShell from '@/components/layout/AppShell';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useInventoryStore } from '@/features/inventory-map/store/useInventoryStore';
import type { SpaceType } from '@/features/inventory-map/types/inventoryMap.types';
import { toast } from 'sonner';

const spaceTypeLabels: Record<SpaceType, string> = {
  UNIT: 'Unidade',
  BUILDING: 'Prédio',
  FLOOR: 'Andar',
  SECTOR: 'Departamento',
};

const spaceTypeIcons: Record<SpaceType, React.ReactNode> = {
  UNIT: <Building className="h-4 w-4" />,
  BUILDING: <Building className="h-4 w-4" />,
  FLOOR: <Layers className="h-4 w-4" />,
  SECTOR: <LayoutGrid className="h-4 w-4" />,
};

// Modelo: Unidade -> Andar -> Departamento. (Prédio existe no schema mas fica
// fora do fluxo de criação para não confundir.)
const allowedChildren: Record<SpaceType, SpaceType[]> = {
  UNIT: ['FLOOR'],
  BUILDING: ['FLOOR'],
  FLOOR: ['SECTOR'],
  SECTOR: [],
};

const emptyForm = { name: '', type: 'FLOOR' as SpaceType, parentId: '' as string | undefined, order: 0 };

const EspacosPage = () => {
  const navigate = useNavigate();
  const isAdmin = useAuthStore(state => state.user?.role === 'ADMIN');
  const { spaces, addSpace, updateSpace, deleteSpace, getChildSpaces } = useInventoryStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(spaces.filter(space => !space.parentId).map(space => space.id)));

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const rootSpaces = spaces.filter(space => !space.parentId).sort((a, b) => a.order - b.order);

  const openCreate = (parentId?: string, parentType?: SpaceType) => {
    const defaultType = parentType ? (allowedChildren[parentType]?.[0] || 'SECTOR') : 'UNIT';
    setEditingId(null);
    setForm({ name: '', type: defaultType, parentId: parentId || undefined, order: 0 });
    setDialogOpen(true);
  };

  const openEdit = (id: string) => {
    const space = spaces.find(item => item.id === id);
    if (!space) return;
    setEditingId(id);
    setForm({ name: space.name, type: space.type, parentId: space.parentId, order: space.order });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Informe o nome do espaço');
      return;
    }

    const data = { name: form.name.trim(), type: form.type, parentId: form.parentId || undefined, order: form.order };
    try {
      if (editingId) {
        await updateSpace(editingId, data);
        toast.success('Espaço atualizado');
      } else {
        await addSpace(data);
        toast.success('Espaço criado');
        if (data.parentId) {
          setExpanded(prev => new Set([...prev, data.parentId!]));
        }
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar espaço');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteSpace(deleteId);
      toast.success('Espaço e subespaços excluídos');
      setDeleteId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir espaço');
    }
  };

  const getDescendantCount = (id: string): number => {
    const children = getChildSpaces(id);
    return children.length + children.reduce((sum, child) => sum + getDescendantCount(child.id), 0);
  };

  const renderTree = (parentId: string | undefined, depth: number) => {
    const children = parentId ? getChildSpaces(parentId) : rootSpaces;
    if (children.length === 0) return null;

    return (
      <div className={depth > 0 ? 'ml-6 border-l border-border/50' : ''}>
        {children.map(space => {
          const hasChildren = getChildSpaces(space.id).length > 0;
          const canAddChildren = allowedChildren[space.type].length > 0;
          const isExpanded = expanded.has(space.id);

          return (
            <div key={space.id}>
              <div className="flex items-center gap-2 py-2 px-3 hover:bg-secondary/30 rounded-md transition-colors group">
                <button
                  onClick={() => hasChildren && toggleExpand(space.id)}
                  className={`h-5 w-5 flex items-center justify-center shrink-0 ${hasChildren ? 'text-muted-foreground hover:text-foreground cursor-pointer' : 'text-transparent'}`}
                  disabled={!hasChildren}
                >
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>

                <span className="text-muted-foreground shrink-0">{spaceTypeIcons[space.type]}</span>
                <span className="text-sm font-medium text-foreground flex-1">{space.name}</span>
                <Badge variant="outline" className="text-[10px] font-normal shrink-0">{spaceTypeLabels[space.type]}</Badge>

                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isAdmin && canAddChildren && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Adicionar sub-espaço" onClick={() => openCreate(space.id, space.type)}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {isAdmin && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(space.id)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {isAdmin && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteId(space.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {(space.type === 'FLOOR' || space.type === 'SECTOR') && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Ver mapa deste espaço" onClick={() => navigate(`/?spaceId=${space.id}`)}>
                      <Map className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {isExpanded && renderTree(space.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  const getValidTypes = (): SpaceType[] => {
    if (editingId) return [form.type];
    if (!form.parentId) return ['UNIT'];
    const parent = spaces.find(space => space.id === form.parentId);
    return parent ? allowedChildren[parent.type] : ['UNIT'];
  };

  return (
    <AppShell
      active="espacos"
      actions={
        isAdmin && (
          <Button size="sm" onClick={() => openCreate()} className="h-[38px]">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Nova unidade
          </Button>
        )
      }
    >
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-7">
        <div className="mx-auto max-w-3xl space-y-5">
          <div className="flex flex-col gap-1">
            <h2 className="font-serif text-[34px] font-semibold leading-none text-primary">Espaços e estações</h2>
            <p className="text-sm text-muted-foreground">Hierarquia de unidades, andares e setores</p>
          </div>
          {rootSpaces.length === 0 ? (
            <div className="text-center py-16">
              <Building className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">Nenhum espaço cadastrado</p>
              <p className="text-xs text-muted-foreground mt-1">Comece criando a unidade principal</p>
              {isAdmin && (
                <Button variant="outline" size="sm" className="mt-4" onClick={() => openCreate()}>
                  <Plus className="h-4 w-4 mr-1" />
                  Criar primeira unidade
                </Button>
              )}
            </div>
          ) : (
            <div className="border border-border rounded-lg bg-card p-2">
              {renderTree(undefined, 0)}
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen && isAdmin} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar' : 'Novo'} Espaço</DialogTitle>
            <DialogDescription>
              {form.parentId
                ? `Adicionando sub-espaço em "${spaces.find(space => space.id === form.parentId)?.name}"`
                : 'Crie a unidade raiz da hierarquia'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome *</Label>
              <Input value={form.name} onChange={e => setForm(current => ({ ...current, name: e.target.value }))} placeholder="Ex: 1º Andar" className="h-9 text-sm" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={form.type} onValueChange={value => setForm(current => ({ ...current, type: value as SpaceType }))} disabled={getValidTypes().length <= 1}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {getValidTypes().map(type => <SelectItem key={type} value={type}>{spaceTypeLabels[type]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
            <AlertDialogTitle>Excluir espaço?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteId && getDescendantCount(deleteId) > 0
                ? `Este espaço possui ${getDescendantCount(deleteId)} sub-espaço(s) que também serão excluídos.`
                : 'Esta ação não pode ser desfeita.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
};

export default EspacosPage;
