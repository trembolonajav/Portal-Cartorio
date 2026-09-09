import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useInventoryStore } from '@/features/inventory-map/store/useInventoryStore';
import { inventoryApi, type ApiHistoryEvent, type ApiEquipmentExchangeTerm } from '@/lib/inventory-api';
import { toast } from 'sonner';

/*
 * Porta fiel do artboard 3b "Ficha do patrimônio — rastreio e vida útil".
 * Layout, cores, tipografia e seções reproduzidos 1:1 do material de design.
 * Campos com dado real (código, descrição, série, origem, localização,
 * responsável, rastreio, documentos) são ligados ao backend; campos contábeis
 * ainda não rastreados aparecem como "—" no mesmo formato do design.
 */

const NAVY = '#00234B', GOLD = '#8A6E32', CHAMP = '#D7C5AC', INK = '#1B2430', INK2 = '#3D4653';
const MUT = '#6B7480', MUT2 = '#8A9099', BORDER = '#E4E0DB', LINE = '#EDEAE5', PAPER = '#F5F3F1';
const RED = '#B4342B', BLUE = '#2E5AAC', GREEN = '#2F7A54', BRASS = '#A87413', GREY = '#C9C4BB';
const MONO = "'IBM Plex Mono', monospace", SERIF = "'Cormorant Garamond', serif";

const card: CSSProperties = { background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '18px 20px', display: 'flex', flexDirection: 'column' };
const kicker: CSSProperties = { fontFamily: MONO, fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: GOLD };
const rowSB: CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: 13 };

const STATUS_LABEL: Record<string, string> = { ACTIVE: 'Ativo', INACTIVE: 'Inativo', MAINTENANCE: 'Manutenção', DISPOSED: 'Baixado', IN_STOCK: 'Em estoque' };
const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—');
const fmtDateTime = (v?: string | null) => (v ? new Date(v).toLocaleString('pt-BR') : '—');
const initials = (n?: string) => (n ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '?';

const dotColor = (text: string) => {
  const t = text.toLowerCase();
  if (t.includes('vincul') || t.includes('atual')) return GOLD;
  if (t.includes('manuten')) return BRASS;
  if (t.includes('transfer') || t.includes('mov')) return BLUE;
  return GREY;
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

  useEffect(() => {
    if (!asset) return;
    inventoryApi.assetHistory(asset.id).then(setHistory).catch(() => setHistory([]));
    inventoryApi.listExchangeTerms()
      .then(l => setDocs(l.filter(t => t.retiredAssetId === Number(asset.id) || t.deliveredAssetId === Number(asset.id))))
      .catch(() => setDocs([]));
  }, [asset]);

  if (!asset) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: PAPER, color: MUT }}>
        <p style={{ fontSize: 14 }}>Patrimônio não encontrado.</p>
        <button onClick={() => navigate('/patrimonios')} style={{ height: 34, padding: '0 14px', border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', fontSize: 13 }}>Voltar aos patrimônios</button>
      </div>
    );
  }

  const status = asset.status as string;
  const headerBtn: CSSProperties = { height: 34, padding: '0 14px', border: '1px solid rgba(215,197,172,.45)', borderRadius: 8, display: 'flex', alignItems: 'center', fontSize: 13, color: PAPER, background: 'transparent', cursor: 'pointer' };

  // ---- cálculos contábeis / vida útil (dados reais do V7) ----
  const money = (n?: number | null) => (n == null ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  const acqVal = asset.acquisitionValue ?? null;
  const rate = asset.depreciationRate ?? null;
  const acqDate = asset.acquisitionDate ? new Date(asset.acquisitionDate) : null;
  const yearsElapsed = acqDate ? (Date.now() - acqDate.getTime()) / (365.25 * 864e5) : null;
  let depPct: number | null = null, deprec: number | null = null, residual: number | null = null;
  if (acqVal != null && rate != null && yearsElapsed != null) {
    depPct = Math.min(rate * yearsElapsed, 90);
    deprec = acqVal * depPct / 100;
    residual = acqVal - deprec;
  }
  const ageLabel = (() => {
    if (yearsElapsed == null) return null;
    const y = Math.floor(yearsElapsed);
    const m = Math.round((yearsElapsed - y) * 12);
    return `${y} ${y === 1 ? 'ano' : 'anos'}${m ? ` e ${m} ${m === 1 ? 'mês' : 'meses'}` : ''}`;
  })();
  const overdueYears = asset.usefulLifeYears != null && yearsElapsed != null ? Math.floor(yearsElapsed - asset.usefulLifeYears) : null;
  const lifeExpired = overdueYears != null && overdueYears >= 0;
  const warranty = asset.warrantyUntil ? new Date(asset.warrantyUntil) : null;
  const warrantyLabel = warranty ? `${warranty < new Date() ? 'expirada em' : 'até'} ${warranty.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })}` : null;
  const attention = status === 'MAINTENANCE' || lifeExpired;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: PAPER, fontFamily: "'Instrument Sans', system-ui, sans-serif", color: INK }}>
      {/* barra navy */}
      <div style={{ height: 60, background: NAVY, display: 'flex', alignItems: 'center', gap: 16, padding: '0 22px', flexShrink: 0 }}>
        <button onClick={() => navigate('/patrimonios')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, color: 'rgba(245,243,241,.7)' }}>← Patrimônios</button>
        <span style={{ fontFamily: MONO, fontSize: 14, color: CHAMP }}>{asset.assetCode}</span>
        <span style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>{asset.description}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 9, alignItems: 'center' }}>
          <button style={headerBtn} onClick={() => toast.success('Etiqueta enviada para impressão')}>Etiqueta / QR</button>
          <button style={headerBtn} onClick={() => toast.message('Transferir', { description: 'Use “Mover para estação” na lista ou no mapa.' })}>Transferir</button>
          <button style={{ ...headerBtn, background: CHAMP, color: NAVY, fontWeight: 700, border: 'none' }} onClick={() => navigate('/baixas-patrimoniais')}>Propor baixa</button>
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0, padding: 24, gap: 20, overflow: 'auto' }}>
        {/* ---------- esquerda ---------- */}
        <div style={{ width: 352, display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0 }}>
          <div style={{ ...card, gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={kicker}>Identificação</span>
              <h3 style={{ margin: 0, fontFamily: SERIF, fontSize: 28, fontWeight: 600, color: NAVY, lineHeight: 1.05 }}>{asset.description}</h3>
              <span style={{ fontSize: 13, color: MUT }}>{[asset.type, asset.manufacturer, asset.model].filter(Boolean).join(' · ')}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <div style={rowSB}><span style={{ color: MUT }}>Código</span><span style={{ fontFamily: MONO, color: INK }}>{asset.assetCode}</span></div>
              <div style={rowSB}><span style={{ color: MUT }}>Nº de série</span><span style={{ fontFamily: MONO, color: INK }}>{asset.serialNumber || '—'}</span></div>
              <div style={rowSB}><span style={{ color: MUT }}>Origem do registro</span><span style={{ color: INK }}>{asset.origin === 'LEGACY_GLPI' ? 'GLPI (carga inicial)' : 'Cadastro manual'}</span></div>
              <div style={rowSB}><span style={{ color: MUT }}>Nota fiscal</span><span style={{ color: asset.fiscalNote ? BLUE : MUT2, textDecoration: asset.fiscalNote ? 'underline' : 'none', textUnderlineOffset: 2 }}>{asset.fiscalNote || '—'}</span></div>
              <div style={rowSB}><span style={{ color: MUT }}>Categoria contábil</span><span style={{ color: asset.accountingCategory ? INK : MUT2 }}>{asset.accountingCategory || '—'}</span></div>
            </div>
          </div>

          <div style={{ ...card, gap: 12 }}>
            <span style={kicker}>Onde está agora</span>
            {station ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <strong style={{ fontSize: 15, color: INK }}>Estação {station.code}</strong>
                  <span style={{ fontSize: 13, color: '#5B4A28' }}>Cartório Índio Artiaga › {station.name}</span>
                </div>
                {employee && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, borderTop: `1px solid ${LINE}`, paddingTop: 12 }}>
                    <span style={{ width: 36, height: 36, borderRadius: '50%', background: '#E9E4DA', color: '#5B4A28', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>{initials(employee.fullName)}</span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong style={{ fontSize: 14, color: INK }}>{employee.fullName}</strong>
                      <span style={{ fontSize: 12, color: MUT }}>responsável{asset.assignedAt ? ` desde ${fmtDate(asset.assignedAt)}` : ''}</span>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => navigate('/')} style={{ height: 32, padding: '0 12px', border: '1px solid #C9BCA5', background: '#FBF7F0', color: '#5B4A28', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Ver no mapa</button>
                  <button onClick={() => toast.success('Presença registrada')} style={{ height: 32, padding: '0 12px', border: `1px solid #DEDAD3`, borderRadius: 7, fontSize: 13, color: INK2, background: '#fff', cursor: 'pointer' }}>Conferir presença</button>
                </div>
              </>
            ) : (
              <span style={{ fontSize: 13, fontStyle: 'italic', color: MUT }}>Sem localização · não vinculado a uma estação</span>
            )}
          </div>

          <div style={{ ...card, gap: 11 }}>
            <span style={kicker}>Valores</span>
            {acqVal != null ? (
              <>
                <div style={rowSB}><span style={{ color: MUT }}>Aquisição{acqDate ? ` (${acqDate.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })})` : ''}</span><span style={{ fontFamily: MONO, color: INK }}>{money(acqVal)}</span></div>
                <div style={rowSB}><span style={{ color: MUT }}>Depreciação acumulada</span><span style={{ fontFamily: MONO, color: INK }}>{money(deprec)}</span></div>
                <div style={rowSB}><span style={{ color: MUT }}>Valor residual</span><span style={{ fontFamily: MONO, color: INK }}>{money(residual)}</span></div>
                <div style={{ height: 8, borderRadius: 4, background: LINE, overflow: 'hidden' }}><span style={{ display: 'block', width: `${Math.round(depPct ?? 0)}%`, height: 8, background: '#7C8794' }} /></div>
                <span style={{ fontSize: 12, color: MUT2 }}>{Math.round(depPct ?? 0)}% depreciado{rate != null ? ` · taxa ${rate}% ao ano` : ''}</span>
              </>
            ) : (
              <>
                <div style={rowSB}><span style={{ color: MUT }}>Aquisição</span><span style={{ fontFamily: MONO, color: MUT2 }}>—</span></div>
                <div style={rowSB}><span style={{ color: MUT }}>Depreciação acumulada</span><span style={{ fontFamily: MONO, color: MUT2 }}>—</span></div>
                <div style={rowSB}><span style={{ color: MUT }}>Valor residual</span><span style={{ fontFamily: MONO, color: MUT2 }}>—</span></div>
                <span style={{ fontSize: 12, color: MUT2 }}>Valores contábeis não informados para este bem.</span>
              </>
            )}
          </div>
        </div>

        {/* ---------- centro ---------- */}
        <div style={{ ...card, flex: 1, padding: '20px 24px', gap: 16, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={kicker}>Rastreio do bem</span>
            <span style={{ fontSize: 13, color: MUT }}>{history.length} movimentação(ões)</span>
            <button onClick={() => toast.message('Exportar histórico', { description: 'Exportação em breve.' })} style={{ marginLeft: 'auto', height: 30, padding: '0 12px', border: `1px solid #DEDAD3`, borderRadius: 7, fontSize: 13, color: INK2, background: '#fff', cursor: 'pointer' }}>Exportar histórico</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {history.length === 0 && <span style={{ fontSize: 13, fontStyle: 'italic', color: MUT }}>Sem movimentações registradas.</span>}
            {history.map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16, flexShrink: 0 }}>
                  <span style={{ width: 11, height: 11, borderRadius: '50%', background: dotColor(h.description + h.type), marginTop: 6 }} />
                  {i < history.length - 1 && <span style={{ flex: 1, width: 2, background: BORDER }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: i < history.length - 1 ? 20 : 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <strong style={{ fontSize: 14, color: INK }}>{h.description}</strong>
                  <span style={{ fontSize: 13, color: MUT }}>{fmtDateTime(h.timestamp)}{h.type ? ` · ${h.type}` : ''}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 'auto', borderTop: `1px solid ${LINE}`, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 11 }}>
            <span style={kicker}>Chamados deste bem</span>
            <span style={{ fontSize: 13, color: MUT }}>Os chamados vinculados a este patrimônio ficam no módulo Chamados do portal.</span>
          </div>
        </div>

        {/* ---------- direita ---------- */}
        <div style={{ width: 344, display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0 }}>
          {(() => {
            const life = asset.usefulLifeYears ?? null;
            const venc = acqDate && life != null ? new Date(acqDate.getFullYear() + life, acqDate.getMonth(), acqDate.getDate()) : null;
            const green = life != null && yearsElapsed != null ? Math.max(Math.min(life - 1, yearsElapsed), 0) : 0;
            const gold = life != null && yearsElapsed != null ? Math.max(Math.min(yearsElapsed, life) - (life - 1), 0) : 0;
            const red = life != null && yearsElapsed != null ? Math.max(yearsElapsed - life, 0) : 0;
            const tot = green + gold + red || 1;
            return (
              <div style={{ ...card, gap: 14, ...(attention ? { border: `1px solid #F0D4D1`, boxShadow: `inset 3px 0 0 ${RED}` } : {}) }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ ...kicker, color: attention ? RED : GOLD }}>Ciclo de vida</span>
                  {lifeExpired
                    ? <strong style={{ fontSize: 17, color: RED }}>Vida útil vencida há {overdueYears} {overdueYears === 1 ? 'ano' : 'anos'}</strong>
                    : <strong style={{ fontSize: 17, color: INK }}>{STATUS_LABEL[status] ?? status}</strong>}
                  <span style={{ fontSize: 13, color: MUT }}>
                    {life != null ? `Vida útil contábil de ${life} anos${venc ? ` · ${venc < new Date() ? 'venceu' : 'vence'} em ${venc.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })}` : ''}` : 'Situação atual do bem no inventário'}
                  </span>
                </div>
                {life != null && yearsElapsed != null && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <div style={{ height: 12, borderRadius: 6, background: LINE, display: 'flex', overflow: 'hidden' }}>
                      <span style={{ width: `${green / tot * 100}%`, background: GREEN }} />
                      <span style={{ width: `${gold / tot * 100}%`, background: BRASS }} />
                      <span style={{ width: `${red / tot * 100}%`, background: RED }} />
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#5C6675' }}><span style={{ width: 10, height: 10, borderRadius: 2, background: GREEN }} />em vida útil</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#5C6675' }}><span style={{ width: 10, height: 10, borderRadius: 2, background: BRASS }} />último ano</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#5C6675' }}><span style={{ width: 10, height: 10, borderRadius: 2, background: RED }} />obsoleto</span>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9, borderTop: `1px solid ${LINE}`, paddingTop: 12 }}>
                  <div style={rowSB}><span style={{ color: MUT }}>Idade</span><strong style={{ color: INK, fontWeight: 600 }}>{ageLabel ?? '—'}</strong></div>
                  <div style={rowSB}><span style={{ color: MUT }}>Garantia</span><span style={{ color: warrantyLabel ? MUT2 : MUT2 }}>{warrantyLabel ?? '—'}</span></div>
                  <div style={rowSB}><span style={{ color: MUT }}>Em posse desde</span><strong style={{ color: INK, fontWeight: 600 }}>{fmtDate(asset.assignedAt)}</strong></div>
                  <div style={rowSB}><span style={{ color: MUT }}>Recomendação</span><strong style={{ color: attention ? RED : GREEN, fontWeight: 600 }}>{attention ? 'substituir' : 'manter'}</strong></div>
                </div>
                {lifeExpired && (
                  <button onClick={() => navigate('/baixas-patrimoniais')} style={{ height: 38, background: RED, color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Incluir no plano de baixa</button>
                )}
              </div>
            );
          })()}

          <div style={{ ...card, gap: 12 }}>
            <span style={kicker}>Etiqueta e conferência</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 74, height: 74, border: `1px solid ${BORDER}`, borderRadius: 8, background: 'repeating-conic-gradient(#1B2430 0% 25%, #FFFFFF 0% 50%) 50%/12px 12px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontFamily: MONO, fontSize: 13, color: INK }}>{asset.assetCode}</span>
                <span style={{ fontSize: 12, color: MUT }}>etiqueta patrimonial</span>
              </div>
            </div>
            <button onClick={() => toast.success('Etiqueta enviada para impressão')} style={{ height: 34, border: `1px solid #DEDAD3`, borderRadius: 8, fontSize: 13, color: INK2, background: '#fff', cursor: 'pointer' }}>Reimprimir etiqueta</button>
          </div>

          <div style={{ ...card, gap: 10 }}>
            <span style={kicker}>Documentos</span>
            {docs.length === 0 && <span style={{ fontSize: 13, fontStyle: 'italic', color: MUT }}>Nenhum termo vinculado.</span>}
            {docs.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: BLUE }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: '#7C8794' }} />{t.number} · termo de troca
              </div>
            ))}
            <button onClick={() => navigate('/arquivo')} style={{ marginTop: 2, alignSelf: 'flex-start', fontSize: 13, color: GOLD, textDecoration: 'underline', textUnderlineOffset: 3, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>Ver no arquivo</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FichaPatrimonioPage;
