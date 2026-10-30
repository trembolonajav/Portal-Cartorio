import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil, Ban, MapPin, Package, UserCircle, Building2, Unlink, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppShell from '@/components/layout/AppShell';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useInventoryStore } from '@/features/inventory-map/store/useInventoryStore';
import type { AssetStatus } from '@/features/inventory-map/types/inventoryMap.types';
import { toast } from 'sonner';

const CATEGORIES = ['CPU', 'Monitor', 'Mouse', 'Teclado', 'Nobreak', 'Headset', 'Webcam', 'Notebook', 'Impressora', 'Switch', 'Leitor biométrico', 'Outro'];
const STATUSES: AssetStatus[] = ['ACTIVE', 'IN_STOCK', 'INACTIVE', 'MAINTENANCE', 'DISPOSED', 'VOIDED'];
const EDITABLE_STATUSES: AssetStatus[] = ['ACTIVE', 'IN_STOCK', 'INACTIVE', 'MAINTENANCE'];
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  MAINTENANCE: 'Em manutenção',
  DISPOSED: 'Baixado',
  IN_STOCK: 'Em Estoque',
  VOIDED: 'Anulado',
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'border-success/30 bg-success/10 text-success',
  IN_STOCK: 'border-info/30 bg-info/10 text-info',
  MAINTENANCE: 'border-brass/30 bg-brass/10 text-brass',
  DISPOSED: 'border-danger/30 bg-danger/10 text-danger',
  INACTIVE: 'border-border bg-muted text-muted-foreground',
  VOIDED: 'border-slate-300 bg-slate-100 text-slate-600',
};

const emptyForm = {
  assetCode: '',
  type: 'CPU',
  manufacturer: '',
  model: '',
  description: '',
  serialNumber: '',
  status: 'ACTIVE' as AssetStatus,
  fiscalNote: '',
  nfeAccessKey: '',
  fiscalNoteSeries: '',
  supplierName: '',
  acquisitionBatch: '',
  nfItemCode: '',
  supplierOrder: '',
  initialCondition: '',
  conditionGrade: '',
  functionalStatus: '',
  conditionNotes: '',
  partNumber: '',
  regulatoryModel: '',
  ncm: '',
  ean: '',
  upc: '',
  color: '',
  ram: '',
  storage: '',
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
    voidAsset,
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
  const [voidId, setVoidId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');

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
        || asset.type.toLowerCase().includes(q)
        || asset.serialNumber?.toLowerCase().includes(q)
        || asset.manufacturer?.toLowerCase().includes(q)
        || asset.model?.toLowerCase().includes(q)
        || (() => {
          const station = getStationForAsset(asset.id);
          const employee = station ? getEmployeeForStation(station.id) : null;
          const department = employee?.departmentId ? departments.find(item => item.id === employee.departmentId) : null;
          return [station?.code, station?.name, employee?.fullName, department?.name]
            .some(value => value?.toLowerCase().includes(q));
        })();
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
        const station = stationId ? stations.find(item => item.id === stationId) : null;
        const stationResponsible = station ? getEmployeeForStation(station.id) : null;
        if (!stationResponsible || stationResponsible.departmentId !== filterDepartment) return false;
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [assets, search, filterCategory, filterStatus, filterStation, filterEmployee, filterDepartment, filterBinding, assetStationMap, employees, stations, departments, getEmployeeForStation, getStationForAsset]);

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
      fiscalNote: asset.fiscalNote || '',
      nfeAccessKey: asset.nfeAccessKey || '',
      fiscalNoteSeries: asset.fiscalNoteSeries || '',
      supplierName: asset.supplierName || '',
      acquisitionBatch: asset.acquisitionBatch || '',
      nfItemCode: asset.nfItemCode || '',
      supplierOrder: asset.supplierOrder || '',
      initialCondition: asset.initialCondition || '',
      conditionGrade: asset.conditionGrade || '',
      functionalStatus: asset.functionalStatus || '',
      conditionNotes: asset.conditionNotes || '',
      partNumber: asset.partNumber || '',
      regulatoryModel: asset.regulatoryModel || '',
      ncm: asset.ncm || '',
      ean: asset.ean || '',
      upc: asset.upc || '',
      color: asset.color || '',
      ram: asset.ram || '',
      storage: asset.storage || '',
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

  const handleVoid = async () => {
    if (!voidId || !voidReason.trim()) {
      toast.error('Informe o motivo da anulação');
      return;
    }
    try {
      await voidAsset(voidId, voidReason.trim());
      toast.success('Cadastro patrimonial anulado com histórico preservado');
      setVoidId(null);
      setVoidReason('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao anular patrimônio');
    }
  };

  const activeFiltersCount = [filterStation, filterEmployee, filterDepartment, filterBinding].filter(value => value !== 'ALL').length;

  const linkedCount = assets.filter(asset => assetStationMap.has(asset.id)).length;
  const unlinkedCount = assets.length - linkedCount;

  return (
    <AppShell
      active="patrimonios"
      search={
        <div className="relative flex h-[38px] w-full max-w-[460px] items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground/70" />
          <Input
            placeholder="Buscar por código, série, modelo ou pessoa"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-[38px] rounded-lg border-input bg-paper-2 pl-9 text-sm"
          />
        </div>
      }
      actions={
        <>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => navigate('/importar')} className="h-[38px]">
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Importar
            </Button>
          )}
          <Button size="sm" onClick={openNew} className="h-[38px]">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Novo patrimônio
          </Button>
        </>
      }
    >
      <div className="flex h-full flex-col gap-4 px-4 py-6 md:px-7">
        {/* Cabeçalho da página */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-serif text-[34px] font-semibold leading-none text-primary">Patrimônios</h2>
            <p className="text-sm text-muted-foreground">
              {assets.length.toLocaleString('pt-BR')} itens · {linkedCount.toLocaleString('pt-BR')} vinculados a uma estação · {unlinkedCount.toLocaleString('pt-BR')} sem localização
            </p>
          </div>
          <div className="flex rounded-[9px] bg-secondary p-[3px] text-[13px]">
            <span className="rounded-[7px] bg-card px-4 py-2 font-semibold text-primary shadow-sm">Lista</span>
            <button type="button" className="rounded-[7px] px-4 py-2 text-muted-foreground transition-colors hover:text-primary" onClick={() => navigate('/')}>Mapa</button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-[34px] w-[150px] bg-card text-[13px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas categorias</SelectItem>
              {CATEGORIES.map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-[34px] w-[140px] bg-card text-[13px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos status</SelectItem>
              {STATUSES.map(status => <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterBinding} onValueChange={setFilterBinding}>
            <SelectTrigger className="h-[34px] w-[140px] bg-card text-[13px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos vínculos</SelectItem>
              <SelectItem value="LINKED">Vinculados</SelectItem>
              <SelectItem value="UNLINKED">Sem vínculo</SelectItem>
            </SelectContent>
          </Select>
          <div className="mx-1 hidden h-[22px] w-px bg-border lg:block" />
          <Select value={filterStation} onValueChange={setFilterStation}>
            <SelectTrigger className="h-[34px] w-[160px] bg-card text-[13px]"><MapPin className="mr-1 h-3.5 w-3.5 shrink-0 text-brass-ink" /><SelectValue placeholder="Estação" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas estações</SelectItem>
              {stations.map(station => <SelectItem key={station.id} value={station.id}>{station.code} - {station.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="h-[34px] w-[170px] bg-card text-[13px]"><UserCircle className="mr-1 h-3.5 w-3.5 shrink-0 text-brass-ink" /><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos funcionários</SelectItem>
              {employees.filter(employee => employee.status === 'ACTIVE').map(employee => (
                <SelectItem key={employee.id} value={employee.id}>{employee.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterDepartment} onValueChange={setFilterDepartment}>
            <SelectTrigger className="h-[34px] w-[160px] bg-card text-[13px]"><Building2 className="mr-1 h-3.5 w-3.5 shrink-0 text-brass-ink" /><SelectValue placeholder="Departamento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos departamentos</SelectItem>
              {departments.map(department => <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {activeFiltersCount > 0 && (
            <button
              type="button"
              className="text-[13px] text-brass-ink underline underline-offset-2 hover:text-brass"
              onClick={() => {
                setFilterStation('ALL');
                setFilterEmployee('ALL');
                setFilterDepartment('ALL');
                setFilterBinding('ALL');
              }}
            >
              Limpar tudo
            </button>
          )}
          <span className="ml-auto text-[13px] text-muted-foreground">{filtered.length.toLocaleString('pt-BR')} resultado(s)</span>
        </div>

        {/* Tabela */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
          {filtered.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
              <Package className="mb-3 h-10 w-10 opacity-40" />
              <p className="text-sm font-medium">Nenhum patrimônio encontrado</p>
              <p className="mt-1 text-xs">Ajuste os filtros ou cadastre um novo item</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border bg-paper-2 hover:bg-paper-2">
                    <TableHead className="w-[120px] text-[12px] uppercase tracking-[0.05em] text-muted-foreground">Código</TableHead>
                    <TableHead className="text-[12px] uppercase tracking-[0.05em] text-muted-foreground">Descrição</TableHead>
                    <TableHead className="w-[120px] text-[12px] uppercase tracking-[0.05em] text-muted-foreground">Categoria</TableHead>
                    <TableHead className="w-[130px] text-[12px] uppercase tracking-[0.05em] text-muted-foreground">Status</TableHead>
                    <TableHead className="w-[220px] text-[12px] uppercase tracking-[0.05em] text-muted-foreground">Localização</TableHead>
                    <TableHead className="w-[160px] text-[12px] uppercase tracking-[0.05em] text-muted-foreground">Responsável</TableHead>
                    <TableHead className="w-[70px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(asset => {
                    const station = getStationForAsset(asset.id);
                    const employee = station ? getEmployeeForStation(station.id) : null;
                    return (
                      <TableRow key={asset.id} className="border-b border-border/60">
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="num-mono text-[13px] text-primary">{asset.assetCode}</span>
                            {asset.origin === 'LEGACY_GLPI' && (
                              <Badge variant="outline" className="border-info/30 bg-info/10 px-1.5 py-0 text-[9px] text-info">Legado</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-[14px] text-ink">
                          <button type="button" className="text-left hover:text-primary hover:underline" onClick={() => navigate(`/patrimonios/${asset.id}`)}>
                            {asset.description}
                          </button>
                        </TableCell>
                        <TableCell className="text-[13px] text-muted-foreground">{asset.type}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_BADGE[asset.status] ?? STATUS_BADGE.INACTIVE}>
                            {STATUS_LABELS[asset.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {station ? (
                            <span className="flex items-center gap-2 text-[13px] text-brass-ink">
                              <span className="h-1.5 w-1.5 rounded-full bg-brass-ink" />
                              {station.code}
                            </span>
                          ) : (
                            <span className="flex items-center gap-2 text-[13px] italic text-muted-foreground">
                              <Unlink className="h-3 w-3" />
                              Sem localização
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-[13px] text-ink-2">
                          {employee ? employee.fullName : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(asset.id)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {isAdmin && asset.status !== 'DISPOSED' && asset.status !== 'VOIDED' && (
                              <Button variant="ghost" size="sm" title="Anular cadastro" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => { setVoidId(asset.id); setVoidReason(''); }}>
                                <Ban className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
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
                    {(editingId && (form.status === 'DISPOSED' || form.status === 'VOIDED') ? [form.status] : EDITABLE_STATUSES).map(status => <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Conservação atual</Label>
                <Select value={form.conditionGrade || 'UNINFORMED'} onValueChange={value => setForm(current => ({ ...current, conditionGrade: value === 'UNINFORMED' ? '' : value }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNINFORMED">Não informado</SelectItem>
                    <SelectItem value="NEW">Novo</SelectItem><SelectItem value="EXCELLENT">Excelente</SelectItem>
                    <SelectItem value="GOOD">Bom</SelectItem><SelectItem value="FAIR">Regular</SelectItem>
                    <SelectItem value="POOR">Ruim</SelectItem><SelectItem value="UNSERVICEABLE">Inservível</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Funcionamento atual</Label>
                <Select value={form.functionalStatus || 'UNINFORMED'} onValueChange={value => setForm(current => ({ ...current, functionalStatus: value === 'UNINFORMED' ? '' : value }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNINFORMED">Não informado</SelectItem>
                    <SelectItem value="WORKING">Funcional</SelectItem><SelectItem value="PARTIALLY_WORKING">Parcialmente funcional</SelectItem>
                    <SelectItem value="NOT_TESTED">Não testado</SelectItem><SelectItem value="NOT_WORKING">Inoperante</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observações do estado atual</Label>
              <Textarea value={form.conditionNotes} onChange={e => setForm(current => ({ ...current, conditionNotes: e.target.value }))} placeholder="Ex.: funcional, com desgaste na impressão de algumas teclas" />
            </div>
            <details className="rounded-md border border-border/60 bg-secondary/20 px-3 py-2">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Dados fiscais e catálogo (NF, SEFAZ, specs)</summary>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {([
                  ['fiscalNote', 'Nº da nota fiscal'],
                  ['nfeAccessKey', 'Chave de acesso (NF-e)'],
                  ['fiscalNoteSeries', 'Série da NF'],
                  ['supplierName', 'Fornecedor'],
                  ['acquisitionBatch', 'Lote'],
                  ['nfItemCode', 'Item na NF'],
                  ['supplierOrder', 'Pedido'],
                  ['initialCondition', 'Condição inicial'],
                  ['partNumber', 'P/N comercial'],
                  ['regulatoryModel', 'Modelo regulatório'],
                  ['ncm', 'NCM'], ['ean', 'EAN'], ['upc', 'UPC'], ['color', 'Cor'],
                  ['ram', 'Memória RAM'], ['storage', 'Armazenamento'],
                ] as [keyof typeof emptyForm, string][]).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs">{label}</Label>
                    <Input value={form[key] as string} onChange={e => updateForm({ [key]: e.target.value } as Partial<typeof emptyForm>)} className="h-9 text-sm" />
                  </div>
                ))}
              </div>
            </details>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave}>{editingId ? 'Salvar' : 'Cadastrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!voidId && isAdmin} onOpenChange={(open) => { if (!open) { setVoidId(null); setVoidReason(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anular cadastro patrimonial?</AlertDialogTitle>
            <AlertDialogDescription>
              O registro não será apagado. Ele permanecerá no histórico como anulado. A anulação só é permitida quando o patrimônio nunca teve vínculo, conferência, termo, troca ou baixa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="void-reason">Motivo da anulação *</Label>
            <Textarea id="void-reason" value={voidReason} onChange={event => setVoidReason(event.target.value)} placeholder="Ex.: cadastro duplicado do patrimônio 1130" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={!voidReason.trim()} onClick={handleVoid} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Anular cadastro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
};

export default PatrimoniosPage;
