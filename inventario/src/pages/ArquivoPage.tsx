import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, FileDown, Upload, Search, CheckCircle2, PenLine, ExternalLink, XCircle, Plus, RotateCcw, Eye, ArrowRight } from 'lucide-react';
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
  type ApiAssetDocument,
} from '@/lib/inventory-api';
import { toast } from 'sonner';

type Tab = 'documentos' | 'baixas' | 'responsabilidade' | 'troca' | 'solicitacoes';

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

type TermMockKind = 'responsibility' | 'exchange';

const TermMockPreview = ({ kind, open, onOpenChange }: { kind: TermMockKind; open: boolean; onOpenChange: (open: boolean) => void }) => {
  const responsibility = kind === 'responsibility';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto p-0 sm:max-w-5xl">
        <DialogHeader className="border-b border-border px-6 py-5 text-left">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <DialogTitle>{responsibility ? 'Modelo do termo de responsabilidade' : 'Modelo do termo de troca'}</DialogTitle>
              <DialogDescription className="mt-1">Prévia interna com dados fictícios. Nenhum registro será criado.</DialogDescription>
            </div>
            <Badge variant="outline" className="ml-auto border-brass/30 bg-brass/10 text-brass">MODELO</Badge>
          </div>
        </DialogHeader>

        <div className="bg-muted/50 p-4 sm:p-7">
          <article className="relative mx-auto min-h-[760px] max-w-[760px] overflow-hidden border border-border bg-white px-7 py-8 text-[#1d2733] shadow-[0_18px_50px_rgba(17,35,58,0.12)] sm:px-12">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
              <span className="-rotate-[32deg] whitespace-nowrap text-[44px] font-bold tracking-[0.08em] text-slate-900/[0.035]">MODELO · DADOS FICTÍCIOS</span>
            </div>

            <div className="relative">
              <div className="mb-8 flex items-start justify-between border-t-2 border-[#b58a39] pt-6">
                <div>
                  <p className="font-serif text-[21px] font-semibold text-[#09264a]">Cartório Índio Artiaga</p>
                  <p className="mt-1 text-[11px] text-slate-500">4º Tabelionato de Notas · Goiânia/GO</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[12px] font-semibold text-[#09264a]">{responsibility ? 'TR-2026-0001' : 'TE-2026-0001'}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-slate-500">Documento de modelo</p>
                </div>
              </div>

              <h1 className="text-center font-serif text-[28px] font-semibold uppercase tracking-[0.025em] text-[#09264a]">
                {responsibility ? 'Termo de Responsabilidade Patrimonial' : 'Termo de Troca de Equipamento'}
              </h1>
              <p className="mb-7 mt-2 text-center text-[11px] text-slate-500">
                {responsibility ? 'Entrega e guarda de bens institucionais' : 'Substituição interna registrada pelo Departamento de Tecnologia da Informação'}
              </p>

              <div className="mb-6 grid grid-cols-2 border border-slate-200 text-[11px] sm:grid-cols-4">
                {responsibility ? (
                  <>
                    <div className="bg-slate-50 p-2 font-semibold uppercase text-slate-500">Responsável</div><div className="p-2 font-semibold">Ana Paula de Souza</div>
                    <div className="bg-slate-50 p-2 font-semibold uppercase text-slate-500">Setor</div><div className="p-2 font-semibold">Atendimento</div>
                    <div className="border-t border-slate-200 bg-slate-50 p-2 font-semibold uppercase text-slate-500">Local</div><div className="border-t border-slate-200 p-2 font-semibold">P-014 · Balcão 03</div>
                    <div className="border-t border-slate-200 bg-slate-50 p-2 font-semibold uppercase text-slate-500">Data</div><div className="border-t border-slate-200 p-2 font-semibold">28/09/2026</div>
                  </>
                ) : (
                  <>
                    <div className="bg-slate-50 p-2 font-semibold uppercase text-slate-500">Funcionário</div><div className="p-2 font-semibold">João Ferreira Costa</div>
                    <div className="bg-slate-50 p-2 font-semibold uppercase text-slate-500">Chamado</div><div className="p-2 font-semibold">CH-2026-0184</div>
                    <div className="border-t border-slate-200 bg-slate-50 p-2 font-semibold uppercase text-slate-500">Setor</div><div className="border-t border-slate-200 p-2 font-semibold">Reconhecimento de Firmas</div>
                    <div className="border-t border-slate-200 bg-slate-50 p-2 font-semibold uppercase text-slate-500">Técnico</div><div className="border-t border-slate-200 p-2 font-semibold">Carlos Mendes · TI</div>
                  </>
                )}
              </div>

              <h2 className="mb-2 text-[14px] font-semibold text-[#09264a]">1. {responsibility ? 'Bens sob responsabilidade' : 'Equipamentos envolvidos'}</h2>
              {responsibility ? (
                <div className="mb-6 overflow-hidden border border-slate-200 text-[10px]">
                  <div className="grid grid-cols-[.8fr_1.3fr_1.3fr_.9fr] bg-[#f7f1e5] font-semibold uppercase text-slate-600"><span className="p-2">Patrimônio</span><span className="p-2">Equipamento</span><span className="p-2">Marca / modelo</span><span className="p-2">Estado</span></div>
                  {[['PAT-0312', 'Notebook corporativo', 'Dell Latitude 5420', 'Bom'], ['PAT-0421', 'Teclado USB', 'Logitech K120', 'Bom'], ['PAT-0422', 'Mouse USB', 'Logitech M90', 'Bom']].map(row => <div key={row[0]} className="grid grid-cols-[.8fr_1.3fr_1.3fr_.9fr] border-t border-slate-200">{row.map(cell => <span key={cell} className="p-2">{cell}</span>)}</div>)}
                </div>
              ) : (
                <div className="mb-6 grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr]">
                  <div className="rounded-md border border-slate-200 p-3"><p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Equipamento retirado</p><p className="mt-2 font-mono text-[13px] font-semibold text-[#09264a]">PAT-0215</p><p className="mt-1 text-[11px]">Teclado USB · Logitech K120</p><p className="mt-2 text-[10px] text-red-700">Defeito confirmado</p></div>
                  <div className="flex items-center justify-center text-[#b58a39]"><ArrowRight className="h-5 w-5" /></div>
                  <div className="rounded-md border border-emerald-200 bg-emerald-50/40 p-3"><p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Equipamento entregue</p><p className="mt-2 font-mono text-[13px] font-semibold text-[#09264a]">PAT-0489</p><p className="mt-1 text-[11px]">Teclado USB · Logitech K120</p><p className="mt-2 text-[10px] text-emerald-700">Em bom estado</p></div>
                </div>
              )}

              <h2 className="mb-2 text-[14px] font-semibold text-[#09264a]">2. {responsibility ? 'Declaração de responsabilidade' : 'Registro técnico'}</h2>
              <p className="text-justify text-[11px] leading-5 text-slate-700">
                {responsibility
                  ? 'Declaro que recebi os bens relacionados acima em condições adequadas de uso e assumo a responsabilidade por sua guarda, conservação e utilização exclusivamente em atividades institucionais. Comprometo-me a comunicar ao Departamento de Tecnologia da Informação qualquer defeito, dano, extravio ou necessidade de substituição.'
                  : 'Problema relatado: falhas intermitentes e desgaste acentuado nas teclas A, S e E. Após vistoria, o defeito foi confirmado e a substituição recomendada. O equipamento retirado será encaminhado para manutenção e avaliação técnica.'}
              </p>

              <h2 className="mb-2 mt-5 text-[14px] font-semibold text-[#09264a]">3. Declaração de recebimento</h2>
              <p className="text-justify text-[11px] leading-5 text-slate-700">
                {responsibility
                  ? 'Os equipamentos permanecem como propriedade da serventia e deverão ser devolvidos quando solicitados, por mudança de função, desligamento, substituição ou encerramento da necessidade de uso.'
                  : 'Declaro que devolvi o patrimônio PAT-0215 e recebi o equipamento substituto PAT-0489 em condições adequadas de funcionamento. A partir desta data, o novo bem passa a integrar minha responsabilidade patrimonial.'}
              </p>

              <p className="mt-8 text-center text-[11px]">Goiânia, 28 de setembro de 2026.</p>
              <div className="mt-10 grid grid-cols-2 gap-12 text-[10px] text-slate-600">
                <div className="border-t border-slate-500 pt-2"><strong className="text-slate-800">{responsibility ? 'Ana Paula de Souza' : 'João Ferreira Costa'}</strong><br />Responsável pelo equipamento</div>
                <div className="border-t border-slate-500 pt-2"><strong className="text-slate-800">Carlos Mendes</strong><br />Tecnologia da Informação</div>
              </div>
            </div>
          </article>
        </div>
      </DialogContent>
    </Dialog>
  );
};

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
  const stations = useInventoryStore(s => s.stations);
  const [rows, setRows] = useState<ApiResponsibilityTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
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

  const selectedEmployee = useMemo(
    () => employees.find(employee => employee.id === formEmployee) ?? null,
    [employees, formEmployee],
  );
  const selectedStation = useMemo(
    () => stations.find(station => station.id === selectedEmployee?.stationId) ?? null,
    [stations, selectedEmployee],
  );
  const stationAssetIds = useMemo(() => new Set(
    selectedEmployee?.stationId
      ? assets
        .filter(asset => asset.stationId === selectedEmployee.stationId && asset.status !== 'DISPOSED' && asset.status !== 'VOIDED')
        .map(asset => asset.id)
      : [],
  ), [assets, selectedEmployee]);

  const selectableAssets = useMemo(() => {
    const q = assetQuery.trim().toLowerCase();
    return assets
      .filter(a => a.status !== 'DISPOSED' && a.status !== 'VOIDED')
      .filter(a => !q || a.assetCode.toLowerCase().includes(q) || a.description.toLowerCase().includes(q))
      .sort((left, right) => {
        const leftPriority = stationAssetIds.has(left.id) ? 0 : formAssets.has(left.id) ? 1 : 2;
        const rightPriority = stationAssetIds.has(right.id) ? 0 : formAssets.has(right.id) ? 1 : 2;
        return leftPriority - rightPriority || left.assetCode.localeCompare(right.assetCode, 'pt-BR', { numeric: true });
      })
      .slice(0, 150);
  }, [assets, assetQuery, formAssets, stationAssetIds]);

  const selectStationAssets = (employeeId: string) => {
    const employee = employees.find(item => item.id === employeeId);
    const ids = employee?.stationId
      ? assets
        .filter(asset => asset.stationId === employee.stationId && asset.status !== 'DISPOSED' && asset.status !== 'VOIDED')
        .map(asset => asset.id)
      : [];
    setFormAssets(new Set(ids));
  };

  const handleEmployeeChange = (employeeId: string) => {
    setFormEmployee(employeeId);
    setAssetQuery('');
    selectStationAssets(employeeId);
  };

  const resetCreateForm = () => {
    setFormEmployee('');
    setFormAssets(new Set());
    setFormNotes('');
    setAssetQuery('');
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) resetCreateForm();
  };

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
      resetCreateForm();
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
        <Button size="sm" variant="outline" className="h-[34px]" onClick={() => setPreviewOpen(true)}><Eye className="mr-1.5 h-3.5 w-3.5" />Visualizar modelo</Button>
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
                      {t.signedDocumentUploadedAt && <Button size="sm" variant="outline" className="h-8 border-success/40 text-success hover:bg-success/10 hover:text-success" onClick={() => openPdf(inventoryApi.responsibilityTermSignedUrl(String(t.id)))}><FileText className="mr-1.5 h-3.5 w-3.5" />Ver assinado</Button>}
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

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-h-[92vh] w-[calc(100%-2rem)] min-w-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader>
            <div className="px-6 pt-6">
              <DialogTitle>Novo termo de responsabilidade</DialogTitle>
              <DialogDescription className="mt-1">Selecione o responsável e confira os bens carregados da estação de trabalho atual.</DialogDescription>
            </div>
          </DialogHeader>
          <div className="min-w-0 space-y-4 overflow-y-auto px-6 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Responsável *</Label>
              <Select value={formEmployee} onValueChange={handleEmployeeChange}>
                <SelectTrigger className="h-9 min-w-0 text-sm"><SelectValue placeholder="Selecione o funcionário" /></SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.status === 'ACTIVE').map(e => <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {formEmployee && (
              <div className={cn(
                'flex min-w-0 flex-col gap-2 rounded-lg border px-3 py-2.5 text-xs sm:flex-row sm:items-center',
                selectedStation ? 'border-info/25 bg-info/5' : 'border-brass/25 bg-brass/5',
              )}>
                <div className="min-w-0 flex-1">
                  {selectedStation ? (
                    <>
                      <strong className="block truncate text-ink">Estação atual: {selectedStation.code} · {selectedStation.name}</strong>
                      <span className="text-muted-foreground">{stationAssetIds.size} {stationAssetIds.size === 1 ? 'bem vinculado foi pré-selecionado' : 'bens vinculados foram pré-selecionados'}.</span>
                    </>
                  ) : (
                    <>
                      <strong className="block text-ink">Responsável sem estação atual</strong>
                      <span className="text-muted-foreground">Nenhum bem foi marcado automaticamente. Selecione os itens manualmente.</span>
                    </>
                  )}
                </div>
                {selectedStation && (
                  <Button type="button" size="sm" variant="outline" className="h-8 shrink-0" onClick={() => selectStationAssets(formEmployee)}>
                    Restaurar seleção da estação
                  </Button>
                )}
              </div>
            )}
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <Label className="text-xs">Patrimônios *</Label>
                <span className="text-xs text-muted-foreground">{formAssets.size} selecionado(s)</span>
              </div>
              <Input placeholder="Filtrar por código ou descrição" value={assetQuery} onChange={(e) => setAssetQuery(e.target.value)} className="h-9 min-w-0 text-sm" />
              <div className="max-h-64 min-w-0 overflow-y-auto overflow-x-hidden rounded-lg border border-border">
                {selectableAssets.map(a => (
                  <label key={a.id} className={cn(
                    'flex min-w-0 cursor-pointer items-center gap-2.5 border-b border-border/60 px-3 py-2 text-[13px] last:border-0 hover:bg-muted/50',
                    stationAssetIds.has(a.id) && 'bg-info/5',
                  )}>
                    <Checkbox className="shrink-0" checked={formAssets.has(a.id)} onCheckedChange={() => toggleAsset(a.id)} />
                    <span className="num-mono shrink-0 text-primary">{a.assetCode}</span>
                    <span className="min-w-0 flex-1 truncate text-ink" title={a.description}>{a.description}</span>
                    {stationAssetIds.has(a.id) && <Badge variant="outline" className="hidden shrink-0 border-info/30 bg-info/10 text-[10px] text-info sm:inline-flex">Estação atual</Badge>}
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
          <DialogFooter className="border-t border-border px-6 py-4">
            <Button variant="outline" size="sm" onClick={() => handleDialogOpenChange(false)}>Cancelar</Button>
            <Button size="sm" onClick={submitCreate}>Criar termo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TermMockPreview kind="responsibility" open={previewOpen} onOpenChange={setPreviewOpen} />
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
  DRAFT: 'Rascunho', WAITING_SIGNATURE: 'Aguardando assinatura', ACTIVE: 'Concluída (legado)', COMPLETED: 'Concluída', CANCELLED: 'Cancelada',
};
const EX_STATUS_BADGE: Record<ApiExchangeTermStatus, string> = {
  DRAFT: 'border-border bg-muted text-muted-foreground',
  WAITING_SIGNATURE: 'border-brass/30 bg-brass/10 text-brass',
  ACTIVE: 'border-success/30 bg-success/10 text-success',
  COMPLETED: 'border-success/30 bg-success/10 text-success',
  CANCELLED: 'border-danger/30 bg-danger/10 text-danger',
};

const TrocaView = () => {
  const refreshInventory = useInventoryStore(s => s.refreshAll);
  const [rows, setRows] = useState<ApiEquipmentExchangeTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
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
    active: rows.filter(t => t.status === 'ACTIVE' || t.status === 'COMPLETED').length,
    docs: rows.filter(t => t.signedDocumentUploadedAt).length,
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(t => !q || [t.number, t.retiredCode, t.deliveredCode, t.responsibleName].some(v => v?.toLowerCase().includes(q)));
  }, [rows, search]);

  const run = async (id: number, action: () => Promise<unknown>, ok: string) => {
    setBusyId(id);
    try { await action(); toast.success(ok); await Promise.all([load(), refreshInventory()]); }
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
        <KpiCard tone="#2F7A54" value={kpis.active} title="Trocas concluídas" sub="movimentações efetivadas" />
        <KpiCard tone="#6B7480" value={kpis.docs} title="Documentos no arquivo" sub="termos assinados" />
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex h-[34px] w-full max-w-[320px] items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground/70" />
          <Input placeholder="Buscar por nº ou patrimônio" value={search} onChange={(e) => setSearch(e.target.value)} className="h-[34px] bg-card pl-9 text-[13px]" />
        </div>
        <Button size="sm" className="h-[34px]" onClick={() => setModalOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />Gerar termo de troca</Button>
        <Button size="sm" variant="outline" className="h-[34px]" onClick={() => setPreviewOpen(true)}><Eye className="mr-1.5 h-3.5 w-3.5" />Visualizar modelo</Button>
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
                      {t.status === 'WAITING_SIGNATURE' && t.signedDocumentUploadedAt && <Button size="sm" className="h-8 bg-success text-success-foreground hover:bg-success/90" disabled={busy} onClick={() => { if (window.confirm(`Concluir a troca ${t.number}? O patrimônio ${t.retiredCode} será retirado do posto e ${t.deliveredCode} será entregue ao funcionário.`)) void run(t.id, () => inventoryApi.completeExchangeTerm(String(t.id)), 'Troca concluída e patrimônios movimentados'); }}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Concluir troca</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableCard>

      <GerarTermoTrocaModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={load} />
      <TermMockPreview kind="exchange" open={previewOpen} onOpenChange={setPreviewOpen} />
    </div>
  );
};

// ============================ Página ============================
const DOCUMENT_TYPE_LABEL: Record<ApiAssetDocument['type'], string> = {
  INVOICE: 'Nota fiscal',
  RECEIPT_TERM: 'Termo de recebimento',
  WARRANTY: 'Garantia',
  MANUAL: 'Manual',
  OTHER: 'Outro documento',
};

const DocumentosView = () => {
  const [documents, setDocuments] = useState<ApiAssetDocument[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    try {
      setDocuments(await inventoryApi.listAssetDocuments());
    } catch {
      toast.error('Não foi possível carregar os documentos patrimoniais');
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return documents;
    return documents.filter(document => [document.title, document.documentNumber, document.supplierName, document.fileName, ...document.assets.map(asset => asset.assetCode)]
      .filter(Boolean).some(value => String(value).toLowerCase().includes(term)));
  }, [documents, query]);

  const uploadGeneral = async (file?: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      await inventoryApi.uploadAssetDocument({ type: 'OTHER', title: file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' '), file });
      await load();
      toast.success('Documento incluído no arquivo patrimonial');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível anexar o documento');
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const invoices = documents.filter(document => document.type === 'INVOICE').length;
  const receipts = documents.filter(document => document.type === 'RECEIPT_TERM').length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <KpiCard tone="#00234B" value={documents.length} title="Documentos patrimoniais" sub="arquivos persistentes" />
        <KpiCard tone="#8A6E32" value={invoices} title="Notas fiscais" sub="documentos de aquisição" />
        <KpiCard tone="#2E5AAC" value={receipts} title="Termos de recebimento" sub="entrada e conferência" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por número, fornecedor ou patrimônio" className="pl-9" />
        </div>
        <Button onClick={() => fileInput.current?.click()} disabled={busy}><Upload className="mr-2 h-4 w-4" />Anexar documento</Button>
        <input ref={fileInput} type="file" accept="application/pdf,image/*" className="hidden" onChange={event => uploadGeneral(event.target.files?.[0])} />
      </div>

      <TableCard empty={!filtered.length}>
        <Table>
          <TableHeader><TableRow><TableHead>Documento</TableHead><TableHead>Tipo</TableHead><TableHead>Número / emissão</TableHead><TableHead>Patrimônios vinculados</TableHead><TableHead className="w-[120px]">Arquivo</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(document => (
              <TableRow key={document.id}>
                <TableCell><div className="flex flex-col"><strong className="text-[13px] text-ink">{document.title}</strong><span className="text-xs text-muted-foreground">{document.supplierName || document.fileName}</span></div></TableCell>
                <TableCell><Badge variant="outline">{DOCUMENT_TYPE_LABEL[document.type]}</Badge></TableCell>
                <TableCell><div className="flex flex-col text-[13px]"><span>{document.documentNumber || '—'}</span><span className="text-xs text-muted-foreground">{formatDate(document.issueDate)}</span></div></TableCell>
                <TableCell><div className="flex max-w-[340px] flex-wrap gap-1">{document.assets.length ? document.assets.map(asset => <Badge key={asset.id} variant="secondary">{asset.assetCode}</Badge>) : <span className="text-xs text-muted-foreground">Documento geral</span>}</div></TableCell>
                <TableCell><Button size="sm" variant="outline" onClick={() => openPdf(inventoryApi.assetDocumentUrl(document.id))}><Eye className="mr-1.5 h-3.5 w-3.5" />Abrir</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>
    </div>
  );
};

const TABS: { key: Tab; label: string }[] = [
  { key: 'documentos', label: 'Documentos patrimoniais' },
  { key: 'baixas', label: 'Termos de baixa' },
  { key: 'responsabilidade', label: 'Termos de responsabilidade' },
  { key: 'troca', label: 'Termos de troca' },
  { key: 'solicitacoes', label: 'Solicitações' },
];

const ArquivoPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab') as Tab | null;
  const [tab, setTab] = useState<Tab>(requestedTab && TABS.some(item => item.key === requestedTab) ? requestedTab : 'documentos');

  const selectTab = (next: Tab) => {
    setTab(next);
    setSearchParams({ tab: next }, { replace: true });
  };

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
              onClick={() => selectTab(t.key)}
              className={cn(
                'rounded-[7px] px-4 py-2 transition-colors',
                tab === t.key ? 'bg-card font-semibold text-primary shadow-sm' : 'text-muted-foreground hover:text-primary',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'documentos' && <DocumentosView />}
        {tab === 'baixas' && <BaixasView />}
        {tab === 'responsabilidade' && <ResponsabilidadeView />}
        {tab === 'troca' && <TrocaView />}
        {tab === 'solicitacoes' && <SolicitacoesView />}
      </div>
    </AppShell>
  );
};

export default ArquivoPage;
