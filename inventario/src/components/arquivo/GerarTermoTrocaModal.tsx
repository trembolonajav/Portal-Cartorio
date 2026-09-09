import { useMemo, useState } from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo-cartorio.png';
import { getCurrentUsername, getStoredAuth } from '@/lib/auth';
import { useInventoryStore } from '@/features/inventory-map/store/useInventoryStore';
import { inventoryApi } from '@/lib/inventory-api';
import { toast } from 'sonner';

const DOC_TYPES = [
  { key: 'responsabilidade', label: 'Termo de responsabilidade' },
  { key: 'troca', label: 'Termo de troca de equipamento' },
  { key: 'baixa', label: 'Termo de baixa' },
] as const;

const today = () => new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const GerarTermoTrocaModal = ({ open, onClose, onCreated }: Props) => {
  const assets = useInventoryStore(s => s.assets);
  const getStationForAsset = useInventoryStore(s => s.getStationForAsset);
  const getEmployeeForStation = useInventoryStore(s => s.getEmployeeForStation);

  const [retiredId, setRetiredId] = useState('');
  const [deliveredId, setDeliveredId] = useState('');
  const [ticket, setTicket] = useState('');
  const [sector, setSector] = useState('');
  const [reason, setReason] = useState('Manutenção corretiva');
  const [saving, setSaving] = useState(false);

  const info = (id: string) => {
    const a = assets.find(x => x.id === id);
    if (!a) return null;
    const station = getStationForAsset(a.id);
    const employee = station ? getEmployeeForStation(station.id) : null;
    return {
      code: a.assetCode,
      description: a.description,
      serial: a.serialNumber || '—',
      station: station ? `${station.code} - ${station.name}` : (a.status === 'IN_STOCK' ? 'Estoque de TI · em estoque' : 'Sem localização'),
      responsible: employee?.fullName ?? null,
    };
  };
  const retired = useMemo(() => info(retiredId), [retiredId, assets]);
  const delivered = useMemo(() => info(deliveredId), [deliveredId, assets]);
  const responsible = retired?.responsible ?? null;

  const submit = async () => {
    if (!retiredId || !deliveredId) { toast.error('Selecione o equipamento retirado e o entregue'); return; }
    if (retiredId === deliveredId) { toast.error('Os equipamentos devem ser diferentes'); return; }
    setSaving(true);
    try {
      const created = await inventoryApi.createExchangeTerm({
        retiredAssetId: Number(retiredId),
        deliveredAssetId: Number(deliveredId),
        responsibleName: responsible || undefined,
        ticketRef: ticket || undefined,
        sector: sector || undefined,
        reason: reason || undefined,
      });
      const done = await inventoryApi.generateExchangeTerm(String(created.id), getCurrentUsername() || undefined);
      toast.success(`Termo de troca ${done.number} gerado e arquivado`);
      // abre o PDF gerado
      try {
        const auth = getStoredAuth();
        const res = await fetch(inventoryApi.exchangeTermUrl(String(created.id)), { headers: auth?.token ? { Authorization: auth.token } : undefined });
        if (res.ok) window.open(URL.createObjectURL(new Blob([await res.blob()], { type: 'application/pdf' })), '_blank');
      } catch { /* preview do PDF é opcional */ }
      onCreated();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao gerar o termo');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const assetOption = (a: { id: string; assetCode: string; description: string }) => (
    <option key={a.id} value={a.id}>{a.assetCode} · {a.description}</option>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 p-4">
      <div className="flex max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-card shadow-2xl">
        {/* ---- Formulário ---- */}
        <div className="flex w-[420px] shrink-0 flex-col overflow-y-auto border-r border-border">
          <div className="flex items-center gap-3 border-b border-border px-6 py-5">
            <h2 className="font-serif text-[24px] font-semibold leading-none text-primary">Gerar termo de troca</h2>
            <span className="num-mono rounded-md bg-secondary px-2 py-1 text-[12px] text-muted-foreground">nº a gerar</span>
          </div>

          <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-2.5">
              <span className="label-mono">Tipo de documento</span>
              {DOC_TYPES.map(t => (
                <div
                  key={t.key}
                  className={cn(
                    'rounded-lg border px-4 py-3 text-[15px]',
                    t.key === 'troca'
                      ? 'border-champagne bg-brass/5 font-semibold text-primary'
                      : 'border-border text-muted-foreground',
                  )}
                  title={t.key !== 'troca' ? 'Use a aba correspondente do Arquivo' : undefined}
                >
                  {t.label}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <span className="label-mono">Equipamento retirado</span>
              <select value={retiredId} onChange={e => setRetiredId(e.target.value)} className="h-10 rounded-lg border border-input bg-paper-2 px-3 text-sm">
                <option value="">Selecione…</option>
                {assets.map(assetOption)}
              </select>
              {retired && (
                <div className="rounded-lg border border-border bg-paper-2 px-3 py-2 text-[13px]">
                  <div className="flex items-center gap-2"><span className="num-mono text-primary">{retired.code}</span><strong className="text-ink">{retired.description}</strong></div>
                  <div className="text-muted-foreground">{retired.station}{responsible ? ` · ${responsible}` : ''}</div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <span className="label-mono">Equipamento entregue</span>
              <select value={deliveredId} onChange={e => setDeliveredId(e.target.value)} className="h-10 rounded-lg border border-input bg-paper-2 px-3 text-sm">
                <option value="">Selecione…</option>
                {assets.map(assetOption)}
              </select>
              {delivered && (
                <div className="rounded-lg border border-border bg-paper-2 px-3 py-2 text-[13px]">
                  <div className="flex items-center gap-2"><span className="num-mono text-primary">{delivered.code}</span><strong className="text-ink">{delivered.description}</strong></div>
                  <div className="text-muted-foreground">{delivered.station}</div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="label-mono">Vínculos</span>
              <label className="flex items-center justify-between gap-3 text-[14px]">
                <span className="text-muted-foreground">Chamado</span>
                <Input value={ticket} onChange={e => setTicket(e.target.value)} placeholder="#0000" className="h-9 w-40 text-right text-sm" />
              </label>
              <label className="flex items-center justify-between gap-3 text-[14px]">
                <span className="text-muted-foreground">Setor</span>
                <Input value={sector} onChange={e => setSector(e.target.value)} placeholder="Recepção" className="h-9 w-40 text-right text-sm" />
              </label>
              <label className="flex items-center justify-between gap-3 text-[14px]">
                <span className="text-muted-foreground">Motivo</span>
                <Input value={reason} onChange={e => setReason(e.target.value)} className="h-9 w-52 text-right text-sm" />
              </label>
            </div>

            <Button className="h-12 w-full text-[15px]" disabled={saving} onClick={submit}>
              <FileText className="mr-2 h-4 w-4" />
              {saving ? 'Gerando…' : 'Gerar PDF e arquivar'}
            </Button>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              O termo entra no arquivo como <strong className="text-brass">Aguardando assinatura</strong>. Depois de assinado, suba o digitalizado na mesma linha.
            </p>
          </div>
        </div>

        {/* ---- Pré-visualização A4 ---- */}
        <div className="flex min-w-0 flex-1 flex-col bg-secondary/40">
          <div className="flex items-center justify-between px-6 py-4">
            <span className="label-mono">Pré-visualização · A4</span>
            <div className="flex items-center gap-4">
              <button type="button" className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-primary"><Printer className="h-3.5 w-3.5" />Imprimir</button>
              <button type="button" onClick={onClose} className="text-muted-foreground hover:text-primary"><X className="h-5 w-5" /></button>
            </div>
          </div>
          <div className="flex-1 overflow-auto px-8 pb-8">
            <div className="mx-auto max-w-[560px] rounded-sm bg-white p-10 shadow-md" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
              <div className="flex items-center gap-3">
                <img src={logo} alt="" className="h-9 w-auto object-contain" />
                <div className="flex-1">
                  <div className="font-serif text-[17px] font-semibold text-primary">Cartório Índio Artiaga</div>
                  <div className="text-[11px] text-muted-foreground">4º Tabelionato de Notas · Goiânia — GO</div>
                </div>
                <span className="num-mono text-[11px] tracking-wider text-muted-foreground">TERMO ——/26</span>
              </div>
              <div className="my-6 h-px bg-champagne" />
              <h1 className="text-center font-serif text-[26px] font-semibold text-primary">Termo de Troca de Equipamento</h1>
              <p className="mb-6 text-center text-[13px] text-muted-foreground">emitido em {today()}</p>
              <p className="mb-6 text-[13.5px] leading-relaxed text-ink-2">
                Declaro, para os devidos fins, que nesta data recebi do setor de Tecnologia da Informação o equipamento abaixo descrito, em substituição ao equipamento retirado para {(reason || 'manutenção corretiva').toLowerCase()}, comprometendo-me a zelar por sua guarda e conservação.
              </p>
              <table className="mb-6 w-full border-collapse text-[12px]">
                <thead>
                  <tr className="bg-paper-2 text-left uppercase tracking-wide text-muted-foreground">
                    <th className="border border-border px-3 py-2 font-semibold">Situação</th>
                    <th className="border border-border px-3 py-2 font-semibold">Patrimônio</th>
                    <th className="border border-border px-3 py-2 font-semibold">Nº de série</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border px-3 py-2.5 align-top text-ink-2">Retirado</td>
                    <td className="border border-border px-3 py-2.5 align-top"><div className="num-mono text-primary">{retired?.code ?? 'VRT-————'}</div><div className="text-ink-2">{retired?.description ?? '—'}</div></td>
                    <td className="border border-border px-3 py-2.5 align-top num-mono text-ink-2">{retired?.serial ?? '—'}</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-3 py-2.5 align-top text-ink-2">Entregue</td>
                    <td className="border border-border px-3 py-2.5 align-top"><div className="num-mono text-primary">{delivered?.code ?? 'VRT-————'}</div><div className="text-ink-2">{delivered?.description ?? '—'}</div></td>
                    <td className="border border-border px-3 py-2.5 align-top num-mono text-ink-2">{delivered?.serial ?? '—'}</td>
                  </tr>
                </tbody>
              </table>
              <div className="mb-10 grid grid-cols-[110px_1fr] gap-y-1 text-[13px]">
                <span className="text-muted-foreground">Responsável</span><span className="font-medium text-ink">{responsible ?? '—'}{sector ? ` · ${sector}` : ''}</span>
                <span className="text-muted-foreground">Local</span><span className="font-medium text-ink">{retired?.station ?? '—'}</span>
                <span className="text-muted-foreground">Chamado</span><span className="font-medium text-ink">{ticket || '—'}</span>
              </div>
              <div className="flex gap-8">
                <div className="flex-1 border-t border-ink pt-2 text-[12px]"><div className="text-ink">{responsible ?? 'Responsável pelo bem'}</div><div className="text-muted-foreground">Responsável pelo bem</div></div>
                <div className="flex-1 border-t border-ink pt-2 text-[12px]"><div className="text-ink">Tecnologia da Informação</div><div className="text-muted-foreground">Entrega</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GerarTermoTrocaModal;
