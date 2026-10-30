import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { inventoryApi, type ApiAssetPolicy } from '@/lib/inventory-api';
import { toast } from 'sonner';

const TREATMENT_LABELS: Record<string, string> = {
  CONTROLLED_ASSET: 'Controle patrimonial',
  FIXED_ASSET: 'Ativo imobilizado',
  LOW_VALUE_EXPENSE: 'Despesa / baixo valor',
};

const PoliticaPatrimonialPage = () => {
  const [policies, setPolicies] = useState<ApiAssetPolicy[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = () => inventoryApi.listAssetPolicies().then(setPolicies).catch((error) => {
    toast.error(error instanceof Error ? error.message : 'Erro ao carregar a política');
  });

  useEffect(() => { void load(); }, []);

  const change = (id: number, values: Partial<ApiAssetPolicy>) => {
    setPolicies(current => current.map(item => item.id === id ? { ...item, ...values } : item));
  };

  const save = async (policy: ApiAssetPolicy, applyToExisting: boolean) => {
    setBusyId(policy.id);
    try {
      const saved = await inventoryApi.updateAssetPolicy(policy.id, {
        assetType: policy.assetType,
        accountingCategory: policy.accountingCategory,
        accountingGroup: policy.accountingGroup,
        accountingTreatment: policy.accountingTreatment,
        usefulLifeMonths: Number(policy.usefulLifeMonths),
        residualRate: Number(policy.residualRate),
        depreciationMethod: policy.depreciationMethod,
        active: policy.active,
        applyToExisting,
      });
      change(policy.id, saved);
      toast.success(applyToExisting ? 'Política salva e aplicada aos bens existentes' : 'Política salva para novos bens');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar a política');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppShell active="politica">
      <div className="flex min-h-full flex-col gap-5 bg-paper px-4 py-6 md:px-7">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-[34px] font-semibold leading-none text-primary">Política patrimonial interna</h2>
            <Badge variant="outline" className="border-champagne/60 bg-champagne/10 text-primary">v1.0</Badge>
          </div>
          <p className="max-w-4xl text-sm text-muted-foreground">
            Parâmetros gerenciais de vida útil e depreciação. A política não substitui a classificação da contabilidade oficial.
          </p>
        </div>

        <div className="max-w-[1380px] overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="grid grid-cols-[150px_190px_190px_180px_105px_95px_90px_1fr] gap-3 border-b border-border bg-paper-2 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Categoria</span><span>Categoria contábil</span><span>Grupo interno</span><span>Tratamento</span>
            <span>Vida útil</span><span>Taxa anual</span><span>Residual</span><span>Ações</span>
          </div>
          {policies.map(policy => (
            <div key={policy.id} className="grid grid-cols-[150px_190px_190px_180px_105px_95px_90px_1fr] items-center gap-3 border-b border-border/70 px-5 py-3 last:border-b-0">
              <Input value={policy.assetType} onChange={event => change(policy.id, { assetType: event.target.value })} className="h-9" />
              <Input value={policy.accountingCategory} onChange={event => change(policy.id, { accountingCategory: event.target.value })} className="h-9" />
              <Input value={policy.accountingGroup || ''} onChange={event => change(policy.id, { accountingGroup: event.target.value })} className="h-9" />
              <Select value={policy.accountingTreatment} onValueChange={value => change(policy.id, { accountingTreatment: value })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(TREATMENT_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
              <div className="relative"><Input type="number" min={1} value={policy.usefulLifeMonths} onChange={event => change(policy.id, { usefulLifeMonths: Number(event.target.value) })} className="h-9 pr-10" /><span className="pointer-events-none absolute right-2 top-2.5 text-[11px] text-muted-foreground">meses</span></div>
              <div className="text-sm"><strong>{(1200 / Math.max(policy.usefulLifeMonths, 1)).toFixed(2)}%</strong><div className="text-[10px] text-muted-foreground">linear</div></div>
              <div className="relative"><Input type="number" min={0} max={100} step="0.01" value={policy.residualRate} onChange={event => change(policy.id, { residualRate: Number(event.target.value) })} className="h-9 pr-7" /><span className="pointer-events-none absolute right-2 top-2.5 text-xs text-muted-foreground">%</span></div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={busyId === policy.id} onClick={() => save(policy, false)}>Só novos</Button>
                <Button size="sm" disabled={busyId === policy.id} onClick={() => save(policy, true)}>Salvar e recalcular</Button>
                <span className="text-[11px] text-muted-foreground">v{policy.policyVersion}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="max-w-4xl rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <strong className="text-foreground">Regra de cálculo:</strong> método linear sobre o valor de aquisição menos o valor residual, dividido pela vida útil em meses. A depreciação começa na data em que o bem fica disponível para uso. “Só novos” preserva os bens existentes; “Salvar e recalcular” aplica a nova versão à categoria inteira.
        </div>
      </div>
    </AppShell>
  );
};

export default PoliticaPatrimonialPage;
