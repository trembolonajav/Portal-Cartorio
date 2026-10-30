import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { FileText, Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import logo from '@/assets/logo-cartorio.png';
import { getCurrentUsername, getStoredAuth } from '@/lib/auth';
import { useInventoryStore } from '@/features/inventory-map/store/useInventoryStore';
import {
  inventoryApi,
  type ApiExchangeCondition,
  type ApiExchangeInspectionResult,
  type ApiExchangeRetiredDestination,
} from '@/lib/inventory-api';
import { toast } from 'sonner';

const INSPECTION_LABELS: Record<ApiExchangeInspectionResult, string> = {
  CONFIRMED: 'Defeito confirmado',
  PARTIAL: 'Defeito parcialmente confirmado',
  NOT_CONFIRMED: 'Defeito não confirmado',
};

const CONDITION_LABELS: Record<ApiExchangeCondition, string> = {
  GOOD: 'Bom estado',
  NORMAL_WEAR: 'Desgaste normal',
  DAMAGED: 'Danificado',
  INCOMPLETE: 'Incompleto',
};

const DESTINATION_LABELS: Record<ApiExchangeRetiredDestination, string> = {
  MAINTENANCE: 'Manutenção',
  STOCK: 'Retorno ao estoque',
  DISPOSAL_EVALUATION: 'Avaliação para baixa',
};

const today = () => new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const GerarTermoTrocaModal = ({ open, onClose, onCreated }: Props) => {
  const assets = useInventoryStore(s => s.assets);
  const departments = useInventoryStore(s => s.departments);
  const getStationForAsset = useInventoryStore(s => s.getStationForAsset);
  const getEmployeeForStation = useInventoryStore(s => s.getEmployeeForStation);

  const [retiredId, setRetiredId] = useState('');
  const [deliveredId, setDeliveredId] = useState('');
  const [ticket, setTicket] = useState('');
  const [sector, setSector] = useState('');
  const [reason, setReason] = useState('Defeito');
  const [reportedProblem, setReportedProblem] = useState('');
  const [inspectionResult, setInspectionResult] = useState<ApiExchangeInspectionResult>('CONFIRMED');
  const [diagnosis, setDiagnosis] = useState('');
  const [returnedCondition, setReturnedCondition] = useState<ApiExchangeCondition>('DAMAGED');
  const [retiredDestination, setRetiredDestination] = useState<ApiExchangeRetiredDestination>('MAINTENANCE');
  const [technicianName, setTechnicianName] = useState(getCurrentUsername() || '');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const retiredOptions = useMemo(
    () => assets
      .filter(asset => Boolean(getStationForAsset(asset.id)) && ['ACTIVE', 'MAINTENANCE'].includes(asset.status))
      .sort((a, b) => a.assetCode.localeCompare(b.assetCode, 'pt-BR')),
    [assets, getStationForAsset],
  );
  const retiredAsset = assets.find(asset => asset.id === retiredId) ?? null;
  const deliveredOptions = useMemo(
    () => assets
      .filter(asset => asset.status === 'IN_STOCK' && !getStationForAsset(asset.id) && asset.id !== retiredId)
      .sort((a, b) => {
        const aSame = retiredAsset && a.type === retiredAsset.type ? 0 : 1;
        const bSame = retiredAsset && b.type === retiredAsset.type ? 0 : 1;
        return aSame - bSame || a.assetCode.localeCompare(b.assetCode, 'pt-BR');
      }),
    [assets, getStationForAsset, retiredAsset, retiredId],
  );
  const deliveredAsset = assets.find(asset => asset.id === deliveredId) ?? null;
  const retiredStation = retiredAsset ? getStationForAsset(retiredAsset.id) : null;
  const responsible = retiredStation ? getEmployeeForStation(retiredStation.id) : null;
  const department = responsible?.departmentId ? departments.find(item => item.id === responsible.departmentId) : null;

  useEffect(() => setSector(department?.name ?? ''), [department?.name]);
  useEffect(() => {
    if (deliveredId && !deliveredOptions.some(asset => asset.id === deliveredId)) setDeliveredId('');
  }, [deliveredId, deliveredOptions]);

  const retiredLocation = retiredStation ? `${retiredStation.code} - ${retiredStation.name}` : '—';
  const sameCategory = Boolean(retiredAsset && deliveredAsset && retiredAsset.type === deliveredAsset.type);

  const submit = async () => {
    if (!retiredAsset || !deliveredAsset) {
      toast.error('Selecione o equipamento retirado e o substituto em estoque');
      return;
    }
    if (!responsible) {
      toast.error('O equipamento retirado precisa estar em um posto com funcionário responsável');
      return;
    }
    if (!reportedProblem.trim() || !diagnosis.trim()) {
      toast.error('Informe o problema relatado e o diagnóstico do TI');
      return;
    }
    setSaving(true);
    try {
      const created = await inventoryApi.createExchangeTerm({
        retiredAssetId: Number(retiredAsset.id),
        deliveredAssetId: Number(deliveredAsset.id),
        responsibleName: responsible.fullName,
        ticketRef: ticket.trim() || undefined,
        sector: sector.trim() || undefined,
        reason: reason.trim() || 'Defeito',
        reportedProblem: reportedProblem.trim(),
        inspectionResult,
        diagnosis: diagnosis.trim(),
        returnedCondition,
        retiredDestination,
        technicianName: technicianName.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      const generated = await inventoryApi.generateExchangeTerm(String(created.id), getCurrentUsername() || undefined);
      toast.success(`Termo ${generated.number} gerado. A troca ainda não movimentou os patrimônios.`);
      try {
        const auth = getStoredAuth();
        const response = await fetch(inventoryApi.exchangeTermUrl(String(created.id)), { headers: auth?.token ? { Authorization: auth.token } : undefined });
        if (response.ok) window.open(URL.createObjectURL(new Blob([await response.blob()], { type: 'application/pdf' })), '_blank');
      } catch {
        // A abertura automática do PDF é apenas uma conveniência.
      }
      onCreated();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao gerar o termo de troca');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 p-4">
      <div className="flex max-h-[94vh] w-full max-w-7xl overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="flex w-[500px] shrink-0 flex-col overflow-y-auto border-r border-border">
          <div className="flex items-center justify-between border-b border-border px-6 py-5">
            <div><h2 className="font-serif text-[24px] font-semibold leading-none text-primary">Registrar troca interna</h2><p className="mt-2 text-xs text-muted-foreground">Fluxo restrito ao departamento de TI</p></div>
            <button type="button" onClick={onClose} className="text-muted-foreground hover:text-primary"><X className="h-5 w-5" /></button>
          </div>

          <div className="flex flex-col gap-5 p-6">
            <section className="space-y-3">
              <span className="label-mono">1. Equipamentos</span>
              <Field label="Equipamento retirado do funcionário">
                <select value={retiredId} onChange={event => setRetiredId(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-paper-2 px-3 text-sm">
                  <option value="">Selecione um patrimônio vinculado…</option>
                  {retiredOptions.map(asset => <option key={asset.id} value={asset.id}>{asset.assetCode} · {asset.description}</option>)}
                </select>
              </Field>
              {retiredAsset && <InfoCard><strong>{retiredAsset.assetCode} · {retiredAsset.description}</strong><span>{retiredLocation} · {responsible?.fullName ?? 'sem responsável definido'}</span></InfoCard>}
              <Field label="Equipamento novo/substituto">
                <select value={deliveredId} onChange={event => setDeliveredId(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-paper-2 px-3 text-sm">
                  <option value="">Selecione um patrimônio em estoque…</option>
                  {deliveredOptions.map(asset => <option key={asset.id} value={asset.id}>{asset.assetCode} · {asset.description}{retiredAsset && asset.type === retiredAsset.type ? ' · mesma categoria' : ''}</option>)}
                </select>
              </Field>
              {deliveredAsset && <InfoCard><strong>{deliveredAsset.assetCode} · {deliveredAsset.description}</strong><span>Estoque de TI{sameCategory ? ' · mesma categoria do bem retirado' : ''}</span></InfoCard>}
            </section>

            <section className="space-y-3 border-t border-border pt-5">
              <span className="label-mono">2. Vistoria do TI</span>
              <Field label="Problema relatado *"><Textarea value={reportedProblem} onChange={event => setReportedProblem(event.target.value)} className="min-h-20 text-sm" placeholder="Ex.: teclado apresenta falhas e teclas desgastadas" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Resultado da vistoria"><EnumSelect value={inspectionResult} onChange={value => setInspectionResult(value as ApiExchangeInspectionResult)} options={INSPECTION_LABELS} /></Field>
                <Field label="Condição devolvida"><EnumSelect value={returnedCondition} onChange={value => setReturnedCondition(value as ApiExchangeCondition)} options={CONDITION_LABELS} /></Field>
              </div>
              <Field label="Diagnóstico / ação adotada *"><Textarea value={diagnosis} onChange={event => setDiagnosis(event.target.value)} className="min-h-20 text-sm" placeholder="Ex.: desgaste confirmado; substituição recomendada" /></Field>
              <Field label="Destino do equipamento retirado"><EnumSelect value={retiredDestination} onChange={value => setRetiredDestination(value as ApiExchangeRetiredDestination)} options={DESTINATION_LABELS} /></Field>
            </section>

            <section className="space-y-3 border-t border-border pt-5">
              <span className="label-mono">3. Dados do termo</span>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Chamado"><Input value={ticket} onChange={event => setTicket(event.target.value)} placeholder="#0000" className="h-9 text-sm" /></Field>
                <Field label="Motivo"><Input value={reason} onChange={event => setReason(event.target.value)} className="h-9 text-sm" /></Field>
                <Field label="Setor"><Input value={sector} onChange={event => setSector(event.target.value)} className="h-9 text-sm" /></Field>
                <Field label="Técnico responsável"><Input value={technicianName} onChange={event => setTechnicianName(event.target.value)} className="h-9 text-sm" /></Field>
              </div>
              <Field label="Observações"><Textarea value={notes} onChange={event => setNotes(event.target.value)} className="min-h-16 text-sm" placeholder="Opcional" /></Field>
            </section>

            <Button className="h-12 w-full text-[15px]" disabled={saving} onClick={submit}><FileText className="mr-2 h-4 w-4" />{saving ? 'Gerando…' : 'Gerar termo para assinatura'}</Button>
            <p className="rounded-lg border border-brass/25 bg-brass/5 p-3 text-[12px] leading-relaxed text-muted-foreground">Gerar o termo não altera o inventário. Após a assinatura, envie o documento e use <strong className="text-ink">Concluir troca</strong> para movimentar os dois patrimônios juntos.</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col bg-secondary/40">
          <div className="flex items-center justify-between px-6 py-4"><span className="label-mono">Pré-visualização · A4</span><span className="flex items-center gap-1.5 text-[13px] text-muted-foreground"><Printer className="h-3.5 w-3.5" />Termo nominal</span></div>
          <div className="flex-1 overflow-auto px-8 pb-8">
            <div className="mx-auto max-w-[620px] rounded-sm bg-white p-10 shadow-md">
              <div className="flex items-center gap-3"><img src={logo} alt="" className="h-9 w-auto object-contain" /><div className="flex-1"><div className="font-serif text-[17px] font-semibold text-primary">Cartório Índio Artiaga</div><div className="text-[11px] text-muted-foreground">4º Tabelionato de Notas · Goiânia/GO</div></div><span className="num-mono text-[11px] text-muted-foreground">TERMO —/26</span></div>
              <div className="my-6 h-px bg-champagne" />
              <h1 className="text-center font-serif text-[25px] font-semibold text-primary">Termo de Troca de Equipamento</h1>
              <p className="mb-6 text-center text-[12px] text-muted-foreground">emitido em {today()}</p>
              <p className="mb-5 text-[13px] leading-relaxed text-ink-2">O funcionário abaixo recebe o equipamento substituto após vistoria técnica e devolução do equipamento anteriormente sob sua responsabilidade.</p>
              <PreviewEquipment label="Retirado" code={retiredAsset?.assetCode} description={retiredAsset?.description} serial={retiredAsset?.serialNumber} />
              <PreviewEquipment label="Entregue" code={deliveredAsset?.assetCode} description={deliveredAsset?.description} serial={deliveredAsset?.serialNumber} />
              <div className="my-5 grid grid-cols-[145px_1fr] gap-y-1 text-[12px]">
                <PreviewRow label="Funcionário" value={responsible?.fullName} /><PreviewRow label="Setor / local" value={[sector, retiredLocation].filter(Boolean).join(' · ')} />
                <PreviewRow label="Problema relatado" value={reportedProblem} /><PreviewRow label="Vistoria do TI" value={INSPECTION_LABELS[inspectionResult]} />
                <PreviewRow label="Diagnóstico" value={diagnosis} /><PreviewRow label="Condição devolvida" value={CONDITION_LABELS[returnedCondition]} />
                <PreviewRow label="Destino do retirado" value={DESTINATION_LABELS[retiredDestination]} /><PreviewRow label="Chamado" value={ticket} />
              </div>
              <div className="mt-12 flex gap-8 text-[11px]"><div className="flex-1 border-t border-ink pt-2"><div>{responsible?.fullName ?? 'Funcionário responsável'}</div><div className="text-muted-foreground">Responsável pelo bem</div></div><div className="flex-1 border-t border-ink pt-2"><div>{technicianName || 'Tecnologia da Informação'}</div><div className="text-muted-foreground">Técnico responsável</div></div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: ReactNode }) => <label className="block space-y-1.5"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
const InfoCard = ({ children }: { children: ReactNode }) => <div className="flex flex-col rounded-lg border border-border bg-paper-2 px-3 py-2 text-[13px] text-ink [&>span]:text-muted-foreground">{children}</div>;
const EnumSelect = ({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: Record<string, string> }) => <select value={value} onChange={event => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-paper-2 px-3 text-sm">{Object.entries(options).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>;
const PreviewEquipment = ({ label, code, description, serial }: { label: string; code?: string; description?: string; serial?: string }) => <div className="grid grid-cols-[75px_1fr_130px] border border-border border-b-0 px-3 py-2 text-[11px] last:border-b"><span className="text-muted-foreground">{label}</span><span><strong className="num-mono text-primary">{code ?? '—'}</strong><br />{description ?? '—'}</span><span className="num-mono text-muted-foreground">{serial ?? '—'}</span></div>;
const PreviewRow = ({ label, value }: { label: string; value?: string | null }) => <><span className="text-muted-foreground">{label}</span><span className="font-medium text-ink">{value || '—'}</span></>;

export default GerarTermoTrocaModal;
