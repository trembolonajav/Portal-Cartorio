import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, FileDown, Upload, Search, CheckCircle2, PenLine, ExternalLink, XCircle, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import AppShell from '@/components/layout/AppShell';
import GerarTermoTrocaModal from '@/components/arquivo/GerarTermoTrocaModal';
import { getCurrentUsername, getStoredAuth } from '@/lib/auth';
import { useInventoryStore } from '@/features/inventory-map/store/useInventoryStore';
import {
  inventoryApi,
  type ApiAssetDisposal,
  type ApiDisposalStatus,
  type ApiResponsibilityTerm,
  type ApiResponsibilityTermStatus,
  type ApiAssetRequest,
  type ApiAssetRequestStatus,
  type ApiAssetRequestType,
  type ApiAssetRequestPriority,
  type ApiEquipmentExchangeTerm,
  type ApiExchangeTermStatus,
} from '@/lib/inventory-api';
import { toast } from 'sonner';

type Tab = 'baixas' | 'responsabilidade' | 'troca' | 'solicitacoes';

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

const openPdf = async (url: string) => {
  const auth = getStoredAuth();
  try {
    const response = await fetch(url, { headers: auth?.token ? { Authorization: auth.token } : undefined });
    if (!response.ok) {
      toast.error('Não foi possível abrir o documento');
      return;
    }
    const blob = await response.blob();
    window.open(URL.createObjectURL(new Blob([blob], { type: 'application/pdf' })), '_blank');
  } catch {
    toast.error('Não foi possível abrir o documento');
  }
};

const KpiCard = ({ tone, value, title, sub }: { tone: string; value: number; title: string; sub: string }) => (
  <div className="flex items-center gap-3.5 rounded-xl border border-border bg-card p-4" style={{ boxShadow: `inset 3px 0 0 ${tone}` }}>
    <span className="num-mono text-[28px] font-medium leading-none" style={{ color: tone }}>{value.toLocaleString('pt-BR')}</span>
    <div className="flex flex-col gap-0.5">
      <strong className="text-[13px] text-ink">{title}</strong>
      <span className="text-[12px] text-muted-foreground">{sub}</span>
    </div>
  </div>
);

const TableCard = ({ empty, children }: { empty: boolean; children: React.ReactNode }) => (
  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
    {empty ? (
      <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
        <FileText className="mb-3 h-10 w-10 opacity-40" />
        <p className="text-sm font-medium">Nenhum registro neste arquivo</p>
      </div>
    ) : (
      <div className="flex-1 overflow-auto">{children}</div>
    )}
  </div>
);

const th = 'text-[12px] uppercase tracking-[0.05em] text-muted-foreground';

// ============================ Baixas ============================
const DISPOSAL_STATUS_LABELS: Record<ApiDisposalStatus, string> = {
  DRAFT: 'Rascunho', WAITING_SIGNATURE: 'Aguardando assinatura', FINALIZED: 'Finalizada', CANCELLED: 'Cancelada',
};
const DISPOSAL_STATUS_BADGE: Record<ApiDisposalStatus, string> = {
  DRAFT: 'border-border bg-muted text-muted-foreground',
  WAITING_SIGNATURE: 'border-brass/30 bg-brass/10 text-brass',
  FINALIZED: 'border-success/30 bg-success/10 text-success',
  CANCELLED: 'border-danger/30 bg-danger/10 text-danger',
};

const BaixasView = () => {
  const [rows, setRows] = useState<ApiAssetDisposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const uploadFor = useRef<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    try { setRows(await inventoryApi.listDisposals()); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Falha ao carregar baixas'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const kpis = useMemo(() => ({
    pending: rows.filter(d => d.termGeneratedAt && !d.signedDocumentUploadedAt && d.status !== 'CANCELLED').length,
    awaiting: rows.filter(d => d.status === 'WAITING_SIGNATURE' && d.signedDocumentUploadedAt).length,
    finalized: rows.filter(d => d.status === 'FINALIZED').length,
    docs: rows.filter(d => d.signedDocumentUploadedAt).length,
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(d => !q || [d.number, d.destination].some(v => v?.toLowerCase().includes(q)));
  }, [rows, search]);

  const run = async (id: number, action: () => Promise<unknown>, ok: string) => {
    setBusyId(id);
    try { await action(); toast.success(ok); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Ação falhou'); }
    finally { setBusyId(null); }
  };

  const onFilePicked = async (file: File | null) => {
    const id = uploadFor.current; uploadFor.current = null;
    if (fileInput.current) fileInput.current.value = '';
    if (!id || !file) return;
    await run(id, () => inventoryApi.uploadSignedDisposalTerm(String(id), file, getCurrentUsername() || undefined), 'Documento assinado enviado');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <input ref={fileInput} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)} />
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard tone="#A87413" value={kpis.pending} title="Termos pendentes de assinatura" sub="gerados e sem PDF assinado" />
        <KpiCard tone="#2E5AAC" value={kpis.awaiting} title="Assinados aguardando finalização" sub="PDF no arquivo, baixa a confirmar" />
        <KpiCard tone="#2F7A54" value={kpis.finalized} title="Baixas finalizadas" sub="processos concluídos" />
        <KpiCard tone="#6B7480" value={kpis.docs} title="Documentos no arquivo" sub="termos e comprovantes" />
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex h-[34px] w-full max-w-[320px] items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground/70" />
          <Input placeholder="Buscar por nº ou destino" value={search} onChange={(e) => setSearch(e.target.value)} className="h-[34px] bg-card pl-9 text-[13px]" />
        </div>
        <span className="ml-auto text-[13px] text-muted-foreground">{filtered.length} registro(s)</span>
      </div>
      <TableCard empty={!loading && filtered.length === 0}>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-paper-2 hover:bg-paper-2">
              <TableHead className={cn('w-[130px]', th)}>Nº termo</TableHead>
              <TableHead className={th}>Baixa</TableHead>
              <TableHead className={cn('w-[210px]', th)}>Documento</TableHead>
              <TableHead className={cn('w-[140px]', th)}>Situação</TableHead>
              <TableHead className={cn('w-[290px]', th)}>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(d => {
              const state = d.signedDocumentUploadedAt ? 'signed' : d.termGeneratedAt ? 'pending' : 'none';
              const busy = busyId === d.id;
              return (
                <TableRow key={d.id} className="border-b border-border/60">
                  <TableCell className="num-mono text-[13px] text-primary">{d.number}</TableCell>
                  <TableCell className="text-[13px] text-ink">{d.itemCount} {d.itemCount === 1 ? 'item' : 'itens'} · <span className="text-muted-foreground">{d.destination}</span></TableCell>
                  <TableCell className="text-[13px]">
                    {state === 'signed' ? <span className="flex items-center gap-2 text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" />Assinado · {formatDate(d.signedDocumentUploadedAt)}</span>
                      : state === 'pending' ? <span className="flex items-center gap-2 text-brass"><span className="h-1.5 w-1.5 rounded-full bg-brass" />Pendente · {formatDate(d.termGeneratedAt)}</span>
                      : <span className="flex items-center gap-2 italic text-muted-foreground">Termo não gerado</span>}
                  </TableCell>
                  <TableCell><Badge variant="outline" className={DISPOSAL_STATUS_BADGE[d.status]}>{DISPOSAL_STATUS_LABELS[d.status]}</Badge></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {d.status === 'DRAFT' && <Button size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => run(d.id, () => inventoryApi.generateDisposalTerm(String(d.id), getCurrentUsername() || undefined), 'Termo gerado')}><PenLine className="mr-1.5 h-3.5 w-3.5" />Gerar termo</Button>}
                      {state !== 'none' && <Button size="sm" variant="outline" className="h-8" onClick={() => openPdf(inventoryApi.disposalTermUrl(String(d.id)))}><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Ver termo</Button>}
                      {d.status === 'WAITING_SIGNATURE' && <Button size="sm" variant="outline" className="h-8" onClick={() => openPdf(inventoryApi.disposalSignatureSheetUrl(String(d.id)))}><FileDown className="mr-1.5 h-3.5 w-3.5" />Folha</Button>}
                      {d.status === 'WAITING_SIGNATURE' && <Button size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => { uploadFor.current = d.id; fileInput.current?.click(); }}><Upload className="mr-1.5 h-3.5 w-3.5" />Subir assinado</Button>}
                      {d.status === 'WAITING_SIGNATURE' && d.signedDocumentUploadedAt && <Button size="sm" className="h-8 bg-success text-success-foreground hover:bg-success/90" disabled={busy} onClick={() => run(d.id, () => inventoryApi.finalizeDisposal(String(d.id), getCurrentUsername() || undefined), 'Baixa finalizada')}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Finalizar</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableCard>
    </div>
  );
};

// ============================ Termos de responsabilidade ============================
const RT_STATUS_LABELS: Record<ApiResponsibilityTermStatus, string> = {
  DRAFT: 'Rascunho', WAITING_SIGNATURE: 'Aguardando assinatura', ACTIVE: 'Ativo', RETURNED: 'Devolvido', CANCELLED: 'Cancelado',
};
const RT_STATUS_BADGE: Record<ApiResponsibilityTermStatus, string> = {
  DRAFT: 'border-border bg-muted text-muted-foreground',
  WAITING_SIGNATURE: 'border-brass/30 bg-brass/10 text-brass',
  ACTIVE: 'border-success/30 bg-success/10 text-success',
  RETURNED: 'border-info/30 bg-info/10 text-info',
  CANCELLED: 'border-danger/30 bg-danger/10 text-danger',
};

const ResponsabilidadeView = () => {
  const assets = useInventoryStore(s => s.assets);
  const employees = useInventoryStore(s => s.employees);
  const [rows, setRows] = useState<ApiResponsibilityTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formEmployee, setFormEmployee] = useState('');
  const [formAssets, setFormAssets] = useState<Set<string>>(new Set());
  const [assetQuery, setAssetQuery] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const uploadFor = useRef<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    try { setRows(await inventoryApi.listResponsibilityTerms()); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Falha ao carregar termos'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const kpis = useMemo(() => ({
    pending: rows.filter(t => t.status === 'WAITING_SIGNATURE' && !t.signedDocumentUploadedAt).length,
    active: rows.filter(t => t.status === 'ACTIVE').length,
    docs: rows.filter(t => t.signedDocumentUploadedAt).length,
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(t => !q || [t.number, t.employeeName, t.department].some(v => v?.toLowerCase().includes(q)));
  }, [rows, search]);

  const run = async (id: number, action: () => Promise<unknown>, ok: string) => {
    setBusyId(id);
    try { await action(); toast.success(ok); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Ação falhou'); }
    finally { setBusyId(null); }
  };

  const onFilePicked = async (file: File | null) => {
    const id = uploadFor.current; uploadFor.current = null;
    if (fileInput.current) fileInput.current.value = '';
    if (!id || !file) return;
    await run(id, () => inventoryApi.uploadSignedResponsibilityTerm(String(id), file, getCurrentUsername() || undefined), 'Documento assinado enviado');
  };

  const selectableAssets = useMemo(() => {
    const q = assetQuery.trim().toLowerCase();
    return assets
      .filter(a => a.status !== 'DISPOSED')
      .filter(a => !q || a.assetCode.toLowerCase().includes(q) || a.description.toLowerCase().includes(q))
      .slice(0, 100);
  }, [assets, assetQuery]);

  const submitCreate = async () => {
    if (!formEmployee) { toast.error('Selecione o responsável'); return; }
    if (formAssets.size === 0) { toast.error('Selecione ao menos um patrimônio'); return; }
    try {
      await inventoryApi.createResponsibilityTerm({
        employeeId: formEmployee,
        assetIds: Array.from(formAssets).map(Number),
        notes: formNotes || undefined,
      });
      toast.success('Termo de responsabilidade criado');
      setDialogOpen(false);
      setFormEmployee(''); setFormAssets(new Set()); setFormNotes(''); setAssetQuery('');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao criar termo');
    }
  };

  const toggleAsset = (id: string) => setFormAssets(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <input ref={fileInput} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)} />
      <div className="grid gap-3.5 sm:grid-cols-3">
        <KpiCard tone="#A87413" value={kpis.pending} title="Pendentes de assinatura" sub="termos gerados a assinar" />
        <KpiCard tone="#2F7A54" value={kpis.active} title="Termos ativos" sub="responsabilidades vigentes" />
        <KpiCard tone="#6B7480" value={kpis.docs} title="Documentos no arquivo" sub="termos assinados" />
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex h-[34px] w-full max-w-[320px] items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground/70" />
          <Input placeholder="Buscar por nº ou responsável" value={search} onChange={(e) => setSearch(e.target.value)} className="h-[34px] bg-card pl-9 text-[13px]" />
        </div>
        <Button size="sm" className="h-[34px]" onClick={() => setDialogOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />Novo termo</Button>
        <span className="ml-auto text-[13px] text-muted-foreground">{filtered.length} registro(s)</span>
      </div>
      <TableCard empty={!loading && filtered.length === 0}>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-paper-2 hover:bg-paper-2">
              <TableHead className={cn('w-[130px]', th)}>Nº termo</TableHead>
              <TableHead className={th}>Responsável</TableHead>
              <TableHead className={cn('w-[210px]', th)}>Documento</TableHead>
              <TableHead className={cn('w-[130px]', th)}>Situação</TableHead>
              <TableHead className={cn('w-[320px]', th)}>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(t => {
              const state = t.signedDocumentUploadedAt ? 'signed' : t.termGeneratedAt ? 'pending' : 'none';
              const busy = busyId === t.id;
              return (
                <TableRow key={t.id} className="border-b border-border/60">
                  <TableCell className="num-mono text-[13px] text-primary">{t.number}</TableCell>
                  <TableCell className="text-[13px] text-ink">
                    <div className="font-medium">{t.employeeName}</div>
                    <div className="text-[12px] text-muted-foreground">{[t.department, `${t.itemCount} ${t.itemCount === 1 ? 'bem' : 'bens'}`].filter(Boolean).join(' · ')}</div>
                  </TableCell>
                  <TableCell className="text-[13px]">
                    {state === 'signed' ? <span className="flex items-center gap-2 text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" />Assinado · {formatDate(t.signedDocumentUploadedAt)}</span>
                      : state === 'pending' ? <span className="flex items-center gap-2 text-brass"><span className="h-1.5 w-1.5 rounded-full bg-brass" />Pendente · {formatDate(t.termGeneratedAt)}</span>
                      : <span className="flex items-center gap-2 italic text-muted-foreground">Termo não gerado</span>}
                  </TableCell>
                  <TableCell><Badge variant="outline" className={RT_STATUS_BADGE[t.status]}>{RT_STATUS_LABELS[t.status]}</Badge></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {t.status === 'DRAFT' && <Button size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => run(t.id, () => inventoryApi.generateResponsibilityTerm(String(t.id), getCurrentUsername() || undefined), 'Termo gerado')}><PenLine className="mr-1.5 h-3.5 w-3.5" />Gerar termo</Button>}
                      {state !== 'none' && <Button size="sm" variant="outline" className="h-8" onClick={() => openPdf(inventoryApi.responsibilityTermUrl(String(t.id)))}><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Ver termo</Button>}
                      {t.status === 'WAITING_SIGNATURE' && <Button size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => { uploadFor.current = t.id; fileInput.current?.click(); }}><Upload className="mr-1.5 h-3.5 w-3.5" />Subir assinado</Button>}
                      {t.status === 'WAITING_SIGNATURE' && t.signedDocumentUploadedAt && <Button size="sm" className="h-8 bg-success text-success-foreground hover:bg-success/90" disabled={busy} onClick={() => run(t.id, () => inventoryApi.activateResponsibilityTerm(String(t.id), getCurrentUsername() || undefined), 'Termo ativado')}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Ativar</Button>}
                      {t.status === 'ACTIVE' && <Button size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => run(t.id, () => inventoryApi.returnResponsibilityTerm(String(t.id), getCurrentUsername() || undefined), 'Baixa do termo registrada')}><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Devolver</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo termo de responsabilidade</DialogTitle>
            <DialogDescription>Vincule os bens sob guarda de um responsável.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Responsável *</Label>
              <Select value={formEmployee} onValueChange={setFormEmployee}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione o funcionário" /></SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.status === 'ACTIVE').map(e => <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Patrimônios * <span className="text-muted-foreground">({formAssets.size} selecionado(s))</span></Label>
              <Input placeholder="Filtrar por código ou descrição" value={assetQuery} onChange={(e) => setAssetQuery(e.target.value)} className="h-9 text-sm" />
              <div className="max-h-56 overflow-auto rounded-lg border border-border">
                {selectableAssets.map(a => (
                  <label key={a.id} className="flex cursor-pointer items-center gap-2.5 border-b border-border/60 px-3 py-2 text-[13px] last:border-0 hover:bg-muted/50">
                    <Checkbox checked={formAssets.has(a.id)} onCheckedChange={() => toggleAsset(a.id)} />
                    <span className="num-mono text-primary">{a.assetCode}</span>
                    <span className="truncate text-ink">{a.description}</span>
                  </label>
                ))}
                {selectableAssets.length === 0 && <div className="px-3 py-4 text-center text-[13px] text-muted-foreground">Nenhum patrimônio encontrado</div>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observações</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="min-h-16 text-sm" placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={submitCreate}>Criar termo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============================ Solicitações ============================
const REQ_TYPE_LABELS: Record<ApiAssetRequestType, string> = {
  NEW_EQUIPMENT: 'Novo equipamento', REPAIR: 'Reparo', RELOCATION: 'Remanejamento', SUPPLY: 'Suprimento', OTHER: 'Outro',
};
const REQ_STATUS_LABELS: Record<ApiAssetRequestStatus, string> = {
  PENDING: 'Pendente', APPROVED: 'Aprovada', REJECTED: 'Rejeitada', CANCELLED: 'Cancelada',
};
const REQ_STATUS_BADGE: Record<ApiAssetRequestStatus, string> = {
  PENDING: 'border-brass/30 bg-brass/10 text-brass',
  APPROVED: 'border-success/30 bg-success/10 text-success',
  REJECTED: 'border-danger/30 bg-danger/10 text-danger',
  CANCELLED: 'border-border bg-muted text-muted-foreground',
};
const REQ_PRIORITY_BADGE: Record<ApiAssetRequestPriority, string> = {
  HIGH: 'border-danger/30 bg-danger/10 text-danger',
  MEDIUM: 'border-brass/30 bg-brass/10 text-brass',
  LOW: 'border-border bg-muted text-muted-foreground',
};
const REQ_PRIORITY_LABELS: Record<ApiAssetRequestPriority, string> = { HIGH: 'Alta', MEDIUM: 'Média', LOW: 'Baixa' };

const emptyReqForm = { type: 'NEW_EQUIPMENT' as ApiAssetRequestType, priority: 'MEDIUM' as ApiAssetRequestPriority, title: '', description: '', department: '' };

const SolicitacoesView = () => {
  const [rows, setRows] = useState<ApiAssetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyReqForm);

  const load = async () => {
    try { setRows(await inventoryApi.listAssetRequests()); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Falha ao carregar solicitações'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const kpis = useMemo(() => ({
    pending: rows.filter(r => r.status === 'PENDING').length,
    approved: rows.filter(r => r.status === 'APPROVED').length,
    rejected: rows.filter(r => r.status === 'REJECTED').length,
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => !q || [r.number, r.title, r.requestedBy].some(v => v?.toLowerCase().includes(q)));
  }, [rows, search]);

  const run = async (id: number, action: () => Promise<unknown>, ok: string) => {
    setBusyId(id);
    try { await action(); toast.success(ok); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Ação falhou'); }
    finally { setBusyId(null); }
  };

  const submitCreate = async () => {
    if (!form.title.trim() || !form.description.trim()) { toast.error('Preencha título e descrição'); return; }
    try {
      await inventoryApi.createAssetRequest({
        type: form.type, priority: form.priority, title: form.title.trim(), description: form.description.trim(),
        requestedBy: getCurrentUsername() || undefined, department: form.department || undefined,
      });
      toast.success('Solicitação registrada');
      setDialogOpen(false); setForm(emptyReqForm); await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao criar solicitação');
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid gap-3.5 sm:grid-cols-3">
        <KpiCard tone="#A87413" value={kpis.pending} title="Aguardando aprovação" sub="solicitações pendentes" />
        <KpiCard tone="#2F7A54" value={kpis.approved} title="Aprovadas" sub="deferidas" />
        <KpiCard tone="#B4342B" value={kpis.rejected} title="Rejeitadas" sub="indeferidas" />
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex h-[34px] w-full max-w-[320px] items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground/70" />
          <Input placeholder="Buscar por nº ou título" value={search} onChange={(e) => setSearch(e.target.value)} className="h-[34px] bg-card pl-9 text-[13px]" />
        </div>
        <Button size="sm" className="h-[34px]" onClick={() => setDialogOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />Nova solicitação</Button>
        <span className="ml-auto text-[13px] text-muted-foreground">{filtered.length} registro(s)</span>
      </div>
      <TableCard empty={!loading && filtered.length === 0}>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-paper-2 hover:bg-paper-2">
              <TableHead className={cn('w-[130px]', th)}>Nº</TableHead>
              <TableHead className={th}>Solicitação</TableHead>
              <TableHead className={cn('w-[110px]', th)}>Prioridade</TableHead>
              <TableHead className={cn('w-[120px]', th)}>Situação</TableHead>
              <TableHead className={cn('w-[200px]', th)}>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(r => {
              const busy = busyId === r.id;
              return (
                <TableRow key={r.id} className="border-b border-border/60">
                  <TableCell className="num-mono text-[13px] text-primary">{r.number}</TableCell>
                  <TableCell className="text-[13px] text-ink">
                    <div className="font-medium">{r.title}</div>
                    <div className="text-[12px] text-muted-foreground">{[REQ_TYPE_LABELS[r.type], r.department, r.requestedBy].filter(Boolean).join(' · ')}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className={REQ_PRIORITY_BADGE[r.priority]}>{REQ_PRIORITY_LABELS[r.priority]}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={REQ_STATUS_BADGE[r.status]}>{REQ_STATUS_LABELS[r.status]}</Badge></TableCell>
                  <TableCell>
                    {r.status === 'PENDING' ? (
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm" className="h-8 bg-success text-success-foreground hover:bg-success/90" disabled={busy} onClick={() => run(r.id, () => inventoryApi.approveAssetRequest(String(r.id), { username: getCurrentUsername() || undefined }), 'Solicitação aprovada')}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Aprovar</Button>
                        <Button size="sm" variant="outline" className="h-8 text-danger" disabled={busy} onClick={() => run(r.id, () => inventoryApi.rejectAssetRequest(String(r.id), { username: getCurrentUsername() || undefined }), 'Solicitação rejeitada')}><XCircle className="mr-1.5 h-3.5 w-3.5" />Rejeitar</Button>
                      </div>
                    ) : (
                      <span className="text-[12px] text-muted-foreground">{r.decidedBy ? `por ${r.decidedBy}` : '—'} · {formatDate(r.decidedAt)}</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova solicitação</DialogTitle>
            <DialogDescription>Registre um pedido para aprovação da administração.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v as ApiAssetRequestType }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(REQ_TYPE_LABELS) as ApiAssetRequestType[]).map(t => <SelectItem key={t} value={t}>{REQ_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm(f => ({ ...f, priority: v as ApiAssetRequestPriority }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(REQ_PRIORITY_LABELS) as ApiAssetRequestPriority[]).map(p => <SelectItem key={p} value={p}>{REQ_PRIORITY_LABELS[p]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Título *</Label>
              <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className="h-9 text-sm" placeholder="Ex.: Headset para atendimento" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Setor</Label>
              <Input value={form.department} onChange={(e) => setForm(f => ({ ...f, department: e.target.value }))} className="h-9 text-sm" placeholder="Opcional" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição *</Label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="min-h-20 text-sm" placeholder="Detalhe o pedido" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={submitCreate}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============================ Termos de troca ============================
const EX_STATUS_LABELS: Record<ApiExchangeTermStatus, string> = {
  DRAFT: 'Rascunho', WAITING_SIGNATURE: 'Aguardando assinatura', ACTIVE: 'Ativo', CANCELLED: 'Cancelado',
};
const EX_STATUS_BADGE: Record<ApiExchangeTermStatus, string> = {
  DRAFT: 'border-border bg-muted text-muted-foreground',
  WAITING_SIGNATURE: 'border-brass/30 bg-brass/10 text-brass',
  ACTIVE: 'border-success/30 bg-success/10 text-success',
  CANCELLED: 'border-danger/30 bg-danger/10 text-danger',
};

const TrocaView = () => {
  const [rows, setRows] = useState<ApiEquipmentExchangeTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const uploadFor = useRef<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    try { setRows(await inventoryApi.listExchangeTerms()); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Falha ao carregar termos de troca'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const kpis = useMemo(() => ({
    pending: rows.filter(t => t.status === 'WAITING_SIGNATURE' && !t.signedDocumentUploadedAt).length,
    active: rows.filter(t => t.status === 'ACTIVE').length,
    docs: rows.filter(t => t.signedDocumentUploadedAt).length,
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(t => !q || [t.number, t.retiredCode, t.deliveredCode, t.responsibleName].some(v => v?.toLowerCase().includes(q)));
  }, [rows, search]);

  const run = async (id: number, action: () => Promise<unknown>, ok: string) => {
    setBusyId(id);
    try { await action(); toast.success(ok); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Ação falhou'); }
    finally { setBusyId(null); }
  };

  const onFilePicked = async (file: File | null) => {
    const id = uploadFor.current; uploadFor.current = null;
    if (fileInput.current) fileInput.current.value = '';
    if (!id || !file) return;
    await run(id, () => inventoryApi.uploadSignedExchangeTerm(String(id), file, getCurrentUsername() || undefined), 'Documento assinado enviado');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <input ref={fileInput} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)} />
      <div className="grid gap-3.5 sm:grid-cols-3">
        <KpiCard tone="#A87413" value={kpis.pending} title="Pendentes de assinatura" sub="termos de troca a assinar" />
        <KpiCard tone="#2F7A54" value={kpis.active} title="Trocas ativas" sub="substituições vigentes" />
        <KpiCard tone="#6B7480" value={kpis.docs} title="Documentos no arquivo" sub="termos assinados" />
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex h-[34px] w-full max-w-[320px] items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground/70" />
          <Input placeholder="Buscar por nº ou patrimônio" value={search} onChange={(e) => setSearch(e.target.value)} className="h-[34px] bg-card pl-9 text-[13px]" />
        </div>
        <Button size="sm" className="h-[34px]" onClick={() => setModalOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />Gerar termo de troca</Button>
        <span className="ml-auto text-[13px] text-muted-foreground">{filtered.length} registro(s)</span>
      </div>
      <TableCard empty={!loading && filtered.length === 0}>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-paper-2 hover:bg-paper-2">
              <TableHead className={cn('w-[130px]', th)}>Nº termo</TableHead>
              <TableHead className={th}>Troca</TableHead>
              <TableHead className={cn('w-[210px]', th)}>Documento</TableHead>
              <TableHead className={cn('w-[130px]', th)}>Situação</TableHead>
              <TableHead className={cn('w-[280px]', th)}>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(t => {
              const state = t.signedDocumentUploadedAt ? 'signed' : t.termGeneratedAt ? 'pending' : 'none';
              const busy = busyId === t.id;
              return (
                <TableRow key={t.id} className="border-b border-border/60">
                  <TableCell className="num-mono text-[13px] text-primary">{t.number}</TableCell>
                  <TableCell className="text-[13px] text-ink">
                    <div className="flex items-center gap-1.5"><span className="num-mono text-primary">{t.retiredCode}</span><span className="text-muted-foreground">→</span><span className="num-mono text-primary">{t.deliveredCode}</span></div>
                    <div className="text-[12px] text-muted-foreground">{[t.reason, t.ticketRef ? `chamado ${t.ticketRef}` : null].filter(Boolean).join(' · ')}</div>
                  </TableCell>
                  <TableCell className="text-[13px]">
                    {state === 'signed' ? <span className="flex items-center gap-2 text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" />Assinado · {formatDate(t.signedDocumentUploadedAt)}</span>
                      : state === 'pending' ? <span className="flex items-center gap-2 text-brass"><span className="h-1.5 w-1.5 rounded-full bg-brass" />Pendente · {formatDate(t.termGeneratedAt)}</span>
                      : <span className="flex items-center gap-2 italic text-muted-foreground">Termo não gerado</span>}
                  </TableCell>
                  <TableCell><Badge variant="outline" className={EX_STATUS_BADGE[t.status]}>{EX_STATUS_LABELS[t.status]}</Badge></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {state !== 'none' && <Button size="sm" variant="outline" className="h-8" onClick={() => openPdf(inventoryApi.exchangeTermUrl(String(t.id)))}><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Ver termo</Button>}
                      {t.status === 'WAITING_SIGNATURE' && <Button size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => { uploadFor.current = t.id; fileInput.current?.click(); }}><Upload className="mr-1.5 h-3.5 w-3.5" />Subir assinado</Button>}
                      {t.status === 'WAITING_SIGNATURE' && t.signedDocumentUploadedAt && <Button size="sm" className="h-8 bg-success text-success-foreground hover:bg-success/90" disabled={busy} onClick={() => run(t.id, () => inventoryApi.activateExchangeTerm(String(t.id), getCurrentUsername() || undefined), 'Termo de troca ativado')}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Ativar</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableCard>

      <GerarTermoTrocaModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={load} />
    </div>
  );
};

// ============================ Página ============================
const TABS: { key: Tab; label: string }[] = [
  { key: 'baixas', label: 'Termos de baixa' },
  { key: 'responsabilidade', label: 'Termos de responsabilidade' },
  { key: 'troca', label: 'Termos de troca' },
  { key: 'solicitacoes', label: 'Solicitações' },
];

const ArquivoPage = () => {
  const [tab, setTab] = useState<Tab>('baixas');

  return (
    <AppShell active="arquivo">
      <div className="flex h-full flex-col gap-4 px-4 py-6 md:px-7">
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-[34px] font-semibold leading-none text-primary">Arquivo</h2>
          <p className="text-sm text-muted-foreground">Termos, documentos assinados e solicitações · acesso restrito à administração</p>
        </div>

        <div className="flex w-fit rounded-[9px] bg-secondary p-[3px] text-[13px]">
          {TABS.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'rounded-[7px] px-4 py-2 transition-colors',
                tab === t.key ? 'bg-card font-semibold text-primary shadow-sm' : 'text-muted-foreground hover:text-primary',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'baixas' && <BaixasView />}
        {tab === 'responsabilidade' && <ResponsabilidadeView />}
        {tab === 'troca' && <TrocaView />}
        {tab === 'solicitacoes' && <SolicitacoesView />}
      </div>
    </AppShell>
  );
};

export default ArquivoPage;
