import { useCallback, useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Line, Group, Text, Circle } from 'react-konva';
import type Konva from 'konva';
import { useInventoryMapStore } from '@/features/inventory-map/store/useInventoryMapStore';
import { useInventoryStore } from '@/features/inventory-map/store/useInventoryStore';
import type { LayoutElement } from '@/features/inventory-map/types/inventoryMap.types';
import {
  getWallGeometry, isWall, snapValue, fmtMeters, WALL_MAGNET, DEFAULT_WALL_THICKNESS, type Point,
} from '@/features/inventory-map/lib/wallGeometry';

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
    selectElement, hoverElement, moveElement, addElement, setScale, setStagePosition, addWall, moveWall,
  } = useInventoryMapStore();

  // Desenho de parede por cantos (adaptado do editor de referência).
  const [draft, setDraft] = useState<Point[]>([]);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [shiftDown, setShiftDown] = useState(false);
  const draftRef = useRef<Point[]>(draft);
  draftRef.current = draft;

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

  const finishDraft = useCallback((pts?: Point[]) => {
    const points = pts || draftRef.current;
    if (points.length >= 2) {
      useInventoryMapStore.getState().addWall(points.map((p) => [p[0], p[1]] as Point), DEFAULT_WALL_THICKNESS);
    }
    setDraft([]);
  }, []);

  // Limpa rascunho ao sair da ferramenta de parede.
  useEffect(() => {
    if (placingType !== 'WALL') {
      setDraft([]);
      setCursor(null);
    }
  }, [placingType]);

  // Teclas do modo parede: Enter conclui, Esc conclui/cancela, Shift libera o ângulo.
  useEffect(() => {
    if (placingType !== 'WALL') return;
    const kd = (e: KeyboardEvent) => {
      if (e.key === 'Shift') { setShiftDown(true); return; }
      if (e.key === 'Enter') { e.preventDefault(); finishDraft(); }
      else if (e.key === 'Escape') {
        if (draftRef.current.length) finishDraft();
        else useInventoryMapStore.getState().cancelPlacing();
      }
    };
    const ku = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftDown(false); };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, [placingType, finishDraft]);

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

  const pointerWorld = (): Point | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const p = stage.getPointerPosition();
    if (!p) return null;
    return [(p.x - stagePosition.x) / scale, (p.y - stagePosition.y) / scale];
  };

  const stations = useInventoryStore(s => s.stations);
  const assets = useInventoryStore(s => s.assets);

  const sortedElements = [...layout.elements].sort((a, b) => a.zIndex - b.zIndex);
  const walls = sortedElements.filter(isWall);

  // Ponto de parede com snap na grade, trava em 90° (relativo ao último canto) e ímã nas pontas existentes.
  const computeWallPoint = (raw: Point): Point => {
    let x = snapValue(raw[0]);
    let y = snapValue(raw[1]);
    const d = draft;
    if (d.length && !shiftDown) {
      const [lx, ly] = d[d.length - 1];
      if (Math.abs(x - lx) >= Math.abs(y - ly)) y = ly; else x = lx;
    }
    const cands: Point[] = [];
    walls.forEach((w) => getWallGeometry(w).points.forEach((pt) => cands.push(pt)));
    if (d.length > 2) cands.push(d[0]);
    let best: { c: Point; dist: number } | null = null;
    cands.forEach((c) => {
      const dd = Math.hypot(c[0] - x, c[1] - y);
      if (dd < WALL_MAGNET && (!best || dd < best.dist)) best = { c, dist: dd };
    });
    return best ? [best.c[0], best.c[1]] : [x, y];
  };

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (placingType === 'WALL') {
      const raw = pointerWorld();
      if (!raw) return;
      const q = computeWallPoint(raw);
      const d = draft;
      if (d.length) {
        const last = d[d.length - 1];
        if (last[0] === q[0] && last[1] === q[1]) return;
      }
      if (d.length > 2 && q[0] === d[0][0] && q[1] === d[0][1]) {
        finishDraft([...d, q]);
        return;
      }
      setDraft([...d, q]);
      return;
    }
    if (placingType) {
      const raw = pointerWorld();
      if (!raw) return;
      addElement(raw[0], raw[1]);
      return;
    }
    if (e.target === e.target.getStage()) {
      selectElement(null);
    }
  };

  const handleStageMouseMove = () => {
    if (placingType === 'WALL') {
      const w = pointerWorld();
      if (w) setCursor(w);
    }
  };

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

  const getStationForElement = (el: LayoutElement) => {
    if (!el.stationId) return null;
    return stations.find(s => s.id === el.stationId) || null;
  };

  const getAssetForElement = (el: LayoutElement) => {
    const assetId = el.metadata?.assetId;
    if (assetId === undefined || assetId === null || assetId === '') return null;
    return assets.find(asset => asset.id === String(assetId)) || null;
  };

  // Cotas (metragem) de cada trecho de uma parede.
  const wallCotas = (geom: ReturnType<typeof getWallGeometry>, keyPrefix: string) => {
    const nodes: JSX.Element[] = [];
    const T = geom.thickness;
    for (let i = 0; i < geom.points.length - 1; i++) {
      const a = geom.points[i];
      const b = geom.points[i + 1];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy);
      if (!len) continue;
      const nx = -dy / len;
      const ny = dx / len;
      const mx = (a[0] + b[0]) / 2 + nx * (T / 2 + 14);
      const my = (a[1] + b[1]) / 2 + ny * (T / 2 + 14);
      nodes.push(
        <Text key={`${keyPrefix}${i}`} x={mx - 40} y={my - 7} width={80} align="center"
          text={fmtMeters(len)} fontSize={12} fontFamily="monospace" fill={COLORS.selectedStroke} listening={false} />
      );
    }
    return nodes;
  };

  const buildWalls = () => {
    const nodes: JSX.Element[] = [];
    const editable = mode === 'EDIT' && !placingType;
    walls.forEach((w) => {
      const geom = getWallGeometry(w);
      let pts = geom.points;
      let closed = false;
      if (geom.closed) { pts = pts.slice(0, -1); closed = true; }
      const flat = pts.flat();
      const selected = selectedElementId === w.id;
      const hovered = hoveredElementId === w.id;
      if (selected) {
        nodes.push(
          <Line key={`wh${w.id}`} points={flat} closed={closed} stroke={COLORS.selectedStroke}
            strokeWidth={geom.thickness + 8} opacity={0.35} lineJoin="miter" lineCap="square" listening={false} />
        );
      }
      nodes.push(
        <Line
          key={`w${w.id}`} points={flat} closed={closed}
          stroke={hovered && !selected ? COLORS.hoverStroke : COLORS.wallFill}
          strokeWidth={geom.thickness} lineJoin="miter" lineCap="square"
          hitStrokeWidth={geom.thickness + 16}
          draggable={editable}
          onClick={(e) => { e.cancelBubble = true; if (placingType) return; if (mode === 'EDIT') selectElement(w.id); }}
          onMouseEnter={() => hoverElement(w.id)}
          onMouseLeave={() => hoverElement(null)}
          onDragEnd={(e) => {
            const node = e.target;
            const dx = node.x();
            const dy = node.y();
            node.position({ x: 0, y: 0 });
            if (dx || dy) moveWall(w.id, dx, dy);
          }}
        />
      );
      if (selected) nodes.push(...wallCotas(geom, `wc${w.id}-`));
    });

    // Rascunho da parede em desenho.
    if (placingType === 'WALL') {
      const q = cursor ? computeWallPoint(cursor) : (draft.length ? draft[draft.length - 1] : null);
      if (draft.length && q) {
        const previewPts = [...draft, q].flat();
        nodes.push(
          <Line key="wdraft" points={previewPts} stroke={COLORS.wallFill} strokeWidth={DEFAULT_WALL_THICKNESS}
            opacity={0.5} lineJoin="miter" lineCap="square" listening={false} />
        );
        const l = draft[draft.length - 1];
        const len = Math.hypot(q[0] - l[0], q[1] - l[1]);
        if (len) {
          nodes.push(
            <Text key="wdlen" x={q[0] + 10} y={q[1] - 22} text={fmtMeters(len)} fontSize={13}
              fontFamily="monospace" fill={COLORS.wallFill} listening={false} />
          );
        }
      }
      draft.forEach((p, i) => nodes.push(
        <Circle key={`wdp${i}`} x={p[0]} y={p[1]} radius={4.5} fill="#fff" stroke={COLORS.wallFill} strokeWidth={2} listening={false} />
      ));
      if (q) nodes.push(<Circle key="wdc" x={q[0]} y={q[1]} radius={5} fill={COLORS.selectedStroke} listening={false} />);
    }
    return nodes;
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
        return null; // paredes são desenhadas por buildWalls (polilinha)

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

  const structuralOther = sortedElements.filter(e => e.layer === 'structural' && !isWall(e));
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
      onMouseMove={handleStageMouseMove}
      onDblClick={() => { if (placingType === 'WALL') finishDraft(); }}
      onContextMenu={(e) => { e.evt.preventDefault(); if (placingType === 'WALL') finishDraft(); }}
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
      {/* Structural (blocos/divisórias + paredes por polilinha) */}
      <Layer>
        {structuralOther.map(renderElement)}
        {buildWalls()}
      </Layer>
      {/* Furniture */}
      <Layer>{furniture.map(renderElement)}</Layer>
      {/* Labels */}
      <Layer>{labels.map(renderElement)}</Layer>
    </Stage>
  );
};

export default InventoryMapCanvas;
