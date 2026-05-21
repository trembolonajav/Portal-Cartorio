import { useCallback, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Line, Group, Text, Circle } from 'react-konva';
import type Konva from 'konva';
import { useInventoryMapStore } from '@/features/inventory-map/store/useInventoryMapStore';
import { useInventoryStore } from '@/features/inventory-map/store/useInventoryStore';
import type { LayoutElement } from '@/features/inventory-map/types/inventoryMap.types';

const GRID_SIZE = 20;

const COLORS = {
  wallFill: '#1e2a3a',
  partitionFill: '#8b95a5',
  deskFill: '#ffffff',
  deskStroke: '#b0bac5',
  chairFill: '#e8ecf0',
  chairStroke: '#9da5b0',
  equipmentFill: '#f7f8fa',
  equipmentStroke: '#8793a5',
  equipmentAccent: '#1e2a3a',
  selectedStroke: '#b8905b',
  hoverStroke: '#c9a97a',
  gridLine: '#dfe3e8',
  labelText: '#4b5563',
  stationBadge: '#1e6b45',
  canvasBg: '#f0ede8',
};

interface CanvasProps {
  containerWidth: number;
  containerHeight: number;
  onStationClick: (stationId: string, position: { x: number; y: number }) => void;
  onStationHover: (stationId: string | null, position: { x: number; y: number }) => void;
}

const InventoryMapCanvas = ({ containerWidth, containerHeight, onStationClick, onStationHover }: CanvasProps) => {
  const stageRef = useRef<Konva.Stage>(null);
  const {
    layout, mode, selectedElementId, hoveredElementId, showGrid, scale, stagePosition, placingType,
    selectElement, hoverElement, moveElement, addElement, setScale, setStagePosition,
  } = useInventoryMapStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode !== 'EDIT' || !selectedElementId) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        useInventoryMapStore.getState().deleteElement(selectedElementId);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        useInventoryMapStore.getState().duplicateElement(selectedElementId);
      }
      if (e.key === 'r' || e.key === 'R') {
        useInventoryMapStore.getState().rotateElement(selectedElementId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, selectedElementId]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.08;
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = scale;
    const pointer = stage.getPointerPosition()!;
    const mousePointTo = {
      x: (pointer.x - stagePosition.x) / oldScale,
      y: (pointer.y - stagePosition.y) / oldScale,
    };
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    setScale(newScale);
    setStagePosition({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  }, [scale, stagePosition, setScale, setStagePosition]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (placingType) {
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition()!;
      const x = (pointer.x - stagePosition.x) / scale;
      const y = (pointer.y - stagePosition.y) / scale;
      addElement(x, y);
      return;
    }
    if (e.target === e.target.getStage()) {
      selectElement(null);
    }
  }, [placingType, addElement, selectElement, stagePosition, scale]);

  const renderGrid = () => {
    if (!showGrid) return null;
    const lines: JSX.Element[] = [];
    const w = layout.width + 200;
    const h = layout.height + 200;
    for (let i = 0; i < w / GRID_SIZE; i++) {
      lines.push(
        <Line key={`gv${i}`} points={[i * GRID_SIZE, 0, i * GRID_SIZE, h]}
          stroke={COLORS.gridLine} strokeWidth={0.5} opacity={0.6} />
      );
    }
    for (let i = 0; i < h / GRID_SIZE; i++) {
      lines.push(
        <Line key={`gh${i}`} points={[0, i * GRID_SIZE, w, i * GRID_SIZE]}
          stroke={COLORS.gridLine} strokeWidth={0.5} opacity={0.6} />
      );
    }
    return <>{lines}</>;
  };

  const stations = useInventoryStore(s => s.stations);
  const assets = useInventoryStore(s => s.assets);

  const getStationForElement = (el: LayoutElement) => {
    if (!el.stationId) return null;
    return stations.find(s => s.id === el.stationId) || null;
  };

  const getAssetForElement = (el: LayoutElement) => {
    const assetId = el.metadata?.assetId;
    if (assetId === undefined || assetId === null || assetId === '') return null;
    return assets.find(asset => asset.id === String(assetId)) || null;
  };

  const renderElement = (el: LayoutElement) => {
    const isSelected = selectedElementId === el.id;
    const isHovered = hoveredElementId === el.id;
    const station = getStationForElement(el);
    const equipmentAsset = getAssetForElement(el);
    const isDraggable = mode === 'EDIT';
    const labelText = station ? station.code : (el.label || '');
    const labelFontSize = labelText.length > 16 ? 8 : labelText.length > 12 ? 9 : el.fontSize || 11;

    const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
      if (mode !== 'EDIT') return;
      moveElement(el.id, e.target.x(), e.target.y());
    };

    const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      if (mode === 'EDIT') {
        selectElement(el.id);
      }
      if (station && mode === 'VIEW') {
        const stage = stageRef.current;
        if (stage) {
          const pointer = stage.getPointerPosition()!;
          onStationClick(station.id, { x: pointer.x, y: pointer.y });
        }
      }
    };

    const handleMouseEnter = () => {
      hoverElement(el.id);
      if (station && mode === 'VIEW') {
        const stage = stageRef.current;
        if (stage) {
          const pos = stage.getPointerPosition()!;
          onStationHover(station.id, { x: pos.x, y: pos.y });
        }
      }
    };

    const handleMouseLeave = () => {
      hoverElement(null);
      if (mode === 'VIEW') {
        onStationHover(null, { x: 0, y: 0 });
      }
    };

    const selectionStroke = isSelected ? COLORS.selectedStroke : isHovered ? COLORS.hoverStroke : undefined;
    const selectionWidth = isSelected ? 2.5 : isHovered ? 1.5 : 0;

    switch (el.elementType) {
      case 'WALL':
        return (
          <Rect key={el.id} x={el.x} y={el.y} width={el.width} height={el.height}
            fill={COLORS.wallFill} rotation={el.rotation} draggable={isDraggable}
            onDragEnd={handleDragEnd} onClick={handleClick}
            onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
            stroke={selectionStroke} strokeWidth={selectionWidth}
            cornerRadius={1} />
        );

      case 'PARTITION':
        return (
          <Rect key={el.id} x={el.x} y={el.y} width={el.width} height={el.height}
            fill={COLORS.partitionFill} rotation={el.rotation} draggable={isDraggable}
            onDragEnd={handleDragEnd} onClick={handleClick}
            onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
            stroke={selectionStroke} strokeWidth={selectionWidth}
            dash={[6, 3]} opacity={0.7} />
        );

      case 'DESK':
        return (
          <Group key={el.id} x={el.x} y={el.y} rotation={el.rotation}
            draggable={isDraggable} onDragEnd={handleDragEnd}
            onClick={handleClick} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <Rect width={el.width} height={el.height}
              fill={COLORS.deskFill}
              stroke={selectionStroke || COLORS.deskStroke}
              strokeWidth={selectionWidth || 1.5}
              cornerRadius={4}
              shadowColor="rgba(0,0,0,0.08)" shadowBlur={6} shadowOffsetY={2} />
            {/* Monitor strip */}
            <Rect x={el.width * 0.25} y={8} width={el.width * 0.5} height={4}
              fill={COLORS.partitionFill} cornerRadius={2} opacity={0.5} />
            {labelText && (
              <Text text={labelText} x={4} y={el.height / 2 - 10} width={el.width - 8}
                align="center" verticalAlign="middle" height={20} fontSize={labelFontSize} fontFamily="Inter" fontStyle="600"
                wrap="char" ellipsis
                fill={station ? COLORS.wallFill : COLORS.labelText} />
            )}
            {station && (
              <Circle x={el.width - 10} y={10} radius={4}
                fill={station.status === 'ACTIVE' ? COLORS.stationBadge : station.status === 'MAINTENANCE' ? '#c9860b' : '#94a3b8'} />
            )}
          </Group>
        );

      case 'CHAIR':
        return (
          <Group key={el.id} x={el.x} y={el.y} rotation={el.rotation}
            draggable={isDraggable} onDragEnd={handleDragEnd}
            onClick={handleClick} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            {/* Seat */}
            <Circle x={el.width / 2} y={el.height / 2} radius={el.width / 2 - 2}
              fill={COLORS.chairFill}
              stroke={selectionStroke || COLORS.chairStroke}
              strokeWidth={selectionWidth || 1} />
            {/* Backrest */}
            <Rect x={el.width * 0.15} y={-4} width={el.width * 0.7} height={8}
              fill={COLORS.chairStroke} cornerRadius={4} opacity={0.6} />
          </Group>
        );

      case 'PRINTER':
        return (
          <Group key={el.id} x={el.x} y={el.y} rotation={el.rotation}
            draggable={isDraggable} onDragEnd={handleDragEnd}
            onClick={handleClick} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <Rect x={6} y={0} width={el.width - 12} height={el.height * 0.34}
              fill="#fff" stroke={COLORS.equipmentStroke} strokeWidth={1} cornerRadius={2} />
            <Rect x={0} y={el.height * 0.22} width={el.width} height={el.height * 0.5}
              fill={COLORS.equipmentFill}
              stroke={selectionStroke || COLORS.equipmentStroke}
              strokeWidth={selectionWidth || 1.5} cornerRadius={5} />
            <Rect x={9} y={el.height * 0.58} width={el.width - 18} height={el.height * 0.36}
              fill="#fff" stroke={COLORS.equipmentStroke} strokeWidth={1} cornerRadius={2} />
            <Circle x={el.width - 12} y={el.height * 0.39} radius={2.5} fill={COLORS.stationBadge} />
            {equipmentAsset && (
              <Text text={equipmentAsset.assetCode} x={4} y={el.height * 0.32} width={el.width - 8}
                align="center" fontSize={8} fontFamily="Inter" fontStyle="600" fill={COLORS.equipmentAccent} />
            )}
          </Group>
        );

      case 'SWITCH':
        return (
          <Group key={el.id} x={el.x} y={el.y} rotation={el.rotation}
            draggable={isDraggable} onDragEnd={handleDragEnd}
            onClick={handleClick} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <Rect width={el.width} height={el.height}
              fill={COLORS.equipmentFill}
              stroke={selectionStroke || COLORS.equipmentStroke}
              strokeWidth={selectionWidth || 1.5} cornerRadius={5} />
            <Rect x={8} y={8} width={el.width - 16} height={el.height - 16}
              fill={COLORS.equipmentAccent} opacity={0.08} cornerRadius={3} />
            {[0, 1, 2, 3].map(port => (
              <Rect key={port} x={13 + port * 17} y={el.height / 2 - 4} width={10} height={8}
                fill="#fff" stroke={COLORS.equipmentStroke} strokeWidth={1} cornerRadius={1} />
            ))}
            <Circle x={el.width - 13} y={el.height / 2} radius={3} fill={COLORS.stationBadge} />
            {equipmentAsset && (
              <Text text={equipmentAsset.assetCode} x={8} y={el.height - 11} width={el.width - 24}
                align="left" fontSize={8} fontFamily="Inter" fontStyle="600" ellipsis fill={COLORS.equipmentAccent} />
            )}
          </Group>
        );

      case 'LABEL':
        return (
          <Text key={el.id} x={el.x} y={el.y} text={el.label || ''}
            fontSize={el.fontSize || 12} fontFamily="Inter" fontStyle="500" fill={COLORS.labelText}
            rotation={el.rotation} draggable={isDraggable}
            onDragEnd={handleDragEnd} onClick={handleClick}
            onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
            opacity={0.7} />
        );

      case 'ROOM_BLOCK':
        return (
          <Rect key={el.id} x={el.x} y={el.y} width={el.width} height={el.height}
            fill="rgba(30,42,58,0.03)" stroke={COLORS.gridLine} strokeWidth={1}
            rotation={el.rotation} draggable={isDraggable} cornerRadius={2}
            onDragEnd={handleDragEnd} onClick={handleClick}
            onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} />
        );

      default:
        return null;
    }
  };

  const sortedElements = [...layout.elements].sort((a, b) => a.zIndex - b.zIndex);
  const structural = sortedElements.filter(e => e.layer === 'structural');
  const furniture = sortedElements.filter(e => e.layer === 'furniture');
  const labels = sortedElements.filter(e => e.layer === 'labels');

  return (
    <Stage
      ref={stageRef}
      width={containerWidth}
      height={containerHeight}
      scaleX={scale}
      scaleY={scale}
      x={stagePosition.x}
      y={stagePosition.y}
      draggable={mode === 'VIEW' && !placingType}
      onWheel={handleWheel}
      onClick={handleStageClick}
      onDragEnd={(e) => {
        if (mode === 'VIEW' && e.target === stageRef.current) {
          setStagePosition({ x: e.target.x(), y: e.target.y() });
        }
      }}
      style={{ cursor: placingType ? 'crosshair' : mode === 'EDIT' ? 'default' : 'grab' }}
    >
      {/* Background */}
      <Layer>
        <Rect x={-500} y={-500} width={layout.width + 1000} height={layout.height + 1000}
          fill={COLORS.canvasBg} />
        {renderGrid()}
      </Layer>
      {/* Structural */}
      <Layer>{structural.map(renderElement)}</Layer>
      {/* Furniture */}
      <Layer>{furniture.map(renderElement)}</Layer>
      {/* Labels */}
      <Layer>{labels.map(renderElement)}</Layer>
    </Stage>
  );
};

export default InventoryMapCanvas;
