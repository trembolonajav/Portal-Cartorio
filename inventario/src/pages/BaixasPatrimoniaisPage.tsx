import { useEffect, useMemo, useState } from 'react';
import { FileDown, FileText, Plus, Search, Upload, CheckCircle2, XCircle, Paperclip, Trash2, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import AppShell from '@/components/layout/AppShell';
import { useInventoryStore } from '@/features/inventory-map/store/useInventoryStore';
import { getCurrentUsername, getStoredAuth } from '@/lib/auth';
import { inventoryApi, type ApiAssetDisposal, type ApiDisposalDocumentType, type ApiDisposalReason, type ApiDisposalStatus } from '@/lib/inventory-api';
import { toast } from 'sonner';

const REASON_LABELS: Record<ApiDisposalReason, string> = {
  OBSOLESCENCE: 'Obsolescencia',
  IRREPAIRABLE_DEFECT: 'Defeito sem reparo',
  PHYSICAL_DAMAGE: 'Dano fisico',
  LOSS: 'Extravio',
  REPLACEMENT: 'Substituicao',
  DONATION: 'Doacao',
  DISCARD: 'Descarte',
  SALE: 'Venda',
  OTHER: 'Outro',
};

const STATUS_LABELS: Record<ApiDisposalStatus, string> = {
  DRAFT: 'Rascunho',
  WAITING_SIGNATURE: 'Aguardando assinatura',
  FINALIZED: 'Finalizada',
  CANCELLED: 'Cancelada',
};

const STATUS_CLASS: Record<ApiDisposalStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  WAITING_SIGNATURE: 'bg-amber-50 text-amber-700 border-amber-200',
  FINALIZED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

const DOCUMENT_LABELS: Record<ApiDisposalDocumentType, string> = {
  SIGNED_TERM: 'Termo assinado',
  PHOTO: 'Fotografia',
  TECHNICAL_REPORT: 'Laudo técnico',
  DISPOSAL_RECEIPT: 'Comprovante de destinação',
  ORIGINAL_PROCESS: 'Processo original',
  OTHER: 'Outro documento',
};

type DisposalMaterialDraft = {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  notes: string;
  containsSensitiveData: boolean;
};

const newMaterial = (): DisposalMaterialDraft => ({
  id: crypto.randomUUID(),
  category: 'Acessório de TI',
  description: '',
  quantity: 1,
  unit: 'unidade',
  notes: '',
  containsSensitiveData: false,
});

const emptyForm = {
  reason: 'OBSOLESCENCE' as ApiDisposalReason,
  destination: 'Descarte eletronico',
  justification: '',
  notes: '',
  authorizedByName: '',
  authorizationDate: new Date().toISOString().slice(0, 10),
};

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('pt-BR') : '-';
const formatDateTime = (value?: string | null) => value ? new Date(value).toLocaleString('pt-BR') : '-';

const BaixasPatrimoniaisPage = () => {
  const { assets, getStationForAsset, getEmployeeForStation, refreshAll } = useInventoryStore();
  const [disposals, setDisposals] = useState<ApiAssetDisposal[]>([]);
  const [selected, setSelected] = useState<ApiAssetDisposal | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [materials, setMaterials] = useState<DisposalMaterialDraft[]>([]);
  const [assetSearch, setAssetSearch] = useState('');
  const [documentType, setDocumentType] = useState<ApiDisposalDocumentType>('PHOTO');
  const [cancelReason, setCancelReason] = useState('');
  const [loading, setLoading] = useState(false);

  const loadDisposals = async () => {
    const next = await inventoryApi.listDisposals();
    setDisposals(next);
  };

  useEffect(() => {
    void loadDisposals();
  }, []);

  const availableAssets = useMemo(() => {
    const query = assetSearch.toLowerCase();
    return assets
      .filter(asset => asset.status !== 'DISPOSED')
      .filter(asset => !query
        || asset.assetCode.toLowerCase().includes(query)
        || asset.description.toLowerCase().includes(query)
        || asset.type.toLowerCase().includes(query)
        || (asset.manufacturer || '').toLowerCase().includes(query)
        || (asset.model || '').toLowerCase().includes(query)
        || (asset.serialNumber || '').toLowerCase().includes(query));
  }, [assets, assetSearch]);

  const openNew = () => {
    setForm(emptyForm);
    setSelectedAssets(new Set());
    setMaterials([]);
    setAssetSearch('');
    setFormOpen(true);
  };

  const refreshDetail = async (id: number) => {
    const detail = await inventoryApi.getDisposal(String(id));
    setSelected(detail);
    await loadDisposals();
  };

  const createDisposal = async () => {
    if (!form.justification.trim() || !form.destination.trim() || !form.authorizedByName.trim()) {
      toast.error('Preencha motivo, destino, justificativa e autorizador');
      return;
    }
    if (selectedAssets.size === 0 && materials.length === 0) {
      toast.error('Inclua ao menos um patrimônio ou material sem patrimônio');
      return;
    }
    if (materials.some(material => !material.category.trim() || !material.description.trim() || material.quantity < 1 || !material.unit.trim())) {
      toast.error('Preencha categoria, descrição, quantidade e unidade de todos os materiais');
      return;
    }
    setLoading(true);
    try {
      const created = await inventoryApi.createDisposal({
        assetIds: Array.from(selectedAssets).map(Number),
        materials: materials.map(material => ({
          category: material.category,
          description: material.description,
          quantity: material.quantity,
          unit: material.unit,
          notes: material.notes,
          containsSensitiveData: material.containsSensitiveData,
        })),
        reason: form.reason,
        destination: form.destination,
        justification: form.justification,
        notes: form.notes,
        authorizedByName: form.authorizedByName,
        authorizationDate: form.authorizationDate,
        requestedBy: getCurrentUsername() || undefined,
      });
      toast.success(`Baixa ${created.number} criada`);
      setFormOpen(false);
      await refreshDetail(created.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar baixa');
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (id: number) => {
    try {
      await refreshDetail(id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar baixa');
    }
  };

  const isLargeBatch = (disposal: ApiAssetDisposal) => disposal.itemCount > 10;

  const generateTerm = async () => {
    if (!selected) return;
    const updated = await inventoryApi.generateDisposalTerm(String(selected.id), getCurrentUsername() || undefined);
    setSelected(updated);
    await loadDisposals();
    await openTerm(updated.id);
  };

  const openPdfDocument = async (documentUrl: string) => {
    const auth = getStoredAuth();
    const response = await fetch(documentUrl, {
      headers: auth?.token ? { Authorization: auth.token } : undefined,
    });
    if (!response.ok) {
      toast.error('Nao foi possivel abrir o documento');
      return;
    }
    const file = await response.blob();
    const blobUrl = URL.createObjectURL(file);
    window.open(blobUrl, '_blank');
  };

  const openTerm = async (id: number) => openPdfDocument(inventoryApi.disposalTermUrl(String(id)));
  const openSignatureSheet = async (id: number) => openPdfDocument(inventoryApi.disposalSignatureSheetUrl(String(id)));

  const uploadSigned = async (file: File | null) => {
    if (!selected || !file) return;
    try {
      const updated = await inventoryApi.uploadSignedDisposalTerm(String(selected.id), file, getCurrentUsername() || undefined);
      setSelected(updated);
      await loadDisposals();
      toast.success('Folha assinada anexada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao anexar folha assinada');
    }
  };

  const uploadDocument = async (file: File | null) => {
    if (!selected || !file) return;
    try {
      const updated = await inventoryApi.uploadDisposalDocument(String(selected.id), documentType, file, getCurrentUsername() || undefined);
      setSelected(updated);
      await loadDisposals();
      toast.success(`${DOCUMENT_LABELS[documentType]} anexado(a)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao anexar documento');
    }
  };

  const openStoredDocument = async (documentId: number) => {
    if (!selected) return;
    await openPdfDocument(inventoryApi.disposalDocumentUrl(String(selected.id), String(documentId)));
  };

  const updateMaterial = (id: string, patch: Partial<DisposalMaterialDraft>) => {
    setMaterials(current => current.map(material => material.id === id ? { ...material, ...patch } : material));
  };

  const finalizeDisposal = async () => {
    if (!selected) return;
    try {
      const updated = await inventoryApi.finalizeDisposal(String(selected.id), getCurrentUsername() || undefined);
      setSelected(updated);
      await refreshAll();
      await loadDisposals();
      toast.success('Baixa finalizada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao finalizar baixa');
    }
  };

  const cancelDisposal = async () => {
    if (!selected || !cancelReason.trim()) {
      toast.error('Informe o motivo do cancelamento');
      return;
    }
    const updated = await inventoryApi.cancelDisposal(String(selected.id), { reason: cancelReason, username: getCurrentUsername() || undefined });
    setSelected(updated);
    setCancelReason('');
    await loadDisposals();
    toast.success('Baixa cancelada');
  };

  const toggleAsset = (id: string) => {
    setSelectedAssets(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedIds = selectedAssets;

  return (
    <AppShell
      active="baixas"
      actions={
        <Button size="sm" onClick={openNew} className="h-[38px]">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Nova baixa
        </Button>
      }
    >
      <div className="flex-1 space-y-5 overflow-auto px-4 py-6 md:px-7">
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-[34px] font-semibold leading-none text-primary">Baixas patrimoniais</h2>
          <p className="text-sm text-muted-foreground">{disposals.length} processos · itens agrupados, documentos, assinatura e destinação</p>
        </div>
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Composição</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead>Autorizador</TableHead>
                <TableHead className="w-[120px] text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disposals.map(disposal => (
                <TableRow key={disposal.id} className="cursor-pointer" onClick={() => openDetail(disposal.id)}>
                  <TableCell className="font-mono text-xs">{disposal.number}</TableCell>
                  <TableCell><Badge variant="outline" className={STATUS_CLASS[disposal.status]}>{STATUS_LABELS[disposal.status]}</Badge></TableCell>
                  <TableCell>{REASON_LABELS[disposal.reason]}</TableCell>
                  <TableCell>{disposal.destination}</TableCell>
                  <TableCell>
                    <span className="block text-sm">{disposal.assetCount} patrimônio(s)</span>
                    <span className="block text-xs text-muted-foreground">{disposal.materialCount} material(is) sem patrimônio</span>
                  </TableCell>
                  <TableCell>{formatDate(disposal.createdAt)}</TableCell>
                  <TableCell>{disposal.authorizedByName}</TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="outline">Visualizar</Button></TableCell>
                </TableRow>
              ))}
              {!disposals.length && (
                <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">Nenhuma baixa patrimonial registrada.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </section>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova baixa patrimonial</DialogTitle>
            <DialogDescription>Agrupe patrimônios e materiais sem etiqueta em um único processo formal de baixa.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Select value={form.reason} onValueChange={value => setForm(current => ({ ...current, reason: value as ApiDisposalReason }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(REASON_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Destino</Label>
              <Input value={form.destination} onChange={event => setForm(current => ({ ...current, destination: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Autorizador</Label>
              <Input value={form.authorizedByName} onChange={event => setForm(current => ({ ...current, authorizedByName: event.target.value }))} placeholder="Nome de quem autorizou" />
            </div>
            <div className="space-y-2">
              <Label>Data da autorizacao</Label>
              <Input type="date" value={form.authorizationDate} onChange={event => setForm(current => ({ ...current, authorizationDate: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Justificativa detalhada</Label>
              <Textarea value={form.justification} onChange={event => setForm(current => ({ ...current, justification: event.target.value }))} rows={3} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Observacoes internas</Label>
              <Textarea value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} rows={2} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label>Patrimonios selecionados: {selectedIds.size}</Label>
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" value={assetSearch} onChange={event => setAssetSearch(event.target.value)} placeholder="Buscar patrimonio..." />
              </div>
            </div>
            <div className="max-h-72 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Codigo</TableHead>
                    <TableHead>Descricao</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Responsavel</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableAssets.map(asset => {
                    const station = getStationForAsset(asset.id);
                    const employee = station ? getEmployeeForStation(station.id) : null;
                    return (
                      <TableRow key={asset.id}>
                        <TableCell><Checkbox checked={selectedIds.has(asset.id)} onCheckedChange={() => toggleAsset(asset.id)} /></TableCell>
                        <TableCell className="font-mono text-xs">{asset.assetCode}</TableCell>
                        <TableCell>{asset.description}</TableCell>
                        <TableCell>{asset.type}</TableCell>
                        <TableCell>{station?.code || '-'}</TableCell>
                        <TableCell>{employee?.fullName || '-'}</TableCell>
                        <TableCell>{asset.status}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Label>Materiais sem patrimônio</Label>
                <p className="mt-1 text-xs text-muted-foreground">Cabos, mídias, peças, acessórios e resíduos entram no processo sem receber número patrimonial fictício.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setMaterials(current => [...current, newMaterial()])}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />Adicionar material
              </Button>
            </div>
            {materials.map((material, index) => (
              <div key={material.id} className="rounded-md border bg-background p-3">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium">Material {index + 1}</p>
                  <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setMaterials(current => current.filter(item => item.id !== material.id))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-12">
                  <div className="space-y-1 md:col-span-3"><Label className="text-xs">Categoria</Label><Input value={material.category} onChange={event => updateMaterial(material.id, { category: event.target.value })} placeholder="Mídia, cabo, peça..." /></div>
                  <div className="space-y-1 md:col-span-5"><Label className="text-xs">Descrição</Label><Input value={material.description} onChange={event => updateMaterial(material.id, { description: event.target.value })} placeholder="Ex.: CD de instalação Office 2007" /></div>
                  <div className="space-y-1 md:col-span-2"><Label className="text-xs">Quantidade</Label><Input type="number" min={1} value={material.quantity} onChange={event => updateMaterial(material.id, { quantity: Math.max(1, Number(event.target.value) || 1) })} /></div>
                  <div className="space-y-1 md:col-span-2"><Label className="text-xs">Unidade</Label><Input value={material.unit} onChange={event => updateMaterial(material.id, { unit: event.target.value })} placeholder="unidade" /></div>
                  <div className="space-y-1 md:col-span-9"><Label className="text-xs">Observações e cautelas</Label><Input value={material.notes} onChange={event => updateMaterial(material.id, { notes: event.target.value })} placeholder="Estado, motivo, forma de descarte..." /></div>
                  <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs md:col-span-3 md:self-end">
                    <Checkbox checked={material.containsSensitiveData} onCheckedChange={checked => updateMaterial(material.id, { containsSensitiveData: checked === true })} />
                    Possui dados, mídia, licença ou credencial
                  </label>
                </div>
              </div>
            ))}
            {!materials.length && <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">Nenhum material sem patrimônio incluído.</p>}
          </section>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={createDisposal} disabled={loading}>Criar baixa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.number}</DialogTitle>
                <DialogDescription>{STATUS_LABELS[selected.status]} · {REASON_LABELS[selected.reason]} · {selected.assetCount} patrimônio(s) · {selected.materialCount} material(is) sem patrimônio</DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 md:grid-cols-4">
                <Info label="Destino" value={selected.destination} />
                <Info label="Solicitante" value={selected.requestedBy || '-'} />
                <Info label="Autorizador" value={selected.authorizedByName} />
                <Info label="Criada em" value={formatDateTime(selected.createdAt)} />
              </div>

              <div className="rounded-md border p-4 space-y-2">
                <p className="text-sm font-medium">Justificativa</p>
                <p className="text-sm text-muted-foreground">{selected.justification}</p>
                {selected.notes && <p className="text-sm text-muted-foreground">Observacoes: {selected.notes}</p>}
              </div>

              <div className="flex flex-wrap gap-2">
                {selected.status === 'DRAFT' && <Button onClick={generateTerm}><FileDown className="h-4 w-4 mr-2" />Gerar termo PDF</Button>}
                {selected.termGeneratedAt && <Button variant="outline" onClick={() => openTerm(selected.id)}><FileText className="h-4 w-4 mr-2" />Abrir termo completo</Button>}
                {selected.termGeneratedAt && isLargeBatch(selected) && <Button variant="outline" onClick={() => openSignatureSheet(selected.id)}><FileDown className="h-4 w-4 mr-2" />Abrir folha de assinatura</Button>}
                {selected.status === 'WAITING_SIGNATURE' && (
                  <Button variant="outline" asChild>
                    <label className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />{isLargeBatch(selected) ? 'Anexar folha assinada' : 'Anexar termo assinado'}
                      <input type="file" className="hidden" accept="application/pdf,image/*" onChange={event => uploadSigned(event.target.files?.[0] || null)} />
                    </label>
                  </Button>
                )}
                {selected.status === 'WAITING_SIGNATURE' && <Button disabled={!selected.documents.some(document => document.type === 'SIGNED_TERM')} onClick={finalizeDisposal} className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="h-4 w-4 mr-2" />Finalizar baixa</Button>}
              </div>

              {selected.status !== 'FINALIZED' && selected.status !== 'CANCELLED' && (
                <div className="flex gap-2 rounded-md border border-red-100 bg-red-50 p-3">
                  <Input value={cancelReason} onChange={event => setCancelReason(event.target.value)} placeholder="Motivo do cancelamento" />
                  <Button variant="destructive" onClick={cancelDisposal}><XCircle className="h-4 w-4 mr-2" />Cancelar</Button>
                </div>
              )}

              <section className="rounded-md border">
                <div className="border-b bg-muted/30 px-4 py-3">
                  <h3 className="text-sm font-semibold">Patrimônios incluídos ({selected.assetCount})</h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Codigo</TableHead>
                      <TableHead>Descricao</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fabricante</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Serie</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead>Responsavel</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selected.items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.assetCode}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.manufacturer || '-'}</TableCell>
                        <TableCell>{item.model || '-'}</TableCell>
                        <TableCell>{item.serialNumber || '-'}</TableCell>
                        <TableCell>{item.station || '-'}</TableCell>
                        <TableCell>{item.responsible || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </section>

              {!!selected.materials.length && (
                <section className="rounded-md border">
                  <div className="border-b bg-muted/30 px-4 py-3">
                    <h3 className="text-sm font-semibold">Materiais sem patrimônio ({selected.materialCount})</h3>
                  </div>
                  <Table>
                    <TableHeader><TableRow><TableHead>Categoria</TableHead><TableHead>Descrição</TableHead><TableHead>Quantidade</TableHead><TableHead>Dados/credenciais</TableHead><TableHead>Observações</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {selected.materials.map(material => (
                        <TableRow key={material.id}>
                          <TableCell>{material.category}</TableCell>
                          <TableCell>{material.description}</TableCell>
                          <TableCell>{material.quantity} {material.unit}</TableCell>
                          <TableCell>{material.containsSensitiveData ? <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Exige cautela</Badge> : 'Não identificado'}</TableCell>
                          <TableCell>{material.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </section>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <section className="rounded-md border p-4">
                  <div className="mb-3 flex items-center gap-2"><Paperclip className="h-4 w-4" /><h3 className="text-sm font-semibold">Documentação do processo</h3></div>
                  {selected.status !== 'CANCELLED' && (
                    <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                      <Select value={documentType} onValueChange={value => setDocumentType(value as ApiDisposalDocumentType)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(DOCUMENT_LABELS).filter(([value]) => value !== 'SIGNED_TERM').map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" asChild>
                        <label className="cursor-pointer"><Upload className="mr-2 h-4 w-4" />Anexar<input type="file" className="hidden" accept="application/pdf,image/*" onChange={event => uploadDocument(event.target.files?.[0] || null)} /></label>
                      </Button>
                    </div>
                  )}
                  <p className="mb-3 text-xs text-muted-foreground"><Image className="mr-1 inline h-3.5 w-3.5" />Fotografias são incluídas automaticamente no PDF. Use no nome do arquivo o patrimônio ou item fotografado.</p>
                  <div className="space-y-2">
                  {selected.documents.map(document => (
                    <button type="button" key={document.id} onClick={() => openStoredDocument(document.id)} className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left hover:bg-muted/40">
                      <span><span className="block text-sm font-medium">{document.fileName}</span><span className="text-xs text-muted-foreground">{DOCUMENT_LABELS[document.type]} · {formatDateTime(document.uploadedAt)}</span></span>
                      <FileDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                  </div>
                  {!selected.documents.length && <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>}
                </section>
                <section className="rounded-md border p-4">
                  <h3 className="mb-3 text-sm font-semibold">Historico</h3>
                  <div className="space-y-2">
                    {selected.events.map(event => (
                      <p key={event.id} className="text-sm text-muted-foreground">{formatDateTime(event.createdAt)} - {event.description}</p>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border bg-card p-3">
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-1 text-sm font-medium">{value}</p>
  </div>
);

export default BaixasPatrimoniaisPage;
