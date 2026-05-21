import { useEffect, useState } from 'react';
import { Square, Minus, MonitorSmartphone, Armchair, Printer, Network, Type, Grid3X3, Eye, Pencil, Save, RotateCcw, Copy, Trash2, Link2, Plus, ChevronRight, ChevronDown, Building, Layers, LayoutGrid, MoreHorizontal, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useInventoryMapStore } from '@/features/inventory-map/store/useInventoryMapStore';
import { useInventoryStore } from '@/features/inventory-map/store/useInventoryStore';
import type { ElementType, StationStatus, SpaceType } from '@/features/inventory-map/types/inventoryMap.types';
import { toast } from 'sonner';

const toolItems: { type: ElementType; label: string; icon: React.ReactNode }[] = [
  { type: 'WALL', label: 'Parede', icon: <Minus className="h-4 w-4" /> },
  { type: 'PARTITION', label: 'Divisória', icon: <Minus className="h-4 w-4 opacity-50" /> },
  { type: 'DESK', label: 'Mesa', icon: <MonitorSmartphone className="h-4 w-4" /> },
  { type: 'CHAIR', label: 'Cadeira', icon: <Armchair className="h-4 w-4" /> },
  { type: 'PRINTER', label: 'Impressora', icon: <Printer className="h-4 w-4" /> },
  { type: 'SWITCH', label: 'Switch', icon: <Network className="h-4 w-4" /> },
  { type: 'LABEL', label: 'Rótulo', icon: <Type className="h-4 w-4" /> },
  { type: 'ROOM_BLOCK', label: 'Bloco', icon: <Square className="h-4 w-4" /> },
];

const emptyStationForm = { code: '', name: '', locationCode: '', status: 'ACTIVE' as StationStatus };

const spaceTypeIcons: Record<SpaceType, React.ReactNode> = {
  UNIT: <Building className="h-3.5 w-3.5" />,
  BUILDING: <Building className="h-3.5 w-3.5" />,
  FLOOR: <Layers className="h-3.5 w-3.5" />,
  SECTOR: <LayoutGrid className="h-3.5 w-3.5" />,
};

const spaceTypeLabels: Record<SpaceType, string> = {
  UNIT: 'Unidade',
  BUILDING: 'Prédio',
  FLOOR: 'Andar',
  SECTOR: 'Setor/Sala',
};

const allowedChildren: Record<SpaceType, SpaceType[]> = {
  UNIT: ['BUILDING', 'FLOOR'],
  BUILDING: ['FLOOR'],
  FLOOR: ['SECTOR'],
  SECTOR: [],
};

const navigableTypes = new Set<SpaceType>(['FLOOR', 'SECTOR']);
const emptySpaceForm = { name: '', type: 'FLOOR' as SpaceType, parentId: undefined as string | undefined };

const BuilderToolbar = () => {
  const isAdmin = useAuthStore(state => state.user?.role === 'ADMIN');
  const { mode, setMode, showGrid, toggleGrid, placingType, startPlacing, cancelPlacing, saveLayout, selectedElementId, layout, activeSpaceId, rotateElement, duplicateElement, deleteElement, updateElement, switchToSpace } = useInventoryMapStore();
  const { stations, addStation, spaces, getChildSpaces, addSpace, updateSpace, deleteSpace } = useInventoryStore();

  const [createStationOpen, setCreateStationOpen] = useState(false);
  const [stationForm, setStationForm] = useState(emptyStationForm);
  const [spaceDialogOpen, setSpaceDialogOpen] = useState(false);
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [spaceForm, setSpaceForm] = useState(emptySpaceForm);
  const [deleteSpaceId, setDeleteSpaceId] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const expandSet = new Set<string>();
    if (activeSpaceId) {
      let current = spaces.find(space => space.id === activeSpaceId);
      while (current) {
        if (current.parentId) expandSet.add(current.parentId);
        current = current.parentId ? spaces.find(space => space.id === current!.parentId) : undefined;
      }
    }
    spaces.filter(space => !space.parentId).forEach(space => expandSet.add(space.id));
    return expandSet;
  });

  const selectedElement = selectedElementId ? layout.elements.find(element => element.id === selectedElementId) : null;

  useEffect(() => {
    if (!isAdmin && mode !== 'VIEW') {
      setMode('VIEW');
    }
  }, [isAdmin, mode, setMode]);

  const handleSave = async () => {
    try {
      await saveLayout();
      toast.success('Layout salvo com sucesso');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar layout');
    }
  };

  const handleCreateStation = async () => {
    if (!stationForm.code.trim() || !stationForm.name.trim()) {
      toast.error('Preencha código e nome da estação');
      return;
    }
    try {
      await addStation({ code: stationForm.code, name: stationForm.name, locationCode: stationForm.locationCode, status: stationForm.status });
      toast.success(`Estação ${stationForm.code} criada`);
      setStationForm(emptyStationForm);
      setCreateStationOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar estação');
    }
  };

  const availableStations = stations.filter(station => !layout.elements.some(element => element.stationId === station.id && element.id !== selectedElementId));

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSpaceClick = (spaceId: string, spaceName: string, spaceType: SpaceType) => {
    if (navigableTypes.has(spaceType)) {
      void switchToSpace(spaceId, spaceName);
    }
  };

  const openCreateSpace = (parentId?: string, parentType?: SpaceType) => {
    const defaultType = parentType ? (allowedChildren[parentType]?.[0] || 'SECTOR') : 'UNIT';
    setEditingSpaceId(null);
    setSpaceForm({ name: '', type: defaultType, parentId });
    setSpaceDialogOpen(true);
  };

  const openEditSpace = (id: string) => {
    const space = spaces.find(item => item.id === id);
    if (!space) return;
    setEditingSpaceId(id);
    setSpaceForm({ name: space.name, type: space.type, parentId: space.parentId });
    setSpaceDialogOpen(true);
  };

  const handleSaveSpace = async () => {
    if (!spaceForm.name.trim()) {
      toast.error('Informe o nome do espaço');
      return;
    }
    try {
      if (editingSpaceId) {
        await updateSpace(editingSpaceId, { name: spaceForm.name.trim() });
        toast.success('Espaço atualizado');
      } else {
        await addSpace({ name: spaceForm.name.trim(), type: spaceForm.type, parentId: spaceForm.parentId, order: 0 });
        toast.success('Espaço criado');
        if (spaceForm.parentId) {
          setExpanded(prev => new Set([...prev, spaceForm.parentId!]));
        }
      }
      setSpaceDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar espaço');
    }
  };

  const handleDeleteSpace = async () => {
    if (!deleteSpaceId) return;
    try {
      await deleteSpace(deleteSpaceId);
      toast.success('Espaço excluído');
      setDeleteSpaceId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir espaço');
    }
  };

  const getDescendantCount = (id: string): number => {
    const children = getChildSpaces(id);
    return children.length + children.reduce((sum, child) => sum + getDescendantCount(child.id), 0);
  };

  const getValidTypes = (): SpaceType[] => {
    if (editingSpaceId) return [spaceForm.type];
    if (!spaceForm.parentId) return ['UNIT'];
    const parent = spaces.find(space => space.id === spaceForm.parentId);
    return parent ? allowedChildren[parent.type] : ['UNIT'];
  };

  const renderSpaceTree = (parentId: string | undefined, depth: number) => {
    const children = parentId ? getChildSpaces(parentId) : spaces.filter(space => !space.parentId).sort((a, b) => a.order - b.order);
    if (children.length === 0) return null;

    return (
      <div className={depth > 0 ? 'ml-3 border-l border-border/30' : ''}>
        {children.map(space => {
          const hasChildren = getChildSpaces(space.id).length > 0;
          const isExpanded = expanded.has(space.id);
          const isActive = activeSpaceId === space.id;
          const isNavigable = navigableTypes.has(space.type);
          const canAddChildren = allowedChildren[space.type].length > 0;

          return (
            <div key={space.id}>
              <div className={`flex items-center gap-1 py-1 px-1.5 rounded-md text-xs transition-all group ${isActive ? 'bg-primary text-primary-foreground font-medium' : isNavigable ? 'hover:bg-secondary text-foreground cursor-pointer' : 'text-muted-foreground'}`}>
                <button onClick={(event) => { event.stopPropagation(); if (hasChildren) toggleExpand(space.id); }} className={`shrink-0 w-4 h-4 flex items-center justify-center ${hasChildren ? 'hover:text-foreground' : 'invisible'}`}>
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
                <div className="flex items-center gap-1.5 flex-1 min-w-0" onClick={() => { if (isNavigable) handleSpaceClick(space.id, space.name, space.type); else if (hasChildren) toggleExpand(space.id); }}>
                  <span className="shrink-0">{spaceTypeIcons[space.type]}</span>
                  <span className="truncate">{space.name}</span>
                </div>
                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className={`shrink-0 h-5 w-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'hover:bg-primary-foreground/20' : 'hover:bg-secondary'}`} onClick={(event) => event.stopPropagation()}>
                        <MoreHorizontal className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      {canAddChildren && (
                        <DropdownMenuItem onClick={() => openCreateSpace(space.id, space.type)}>
                          <Plus className="h-3.5 w-3.5 mr-2" />
                          Adicionar {allowedChildren[space.type][0] === 'FLOOR' ? 'andar' : allowedChildren[space.type][0] === 'SECTOR' ? 'setor' : 'sub-espaço'}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => openEditSpace(space.id)}>
                        <Pencil className="h-3.5 w-3.5 mr-2" />
                        Renomear
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteSpaceId(space.id)} className="text-destructive focus:text-destructive">
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              {isExpanded && renderSpaceTree(space.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  const rootSpaces = spaces.filter(space => !space.parentId);

  return (
    <>
      <div className="w-64 border-r border-border bg-card flex flex-col h-full">
        <div className="flex flex-col min-h-0 border-b border-border">
          <div className="flex items-center justify-between px-3 pt-3 pb-1">
            <p className="text-[10px] uppercase tracking-[1.5px] text-muted-foreground font-medium">Espaços</p>
            {isAdmin && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Criar unidade" onClick={() => openCreateSpace()}>
                <FolderPlus className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>
          <ScrollArea className="flex-1 px-1.5 pb-2" style={{ maxHeight: '40vh' }}>
            {rootSpaces.length === 0 ? (
              <div className="text-center py-4 px-2">
                <p className="text-[11px] text-muted-foreground">Nenhum espaço cadastrado</p>
                {isAdmin && (
                  <Button variant="outline" size="sm" className="text-[11px] mt-2 h-7" onClick={() => openCreateSpace()}>
                    <Plus className="h-3 w-3 mr-1" />
                    Criar unidade
                  </Button>
                )}
              </div>
            ) : renderSpaceTree(undefined, 0)}
          </ScrollArea>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 border-b border-border">
            <p className="text-[10px] uppercase tracking-[1.5px] text-muted-foreground mb-3 font-medium">Modo</p>
            <div className="flex gap-2">
              <Button variant={mode === 'VIEW' ? 'default' : 'outline'} size="sm" className="flex-1 text-xs" onClick={() => setMode('VIEW')}>
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                Visualizar
              </Button>
              {isAdmin && (
                <Button variant={mode === 'EDIT' ? 'default' : 'outline'} size="sm" className="flex-1 text-xs" onClick={() => setMode('EDIT')}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Editar
                </Button>
              )}
            </div>
          </div>
          {isAdmin && mode === 'EDIT' && (
            <div className="p-4 border-b border-border">
              <p className="text-[10px] uppercase tracking-[1.5px] text-muted-foreground mb-3 font-medium">Inserir Elemento</p>
              <div className="space-y-1.5">
                {toolItems.map(tool => (
                  <button key={tool.type} onClick={() => placingType === tool.type ? cancelPlacing() : startPlacing(tool.type)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${placingType === tool.type ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-foreground hover:bg-secondary'}`}>
                    {tool.icon}
                    {tool.label}
                  </button>
                ))}
              </div>
              {placingType && <p className="mt-3 text-[11px] text-bronze font-medium">Clique no mapa para posicionar</p>}
            </div>
          )}
          {isAdmin && mode === 'EDIT' && selectedElement && (
            <div className="p-4 border-b border-border">
              <p className="text-[10px] uppercase tracking-[1.5px] text-muted-foreground mb-3 font-medium">Item Selecionado</p>
              <div className="flex gap-2 mb-3">
                <Button variant="outline" size="sm" onClick={() => rotateElement(selectedElementId!)} title="Girar 90°"><RotateCcw className="h-3.5 w-3.5" /></Button>
                <Button variant="outline" size="sm" onClick={() => duplicateElement(selectedElementId!)} title="Duplicar"><Copy className="h-3.5 w-3.5" /></Button>
                <Button variant="outline" size="sm" onClick={() => deleteElement(selectedElementId!)} title="Excluir" className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Rótulo</Label>
                  <Input value={selectedElement.label || ''} onChange={(e) => updateElement(selectedElementId!, { label: e.target.value })} placeholder="Texto do rótulo..." className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tamanho da fonte</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" min={8} max={72} value={selectedElement.fontSize || 12} onChange={(e) => updateElement(selectedElementId!, { fontSize: Math.max(8, Math.min(72, Number(e.target.value))) })} className="h-8 text-xs w-20" />
                    <span className="text-[10px] text-muted-foreground">px</span>
                  </div>
                </div>
                {selectedElement.elementType === 'DESK' && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Link2 className="h-3 w-3" />Vincular Estação</Label>
                    <Select value={selectedElement.stationId || '_none'} onValueChange={(value) => {
                      const stationId = value === '_none' ? undefined : value;
                      const station = stations.find(item => item.id === stationId);
                      updateElement(selectedElementId!, { stationId, label: station ? station.code : selectedElement.label });
                      if (station) toast.success(`Mesa vinculada à estação ${station.code}`);
                    }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sem estação" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Sem estação</SelectItem>
                        {availableStations.map(station => <SelectItem key={station.id} value={station.id}>{station.code} - {station.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="w-full text-xs mt-1" onClick={() => setCreateStationOpen(true)}>
                      <Plus className="h-3 w-3 mr-1" />
                      Criar Nova Estação
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
          <Separator />
          <div className="p-4 space-y-2">
            <button onClick={toggleGrid} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all ${showGrid ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/50'}`}>
              <Grid3X3 className="h-4 w-4" />
              Grade {showGrid ? 'Visível' : 'Oculta'}
            </button>
            {isAdmin && mode === 'EDIT' && (
              <Button className="w-full" size="sm" onClick={handleSave}>
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Salvar Layout
              </Button>
            )}
          </div>
        </ScrollArea>
        <div className="p-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground leading-relaxed">{mode === 'VIEW' ? 'Clique num andar/setor para navegar. Passe o mouse nas estações.' : 'Arraste os itens para posicionar.'}</p>
        </div>
      </div>

      <Dialog open={createStationOpen && isAdmin} onOpenChange={setCreateStationOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Criar Nova Estação</DialogTitle>
            <DialogDescription>Preencha os dados para criar uma nova estação de trabalho.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label className="text-xs">Código *</Label><Input value={stationForm.code} onChange={e => setStationForm(current => ({ ...current, code: e.target.value }))} placeholder="Ex: D-25" className="h-9 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Nome *</Label><Input value={stationForm.name} onChange={e => setStationForm(current => ({ ...current, name: e.target.value }))} placeholder="Ex: Estação D-25" className="h-9 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Localização</Label><Input value={stationForm.locationCode} onChange={e => setStationForm(current => ({ ...current, locationCode: e.target.value }))} placeholder="Ex: Ala Norte" className="h-9 text-sm" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={stationForm.status} onValueChange={value => setStationForm(current => ({ ...current, status: value as StationStatus }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Ativa</SelectItem>
                  <SelectItem value="INACTIVE">Inativa</SelectItem>
                  <SelectItem value="MAINTENANCE">Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateStationOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleCreateStation}>Criar Estação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={spaceDialogOpen && isAdmin} onOpenChange={setSpaceDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingSpaceId ? 'Renomear' : 'Novo'} Espaço</DialogTitle>
            <DialogDescription>{spaceForm.parentId ? `Dentro de "${spaces.find(space => space.id === spaceForm.parentId)?.name}"` : 'Crie a unidade raiz'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome *</Label>
              <Input value={spaceForm.name} onChange={e => setSpaceForm(current => ({ ...current, name: e.target.value }))} placeholder={spaceForm.type === 'FLOOR' ? 'Ex: 1º Andar' : spaceForm.type === 'SECTOR' ? 'Ex: Ala Norte' : 'Ex: Escritório Principal'} className="h-9 text-sm" autoFocus onKeyDown={event => event.key === 'Enter' && handleSaveSpace()} />
            </div>
            {!editingSpaceId && getValidTypes().length > 1 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={spaceForm.type} onValueChange={value => setSpaceForm(current => ({ ...current, type: value as SpaceType }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{getValidTypes().map(type => <SelectItem key={type} value={type}>{spaceTypeLabels[type]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSpaceDialogOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSaveSpace}>{editingSpaceId ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteSpaceId && isAdmin} onOpenChange={open => !open && setDeleteSpaceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir espaço?</AlertDialogTitle>
            <AlertDialogDescription>{deleteSpaceId && getDescendantCount(deleteSpaceId) > 0 ? `Este espaço possui ${getDescendantCount(deleteSpaceId)} sub-espaço(s) que também serão excluídos.` : 'Esta ação não pode ser desfeita.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSpace}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BuilderToolbar;
