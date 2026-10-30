import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useInventoryStore } from '@/features/inventory-map/store/useInventoryStore';
import { inventoryApi, type ApiHistoryEvent, type ApiEquipmentExchangeTerm, type ApiAssetDisposal, type ApiAssetDocument } from '@/lib/inventory-api';
import { getStoredAuth } from '@/lib/auth';
import { ConferenceHistory } from '@/components/ConferenceHistory';
import { toast } from 'sonner';

/*
 * Ficha do patrimônio — porta fiel do design da pasta de referência
 * ("Ficha Patrimonial.dc.html"): barra de situação com stepper de ciclo,
 * três colunas (o bem · rastreio · posse/valor), timeline com pontos coloridos,
 * depreciação em tiles. Todos os campos são ligados ao dado real do backend;
 * o que não temos aparece como "—" no mesmo formato do design.
 */

const NAVY = '#00234B', DKNAVY = '#0B2347', GOLD = '#8A6E32', CHAMP = '#D7C5AC';
const INK = '#1B2430', INK2 = '#3D4653', MUT = '#6B7480', MUT2 = '#8A8F96';
const BORDER = '#E4E0DB', LINE = '#F0EDE8', PAPER = '#F3F1EE';
const RED = '#B4342B', BLUE = '#2E5AAC', GREEN = '#2F7A54', BRASS = '#A87413';
const MONO = "'IBM Plex Mono', monospace", SERIF = "'Cormorant Garamond', Georgia, serif";

const card: CSSProperties = { background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' };
const kicker: CSSProperties = { fontFamily: MONO, fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', color: GOLD };
const valR: CSSProperties = { fontSize: 13, color: INK, fontWeight: 500, textAlign: 'right' };
const monoR: CSSProperties = { fontSize: 12.5, color: INK, fontFamily: MONO, textAlign: 'right', wordBreak: 'break-all' };
const mutedR: CSSProperties = { fontSize: 13, color: MUT2, textAlign: 'right' };

const STATUS_LABEL: Record<string, string> = { ACTIVE: 'Em uso', INACTIVE: 'Inativo', MAINTENANCE: 'Em manutenção', DISPOSED: 'Baixado', IN_STOCK: 'Em estoque', VOIDED: 'Anulado' };
const parseLocalDate = (v?: string | null) => (v ? new Date(`${v}T12:00:00`) : null);
const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—');
const fmtDateTime = (v?: string | null) => (v ? new Date(v).toLocaleString('pt-BR') : '—');
const fmtMY = (d?: Date | null) => (d ? d.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }) : '—');
const initials = (n?: string) => (n ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '?';

const openStoredDocument = async (document: ApiAssetDocument) => {
  const auth = getStoredAuth();
  try {
    const response = await fetch(inventoryApi.assetDocumentUrl(document.id), {
      headers: auth?.token ? { Authorization: auth.token } : undefined,
    });
    if (!response.ok) throw new Error('Falha ao abrir documento');
    const blob = await response.blob();
    window.open(URL.createObjectURL(blob), '_blank', 'noopener');
  } catch {
    toast.error('NÃ£o foi possÃ­vel abrir o documento');
  }
};

// Cor/halo do ponto na timeline conforme o tipo do evento.
const eventColor = (ev: ApiHistoryEvent): [string, string] => {
  const t = `${ev.type ?? ''} ${ev.description ?? ''}`.toLowerCase();
  if (t.includes('cadastr') || t.includes('creat')) return [NAVY, '#E6EBF2'];
  if (t.includes('receb')) return [BRASS, '#F5EBD7'];
  if (t.includes('entreg') || t.includes('vincul') || t.includes('assign')) return [GREEN, '#E3F0E8'];
  if (t.includes('baix') || t.includes('dispos') || t.includes('anul') || t.includes('void')) return [RED, '#F7E7E5'];
  if (t.includes('transfer') || t.includes('troca') || t.includes('exchang') || t.includes('mov')) return [BLUE, '#E7EDF8'];
  return ['#6B7480', '#EEECE9'];
};
const eventTag = (ev: ApiHistoryEvent): string => {
  const t = `${ev.type ?? ''} ${ev.description ?? ''}`.toLowerCase();
  if (t.includes('cadastr') || t.includes('creat')) return 'Cadastro';
  if (t.includes('receb')) return 'Recebimento';
  if (t.includes('entreg') || t.includes('assign')) return 'Entrega';
  if (t.includes('baix') || t.includes('dispos')) return 'Baixa';
  if (t.includes('status') || t.includes('situa')) return 'Situação';
  if (t.includes('transfer') || t.includes('troca') || t.includes('exchang')) return 'Movimentação';
  return 'Registro';
};

const FichaPatrimonioPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const assets = useInventoryStore(s => s.assets);
  const getStationForAsset = useInventoryStore(s => s.getStationForAsset);
  const getEmployeeForStation = useInventoryStore(s => s.getEmployeeForStation);

  const asset = useMemo(() => assets.find(a => a.id === id), [assets, id]);
  const station = asset ? getStationForAsset(asset.id) : null;
  const employee = station ? getEmployeeForStation(station.id) : null;

  const [history, setHistory] = useState<ApiHistoryEvent[]>([]);
  const [docs, setDocs] = useState<ApiEquipmentExchangeTerm[]>([]);
  const [assetDocuments, setAssetDocuments] = useState<ApiAssetDocument[]>([]);
  const [disposals, setDisposals] = useState<ApiAssetDisposal[]>([]);
  const [specsOpen, setSpecsOpen] = useState(false);
  const [filter, setFilter] = useState('Tudo');
  const documentInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!asset) return;
    inventoryApi.assetHistory(asset.id).then(setHistory).catch(() => setHistory([]));
    inventoryApi.listExchangeTerms()
      .then(l => setDocs(l.filter(t => t.retiredAssetId === Number(asset.id) || t.deliveredAssetId === Number(asset.id))))
      .catch(() => setDocs([]));
    inventoryApi.listDisposalsForAsset(asset.id).then(setDisposals).catch(() => setDisposals([]));
    inventoryApi.listAssetDocuments(asset.id).then(setAssetDocuments).catch(() => setAssetDocuments([]));
  }, [asset]);

  const uploadDocument = async (file?: File | null) => {
    if (!asset || !file) return;
    try {
      await inventoryApi.uploadAssetDocument({
        type: 'OTHER',
        title: file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' '),
        assetIds: [asset.id],
        file,
      });
      setAssetDocuments(await inventoryApi.listAssetDocuments(asset.id));
      toast.success('Documento anexado ao patrimÃ´nio');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'NÃ£o foi possÃ­vel anexar o documento');
    } finally {
      if (documentInput.current) documentInput.current.value = '';
    }
  };

  if (!asset) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: PAPER, color: MUT }}>
        <p style={{ fontSize: 14 }}>Patrimônio não encontrado.</p>
        <button onClick={() => navigate('/patrimonios')} style={{ height: 34, padding: '0 14px', border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', fontSize: 13 }}>Voltar aos patrimônios</button>
      </div>
    );
  }

  const status = asset.status as string;
  const currentDisposal = disposals.find(item => item.status === 'FINALIZED') ?? disposals[0] ?? null;

  // ---- depreciação (política linear em meses) ----
  const money = (n?: number | null) => (n == null ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  const acqVal = asset.acquisitionValue ?? null;
  const rate = asset.depreciationRate ?? null;
  const acqDate = parseLocalDate(asset.acquisitionDate);
  const depreciationStart = parseLocalDate(asset.depreciationStartDate);
  const lifeMonths = asset.usefulLifeMonths ?? (asset.usefulLifeYears != null ? asset.usefulLifeYears * 12 : null);
  const monthsElapsed = depreciationStart ? Math.max(0, (Date.now() - depreciationStart.getTime()) / (365.25 / 12 * 864e5)) : null;
  const residualFloor = asset.residualValue ?? 0;
  const depreciableBase = acqVal != null ? Math.max(acqVal - residualFloor, 0) : null;
  const monthlyDepreciation = depreciableBase != null && lifeMonths ? depreciableBase / lifeMonths : null;
  const elapsedForDepreciation = monthsElapsed != null && lifeMonths ? Math.min(monthsElapsed, lifeMonths) : null;
  const deprec = monthlyDepreciation != null && elapsedForDepreciation != null ? monthlyDepreciation * elapsedForDepreciation : (acqVal != null ? 0 : null);
  const currentValue = acqVal != null && deprec != null ? Math.max(residualFloor, acqVal - deprec) : null;
  const depPct = elapsedForDepreciation != null && lifeMonths ? elapsedForDepreciation / lifeMonths * 100 : 0;
  const ageMonths = monthsElapsed ?? (acqDate ? Math.max(0, (Date.now() - acqDate.getTime()) / (365.25 / 12 * 864e5)) : null);
  const ageLabel = ageMonths == null ? '—' : (() => {
    const y = Math.floor(ageMonths / 12), m = Math.floor(ageMonths % 12);
    if (y <= 0) return `${m} ${m === 1 ? 'mês' : 'meses'}`;
    return `${y} ${y === 1 ? 'ano' : 'anos'}${m ? ` e ${m} ${m === 1 ? 'mês' : 'meses'}` : ''}`;
  })();
  const warranty = parseLocalDate(asset.warrantyUntil);
  const warrantyLabel = warranty ? `${warranty < new Date() ? 'expirada em' : 'até'} ${fmtMY(warranty)}` : null;
  const lifeExpired = lifeMonths != null && monthsElapsed != null && monthsElapsed >= lifeMonths;
  const attention = status === 'MAINTENANCE' || lifeExpired;

  // ---- stepper de ciclo ----
  const stepIndex = status === 'DISPOSED' || status === 'VOIDED' ? 4
    : status === 'ACTIVE' || status === 'MAINTENANCE' ? 3
    : status === 'IN_STOCK' || status === 'INACTIVE' ? 2 : 2;
  const stepDefs: { label: string; when: string }[] = [
    { label: 'Adquirido', when: fmtMY(acqDate) },
    { label: 'Cadastrado', when: fmtDate(asset.importedAt) },
    { label: 'Em estoque', when: stepIndex >= 2 ? (asset.importedAt ? fmtDate(asset.importedAt) : 'sim') : '—' },
    { label: 'Em uso', when: asset.assignedAt ? fmtDate(asset.assignedAt) : '—' },
    { label: 'Baixado', when: currentDisposal?.finalizedAt ? fmtDate(currentDisposal.finalizedAt) : '—' },
  ];

  // ---- badge de status ----
  const badge = ((): { color: string; bg: string; bd: string; line: string } => {
    switch (status) {
      case 'ACTIVE': return { color: GREEN, bg: '#EAF3ED', bd: '#BFDCCB', line: station ? `na estação ${station.code}` : 'em uso' };
      case 'IN_STOCK': return { color: BLUE, bg: '#EDF2FB', bd: '#C7D6F0', line: 'aguardando entrega' };
      case 'MAINTENANCE': return { color: BRASS, bg: '#FBF3E3', bd: '#EAD9B5', line: 'em manutenção' };
      case 'DISPOSED': return { color: RED, bg: '#FBEDEC', bd: '#F0C9C5', line: currentDisposal ? `baixa ${currentDisposal.number}` : 'baixado' };
      case 'VOIDED': return { color: RED, bg: '#FBEDEC', bd: '#F0C9C5', line: 'cadastro anulado' };
      default: return { color: MUT, bg: '#EEECE9', bd: BORDER, line: '' };
    }
  })();

  const title = [asset.manufacturer, asset.model].filter(Boolean).join(' ') || asset.description;
  const specLine = [asset.type, asset.manufacturer, asset.model, asset.serialNumber && `s/n ${asset.serialNumber}`].filter(Boolean).join(' · ');

  const headerBtn: CSSProperties = { height: 36, padding: '0 14px', border: '1px solid rgba(255,255,255,.35)', borderRadius: 8, display: 'flex', alignItems: 'center', fontSize: 13.5, color: '#fff', background: 'transparent', cursor: 'pointer' };

  // Linhas de identificação / aquisição / onde está / ciclo
  const ident: { k: string; v: string; vs: CSSProperties }[] = [
    { k: 'Patrimônio', v: asset.assetCode, vs: monoR },
    { k: 'Nº de série', v: asset.serialNumber || '—', vs: monoR },
    { k: 'Categoria', v: asset.type || '—', vs: valR },
    { k: 'Fabricante · modelo', v: [asset.manufacturer, asset.model].filter(Boolean).join(' ') || '—', vs: valR },
    { k: 'Grupo interno', v: asset.accountingGroup || '—', vs: asset.accountingGroup ? valR : mutedR },
    { k: 'Categoria contábil', v: asset.accountingCategory || '—', vs: asset.accountingCategory ? valR : mutedR },
    { k: 'Condição inicial', v: asset.initialCondition || '—', vs: asset.initialCondition ? valR : mutedR },
    { k: 'Conservação atual', v: ({ NEW: 'Novo', EXCELLENT: 'Excelente', GOOD: 'Bom', FAIR: 'Regular', POOR: 'Ruim', UNSERVICEABLE: 'Inservível' } as Record<string, string>)[asset.conditionGrade || ''] || '—', vs: asset.conditionGrade ? valR : mutedR },
    { k: 'Funcionamento', v: ({ WORKING: 'Funcional', PARTIALLY_WORKING: 'Parcialmente funcional', NOT_TESTED: 'Não testado', NOT_WORKING: 'Inoperante' } as Record<string, string>)[asset.functionalStatus || ''] || '—', vs: asset.functionalStatus ? valR : mutedR },
    { k: 'Origem', v: asset.origin === 'LEGACY_GLPI' ? 'GLPI (carga inicial)' : 'Cadastro manual', vs: valR },
  ];
  const specs = [
    { k: 'Fabricante', v: asset.manufacturer }, { k: 'Modelo', v: asset.model },
    { k: 'P/N comercial', v: asset.partNumber }, { k: 'Modelo regulatório', v: asset.regulatoryModel },
    { k: 'Nº de série', v: asset.serialNumber }, { k: 'Processador', v: asset.processor },
    { k: 'Memória RAM', v: asset.ram }, { k: 'Armazenamento', v: asset.storage },
    { k: 'Sistema', v: asset.os }, { k: 'Cor', v: asset.color },
    { k: 'NCM', v: asset.ncm }, { k: 'EAN', v: asset.ean },
    { k: 'UPC', v: asset.upc }, { k: 'Grupo GLPI', v: asset.glpiGroup },
  ].filter(s => s.v) as { k: string; v: string }[];

  const stockSinceEv = history.find(h => /para\s+IN_STOCK/i.test(h.description || '') || /em estoque/i.test(`${h.type ?? ''} ${h.description ?? ''}`));
  const stockSince = stockSinceEv?.timestamp || asset.importedAt || null;
  const linkedTerm = docs[0]?.number || disposals[0]?.number || null;
  const invoiceDocument = assetDocuments.find(document => document.type === 'INVOICE' && (!asset.fiscalNote || document.documentNumber === asset.fiscalNote))
    ?? assetDocuments.find(document => document.type === 'INVOICE');

  const where = station ? {
    place: `${station.code} · ${station.name}`,
    sub: 'Cartório Índio Artiaga',
    rows: [
      { k: 'Responsável', v: employee?.fullName || 'Ninguém', vs: employee ? valR : mutedR },
      { k: 'Em posse desde', v: fmtDate(asset.assignedAt), vs: asset.assignedAt ? valR : mutedR },
      { k: 'Termo', v: linkedTerm || 'Nenhum vinculado', vs: linkedTerm ? valR : mutedR },
    ],
  } : status === 'DISPOSED' && currentDisposal ? {
    place: 'Patrimônio baixado',
    sub: `processo ${currentDisposal.number}`,
    rows: [
      { k: 'Data', v: fmtDate(currentDisposal.finalizedAt), vs: valR },
      { k: 'Motivo', v: currentDisposal.reason || '—', vs: valR },
      { k: 'Destino', v: currentDisposal.destination || '—', vs: valR },
    ],
  } : {
    place: 'Estoque da T.I.',
    sub: 'sem estação vinculada · aguardando entrega',
    rows: [
      { k: 'Responsável', v: 'Ninguém', vs: mutedR },
      { k: 'Sob guarda de', v: 'Departamento de T.I.', vs: valR },
      { k: 'Em estoque desde', v: fmtDate(stockSince), vs: stockSince ? valR : mutedR },
      { k: 'Em posse desde', v: '—', vs: mutedR },
      { k: 'Termo', v: linkedTerm || 'Nenhum vinculado', vs: linkedTerm ? valR : mutedR },
    ],
  };

  const life = [
    { k: 'Idade', v: ageLabel, sub: acqDate ? 'desde a aquisição' : '', vs: valR },
    { k: 'Vida útil', v: lifeMonths != null ? `${lifeMonths} meses` : '—', sub: lifeExpired ? 'vencida' : (lifeMonths != null ? `${Math.round(depPct)}% decorrida` : ''), vs: valR },
    { k: 'Garantia', v: warrantyLabel || 'A confirmar', sub: '', vs: warrantyLabel ? valR : { fontSize: 13, color: BRASS, fontWeight: 600, textAlign: 'right' } as CSSProperties },
    { k: 'Recomendação', v: attention ? 'substituir' : 'manter', sub: '', vs: { fontSize: 13, color: attention ? RED : GREEN, fontWeight: 600, textAlign: 'right' } as CSSProperties },
  ];

  const depr = [
    { k: 'Por mês', v: money(monthlyDepreciation) },
    { k: 'Acumulada', v: money(deprec) },
    { k: 'Base depreciável', v: money(depreciableBase) },
    { k: 'Valor residual', v: money(residualFloor) },
  ];

  const filteredHistory = history.filter(h => {
    if (filter === 'Tudo') return true;
    const t = `${h.type ?? ''} ${h.description ?? ''}`.toLowerCase();
    if (filter === 'Movimentações') return t.includes('mov') || t.includes('transfer') || t.includes('troca') || t.includes('entreg') || t.includes('receb');
    if (filter === 'Situação') return t.includes('status') || t.includes('situa');
    if (filter === 'Termos') return !!h.sourceProcessNumber;
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: PAPER, fontFamily: "'Instrument Sans', system-ui, sans-serif", color: INK }}>
      {/* header navy */}
      <header style={{ background: DKNAVY, color: '#fff', padding: '14px 28px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px 20px' }}>
        <button onClick={() => navigate('/patrimonios')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, color: 'rgba(255,255,255,.7)' }}>← Patrimônios</button>
        <span style={{ fontFamily: MONO, fontSize: 15, color: CHAMP }}>{asset.assetCode}</span>
        <span style={{ fontSize: 16, fontWeight: 600, flex: '1 1 280px', minWidth: 0 }}>{asset.description}</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={headerBtn} onClick={() => toast.success('Etiqueta enviada para impressão')}>Etiqueta / QR</button>
          <button style={headerBtn} onClick={() => toast.message(status === 'IN_STOCK' ? 'Entregar' : 'Transferir', { description: 'Use o mapa ou a lista para mover o bem.' })}>{status === 'IN_STOCK' ? 'Entregar' : 'Transferir'}</button>
          {status !== 'DISPOSED' && status !== 'VOIDED' && <button style={{ ...headerBtn, background: CHAMP, color: DKNAVY, fontWeight: 600, border: 'none' }} onClick={() => navigate('/baixas-patrimoniais')}>Propor baixa</button>}
        </div>
      </header>

      <div style={{ padding: '20px 24px 40px', maxWidth: 1640, width: '100%', boxSizing: 'border-box', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* resumo + stepper + valor contábil */}
        <section style={{ ...card, flexDirection: 'row', flexWrap: 'wrap', gap: '18px 36px', alignItems: 'center', padding: '18px 22px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 260, flex: '1 1 300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, color: badge.color, background: badge.bg, border: `1px solid ${badge.bd}` }}>{STATUS_LABEL[status] ?? status}</span>
              {badge.line && <span style={{ fontSize: 13, color: MUT }}>{badge.line}</span>}
            </div>
            <h1 style={{ margin: 0, fontFamily: SERIF, fontSize: 30, fontWeight: 600, lineHeight: 1.1, color: NAVY }}>{title}</h1>
            <span style={{ fontSize: 13.5, color: INK2 }}>{specLine}</span>
          </div>
          <div style={{ flex: '2 1 460px', minWidth: 'min(100%,420px)', display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))' }}>
            {stepDefs.map((s, i) => {
              const done = i < stepIndex, cur = i === stepIndex;
              return (
                <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', flexShrink: 0, boxSizing: 'border-box', ...(cur ? { background: BRASS, boxShadow: '0 0 0 4px #F5EBD7' } : done ? { background: NAVY } : { background: '#fff', border: '2px solid #CFCAC2' }) }} />
                    <span style={{ flex: 1, height: 2, margin: '0 4px', visibility: i === stepDefs.length - 1 ? 'hidden' : 'visible', background: i < stepIndex ? NAVY : BORDER }} />
                  </div>
                  <span style={{ fontSize: 13, paddingRight: 8, ...(cur ? { fontWeight: 700, color: INK } : done ? { fontWeight: 600, color: INK } : { color: MUT2 }) }}>{s.label}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: MUT }}>{s.when}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flex: '0 0 auto' }}>
            <span style={kicker}>Valor contábil</span>
            <span style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 600, color: NAVY, lineHeight: 1 }}>{money(currentValue ?? acqVal)}</span>
            <span style={{ fontSize: 12, color: MUT }}>{acqVal != null ? `de ${money(acqVal)} na aquisição` : 'valor de aquisição não informado'}</span>
          </div>
        </section>

        <main style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>

          {/* ESQUERDA — o bem */}
          <div style={{ flex: '1 1 300px', maxWidth: 380, order: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <section style={{ ...card, gap: 4 }}>
              <span style={{ ...kicker, marginBottom: 6 }}>Identificação</span>
              {ident.map(f => (
                <div key={f.k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', padding: '7px 0', borderBottom: `1px solid ${LINE}` }}>
                  <span style={{ fontSize: 12.5, color: MUT, flexShrink: 0 }}>{f.k}</span>
                  <span style={f.vs}>{f.v}</span>
                </div>
              ))}
            </section>

            <section style={{ ...card, gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={kicker}>Aquisição</span>
                <span style={{ fontSize: 12, color: MUT }}>nota fiscal e valores de compra</span>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, background: '#FAF9F7', border: `1px solid ${BORDER}`, borderRadius: 10 }}>
                <div style={{ width: 34, height: 42, border: '1px solid #CFCAC2', borderRadius: 4, background: '#fff', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 5, boxSizing: 'border-box', flexShrink: 0 }}>
                  <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 500, color: RED }}>PDF</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: INK }}>{asset.fiscalNote ? `NF ${asset.fiscalNote}${asset.fiscalNoteSeries ? ` · série ${asset.fiscalNoteSeries}` : ''}` : 'Sem nota fiscal'}</span>
                  <span style={{ fontSize: 12, color: INK2 }}>{asset.supplierName ? `${asset.supplierName}${acqDate ? ` · ${fmtDate(asset.acquisitionDate)}` : ''}` : (acqDate ? `aquisição em ${fmtDate(asset.acquisitionDate)}` : 'data de aquisição não informada')}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => invoiceDocument ? openStoredDocument(invoiceDocument) : toast.message('PDF da nota nÃ£o anexado', { description: 'A nota pode ser consultada na SEFAZ pela chave de acesso.' })} style={{ flex: 1, textAlign: 'center', border: `1px solid #DEDAD3`, background: '#fff', borderRadius: 8, padding: '7px 8px', fontSize: 12.5, fontWeight: 600, color: NAVY, cursor: 'pointer' }}>Abrir nota</button>
                <button onClick={() => window.open('https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConteudo=7PhJ+gAVw2g=', '_blank', 'noopener')} title="Consultar a NF-e no portal nacional da SEFAZ" style={{ flex: 1, textAlign: 'center', border: `1px solid #DEDAD3`, background: '#fff', borderRadius: 8, padding: '7px 8px', fontSize: 12.5, fontWeight: 600, color: NAVY, cursor: 'pointer' }}>Consultar SEFAZ</button>
              </div>
              {asset.nfeAccessKey && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: MUT }}>Chave de acesso</span>
                    <button onClick={() => { try { navigator.clipboard?.writeText(asset.nfeAccessKey!); toast.success('Chave copiada'); } catch { /* ignore */ } }} style={{ border: 'none', background: 'transparent', padding: 0, fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: NAVY, cursor: 'pointer' }}>Copiar</button>
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 12, lineHeight: 1.55, letterSpacing: '.03em', color: INK, wordBreak: 'break-all' }}>{asset.nfeAccessKey}</span>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[
                  { k: 'Valor de aquisição', v: money(acqVal) },
                  ...(asset.acquisitionBatch ? [{ k: 'Lote', v: asset.acquisitionBatch }] : []),
                  ...(asset.nfItemCode ? [{ k: 'Item na NF', v: asset.nfItemCode }] : []),
                  ...(asset.supplierOrder ? [{ k: 'Pedido', v: asset.supplierOrder }] : []),
                  { k: 'Categoria contábil', v: asset.accountingCategory || '—' },
                  { k: 'Taxa de depreciação', v: rate != null ? `${rate}% ao ano` : '—' },
                ].map(f => (
                  <div key={f.k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', padding: '7px 0', borderTop: `1px solid ${LINE}` }}>
                    <span style={{ fontSize: 12.5, color: MUT, flexShrink: 0 }}>{f.k}</span>
                    <span style={monoR}>{f.v}</span>
                  </div>
                ))}
              </div>
            </section>

            {specs.length > 0 && (
              <section style={{ ...card, padding: 0, overflow: 'hidden' }}>
                <button type="button" onClick={() => setSpecsOpen(o => !o)} style={{ width: '100%', border: 'none', background: '#fff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={kicker}>Especificações do modelo</span>
                    <span style={{ fontSize: 12, color: MUT }}>dados técnicos do bem</span>
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: NAVY, whiteSpace: 'nowrap' }}>{specsOpen ? 'Recolher' : `Ver ${specs.length}`}</span>
                </button>
                {specsOpen && (
                  <div style={{ padding: '0 20px 14px', display: 'flex', flexDirection: 'column' }}>
                    {specs.map(f => (
                      <div key={f.k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderTop: `1px solid ${LINE}` }}>
                        <span style={{ fontSize: 12.5, color: MUT }}>{f.k}</span>
                        <span style={{ fontSize: 12.5, color: INK, textAlign: 'right', fontFamily: MONO }}>{f.v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {asset.notes && (
              <section style={{ ...card, gap: 6 }}>
                <span style={kicker}>Observações</span>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: INK2 }}>{asset.notes}</p>
              </section>
            )}
          </div>

          {/* MEIO — rastreio */}
          <section style={{ ...card, flex: '999 1 460px', order: 2, minWidth: 'min(100%,460px)', padding: '20px 24px', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={kicker}>Rastreio do bem</span>
                <span style={{ fontSize: 13, color: MUT }}>{history.length} registro(s)</span>
              </div>
              <button onClick={() => toast.message('Exportar histórico', { description: 'Exportação em breve.' })} style={{ border: `1px solid #DEDAD3`, borderRadius: 8, padding: '7px 12px', fontSize: 12.5, fontWeight: 600, color: NAVY, background: '#fff', cursor: 'pointer' }}>Exportar histórico</button>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Tudo', 'Movimentações', 'Situação', 'Termos'].map(fl => (
                <button key={fl} onClick={() => setFilter(fl)} style={{ fontSize: 12.5, fontWeight: 600, padding: '5px 11px', borderRadius: 20, cursor: 'pointer', ...(filter === fl ? { background: NAVY, color: '#fff', border: `1px solid ${NAVY}` } : { background: '#F5F3F1', color: INK2, border: `1px solid ${BORDER}` }) }}>{fl}</button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredHistory.length === 0 && <span style={{ fontSize: 13, fontStyle: 'italic', color: MUT }}>Nenhum registro neste filtro.</span>}
              {filteredHistory.map((h, i) => {
                const [color, halo] = eventColor(h);
                const last = i === filteredHistory.length - 1;
                const hasMove = !!(h.fromStationCode || h.toStationCode || h.fromEmployeeName || h.toEmployeeName);
                const sm = (h.description || '').match(/de\s+([A-Za-zÀ-ÿ_]+)\s+para\s+([A-Za-zÀ-ÿ_]+)/i);
                const statusPair = !hasMove && sm ? [STATUS_LABEL[sm[1].toUpperCase()] ?? sm[1], STATUS_LABEL[sm[2].toUpperCase()] ?? sm[2]] : null;
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '20px minmax(0,1fr)', gap: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', background: color, boxShadow: `0 0 0 4px ${halo}`, marginTop: 4, flexShrink: 0 }} />
                      <span style={{ flex: 1, width: 2, background: '#ECE8E2', marginTop: 6, visibility: last ? 'hidden' : 'visible' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingBottom: 22, minWidth: 0 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 12px' }}>
                        <span style={{ fontSize: 14.5, fontWeight: 600, color: INK }}>{h.description}</span>
                        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color, border: `1px solid ${color}`, borderRadius: 4, padding: '1px 6px' }}>{eventTag(h)}</span>
                      </div>
                      {hasMove && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12.5, color: INK2, background: '#F5F3F1', border: `1px solid ${BORDER}`, borderRadius: 7, padding: '5px 10px' }}>{h.fromStationCode || h.fromEmployeeName || 'sem origem'}</span>
                          <span style={{ fontSize: 13, color: GOLD }}>→</span>
                          <span style={{ fontSize: 12.5, color: INK, fontWeight: 600, background: '#FAF4E8', border: '1px solid #EAD9B5', borderRadius: 7, padding: '5px 10px' }}>{h.toStationCode || h.toEmployeeName || 'sem destino'}</span>
                        </div>
                      )}
                      {statusPair && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12.5, color: INK2, background: '#F5F3F1', border: `1px solid ${BORDER}`, borderRadius: 7, padding: '5px 10px' }}>{statusPair[0]}</span>
                          <span style={{ fontSize: 13, color: GOLD }}>→</span>
                          <span style={{ fontSize: 12.5, color: INK, fontWeight: 600, background: '#FAF4E8', border: '1px solid #EAD9B5', borderRadius: 7, padding: '5px 10px' }}>{statusPair[1]}</span>
                        </div>
                      )}
                      <span style={{ fontFamily: MONO, fontSize: 11.5, color: MUT }}>{fmtDateTime(h.timestamp)}{h.performedBy ? ` · ${h.performedBy}` : ''}{h.reason ? ` · ${h.reason}` : ''}</span>
                      {h.sourceProcessNumber && <button onClick={() => h.sourceProcessType === 'ASSET_DISPOSAL' && navigate(`/baixas-patrimoniais?process=${h.sourceProcessId}`)} style={{ alignSelf: 'flex-start', border: 'none', background: 'transparent', padding: 0, color: BLUE, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>Processo de origem: {h.sourceProcessNumber}</button>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={kicker}>Chamados deste bem</span>
              <span style={{ fontSize: 13, color: MUT }}>Os chamados vinculados a este patrimônio ficam no módulo Chamados do portal.</span>
            </div>
          </section>

          {/* DIREITA — posse, valor, situação */}
          <aside style={{ flex: '1 1 300px', maxWidth: 380, order: 3, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <section style={{ ...card, gap: 10 }}>
              <span style={kicker}>Onde está agora</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: status === 'DISPOSED' ? RED : INK }}>{where.place}</span>
                <span style={{ fontSize: 12.5, color: MUT }}>{where.sub}</span>
              </div>
              {employee && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, borderTop: `1px solid ${LINE}`, paddingTop: 10 }}>
                  <span style={{ width: 36, height: 36, borderRadius: '50%', background: '#E9E4DA', color: '#5B4A28', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>{initials(employee.fullName)}</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <strong style={{ fontSize: 14, color: INK }}>{employee.fullName}</strong>
                    <span style={{ fontSize: 12, color: MUT }}>responsável{asset.assignedAt ? ` desde ${fmtDate(asset.assignedAt)}` : ''}</span>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {where.rows.map(w => (
                  <div key={w.k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', padding: '7px 0', borderTop: `1px solid ${LINE}` }}>
                    <span style={{ fontSize: 12.5, color: MUT, flexShrink: 0 }}>{w.k}</span>
                    <span style={w.vs}>{w.v}</span>
                  </div>
                ))}
              </div>
              {status === 'IN_STOCK' && <button onClick={() => navigate('/')} style={{ textAlign: 'center', background: NAVY, color: '#fff', borderRadius: 8, padding: '9px 13px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Entregar a uma estação</button>}
              {status === 'DISPOSED' && currentDisposal && <button onClick={() => navigate(`/baixas-patrimoniais?process=${currentDisposal.id}`)} style={{ textAlign: 'center', background: NAVY, color: '#fff', borderRadius: 8, padding: '9px 13px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Visualizar processo de baixa</button>}
            </section>

            <section style={{ ...card, gap: 4 }}>
              <span style={{ ...kicker, marginBottom: 6 }}>Ciclo de vida</span>
              {life.map(l => (
                <div key={l.k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', padding: '7px 0', borderBottom: `1px solid ${LINE}` }}>
                  <span style={{ fontSize: 12.5, color: MUT }}>{l.k}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                    <span style={l.vs}>{l.v}</span>
                    {l.sub && <span style={{ fontSize: 11.5, color: MUT, textAlign: 'right' }}>{l.sub}</span>}
                  </span>
                </div>
              ))}
            </section>

            <section style={{ ...card, gap: 12 }}>
              <span style={kicker}>Depreciação</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ height: 6, background: LINE, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.round(depPct)}%`, background: NAVY, borderRadius: 3 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5, color: MUT }}>
                  <span>{depreciationStart ? `${Math.round(depPct)}% depreciado` : 'não iniciada'}</span>
                  <span>{lifeMonths != null ? `${lifeMonths} meses · linear` : '—'}</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {depr.map(d => (
                  <div key={d.k} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 10px', background: '#FAF9F7', border: '1px solid #EFEBE5', borderRadius: 9 }}>
                    <span style={{ fontSize: 11, color: MUT }}>{d.k}</span>
                    <span style={{ fontFamily: MONO, fontSize: 13, color: INK }}>{d.v}</span>
                  </div>
                ))}
              </div>
              {rate != null && <span style={{ fontSize: 11.5, color: MUT, lineHeight: 1.5 }}>Política patrimonial interna · taxa {rate}% ao ano · residual {money(residualFloor)}</span>}
            </section>

            <section style={{ ...card, gap: 9 }}>
              <span style={kicker}>Documentos</span>
              {assetDocuments.length === 0 && docs.length === 0 && disposals.length === 0 && <span style={{ fontSize: 13, fontStyle: 'italic', color: MUT }}>Nenhum documento vinculado.</span>}
              {assetDocuments.map(document => (
                <button key={`document-${document.id}`} onClick={() => openStoredDocument(document)} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', padding: '9px 11px', border: `1px solid ${BORDER}`, borderRadius: 9, background: '#FAF9F7', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 12.8, fontWeight: 600, color: INK }}>{document.title}</span>
                    <span style={{ fontSize: 11.5, color: MUT }}>{[document.documentNumber, document.issueDate ? fmtDate(document.issueDate) : null].filter(Boolean).join(' Â· ') || document.fileName}</span>
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.06em', color: document.type === 'INVOICE' ? GOLD : BLUE, whiteSpace: 'nowrap' }}>{document.type === 'INVOICE' ? 'FISCAL' : document.type === 'RECEIPT_TERM' ? 'RECEBIMENTO' : 'ARQUIVO'}</span>
                </button>
              ))}
              {docs.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', padding: '9px 11px', border: `1px solid ${BORDER}`, borderRadius: 9, background: '#FAF9F7' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 12.8, fontWeight: 600, color: INK }}>{t.number}</span>
                    <span style={{ fontSize: 11.5, color: MUT }}>termo de troca</span>
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.06em', color: GOLD, whiteSpace: 'nowrap' }}>TROCA</span>
                </div>
              ))}
              {disposals.map(d => (
                <button key={d.id} onClick={() => navigate(`/baixas-patrimoniais?process=${d.id}`)} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', padding: '9px 11px', border: `1px solid ${BORDER}`, borderRadius: 9, background: '#FAF9F7', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 12.8, fontWeight: 600, color: d.status === 'FINALIZED' ? RED : INK }}>{d.number}</span>
                    <span style={{ fontSize: 11.5, color: MUT }}>baixa {d.status === 'FINALIZED' ? 'finalizada' : 'em andamento'}</span>
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.06em', color: d.status === 'FINALIZED' ? RED : BRASS, whiteSpace: 'nowrap' }}>BAIXA</span>
                </button>
              ))}
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <button onClick={() => documentInput.current?.click()} style={{ alignSelf: 'flex-start', fontSize: 12.5, fontWeight: 600, color: NAVY, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>Anexar documento</button>
                <button onClick={() => navigate('/arquivo?tab=documentos')} style={{ alignSelf: 'flex-start', fontSize: 12.5, fontWeight: 600, color: NAVY, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>Ver no arquivo</button>
                <input ref={documentInput} type="file" accept="application/pdf,image/*" className="hidden" onChange={event => uploadDocument(event.target.files?.[0])} />
              </div>
            </section>

            <section style={{ ...card, gap: 12 }}>
              <span style={kicker}>Etiqueta e conferência</span>
              <ConferenceHistory assetId={asset.id} revision={asset} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 54, height: 54, flexShrink: 0, border: `1px solid ${INK}`, background: 'repeating-conic-gradient(#1B2430 0 25%, #fff 0 50%) 0 0/12px 12px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: MONO, fontSize: 14, color: INK }}>{asset.assetCode}</span>
                  <span style={{ fontSize: 12, color: MUT }}>etiqueta patrimonial</span>
                </div>
                <button onClick={() => toast.success('Etiqueta enviada para impressão')} style={{ fontSize: 12.5, fontWeight: 600, color: NAVY, background: 'transparent', border: 'none', cursor: 'pointer' }}>Reimprimir</button>
              </div>
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
};

export default FichaPatrimonioPage;
