import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Map, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import type { Space } from '@/features/inventory-map/types/inventoryMap.types';
import { cn } from '@/lib/utils';

export const isSelectableMap = (space: Space) => space.type === 'SECTOR';

export function spaceAncestors(space: Space, spaces: Space[]): Space[] {
  const parents: Space[] = [];
  const seen = new Set([space.id]);
  let parent = spaces.find(s => s.id === space.parentId);
  while (parent && !seen.has(parent.id)) {
    seen.add(parent.id);
    parents.unshift(parent);
    parent = spaces.find(s => s.id === parent!.parentId);
  }
  return parents;
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();

export default function MapSelector({ spaces, value, onChange, disabled = false }: {
  spaces: Space[]; value: string; onChange: (id: string) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const sorted = useMemo(() => [...spaces].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)), [spaces]);
  const maps = sorted.filter(isSelectableMap);
  const selected = maps.find(s => s.id === value);
  const path = (space: Space) => spaceAncestors(space, spaces).map(s => s.name).join(' › ');
  const choose = (id: string) => { onChange(id); setOpen(false); setQuery(''); };
  const mapButton = (space: Space, showPath = false) => (
    <button key={space.id} type="button" aria-current={value === space.id ? 'true' : undefined}
      onClick={() => choose(space.id)}
      className={cn('flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring', value === space.id && 'bg-brass/10 font-semibold text-brass-ink')}>
      <Map className="h-4 w-4 shrink-0 text-brass-ink" />
      <span className="min-w-0 flex-1"><span className="block break-words">{space.name}</span>
        {showPath && <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{path(space) || 'Sem agrupamento'}</span>}
      </span>
      {value === space.id && <Check className="h-4 w-4 shrink-0" />}
    </button>
  );
  const renderBranch = (space: Space, seen = new Set<string>()): React.ReactNode => {
    if (seen.has(space.id)) return null;
    const visited = new Set(seen).add(space.id);
    if (isSelectableMap(space)) return mapButton(space);
    const children = sorted.filter(s => s.parentId === space.id);
    if (space.type === 'FLOOR') {
      const count = maps.filter(m => spaceAncestors(m, spaces).some(p => p.id === space.id)).length;
      const active = expanded === space.id;
      return <div key={space.id} className="my-1">
        <button type="button" aria-expanded={active} aria-controls={`map-floor-${space.id}`}
          onClick={() => setExpanded(active ? null : space.id)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {active ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="flex-1">{space.name}</span><span className="text-xs font-normal text-muted-foreground">{count} {count === 1 ? 'mapa' : 'mapas'}</span>
        </button>
        {active && <div id={`map-floor-${space.id}`} className="ml-4 border-l border-border pl-2">
          {children.length ? children.map(c => renderBranch(c, visited)) : <p className="p-3 text-xs text-muted-foreground">Nenhum mapa cadastrado</p>}
        </div>}
      </div>;
    }
    return <section key={space.id} aria-label={space.name} className="py-2">
      <h3 className="px-2 py-2 text-[11px] font-semibold uppercase tracking-widest text-brass-ink">{space.name}</h3>
      <div className="pl-2">{children.map(c => renderBranch(c, visited))}</div>
    </section>;
  };
  const results = maps.filter(s => normalize(`${s.name} ${path(s)}`).includes(normalize(query.trim())));
  return <Popover open={open} onOpenChange={next => {
    setOpen(next); setQuery('');
    if (next) setExpanded(selected ? spaceAncestors(selected, spaces).find(p => p.type === 'FLOOR')?.id ?? null : sorted.find(s => s.type === 'FLOOR')?.id ?? null);
  }}>
    <PopoverTrigger asChild>
      <button type="button" disabled={disabled} aria-label="Selecionar mapa" className="flex min-h-11 w-[340px] max-w-full items-center gap-2 rounded-lg border border-input bg-paper-2 px-3 py-2 text-left disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Map className="h-4 w-4 shrink-0 text-brass-ink" />
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{selected?.name ?? 'Todos os espaços'}</span>
          {selected && <span className="block truncate text-xs text-muted-foreground" title={path(selected)}>{path(selected) || 'Sem agrupamento'}</span>}
        </span><ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-[420px] max-w-[calc(100vw-2rem)] p-0">
      <div className="relative border-b p-3"><Search className="absolute left-6 top-6 h-4 w-4 text-muted-foreground" />
        <Input aria-label="Buscar departamento ou mapa" placeholder="Buscar departamento ou mapa..." value={query} onChange={e => setQuery(e.target.value)} className="pl-9" />
      </div>
      <div className="max-h-[min(440px,60vh)] overflow-y-auto p-2">
        <button type="button" onClick={() => choose('all')} aria-current={value === 'all' ? 'true' : undefined} className={cn('mb-2 flex w-full items-center gap-2 rounded-md border-b px-3 py-3 text-left text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring', value === 'all' && 'bg-brass/10 font-semibold text-brass-ink')}>
          <span className="flex-1">Todos os espaços</span>{value === 'all' && <Check className="h-4 w-4" />}
        </button>
        {query.trim() ? (results.length ? results.map(s => mapButton(s, true)) : <p className="p-5 text-center text-sm text-muted-foreground">Nenhum mapa encontrado</p>)
          : sorted.filter(s => !s.parentId || !spaces.some(p => p.id === s.parentId)).map(s => renderBranch(s))}
      </div>
    </PopoverContent>
  </Popover>;
}
