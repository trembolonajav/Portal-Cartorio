import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Boxes, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import InventoryMapCanvas from '@/components/inventory-map/InventoryMapCanvas';
import BuilderToolbar from '@/components/inventory-map/BuilderToolbar';
import StationDrawer from '@/components/inventory-map/StationDrawer';
import StationTooltip from '@/components/inventory-map/StationTooltip';
import SessionActions from '@/components/layout/SessionActions';
import { useInventoryMapStore } from '@/features/inventory-map/store/useInventoryMapStore';
import { useInventoryStore } from '@/features/inventory-map/store/useInventoryStore';

const InventoryMapPage = () => {
  const navigate = useNavigate();
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
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <header className="h-14 bg-primary border-b-[3px] border-bronze flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-bronze" />
          <h1 className="text-primary-foreground font-semibold text-sm tracking-wide">
            Mapa Patrimonial
          </h1>
          {breadcrumb.length > 0 && (
            <>
              <span className="text-primary-foreground/40 text-xs">|</span>
              <div className="flex items-center gap-1">
                {breadcrumb.map((space, index) => (
                  <span key={space.id} className="text-primary-foreground/60 text-xs font-medium">
                    {index > 0 && <span className="text-primary-foreground/30 mx-1">&gt;</span>}
                    <span className={index === breadcrumb.length - 1 ? 'text-bronze' : ''}>{space.name}</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-primary-foreground/50 text-xs">
            <Boxes className="h-4 w-4" />
            <span>{layout.elements.filter(e => e.elementType === 'DESK').length} estações</span>
          </div>
          <Button variant="ghost" size="sm" className="text-primary-foreground/70 hover:text-primary-foreground text-xs" onClick={() => navigate('/patrimonios')}>
            <Package className="h-3.5 w-3.5 mr-1.5" />
            Patrimônios
          </Button>
          <SessionActions />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <BuilderToolbar />
        <div ref={containerRef} className="flex-1 relative overflow-hidden">
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
          <div className="fixed inset-0 bg-foreground/10 z-40" onClick={() => setDrawerStationId(null)} />
          <StationDrawer stationId={drawerStationId} onClose={() => setDrawerStationId(null)} />
        </>
      )}
    </div>
  );
};

export default InventoryMapPage;
