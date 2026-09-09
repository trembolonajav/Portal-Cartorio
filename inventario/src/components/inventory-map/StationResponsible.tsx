import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useInventoryStore } from '@/features/inventory-map/store/useInventoryStore';
import { toast } from 'sonner';

export default function StationResponsible({ stationId }: { stationId: string }) {
  const isAdmin = useAuthStore(s => s.user?.role === 'ADMIN');
  const { employees, stations, departments, changeStationResponsible } = useInventoryStore();
  const station = stations.find(s => s.id === stationId);
  const currentId = station?.responsibleEmployeeId ?? employees.find(e => e.stationId === stationId)?.id ?? '';
  const current = employees.find(e => e.id === currentId);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmMove, setConfirmMove] = useState(false);
  const [error, setError] = useState('');
  const selectedEmployee = employees.find(e => e.id === selected);
  const previous = selected ? stations.filter(s => s.id !== stationId &&
    (s.responsibleEmployeeId === selected || s.id === selectedEmployee?.stationId)) : [];
  const options = employees.filter(e => e.status === 'ACTIVE' || e.id === currentId)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'pt-BR'));

  const save = async (forceMove = false) => {
    if (!isAdmin || saving) return;
    if (previous.length && !forceMove) { setConfirmMove(true); return; }
    setSaving(true); setError('');
    try {
      await changeStationResponsible(stationId, selected || null, forceMove);
      toast.success(selected ? 'Responsável atualizado' : 'Estação sem responsável');
      setEditing(false); setConfirmMove(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível atualizar o responsável');
      setConfirmMove(false);
    } finally { setSaving(false); }
  };

  return <section className="rounded-lg border border-border bg-paper-2/50 p-3" aria-label="Responsável pela estação">
    <div className="flex items-center gap-2">
      <UserRound className="h-4 w-4 shrink-0 text-brass-ink" />
      <div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">Responsável</p><p className="break-words text-sm font-medium">{current?.fullName ?? 'Sem responsável'}</p></div>
      {isAdmin && !editing && <Button variant="outline" size="sm" className="h-8" onClick={() => { setSelected(currentId); setError(''); setConfirmMove(false); setEditing(true); }}>{current ? 'Alterar' : 'Vincular pessoa'}</Button>}
    </div>
    {editing && isAdmin && <div className="mt-3 space-y-3">
      <label htmlFor={`responsible-${stationId}`} className="block text-xs font-medium">Funcionário responsável</label>
      <select id={`responsible-${stationId}`} value={selected} disabled={saving} onChange={e => { setSelected(e.target.value); setConfirmMove(false); setError(''); }} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <option value="">Sem responsável</option>
        {options.map(e => <option key={e.id} value={e.id}>{e.fullName}{e.status !== 'ACTIVE' ? ' (inativo)' : ''}{e.departmentId ? ` — ${departments.find(d => d.id === e.departmentId)?.name ?? 'Sem departamento'}` : ''}</option>)}
      </select>
      {options.length === 0 && <p className="text-xs text-muted-foreground">Cadastre a pessoa na tela Funcionários para vinculá-la.</p>}
      {confirmMove && <div role="alert" className="rounded-md border border-brass/40 bg-brass/10 p-3 text-sm">
        <p>{selectedEmployee?.fullName} já é responsável por {previous.map(s => s.code).join(', ')}. Ao confirmar, essas estações ficarão sem essa pessoa como responsável. Os patrimônios permanecem nas estações.</p>
        <Button size="sm" className="mt-2" disabled={saving} onClick={() => void save(true)}>Confirmar mudança de estação</Button>
      </div>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        {!confirmMove && <Button size="sm" disabled={saving || selected === currentId} onClick={() => void save()}>{saving ? 'Salvando...' : 'Salvar responsável'}</Button>}
        <Button variant="outline" size="sm" disabled={saving} onClick={() => { setEditing(false); setConfirmMove(false); }}>Cancelar</Button>
      </div>
    </div>}
  </section>;
}
