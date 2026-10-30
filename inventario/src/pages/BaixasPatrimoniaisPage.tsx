import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2, ChevronLeft, ChevronRight, FileDown, FileText, ImagePlus,
  Paperclip, Plus, Search, Trash2, Upload, XCircle,
} from 'lucide-react';
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
import {
  inventoryApi, type ApiAssetDisposal, type ApiDisposalDocumentType,
  type ApiDisposalReason, type ApiDisposalStatus,
} from '@/lib/inventory-api';
import { toast } from 'sonner';
import { assetStatusLabel } from '@/lib/status-labels';

/* ------------------------------------------------------------------ rótulos */

const REASON_LABELS: Record<ApiDisposalReason, string> = {
  OBSOLESCENCE: 'Obsolescência',
  IRREPAIRABLE_DEFECT: 'Defeito sem reparo',
  PHYSICAL_DAMAGE: 'Dano físico',
  LOSS: 'Extravio',
  REPLACEMENT: 'Substituição',
  DONATION: 'Doação',
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
  WAITING_SIGNATURE: 'bg-[#FAF4E8] text-brass-ink border-brass/30',
  FINALIZED: 'bg-[#EAF3ED] text-success border-success/30',
  CANCELLED: 'bg-red-50 text-danger border-red-200',
};

const DOCUMENT_LABELS: Record<ApiDisposalDocumentType, string> = {
  SIGNED_TERM: 'Termo assinado',
  PHOTO: 'Fotografia',
  TECHNICAL_REPORT: 'Laudo técnico',
  DISPOSAL_RECEIPT: 'Comprovante de destinação',
  ORIGINAL_PROCESS: 'Processo original',
  OTHER: 'Outro documento',
};

/** Texto técnico sugerido por motivo — o T.I. só ajusta o que for específico. */
const REASON_TEXT: Record<ApiDisposalReason, string> = {
  OBSOLESCENCE: 'Equipamento obsoleto, sem utilização e sem adequação ao uso atual.',
  IRREPAIRABLE_DEFECT: 'Equipamento com defeito, sem funcionamento e sem viabilidade de reparo.',
  PHYSICAL_DAMAGE: 'Equipamento com dano material constatado, danificado e inservível.',
  LOSS: 'Bem não localizado no inventário físico; extravio registrado.',
  REPLACEMENT: 'Equipamento já substituído por outro em operação.',
  DONATION: 'Baixa vinculada à destinação por doação, conforme autorização interna.',
  DISCARD: 'Equipamento fora de uso, encaminhado para descarte responsável.',
  SALE: 'Baixa vinculada a venda autorizada, com comprovante anexado ao processo.',
  OTHER: '',
};

const DESTINATIONS = [
  'Descarte eletrônico (reciclagem de eletroeletrônicos)',
  'Doação autorizada',
  'Devolução ao fornecedor',
  'Sucata / resíduo comum',
];

const SIGNATORIES = ['Tabelião Substituto', 'Administradora do Cartório'];

/* -------------------------------------------------------------- rascunhos */

type MaterialDraft = {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  notes: string;
  containsSensitiveData: boolean;
};

type ItemDraft = {
  /** motivo específico do item; vazio usa o motivo do processo */
  reason: ApiDisposalReason | '';
  notes: string;
  photo: File | null;
};

const newMaterial = (): MaterialDraft => ({
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
  destination: DESTINATIONS[0],
  justification: '',
  notes: '',
  authorizedByName: SIGNATORIES[0],
  destinationText: '',
  authorizationDate: new Date().toISOString().slice(0, 10),
};

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '-');
const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString('pt-BR') : '-');

/* ------------------------------------------------------------------ página */

const BaixasPatrimoniaisPage = () => {
  const { assets, getStationForAsset, getEmployeeForStation, refreshAll } = useInventoryStore();
  const [disposals, setDisposals] = useState<ApiAssetDisposal[]>([]);
  const [openDisposalAssetIds, setOpenDisposalAssetIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<ApiAssetDisposal | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [itemDrafts, setItemDrafts] = useState<Record<string, ItemDraft>>({});
  const [materials, setMaterials] = useState<MaterialDraft[]>([]);
  const [assetSearch, setAssetSearch] = useState('');
  const [documentType, setDocumentType] = useState<ApiDisposalDocumentType>('PHOTO');
  const [cancelReason, setCancelReason] = useState('');
  const [loading, setLoading] = useState(false);
  const photoInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadDisposals = async () => {
    const [nextDisposals, reservedAssetIds] = await Promise.all([
      inventoryApi.listDisposals(),
      inventoryApi.listOpenDisposalAssetIds(),
    ]);
    setDisposals(nextDisposals);
    setOpenDisposalAssetIds(new Set(reservedAssetIds.map(String)));
  };

  useEffect(() => {
    void loadDisposals();
  }, []);

  const assetById = useMemo(() => new Map(assets.map(asset => [asset.id, asset])), [assets]);

  const availableAssets = useMemo(() => {
    const query = assetSearch.trim().toLowerCase();
    return assets
      .filter(asset => asset.status !== 'DISPOSED' && asset.status !== 'VOIDED')
      .filter(asset => !openDisposalAssetIds.has(asset.id))
      .filter(asset => !query
        || asset.assetCode.toLowerCase().includes(query)
        || asset.description.toLowerCase().includes(query)
        || asset.type.toLowerCase().includes(query)
        || (asset.manufacturer || '').toLowerCase().includes(query)
        || (asset.model || '').toLowerCase().includes(query)
        || (asset.serialNumber || '').toLowerCase().includes(query));
  }, [assets, assetSearch, openDisposalAssetIds]);

  /** Local e responsável vêm do inventário — o usuário não digita. */
  const placementOf = (assetId: string) => {
    const station = getStationForAsset(assetId);
    const employee = station ? getEmployeeForStation(station.id) : null;
    return { station: station?.code || '-', responsible: employee?.fullName || '-' };
  };

  const toggleAsset = (id: string) => {
    setSelectedAssets(current => (current.includes(id) ? current.filter(item => item !== id) : [...current, id]));
    setItemDrafts(current => (current[id] ? current : { ...current, [id]: { reason: '', notes: '', photo: null } }));
  };

  const updateDraft = (id: string, patch: Partial<ItemDraft>) =>
    setItemDrafts(current => ({ ...current, [id]: { ...current[id], ...patch } }));

  const updateMaterial = (id: string, patch: Partial<MaterialDraft>) =>
    setMaterials(current => current.map(material => (material.id === id ? { ...material, ...patch } : material)));

  const openNew = () => {
    setForm(emptyForm);
    setSelectedAssets([]);
    setItemDrafts({});
    setMaterials([]);
    setAssetSearch('');
    setStep(1);
    setFormOpen(true);
  };

  const missingPhotos = useMemo(
    () => selectedAssets.filter(id => !itemDrafts[id]?.photo).length,
    [selectedAssets, itemDrafts],
  );

  /** Justificativa do processo + linha por item (vira o texto do termo). */
  const buildJustification = () => {
    const lines = selectedAssets.map(id => {
      const asset = assetById.get(id);
      const draft = itemDrafts[id];
      const reason = (draft?.reason || form.reason) as ApiDisposalReason;
      const text = draft?.notes?.trim() || REASON_TEXT[reason];
      return `${asset?.assetCode || '-'} — ${asset?.description || ''}: ${REASON_LABELS[reason]}. ${text}`.trim();
    });
    return [form.justification.trim(), ...lines].filter(Boolean).join('\n');
  };

  const createDisposal = async () => {
    if (!form.justification.trim() || !form.destination.trim() || !form.authorizedByName.trim()) {
      toast.error('Preencha justificativa, destinação e autorizador');
      return;
    }
    if (!selectedAssets.length && !materials.length) {
      toast.error('Inclua ao menos um patrimônio ou material sem patrimônio');
      return;
    }
    if (materials.some(m => !m.category.trim() || !m.description.trim() || m.quantity < 1 || !m.unit.trim())) {
      toast.error('Complete categoria, descrição, quantidade e unidade dos materiais');
      return;
    }
    setLoading(true);
    try {
      const created = await inventoryApi.createDisposal({
        assetIds: selectedAssets.map(Number),
        itemAssessments: selectedAssets.map(id => {
          const draft = itemDrafts[id];
          const reason = (draft?.reason || form.reason) as ApiDisposalReason;
          return {
            assetId: Number(id),
            reason,
            physicalCondition: REASON_LABELS[reason],
            evaluationDescription: draft?.notes?.trim() || REASON_TEXT[reason],
            technicalNotes: undefined,
            requiresDataSanitization: false,
            dataSanitizationCompleted: false,
          };
        }),
        materials: materials.map(({ category, description, quantity, unit, notes, containsSensitiveData }) => ({
          category, description, quantity, unit, notes, containsSensitiveData,
        })),
        reason: form.reason,
        destination: form.destination,
        justification: buildJustification(),
        notes: [form.notes.trim(), form.destinationText.trim() ? 'Destinação (texto do termo): ' + form.destinationText.trim() : ''].filter(Boolean).join('\n'),
        authorizedByName: form.authorizedByName,
        authorizationDate: form.authorizationDate,
        requestedBy: getCurrentUsername() || undefined,
      });

      // fotos por item: nome do arquivo carrega o patrimônio, que o termo usa para posicionar a imagem
      const withPhoto = selectedAssets.filter(id => itemDrafts[id]?.photo);
      for (const id of withPhoto) {
        const file = itemDrafts[id]!.photo!;
        const code = assetById.get(id)?.assetCode || id;
        const extension = file.name.split('.').pop() || 'jpg';
        const renamed = new File([file], `patrimonio-${code}.${extension}`, { type: file.type });
        const disposalItem = created.items.find(item => item.assetId === Number(id));
        await inventoryApi.uploadDisposalDocument(
          String(created.id),
          'PHOTO',
          renamed,
          getCurrentUsername() || undefined,
          disposalItem?.id,
        );
      }

      toast.success(`Baixa ${created.number} criada${withPhoto.length ? ` · ${withPhoto.length} foto(s) anexada(s)` : ''}`);
      setFormOpen(false);
      await refreshDetail(created.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar baixa');
    } finally {
      setLoading(false);
    }
  };

  const refreshDetail = async (id: number) => {
    setSelected(await inventoryApi.getDisposal(String(id)));
    await loadDisposals();
  };

  const openPdfDocument = async (documentUrl: string) => {
    const auth = getStoredAuth();
    const response = await fetch(documentUrl, { headers: auth?.token ? { Authorization: auth.token } : undefined });
    if (!response.ok) {
      toast.error('Não foi possível abrir o documento');
      return;
    }
    window.open(URL.createObjectURL(await response.blob()), '_blank');
  };

  const openTerm = (id: number) => openPdfDocument(inventoryApi.disposalTermUrl(String(id)));
  const openSignatureSheet = (id: number) => openPdfDocument(inventoryApi.disposalSignatureSheetUrl(String(id)));

  const generateTerm = async () => {
    if (!selected) return;
    const updated = await inventoryApi.generateDisposalTerm(String(selected.id), getCurrentUsername() || undefined);
    setSelected(updated);
    await loadDisposals();
    await openTerm(updated.id);
  };

  const uploadSigned = async (file: File | null) => {
    if (!selected || !file) return;
    try {
      setSelected(await inventoryApi.uploadSignedDisposalTerm(String(selected.id), file, getCurrentUsername() || undefined));
      await loadDisposals();
      toast.success('Termo assinado anexado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao anexar termo assinado');
    }
  };

  const uploadDocument = async (file: File | null) => {
    if (!selected || !file) return;
    try {
      setSelected(await inventoryApi.uploadDisposalDocument(String(selected.id), documentType, file, getCurrentUsername() || undefined));
      await loadDisposals();
      toast.success(`${DOCUMENT_LABELS[documentType]} anexado(a)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao anexar documento');
    }
  };

  const finalizeDisposal = async () => {
    if (!selected) return;
    try {
      setSelected(await inventoryApi.finalizeDisposal(String(selected.id), getCurrentUsername() || undefined));
      await refreshAll();
      await loadDisposals();
      toast.success('Baixa finalizada · patrimônios marcados como baixados');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao finalizar baixa');
    }
  };

  const cancelDisposal = async () => {
    if (!selected || !cancelReason.trim()) {
      toast.error('Informe o motivo do cancelamento');
      return;
    }
    setSelected(await inventoryApi.cancelDisposal(String(selected.id), { reason: cancelReason, username: getCurrentUsername() || undefined }));
    setCancelReason('');
    await loadDisposals();
    toast.success('Baixa cancelada');
  };

  const [showLog, setShowLog] = useState(false);

  const systemLog = (disposal: ApiAssetDisposal) => [
    ['Processo no sistema', `Baixa ${disposal.number} · Sistema de Inventário Patrimonial`],
    ['Abertura e conferência', `${disposal.requestedBy || 'T.I.'} · ${formatDateTime(disposal.createdAt)}`],
    ['Snapshot dos bens', 'Responsável, estação e departamento registrados na abertura da baixa'],
    ['Termo gerado', disposal.termGeneratedAt ? formatDateTime(disposal.termGeneratedAt) : 'pendente'],
    ['Termo assinado anexado', disposal.signedDocumentUploadedAt ? formatDateTime(disposal.signedDocumentUploadedAt) : 'pendente'],
    ['Efeito da finalização', disposal.finalizedAt
      ? `Status alterado para Baixado, movimentação de saída registrada e termo vinculado a cada bem · ${formatDateTime(disposal.finalizedAt)}`
      : 'Ao finalizar: status Baixado, movimentação de saída e termo vinculado a cada bem'],
  ];

  const hasSignedTerm = !!selected?.documents.some(document => document.type === 'SIGNED_TERM');
  const isLargeBatch = (disposal: ApiAssetDisposal) => disposal.itemCount > 10;

  const stages = (disposal: ApiAssetDisposal) => [
    { label: 'Aberta pelo T.I.', when: formatDateTime(disposal.createdAt), done: true },
    { label: 'Itens e fotos anexados', when: `${disposal.assetCount} patrimônio(s) · ${disposal.materialCount} material(is)`, done: true },
    { label: 'Termo gerado', when: disposal.termGeneratedAt ? formatDateTime(disposal.termGeneratedAt) : 'pendente', done: !!disposal.termGeneratedAt },
    { label: 'Termo assinado anexado', when: disposal.signedDocumentUploadedAt ? formatDateTime(disposal.signedDocumentUploadedAt) : 'pendente', done: !!disposal.signedDocumentUploadedAt },
    { label: 'Baixa finalizada', when: disposal.finalizedAt ? formatDateTime(disposal.finalizedAt) : 'pendente', done: !!disposal.finalizedAt },
  ];

  /* ------------------------------------------------------------- render */

  return (
    <AppShell
      active="baixas"
      actions={<Button size="sm" onClick={openNew} className="h-[38px]"><Plus className="mr-1.5 h-3.5 w-3.5" />Nova baixa</Button>}
    >
      <div className="flex-1 space-y-5 overflow-auto px-4 py-6 md:px-7">
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-[34px] font-semibold leading-none text-primary">Baixas patrimoniais</h2>
          <p className="text-sm text-muted-foreground">
            {disposals.length} processos · numeração, datas, responsável e local preenchidos pelo sistema
          </p>
        </div>

        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Composição</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead>Autorizador</TableHead>
                <TableHead className="w-[120px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disposals.map(disposal => (
                <TableRow key={disposal.id} className="cursor-pointer" onClick={() => refreshDetail(disposal.id)}>
                  <TableCell className="num-mono text-xs">{disposal.number}</TableCell>
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

      {/* ------------------------------------------------ wizard: nova baixa */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova baixa patrimonial</DialogTitle>
            <DialogDescription>
              Número, datas, local e responsável são preenchidos pelo sistema. Você seleciona os itens e descreve o motivo.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            {['Selecionar itens', 'Detalhar e fotografar', 'Revisar e gerar termo'].map((label, index) => {
              const number = index + 1;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setStep(number)}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-[13.5px] font-semibold transition-colors ${
                    step === number ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-ink-2 hover:bg-muted/50'
                  }`}
                >
                  <span className="num-mono text-[11px] opacity-70">{`0${number}`}</span>
                  {label}
                </button>
              );
            })}
          </div>

          {step === 1 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Label>{selectedAssets.length} patrimônio(s) selecionado(s)</Label>
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" value={assetSearch} onChange={event => setAssetSearch(event.target.value)} placeholder="Buscar patrimônio..." />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Bens já baixados ou em outra baixa aberta não aparecem na lista.</p>
              <div className="max-h-72 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Código</TableHead>
                      <TableHead>Equipamento</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Local (auto)</TableHead>
                      <TableHead>Responsável (auto)</TableHead>
                      <TableHead>Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableAssets.map(asset => {
                      const { station, responsible } = placementOf(asset.id);
                      return (
                        <TableRow key={asset.id} className="cursor-pointer" onClick={() => toggleAsset(asset.id)}>
                          <TableCell><Checkbox checked={selectedAssets.includes(asset.id)} /></TableCell>
                          <TableCell className="num-mono text-xs">{asset.assetCode}</TableCell>
                          <TableCell>{asset.description}</TableCell>
                          <TableCell>{asset.type}</TableCell>
                          <TableCell className="text-muted-foreground">{station}</TableCell>
                          <TableCell className="text-muted-foreground">{responsible}</TableCell>
                          <TableCell>{assetStatusLabel(asset.status)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <section className="space-y-3 rounded-lg border border-dashed border-champagne bg-muted/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Label>Materiais sem patrimônio</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Cabos, mídias, fontes e acessórios entram no processo sem número patrimonial fictício.
                    </p>
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
                      <div className="space-y-1 md:col-span-3"><Label className="text-xs">Categoria</Label><Input value={material.category} onChange={event => updateMaterial(material.id, { category: event.target.value })} /></div>
                      <div className="space-y-1 md:col-span-5"><Label className="text-xs">Descrição</Label><Input value={material.description} onChange={event => updateMaterial(material.id, { description: event.target.value })} placeholder="Ex.: fonte HP 0957-2231" /></div>
                      <div className="space-y-1 md:col-span-2"><Label className="text-xs">Quantidade</Label><Input type="number" min={1} value={material.quantity} onChange={event => updateMaterial(material.id, { quantity: Math.max(1, Number(event.target.value) || 1) })} /></div>
                      <div className="space-y-1 md:col-span-2"><Label className="text-xs">Unidade</Label><Input value={material.unit} onChange={event => updateMaterial(material.id, { unit: event.target.value })} /></div>
                      <div className="space-y-1 md:col-span-9"><Label className="text-xs">Observações e cautelas</Label><Input value={material.notes} onChange={event => updateMaterial(material.id, { notes: event.target.value })} placeholder="Estado, motivo, forma de descarte..." /></div>
                      <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs md:col-span-3 md:self-end">
                        <Checkbox checked={material.containsSensitiveData} onCheckedChange={checked => updateMaterial(material.id, { containsSensitiveData: checked === true })} />
                        Possui dados, mídia ou credencial
                      </label>
                    </div>
                  </div>
                ))}
                {!materials.length && <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">Nenhum material sem patrimônio incluído.</p>}
              </section>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Um bloco por item. A descrição já vem sugerida pelo motivo; a foto anexada aqui entra na página do item no termo.
              </p>
              {!selectedAssets.length && <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Selecione os patrimônios no passo 01.</p>}
              {selectedAssets.map((id, index) => {
                const asset = assetById.get(id);
                const draft = itemDrafts[id] || { reason: '', notes: '', photo: null };
                const { station, responsible } = placementOf(id);
                const reason = (draft.reason || form.reason) as ApiDisposalReason;
                return (
                  <div key={id} className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-[150px_1fr]">
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => photoInputs.current[id]?.click()}
                        className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1.5 rounded-md border border-input bg-paper-2 text-brass-ink hover:bg-muted"
                      >
                        {draft.photo ? (
                          <img src={URL.createObjectURL(draft.photo)} alt="" className="h-full w-full rounded-md object-cover" />
                        ) : (
                          <>
                            <ImagePlus className="h-5 w-5" />
                            <span className="num-mono text-[10.5px]">anexar foto</span>
                          </>
                        )}
                      </button>
                      <input
                        ref={element => { photoInputs.current[id] = element; }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={event => updateDraft(id, { photo: event.target.files?.[0] || null })}
                      />
                      <span className="num-mono block text-[10.5px] text-muted-foreground">{`ITEM ${String(index + 1).padStart(2, '0')}`}</span>
                    </div>
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-baseline gap-2.5">
                        <span className="font-serif text-[21px] font-semibold text-primary">{asset?.description || '—'}</span>
                        <span className="num-mono text-[11.5px] text-brass-ink">Patrim. {asset?.assetCode || '—'}</span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-1">
                          <Label className="label-mono">Motivo do item</Label>
                          <Select value={draft.reason || form.reason} onValueChange={value => updateDraft(id, { reason: value as ApiDisposalReason })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{Object.entries(REASON_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="label-mono">Local na abertura</Label>
                          <Input value={station} readOnly className="bg-paper-2 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          <Label className="label-mono">Responsável na abertura</Label>
                          <Input value={responsible} readOnly className="bg-paper-2 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="label-mono">Descrição no termo</Label>
                        <Textarea
                          rows={2}
                          value={draft.notes}
                          placeholder={REASON_TEXT[reason]}
                          onChange={event => updateDraft(id, { notes: event.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4 rounded-lg border bg-card p-4">
                <div className="space-y-2">
                  <Label>Motivo predominante</Label>
                  <Select value={form.reason} onValueChange={value => setForm(current => ({ ...current, reason: value as ApiDisposalReason }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(REASON_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Destinação</Label>
                  <Input
                    list="destinos-baixa"
                    value={form.destination}
                    onChange={event => setForm(current => ({ ...current, destination: event.target.value }))}
                    placeholder="Empresa, ponto de coleta, órgão receptor..."
                  />
                  <datalist id="destinos-baixa">{DESTINATIONS.map(value => <option key={value} value={value} />)}</datalist>
                  <Textarea
                    rows={3}
                    value={form.destinationText}
                    onChange={event => setForm(current => ({ ...current, destinationText: event.target.value }))}
                    placeholder="Texto da seção 3 do termo. Em branco, o sistema escreve o parágrafo padrão de descarte eletrônico (Lei 12.305/2010)."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Assina com o T.I.</Label>
                  <Select value={form.authorizedByName} onValueChange={value => setForm(current => ({ ...current, authorizedByName: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SIGNATORIES.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Justificativa do processo</Label>
                  <Textarea rows={3} value={form.justification} onChange={event => setForm(current => ({ ...current, justification: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Observações internas</Label>
                  <Textarea rows={2} value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} />
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
                <span className="label-mono">Conferência automática</span>
                {[
                  { ok: true, text: 'Responsável e local de cada bem capturados do inventário na abertura.' },
                  { ok: true, text: `${selectedAssets.length} patrimônio(s) e ${materials.length} material(is) sem etiqueta neste processo.` },
                  { ok: missingPhotos === 0, text: missingPhotos === 0 ? 'Todos os itens com foto anexada.' : `${missingPhotos} item(ns) ainda sem foto anexada.` },
                  { ok: true, text: `Termo com assinatura do T.I. e de ${form.authorizedByName}.` },
                ].map(check => (
                  <div key={check.text} className="flex items-baseline gap-2.5">
                    <span className={`num-mono text-sm font-semibold ${check.ok ? 'text-success' : 'text-warning'}`}>{check.ok ? '✓' : '!'}</span>
                    <span className="text-sm text-ink-2">{check.text}</span>
                  </div>
                ))}
                <p className="mt-auto text-xs text-muted-foreground">
                  Ao gerar, o sistema cria o número da baixa, marca os bens como “em baixa aberta” e monta o PDF paginado.
                  O status só muda para Baixado quando o termo assinado for anexado e a baixa finalizada.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <div className="flex gap-2">
              {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)}><ChevronLeft className="mr-1.5 h-4 w-4" />Voltar</Button>}
              {step < 3 && (
                <Button onClick={() => setStep(step + 1)} disabled={step === 1 && !selectedAssets.length && !materials.length}>
                  Continuar<ChevronRight className="ml-1.5 h-4 w-4" />
                </Button>
              )}
              {step === 3 && <Button onClick={createDisposal} disabled={loading}>Criar baixa e gerar termo</Button>}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------- detalhe do processo */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2.5">
                  {selected.number}
                  <Badge variant="outline" className={STATUS_CLASS[selected.status]}>{STATUS_LABELS[selected.status]}</Badge>
                </DialogTitle>
                <DialogDescription>
                  {REASON_LABELS[selected.reason]} · {selected.assetCount} patrimônio(s) · {selected.materialCount} material(is) · {selected.destination}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-2.5 md:grid-cols-5">
                {stages(selected).map((stage, index) => (
                  <div key={stage.label} className={`flex flex-col gap-1 rounded-xl px-3.5 py-3 ${stage.done ? 'bg-primary text-primary-foreground' : 'border border-dashed border-input text-muted-foreground'}`}>
                    <span className="num-mono text-[10px] uppercase tracking-[0.1em] opacity-75">{`0${index + 1}`}</span>
                    <span className="text-[13.5px] font-semibold leading-tight">{stage.label}</span>
                    <span className="text-[11.5px] opacity-75">{stage.when}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {selected.status === 'DRAFT' && <Button onClick={generateTerm}><FileDown className="mr-2 h-4 w-4" />Gerar termo PDF</Button>}
                {selected.termGeneratedAt && <Button variant="outline" onClick={() => openTerm(selected.id)}><FileText className="mr-2 h-4 w-4" />Abrir termo completo</Button>}
                {selected.termGeneratedAt && isLargeBatch(selected) && <Button variant="outline" onClick={() => openSignatureSheet(selected.id)}><FileDown className="mr-2 h-4 w-4" />Folha de assinatura</Button>}
                {selected.status === 'WAITING_SIGNATURE' && (
                  <Button variant="outline" asChild>
                    <label className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />Anexar termo assinado
                      <input type="file" className="hidden" accept="application/pdf,image/*" onChange={event => uploadSigned(event.target.files?.[0] || null)} />
                    </label>
                  </Button>
                )}
                {selected.status === 'WAITING_SIGNATURE' && (
                  <Button disabled={!hasSignedTerm} onClick={finalizeDisposal} className="bg-success text-success-foreground hover:bg-success/90">
                    <CheckCircle2 className="mr-2 h-4 w-4" />Finalizar baixa
                  </Button>
                )}
              </div>
              {selected.status === 'WAITING_SIGNATURE' && !hasSignedTerm && (
                <p className="text-xs text-warning">Finalizar só fica disponível depois que o termo assinado for anexado ao processo.</p>
              )}

              <div className="rounded-md border bg-paper-2 p-4">
                <button type="button" onClick={() => setShowLog(value => !value)} className="flex w-full items-center justify-between text-left">
                  <span className="text-sm font-medium">O que o sistema registrou neste processo</span>
                  <span className="num-mono text-xs text-brass-ink">{showLog ? 'ocultar' : 'ver log'}</span>
                </button>
                {showLog && (
                  <dl className="mt-3 grid gap-1.5">
                    {systemLog(selected).map(([key, value]) => (
                      <div key={key} className="grid gap-1 border-b border-border/60 pb-1.5 sm:grid-cols-[180px_1fr]">
                        <dt className="label-mono">{key}</dt>
                        <dd className="m-0 text-[13px] text-ink-2">{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>

              <div className="rounded-md border p-4">
                <p className="text-sm font-medium">Justificativa</p>
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{selected.justification}</p>
                {selected.notes && <p className="mt-2 text-sm text-muted-foreground">Observações: {selected.notes}</p>}
              </div>

              <section className="overflow-hidden rounded-md border">
                <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
                  <h3 className="text-sm font-semibold">Patrimônios incluídos ({selected.assetCount})</h3>
                  <span className="num-mono text-[11px] text-brass-ink">snapshot de {formatDateTime(selected.createdAt)}</span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Série</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead>Responsável</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selected.items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="num-mono text-xs">{item.assetCode}</TableCell>
                        <TableCell>{item.description}</TableCell>
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
                <section className="overflow-hidden rounded-md border">
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
                          <TableCell>{material.containsSensitiveData ? <Badge variant="outline" className="border-brass/30 bg-[#FAF4E8] text-brass-ink">Exige cautela</Badge> : 'Não identificado'}</TableCell>
                          <TableCell>{material.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </section>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <section className="rounded-md border p-4">
                  <div className="mb-3 flex items-center gap-2"><Paperclip className="h-4 w-4" /><h3 className="text-sm font-semibold">Documentos do processo</h3></div>
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
                  <p className="mb-3 text-xs text-muted-foreground">Fotos entram no termo pelo nome do arquivo (patrimonio-0853.jpg).</p>
                  <div className="space-y-2">
                    {selected.documents.map(document => (
                      <button
                        type="button"
                        key={document.id}
                        onClick={() => openPdfDocument(inventoryApi.disposalDocumentUrl(String(selected.id), String(document.id)))}
                        className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left hover:bg-muted/40"
                      >
                        <span>
                          <span className="block text-sm font-medium">{document.fileName}</span>
                          <span className="text-xs text-muted-foreground">{DOCUMENT_LABELS[document.type]} · {formatDateTime(document.uploadedAt)}</span>
                        </span>
                        <FileDown className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                    {!selected.documents.length && <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>}
                  </div>
                </section>

                <section className="rounded-md border p-4">
                  <h3 className="mb-3 text-sm font-semibold">Histórico</h3>
                  <div className="space-y-2.5">
                    {selected.events.map(event => (
                      <div key={event.id} className="flex gap-2.5">
                        <span className="mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full bg-primary" />
                        <div className="flex flex-col">
                          <span className="text-[12.8px] leading-snug">{event.description}</span>
                          <span className="num-mono text-[10.5px] text-muted-foreground">{formatDateTime(event.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {selected.status !== 'FINALIZED' && selected.status !== 'CANCELLED' && (
                <div className="flex gap-2 rounded-md border border-red-100 bg-red-50 p-3">
                  <Input value={cancelReason} onChange={event => setCancelReason(event.target.value)} placeholder="Motivo do cancelamento" />
                  <Button variant="destructive" onClick={cancelDisposal}><XCircle className="mr-2 h-4 w-4" />Cancelar baixa</Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default BaixasPatrimoniaisPage;
