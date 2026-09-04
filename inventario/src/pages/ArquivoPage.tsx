import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, FileDown, Upload, Search, CheckCircle2, PenLine, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppShell from '@/components/layout/AppShell';
import { getCurrentUsername, getStoredAuth } from '@/lib/auth';
import {
  inventoryApi,
  type ApiAssetDisposal,
  type ApiDisposalReason,
  type ApiDisposalStatus,
} from '@/lib/inventory-api';
import { toast } from 'sonner';

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

const STATUS_BADGE: Record<ApiDisposalStatus, string> = {
  DRAFT: 'border-border bg-muted text-muted-foreground',
  WAITING_SIGNATURE: 'border-brass/30 bg-brass/10 text-brass',
  FINALIZED: 'border-success/30 bg-success/10 text-success',
  CANCELLED: 'border-danger/30 bg-danger/10 text-danger',
};

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

type DocState = 'none' | 'pending' | 'signed';
const docStateOf = (d: ApiAssetDisposal): DocState => {
  if (d.signedDocumentUploadedAt) return 'signed';
  if (d.termGeneratedAt) return 'pending';
  return 'none';
};

const ArquivoPage = () => {
  const [disposals, setDisposals] = useState<ApiAssetDisposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterReason, setFilterReason] = useState<string>('ALL');
  const [filterYear, setFilterYear] = useState<string>('ALL');

  const uploadFor = useRef<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      setDisposals(await inventoryApi.listDisposals());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao carregar o arquivo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const years = useMemo(
    () => Array.from(new Set(disposals.map(d => new Date(d.createdAt).getFullYear()))).sort((a, b) => b - a),
    [disposals],
  );

  const kpis = useMemo(() => {
    const pending = disposals.filter(d => docStateOf(d) === 'pending' && d.status !== 'CANCELLED').length;
    const awaitingFinalize = disposals.filter(d => d.status === 'WAITING_SIGNATURE' && d.signedDocumentUploadedAt).length;
    const finalized = disposals.filter(d => d.status === 'FINALIZED').length;
    const docs = disposals.reduce((sum, d) => sum + (d.documents?.length ?? 0), 0);
    return { pending, awaitingFinalize, finalized, docs };
  }, [disposals]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return disposals.filter(d => {
      if (filterStatus !== 'ALL' && d.status !== filterStatus) return false;
      if (filterReason !== 'ALL' && d.reason !== filterReason) return false;
      if (filterYear !== 'ALL' && String(new Date(d.createdAt).getFullYear()) !== filterYear) return false;
      if (!q) return true;
      return [d.number, d.destination, REASON_LABELS[d.reason], d.authorizedByName]
        .filter(Boolean)
        .some(value => value!.toLowerCase().includes(q));
    });
  }, [disposals, search, filterStatus, filterReason, filterYear]);

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

  const runAction = async (id: number, action: () => Promise<unknown>, success: string) => {
    setBusyId(id);
    try {
      await action();
      toast.success(success);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível concluir a ação');
    } finally {
      setBusyId(null);
    }
  };

  const generateTerm = (id: number) =>
    runAction(id, () => inventoryApi.generateDisposalTerm(String(id), getCurrentUsername() || undefined), 'Termo gerado');
  const finalize = (id: number) =>
    runAction(id, () => inventoryApi.finalizeDisposal(String(id), getCurrentUsername() || undefined), 'Baixa finalizada');

  const promptUpload = (id: number) => {
    uploadFor.current = id;
    fileInput.current?.click();
  };
  const onFilePicked = async (file: File | null) => {
    const id = uploadFor.current;
    uploadFor.current = null;
    if (fileInput.current) fileInput.current.value = '';
    if (!id || !file) return;
    await runAction(id, () => inventoryApi.uploadSignedDisposalTerm(String(id), file, getCurrentUsername() || undefined), 'Documento assinado enviado');
  };

  return (
    <AppShell
      active="arquivo"
      search={
        <div className="relative flex h-[38px] w-full max-w-[460px] items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground/70" />
          <Input
            placeholder="Buscar por nº do termo, motivo ou pessoa"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-[38px] rounded-lg border-input bg-paper-2 pl-9 text-sm"
          />
        </div>
      }
    >
      <input
        ref={fileInput}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)}
      />

      <div className="flex h-full flex-col gap-4 px-4 py-6 md:px-7">
        {/* Cabeçalho */}
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-[34px] font-semibold leading-none text-primary">Arquivo</h2>
          <p className="text-sm text-muted-foreground">
            Termos de baixa, documentos assinados e situação de cada processo · acesso restrito à administração
          </p>
        </div>

        {/* KPIs */}
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard tone="#A87413" value={kpis.pending} title="Termos pendentes de assinatura" sub="gerados e ainda sem o PDF assinado" />
          <KpiCard tone="#2E5AAC" value={kpis.awaitingFinalize} title="Assinados aguardando finalização" sub="PDF no arquivo, baixa a confirmar" />
          <KpiCard tone="#2F7A54" value={kpis.finalized} title="Baixas finalizadas" sub="processos concluídos" />
          <KpiCard tone="#6B7480" value={kpis.docs} title="Documentos no arquivo" sub="termos e comprovantes armazenados" />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-[34px] w-[190px] bg-card text-[13px]"><SelectValue placeholder="Situação" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as situações</SelectItem>
              {(Object.keys(STATUS_LABELS) as ApiDisposalStatus[]).map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterReason} onValueChange={setFilterReason}>
            <SelectTrigger className="h-[34px] w-[170px] bg-card text-[13px]"><SelectValue placeholder="Motivo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os motivos</SelectItem>
              {(Object.keys(REASON_LABELS) as ApiDisposalReason[]).map(r => <SelectItem key={r} value={r}>{REASON_LABELS[r]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="h-[34px] w-[130px] bg-card text-[13px]"><SelectValue placeholder="Ano" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os anos</SelectItem>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="ml-auto text-[13px] text-muted-foreground">{filtered.length.toLocaleString('pt-BR')} registro(s)</span>
        </div>

        {/* Tabela */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Carregando arquivo…</div>
          ) : filtered.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
              <FileText className="mb-3 h-10 w-10 opacity-40" />
              <p className="text-sm font-medium">Nenhum documento no arquivo</p>
              <p className="mt-1 text-xs">Gere termos a partir das baixas patrimoniais</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border bg-paper-2 hover:bg-paper-2">
                    <TableHead className="w-[120px] text-[12px] uppercase tracking-[0.05em] text-muted-foreground">Nº termo</TableHead>
                    <TableHead className="text-[12px] uppercase tracking-[0.05em] text-muted-foreground">Baixa</TableHead>
                    <TableHead className="w-[220px] text-[12px] uppercase tracking-[0.05em] text-muted-foreground">Documento</TableHead>
                    <TableHead className="w-[150px] text-[12px] uppercase tracking-[0.05em] text-muted-foreground">Situação</TableHead>
                    <TableHead className="w-[110px] text-[12px] uppercase tracking-[0.05em] text-muted-foreground">Aberta em</TableHead>
                    <TableHead className="w-[300px] text-[12px] uppercase tracking-[0.05em] text-muted-foreground">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(d => {
                    const state = docStateOf(d);
                    const busy = busyId === d.id;
                    return (
                      <TableRow key={d.id} className="border-b border-border/60 align-top">
                        <TableCell className="num-mono text-[13px] text-primary">{d.number}</TableCell>
                        <TableCell className="text-[13px] text-ink">
                          <div className="font-medium">{REASON_LABELS[d.reason]}</div>
                          <div className="text-[12px] text-muted-foreground">{d.itemCount} {d.itemCount === 1 ? 'item' : 'itens'} · {d.destination}</div>
                        </TableCell>
                        <TableCell className="text-[13px]">
                          {state === 'signed' ? (
                            <span className="flex items-center gap-2 text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" />Assinado · {formatDate(d.signedDocumentUploadedAt)}</span>
                          ) : state === 'pending' ? (
                            <span className="flex items-center gap-2 text-brass"><span className="h-1.5 w-1.5 rounded-full bg-brass" />Pendente · gerado {formatDate(d.termGeneratedAt)}</span>
                          ) : (
                            <span className="flex items-center gap-2 italic text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full border border-muted-foreground" />Termo não gerado</span>
                          )}
                          {d.documents?.length ? <div className="mt-0.5 text-[12px] text-muted-foreground">{d.documents.length} arquivo(s)</div> : null}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_BADGE[d.status]}>{STATUS_LABELS[d.status]}</Badge>
                        </TableCell>
                        <TableCell className="text-[13px] text-ink-2">{formatDate(d.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {d.status === 'DRAFT' && (
                              <Button size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => generateTerm(d.id)}>
                                <PenLine className="mr-1.5 h-3.5 w-3.5" />Gerar termo
                              </Button>
                            )}
                            {state !== 'none' && (
                              <Button size="sm" variant="outline" className="h-8" onClick={() => openPdf(inventoryApi.disposalTermUrl(String(d.id)))}>
                                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />Ver termo
                              </Button>
                            )}
                            {d.status === 'WAITING_SIGNATURE' && (
                              <Button size="sm" variant="outline" className="h-8" onClick={() => openPdf(inventoryApi.disposalSignatureSheetUrl(String(d.id)))}>
                                <FileDown className="mr-1.5 h-3.5 w-3.5" />Folha
                              </Button>
                            )}
                            {d.status === 'WAITING_SIGNATURE' && (
                              <Button size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => promptUpload(d.id)}>
                                <Upload className="mr-1.5 h-3.5 w-3.5" />Subir assinado
                              </Button>
                            )}
                            {d.status === 'WAITING_SIGNATURE' && d.signedDocumentUploadedAt && (
                              <Button size="sm" className="h-8 bg-success text-success-foreground hover:bg-success/90" disabled={busy} onClick={() => finalize(d.id)}>
                                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Finalizar
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
    </AppShell>
  );
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

export default ArquivoPage;
