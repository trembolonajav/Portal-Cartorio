import { useState, useRef, useCallback, useEffect } from 'react';
import { Boxes } from 'lucide-react';
import InventoryMapCanvas from '@/components/inventory-map/InventoryMapCanvas';
import BuilderToolbar from '@/components/inventory-map/BuilderToolbar';
import StationDrawer from '@/components/inventory-map/StationDrawer';
import StationTooltip from '@/components/inventory-map/StationTooltip';
import AppShell from '@/components/layout/AppShell';
import { useInventoryMapStore } from '@/features/inventory-map/store/useInventoryMapStore';
import { useInventoryStore } from '@/features/inventory-map/store/useInventoryStore';

const InventoryMapPage = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [drawerStationId, setDrawerStationId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ stationId: string; position: { x: number; y: number } } | null>(null);

  const { loadLayout, layout, activeSpaceId } = useInventoryMapStore();
  const { spaces, getSpacePath } = useInventoryStore();

  const breadcrumb = activeSpaceId ? getSpacePath(activeSpaceId) : [];

  useEffect(() => {
    void loadLayout();
  }, [loadLayout]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const handleStationClick = useCallback((stationId: string) => {
    setDrawerStationId(stationId);
    setTooltip(null);
  }, []);

  const handleStationHover = useCallback((stationId: string | null, position: { x: number; y: number }) => {
    if (stationId) {
      setTooltip({ stationId, position });
    } else {
      setTooltip(null);
    }
  }, []);

  return (
    <AppShell
      active="mapa"
      search={
        <div className="flex min-w-0 items-center gap-3">
          <span className="font-serif text-[19px] font-semibold text-primary">Mapa patrimonial</span>
          {breadcrumb.length > 0 && (
            <span className="hidden items-center gap-1 truncate text-[13px] text-muted-foreground md:flex">
              {breadcrumb.map((space, index) => (
                <span key={space.id} className="truncate">
                  {index > 0 && <span className="mx-1 text-muted-foreground/50">›</span>}
                  <span className={index === breadcrumb.length - 1 ? 'text-brass-ink' : ''}>{space.name}</span>
                </span>
              ))}
            </span>
          )}
        </div>
      }
      actions={
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Boxes className="h-4 w-4 text-brass-ink" />
          <span>{layout.elements.filter(e => e.elementType === 'DESK').length} estações</span>
        </div>
      }
    >
      <div className="flex h-full overflow-hidden">
        <BuilderToolbar />
        <div ref={containerRef} className="relative flex-1 overflow-hidden">
          <InventoryMapCanvas
            containerWidth={dimensions.width}
            containerHeight={dimensions.height}
            onStationClick={handleStationClick}
            onStationHover={handleStationHover}
          />
        </div>
      </div>

      {tooltip && <StationTooltip stationId={tooltip.stationId} position={tooltip.position} />}

      {drawerStationId && (
        <>
          <div className="fixed inset-0 z-40 bg-foreground/10" onClick={() => setDrawerStationId(null)} />
          <StationDrawer stationId={drawerStationId} onClose={() => setDrawerStationId(null)} />
        </>
      )}
    </AppShell>
  );
};

export default InventoryMapPage;
