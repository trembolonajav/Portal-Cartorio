import { useEffect, useState } from 'react';
import { inventoryApi, type ApiPhysicalCheck, type ApiHistoryEvent } from '@/lib/inventory-api';

export const checkLabel = { FOUND: 'Encontrado', NOT_FOUND: 'Não encontrado', DIVERGENCE: 'Divergência' };
export const conferenceDate = (value?: string | null) => value ? new Date(value).toLocaleString('pt-BR') : 'Data não informada';
const divergenceLabel: Record<string, string> = {
  WRONG_LOCATION: 'Local errado', WRONG_OWNER: 'Responsável diferente', WRONG_DESCRIPTION: 'Descrição incorreta',
  NO_TAG: 'Sem etiqueta', DAMAGED: 'Danificado', DISPOSED_FOUND: 'Baixado mas encontrado', NEW_UNREGISTERED: 'Novo / não cadastrado',
};

export function ConferenceHistory({ assetId, stationId, revision, movements = false }: {
  assetId?: string; stationId?: string; revision?: unknown; movements?: boolean;
}) {
  const [checks, setChecks] = useState<ApiPhysicalCheck[]>([]);
  const [events, setEvents] = useState<ApiHistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(false);
    Promise.all([
      assetId ? inventoryApi.checkHistory(assetId) : inventoryApi.stationChecks(stationId!),
      stationId ? (movements ? inventoryApi.stationHistory(stationId) : Promise.resolve([])) : Promise.resolve([]),
      stationId ? inventoryApi.conferenceFinalizations(stationId) : Promise.resolve([]),
    ]).then(([records, history, finalizations]) => {
      if (active) { setChecks(records); setEvents([...history, ...finalizations]); }
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [assetId, stationId, revision, movements, attempt]);

  if (loading) return <p className="py-3 text-xs text-muted-foreground">Carregando histórico…</p>;
  if (error) return <p role="alert" className="py-3 text-xs text-destructive">Não foi possível carregar o histórico. <button className="underline" onClick={() => setAttempt(a => a + 1)}>Tentar novamente</button></p>;
  const timeline = [
    ...checks.map(c => ({ key: `check-${c.id}`, date: c.checkedAt, check: c, event: null })),
    ...events.map((e, i) => ({ key: `event-${i}`, date: e.timestamp, check: null, event: e })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  return <div className="mt-3 space-y-3 text-xs">
    <p className="font-semibold">Conferências registradas: {checks.length}</p>
    {timeline.length === 0 && <p className="text-muted-foreground">Nenhum registro de conferência.</p>}
    <div className="max-h-96 space-y-3 overflow-y-auto">
      {timeline.map(({ key, date, check: c, event }) => <div key={key} className="rounded-lg border border-border p-3">
        {c ? <>
          <p className="font-semibold">{c.assetCode} · {checkLabel[c.result]}</p>
          <p className="text-muted-foreground">{c.assetDescription}</p>
          <p>{conferenceDate(date)} · por {c.checkedBy}</p>
          <p>Local da conferência: {c.stationCode ?? 'Não informado'}</p>
          <p>Local cadastrado antes: {c.expectedStationCode ?? 'Sem estação'}</p>
          {c.divergenceType && <p className="font-medium">{divergenceLabel[c.divergenceType] ?? c.divergenceType}</p>}
          {c.note && <p className="mt-1 whitespace-pre-wrap">{c.note}</p>}
        </> : <><p className="font-medium">{event!.description}</p><p className="text-muted-foreground">{conferenceDate(date)}</p></>}
      </div>)}
    </div>
  </div>;
}
