import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Pencil, Trash2, MapPin, Package, UserCircle, Building2, Unlink, Upload, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import SessionActions from '@/components/layout/SessionActions';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useInventoryStore } from '@/features/inventory-map/store/useInventoryStore';
import type { AssetStatus } from '@/features/inventory-map/types/inventoryMap.types';
import { toast } from 'sonner';

const CATEGORIES = ['CPU', 'Monitor', 'Mouse', 'Teclado', 'Nobreak', 'Headset', 'Webcam', 'Notebook', 'Outro'];
const STATUSES: AssetStatus[] = ['ACTIVE', 'IN_STOCK', 'INACTIVE', 'MAINTENANCE', 'DISPOSED'];
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  MAINTENANCE: 'Manutenção',
  DISPOSED: 'Baixado',
  IN_STOCK: 'Em Estoque',
};

const emptyForm = {
  assetCode: '',
  type: 'CPU',
  manufacturer: '',
  model: '',
  description: '',
  serialNumber: '',
  status: 'ACTIVE' as AssetStatus,
};

const buildAssetDescription = (data: Pick<typeof emptyForm, 'type' | 'assetCode' | 'manufacturer' | 'model'>) => {
  return [data.type, data.assetCode, data.manufacturer, data.model]
    .map(value => value.trim())
    .filter(Boolean)
    .join(' - ');
};

const PatrimoniosPage = () => {
  const navigate = useNavigate();
  const isAdmin = useAuthStore(state => state.user?.role === 'ADMIN');
  const {
    assets,
    stations,
    employees,
    departments,
    assignments,
    addAsset,
    updateAsset,
    deleteAsset,
    getStationForAsset,
    getEmployeeForStation,
  } = useInventoryStore();

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterStation, setFilterStation] = useState<string>('ALL');
  const [filterEmployee, setFilterEmployee] = useState<string>('ALL');
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL');
  const [filterBinding, setFilterBinding] = useState<string>('ALL');

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [descriptionEdited, setDescriptionEdited] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const assetStationMap = useMemo(() => {
    const map = new Map<string, string>();
    assignments.filter(a => a.status === 'ACTIVE').forEach(a => map.set(a.assetId, a.stationId));
    return map;
  }, [assignments]);

  const filtered = useMemo(() => {
    return assets.filter(asset => {
      const q = search.toLowerCase();
      const matchesSearch = !q
        || asset.assetCode.toLowerCase().includes(q)
        || asset.description.toLowerCase().includes(q)
        || asset.type.toLowerCase().includes(q);
      const matchesCategory = filterCategory === 'ALL' || asset.type === filterCategory;
      const matchesStatus = filterStatus === 'ALL' || asset.status === filterStatus;

      const stationId = assetStationMap.get(asset.id);

      if (filterBinding === 'LINKED' && !stationId) return false;
      if (filterBinding === 'UNLINKED' && stationId) return false;
      if (filterStation !== 'ALL' && stationId !== filterStation) return false;

      if (filterEmployee !== 'ALL') {
        const employeeStationId = employees.find(e => e.id === filterEmployee)?.stationId;
        if (stationId !== employeeStationId) return false;
      }

      if (filterDepartment !== 'ALL') {
        const departmentStationIds = employees
          .filter(e => e.departmentId === filterDepartment)
          .map(e => e.stationId)
          .filter(Boolean);
        if (!stationId || !departmentStationIds.includes(stationId)) return false;
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [assets, search, filterCategory, filterStatus, filterStation, filterEmployee, filterDepartment, filterBinding, assetStationMap, employees]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDescriptionEdited(false);
    setFormOpen(true);
  };

  const openEdit = (id: string) => {
    const asset = assets.find(a => a.id === id);
    if (!asset) return;
    setEditingId(id);
    setForm({
      assetCode: asset.assetCode,
      type: asset.type,
      manufacturer: asset.manufacturer || '',
      model: asset.model || '',
      description: asset.description,
      serialNumber: asset.serialNumber || '',
      status: asset.status,
    });
    setDescriptionEdited(true);
    setFormOpen(true);
  };

  const updateForm = (updates: Partial<typeof emptyForm>) => {
    setForm(current => {
      const next = { ...current, ...updates };
      if (!descriptionEdited && !Object.prototype.hasOwnProperty.call(updates, 'description')) {
        next.description = buildAssetDescription(next);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.assetCode.trim() || !form.description.trim()) {
      toast.error('Preencha código e descrição');
      return;
    }

    try {
      if (editingId) {
        await updateAsset(editingId, { ...form });
        toast.success('Patrimônio atualizado');
      } else {
        await addAsset({ ...form });
        toast.success('Patrimônio cadastrado');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar patrimônio');
      return;
    }

    setFormOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteAsset(deleteId);
      toast.success('Patrimônio excluído');
      setDeleteId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir patrimônio');
    }
  };

  const activeFiltersCount = [filterStation, filterEmployee, filterDepartment, filterBinding].filter(value => value !== 'ALL').length;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <header className="h-14 bg-primary border-b-[3px] border-bronze flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-primary-foreground/70 hover:text-primary-foreground p-1 h-auto" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Package className="h-5 w-5 text-bronze" />
          <h1 className="text-primary-foreground font-semibold text-sm tracking-wide">Patrimônios</h1>
          <span className="text-primary-foreground/40 text-xs">|</span>
          <span className="text-primary-foreground/60 text-xs font-medium">{assets.length} itens</span>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button size="sm" variant="ghost" onClick={() => navigate('/importar')} className="text-xs text-primary-foreground/70 hover:text-primary-foreground">
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Importar
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => navigate('/baixas-patrimoniais')} className="text-xs text-primary-foreground/70 hover:text-primary-foreground">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Baixas
          </Button>
          <Button size="sm" variant="secondary" onClick={openNew} className="text-xs">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Novo Patrimônio
          </Button>
          <SessionActions />
        </div>
      </header>

      <div className="px-6 py-3 border-b border-border bg-card flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por código, nome ou tipo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas categorias</SelectItem>
            {CATEGORIES.map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos status</SelectItem>
            {STATUSES.map(status => <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterBinding} onValueChange={setFilterBinding}>
          <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos vínculos</SelectItem>
            <SelectItem value="LINKED">Vinculados</SelectItem>
            <SelectItem value="UNLINKED">Sem vínculo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="px-6 py-2 border-b border-border bg-card/50 flex items-center gap-3 flex-wrap">
        <Select value={filterStation} onValueChange={setFilterStation}>
          <SelectTrigger className="w-[170px] h-8 text-xs"><MapPin className="h-3 w-3 mr-1 shrink-0" /><SelectValue placeholder="Estação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas estações</SelectItem>
            {stations.map(station => <SelectItem key={station.id} value={station.id}>{station.code} - {station.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterEmployee} onValueChange={setFilterEmployee}>
          <SelectTrigger className="w-[180px] h-8 text-xs"><UserCircle className="h-3 w-3 mr-1 shrink-0" /><SelectValue placeholder="Funcionário" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos funcionários</SelectItem>
            {employees.filter(employee => employee.status === 'ACTIVE').map(employee => (
              <SelectItem key={employee.id} value={employee.id}>{employee.fullName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterDepartment} onValueChange={setFilterDepartment}>
          <SelectTrigger className="w-[170px] h-8 text-xs"><Building2 className="h-3 w-3 mr-1 shrink-0" /><SelectValue placeholder="Departamento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos departamentos</SelectItem>
            {departments.map(department => <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => {
              setFilterStation('ALL');
              setFilterEmployee('ALL');
              setFilterDepartment('ALL');
              setFilterBinding('ALL');
            }}
          >
            Limpar filtros ({activeFiltersCount})
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} resultado(s)</span>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Package className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">Nenhum patrimônio encontrado</p>
            <p className="text-xs mt-1">Ajuste os filtros ou cadastre um novo item</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-[100px]">Categoria</TableHead>
                <TableHead className="w-[130px]">Nº Série</TableHead>
                <TableHead className="w-[110px]">Status</TableHead>
                <TableHead className="w-[130px]">Estação</TableHead>
                <TableHead className="w-[140px]">Responsável</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(asset => {
                const station = getStationForAsset(asset.id);
                const employee = station ? getEmployeeForStation(station.id) : null;
                return (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{asset.assetCode}</span>
                        {asset.origin === 'LEGACY_GLPI' && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[9px] px-1.5 py-0">Legado</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{asset.description}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{asset.type}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{asset.serialNumber || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        asset.status === 'ACTIVE' ? 'bg-success/10 text-success border-success/20' :
                        asset.status === 'IN_STOCK' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        asset.status === 'MAINTENANCE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        asset.status === 'DISPOSED' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                        'bg-muted text-muted-foreground border-border'
                      }>
                        {STATUS_LABELS[asset.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {station ? (
                        <span className="flex items-center gap-1 text-xs">
                          <MapPin className="h-3 w-3 text-bronze" />
                          {station.code}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground italic">
                          <Unlink className="h-3 w-3" />
                          Não vinculado
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {employee ? (
                        <span className="text-xs">{employee.fullName}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(asset.id)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteId(asset.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Patrimônio' : 'Novo Patrimônio'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Altere os dados do patrimônio.' : 'Preencha os dados para cadastrar um novo item.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Código Patrimonial *</Label>
                <Input value={form.assetCode} onChange={e => updateForm({ assetCode: e.target.value })} placeholder="VRT-000" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Categoria *</Label>
                <Select value={form.type} onValueChange={value => updateForm({ type: value })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Fabricante</Label>
                <Input value={form.manufacturer} onChange={e => updateForm({ manufacturer: e.target.value })} placeholder="Ex: Dell, HP, Logitech" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Modelo</Label>
                <Input value={form.model} onChange={e => updateForm({ model: e.target.value })} placeholder="Ex: OptiPlex 3080" className="h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição *</Label>
              <Input value={form.description} onChange={e => { setDescriptionEdited(true); updateForm({ description: e.target.value }); }} placeholder="Monitor - 0115 - Philips - 170S" className="h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nº Série</Label>
                <Input value={form.serialNumber} onChange={e => setForm(current => ({ ...current, serialNumber: e.target.value }))} placeholder="Opcional" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={value => setForm(current => ({ ...current, status: value as AssetStatus }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(status => <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave}>{editingId ? 'Salvar' : 'Cadastrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId && isAdmin} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir patrimônio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O patrimônio será removido permanentemente e desvinculado de qualquer estação.
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

export default PatrimoniosPage;
