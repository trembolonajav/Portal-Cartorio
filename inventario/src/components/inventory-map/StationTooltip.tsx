import { useInventoryStore } from '@/features/inventory-map/store/useInventoryStore';

interface StationTooltipProps {
  stationId: string;
  position: { x: number; y: number };
}

const StationTooltip = ({ stationId, position }: StationTooltipProps) => {
  const { stations, assignments, getEmployeeForStation } = useInventoryStore();

  const station = stations.find(s => s.id === stationId);
  if (!station) return null;

  const person = getEmployeeForStation(stationId);

  const assetCount = assignments.filter(a => a.stationId === stationId && a.status === 'ACTIVE').length;

  const statusColors = {
    ACTIVE: 'bg-success',
    INACTIVE: 'bg-muted-foreground',
    MAINTENANCE: 'bg-amber-500',
  };

  return (
    <div
      className="fixed z-[60] pointer-events-none animate-in fade-in duration-200"
      style={{ left: position.x + 16, top: position.y - 10 }}
    >
      <div className="bg-card/95 backdrop-blur-md border border-border rounded-lg shadow-xl px-4 py-3 min-w-[180px]">
        <div className="flex items-center gap-2 mb-1">
          <div className={`h-2 w-2 rounded-full ${statusColors[station.status]}`} />
          <span className="text-sm font-semibold text-foreground">{station.code}</span>
        </div>
        {person && <p className="text-xs text-muted-foreground">{person.fullName}</p>}
        <p className="text-[11px] text-muted-foreground mt-1">
          {assetCount} {assetCount === 1 ? 'item' : 'itens'} vinculados
        </p>
      </div>
    </div>
  );
};

export default StationTooltip;
