import { useEffect, useState } from 'react';
import { X, Monitor, Cpu, Mouse, Keyboard, Battery, Headphones, Camera, Laptop, Printer, Network, Fingerprint, History, Settings, Plus, Unlink, ArrowRightLeft, Package, UserCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useInventoryMapStore } from '@/features/inventory-map/store/useInventoryMapStore';
import { useInventoryStore } from '@/features/inventory-map/store/useInventoryStore';
import type { StationStatus } from '@/features/inventory-map/types/inventoryMap.types';
import { toast } from 'sonner';

const assetIcons: Record<string, React.ReactNode> = {
  CPU: <Cpu className="h-4 w-4" />,
  Monitor: <Monitor className="h-4 w-4" />,
  Mouse: <Mouse className="h-4 w-4" />,
  Teclado: <Keyboard className="h-4 w-4" />,
  Nobreak: <Battery className="h-4 w-4" />,
  Headset: <Headphones className="h-4 w-4" />,
  Webcam: <Camera className="h-4 w-4" />,
  Notebook: <Laptop className="h-4 w-4" />,
  Impressora: <Printer className="h-4 w-4" />,
  Switch: <Network className="h-4 w-4" />,
  'Leitor biométrico': <Fingerprint className="h-4 w-4" />,
};

interface StationDrawerProps {
  stationId: string;
  onClose: () => void;
}

const StationDrawer = ({ stationId, onClose }: StationDrawerProps) => {
  const isAdmin = useAuthStore(state => state.user?.role === 'ADMIN');
  const { stations, assets, assignments, departments, employees, getAssetsForStation, unlinkAsset, linkAsset, transferAsset, getHistoryForStation, updateStation, getEmployeeForStation, changeStationResponsible, deleteStation, loadStationHistory } = useInventoryStore();
  const { layout, updateElement, saveLayout } = useInventoryMapStore();

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferAssetId, setTransferAssetId] = useState<string | null>(null);
  const [selectedAssetToLink, setSelectedAssetToLink] = useState<string>('');
  const [selectedTransferStation, setSelectedTransferStation] = useState<string>('');
  const [unlinkConfirmId, setUnlinkConfirmId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ code: '', name: '', locationCode: '', status: 'ACTIVE' as StationStatus, observation: '' });
  const [changeResponsibleOpen, setChangeResponsibleOpen] = useState(false);
  const [selectedResponsible, setSelectedResponsible] = useState<string>('_none');
  const [moveResponsibleTarget, setMoveResponsibleTarget] = useState<{ employeeName: string; stationCode: string } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const station = stations.find(item => item.id === stationId);
  if (!station) return null;

  const employee = getEmployeeForStation(stationId);
  const department = employee?.departmentId ? departments.find(item => item.id === employee.departmentId) : null;
  const stationAssets = getAssetsForStation(stationId);
  const historyEntries = getHistoryForStation(stationId);

  useEffect(() => {
    void loadStationHistory(stationId);
  }, [loadStationHistory, stationId]);

  const unlinkedAssets = assets.filter(asset => !assignments.find(assignment => assignment.assetId === asset.id && assignment.status === 'ACTIVE'));
  const otherStations = stations.filter(item => item.id !== stationId && item.status !== 'INACTIVE');

  const handleLink = async () => {
    if (!selectedAssetToLink) return;
    const result = await linkAsset(selectedAssetToLink, stationId);
    if (result.ok) {
      toast.success('Patrimônio vinculado');
      setLinkDialogOpen(false);
      setSelectedAssetToLink('');
    } else {
      toast.error(result.error || 'Erro ao vincular');
    }
  };

  const handleUnlink = async () => {
    if (!unlinkConfirmId) return;
    try {
      await unlinkAsset(unlinkConfirmId);
      toast.success('Patrimônio desvinculado');
      setUnlinkConfirmId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao desvincular');
    }
  };

  const handleTransfer = async () => {
    if (!transferAssetId || !selectedTransferStation) return;
    const result = await transferAsset(transferAssetId, selectedTransferStation);
    if (result.ok) {
      toast.success('Patrimônio transferido');
      setTransferDialogOpen(false);
      setTransferAssetId(null);
      setSelectedTransferStation('');
    } else {
      toast.error(result.error || 'Erro ao transferir');
    }
  };

  const handleEditSave = async () => {
    try {
      await updateStation(stationId, {
        code: editForm.code,
        name: editForm.name,
        locationCode: editForm.locationCode,
        status: editForm.status,
        observation: editForm.observation,
      });
      const linkedElements = layout.elements.filter(element => element.stationId === stationId);
      linkedElements.forEach(element => updateElement(element.id, { label: editForm.code }));
      if (linkedElements.length > 0) {
        await saveLayout();
      }
      toast.success('Estação atualizada');
      setEditOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar estação');
    }
  };

  const submitResponsibleChange = async (forceMove = false) => {
    const newId = selectedResponsible === '_none' ? null : selectedResponsible;
    try {
      await changeStationResponsible(stationId, newId, forceMove);
      toast.success(newId ? 'Responsável alterado' : 'Responsável removido');
      setChangeResponsibleOpen(false);
      setMoveResponsibleTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao alterar responsável');
    }
  };

  const handleChangeResponsible = async () => {
    const newId = selectedResponsible === '_none' ? null : selectedResponsible;
    if (newId) {
      const existingStation = stations.find(item => item.id !== stationId && item.responsibleEmployeeId === newId);
      const selectedEmployee = employees.find(item => item.id === newId);

      if (existingStation && selectedEmployee) {
        setMoveResponsibleTarget({
          employeeName: selectedEmployee.fullName,
          stationCode: existingStation.code,
        });
        return;
      }
    }

    await submitResponsibleChange(false);
  };

  const handleDeleteStation = async () => {
    try {
      const linkedElements = layout.elements.filter(element => element.stationId === stationId);
      await deleteStation(stationId);
      linkedElements.forEach(element => updateElement(element.id, { stationId: undefined, label: undefined }));
      if (linkedElements.length > 0) {
        await saveLayout();
      }
      toast.success('Estação excluída');
      setDeleteConfirmOpen(false);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir estação');
    }
  };

  const statusConfig = {
    ACTIVE: { label: 'Ativa', className: 'bg-success/10 text-success border-success/20' },
    INACTIVE: { label: 'Inativa', className: 'bg-muted text-muted-foreground border-border' },
    MAINTENANCE: { label: 'Manutenção', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  };

  const status = statusConfig[station.status];

  return (
    <>
      <div className="fixed right-0 top-0 h-full w-[400px] bg-card border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground tracking-tight">Estação {station.code}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{employee ? `${employee.fullName}${department ? ` - ${department.name}` : ''}` : 'Sem responsável'}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0"><X className="h-4 w-4" /></Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={status.className}>{status.label}</Badge>
            {station.locationCode && <Badge variant="outline" className="text-muted-foreground">{station.locationCode}</Badge>}
          </div>
          {station.observation && (
            <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-md p-2">
              <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
              <span>{station.observation}</span>
            </div>
          )}
        </div>

        <Tabs defaultValue="assets" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-4 grid w-auto grid-cols-2">
            <TabsTrigger value="assets" className="text-xs">Patrimônios ({stationAssets.length})</TabsTrigger>
            <TabsTrigger value="history" className="text-xs">Histórico</TabsTrigger>
          </TabsList>
          <TabsContent value="assets" className="flex-1 overflow-y-auto px-6 pb-4 mt-4">
            {stationAssets.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Nenhum patrimônio vinculado</p>
                <p className="text-xs text-muted-foreground mt-1">Use o botão abaixo para adicionar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stationAssets.map(asset => (
                  <div key={asset.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50 hover:border-border transition-colors group">
                    <div className="h-9 w-9 rounded-md bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
                      {assetIcons[asset.type] || <Monitor className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{asset.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{asset.assetCode}</span>
                        <span className="text-[11px] text-muted-foreground">{asset.type}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Transferir" onClick={() => { setTransferAssetId(asset.id); setTransferDialogOpen(true); }}>
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" title="Desvincular" onClick={() => setUnlinkConfirmId(asset.id)}>
                        <Unlink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="history" className="flex-1 overflow-y-auto px-6 pb-4 mt-4">
            {historyEntries.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyEntries.slice(0, 50).map(entry => (
                  <div key={entry.id} className="border-l-2 border-border pl-3 py-1">
                    <p className="text-xs text-foreground">{entry.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(entry.timestamp).toLocaleString('pt-BR')}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="p-4 flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setLinkDialogOpen(true)} disabled={station.status === 'INACTIVE'}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Vincular
          </Button>
          {isAdmin && (
            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => { setSelectedResponsible(employee?.id || '_none'); setChangeResponsibleOpen(true); }}>
              <UserCircle className="h-3.5 w-3.5 mr-1.5" />
              Responsável
            </Button>
          )}
          {isAdmin && (
            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => { setEditForm({ code: station.code, name: station.name, locationCode: station.locationCode || '', status: station.status, observation: station.observation || '' }); setEditOpen(true); }}>
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Editar
            </Button>
          )}
        </div>
      </div>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Vincular Patrimônio</DialogTitle>
            <DialogDescription>Selecione um patrimônio disponível para vincular à estação {station.code}.</DialogDescription>
          </DialogHeader>
          {station.status === 'INACTIVE' ? <p className="text-sm text-destructive py-4 text-center">Estação inativa não pode receber patrimônios.</p> : unlinkedAssets.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Todos os patrimônios já estão vinculados.</p> : (
            <Select value={selectedAssetToLink} onValueChange={setSelectedAssetToLink}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Selecionar patrimônio" /></SelectTrigger>
              <SelectContent>{unlinkedAssets.map(asset => <SelectItem key={asset.id} value={asset.id}>{asset.assetCode} - {asset.description}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setLinkDialogOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleLink} disabled={!selectedAssetToLink || station.status === 'INACTIVE'}>Vincular</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Transferir Patrimônio</DialogTitle><DialogDescription>Selecione a estação de destino para a transferência.</DialogDescription></DialogHeader>
          <Select value={selectedTransferStation} onValueChange={setSelectedTransferStation}>
            <SelectTrigger className="text-sm"><SelectValue placeholder="Estação de destino" /></SelectTrigger>
            <SelectContent>{otherStations.map(item => <SelectItem key={item.id} value={item.id}>{item.code} - {item.name}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTransferDialogOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleTransfer} disabled={!selectedTransferStation}>Transferir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!unlinkConfirmId} onOpenChange={open => !open && setUnlinkConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Desvincular patrimônio?</AlertDialogTitle><AlertDialogDescription>O patrimônio será removido desta estação. Você poderá vinculá-lo novamente depois.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleUnlink}>Desvincular</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={changeResponsibleOpen && isAdmin} onOpenChange={setChangeResponsibleOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Alterar Responsável</DialogTitle><DialogDescription>Selecione o funcionário responsável pela estação {station.code}.</DialogDescription></DialogHeader>
          <Select value={selectedResponsible} onValueChange={setSelectedResponsible}>
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Sem responsável</SelectItem>
              {employees.filter(item => item.status === 'ACTIVE').map(item => <SelectItem key={item.id} value={item.id}>{item.fullName}</SelectItem>)}
            </SelectContent>
          </Select>
          <DialogFooter><Button variant="outline" size="sm" onClick={() => setChangeResponsibleOpen(false)}>Cancelar</Button><Button size="sm" onClick={handleChangeResponsible}>Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!moveResponsibleTarget && isAdmin} onOpenChange={open => !open && setMoveResponsibleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover responsável?</AlertDialogTitle>
            <AlertDialogDescription>
              {moveResponsibleTarget?.employeeName} já é responsável pela estação {moveResponsibleTarget?.stationCode}. Se continuar, essa pessoa será movida para {station.code} e a estação anterior ficará sem responsável.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => submitResponsibleChange(true)}>Mover responsável</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editOpen && isAdmin} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Editar Estação</DialogTitle><DialogDescription>Altere os dados da estação.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label className="text-xs">Código</Label><Input value={editForm.code} onChange={e => setEditForm(current => ({ ...current, code: e.target.value }))} className="h-9 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Nome</Label><Input value={editForm.name} onChange={e => setEditForm(current => ({ ...current, name: e.target.value }))} className="h-9 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Localização</Label><Input value={editForm.locationCode} onChange={e => setEditForm(current => ({ ...current, locationCode: e.target.value }))} className="h-9 text-sm" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={editForm.status} onValueChange={value => setEditForm(current => ({ ...current, status: value as StationStatus }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="ACTIVE">Ativa</SelectItem><SelectItem value="INACTIVE">Inativa</SelectItem><SelectItem value="MAINTENANCE">Manutenção</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Observação</Label><Textarea value={editForm.observation} onChange={e => setEditForm(current => ({ ...current, observation: e.target.value }))} placeholder="Observações sobre a estação..." className="text-sm min-h-[60px]" /></div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="destructive" size="sm" onClick={() => { setEditOpen(false); setDeleteConfirmOpen(true); }}>Excluir</Button>
            <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancelar</Button><Button size="sm" onClick={handleEditSave}>Salvar</Button></div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen && isAdmin} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir estação {station.code}?</AlertDialogTitle>
            <AlertDialogDescription>
              {stationAssets.length > 0 ? `Esta estação possui ${stationAssets.length} patrimônio(s) vinculado(s). Ao excluir, todos os vínculos serão encerrados e os patrimônios ficarão sem estação.` : 'Esta ação não pode ser desfeita.'}
              {employee && ` O funcionário ${employee.fullName} será desvinculado.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteStation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir Estação</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default StationDrawer;
