import { create } from 'zustand';
import { inventoryApi } from '@/lib/inventory-api';
import type { LayoutElement, EditorMode, ElementType, Layout } from '../types/inventoryMap.types';
import { mockLayout } from '../data/mockData';

const genId = (existingIds: Set<string>) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    let id = `el-${crypto.randomUUID()}`;
    while (existingIds.has(id)) {
      id = `el-${crypto.randomUUID()}`;
    }
    return id;
  }

  let index = existingIds.size + 1;
  let id = `el-${Date.now()}-${index}`;
  while (existingIds.has(id)) {
    index += 1;
    id = `el-${Date.now()}-${index}`;
  }
  return id;
};

const ensureUniqueElementIds = (elements: LayoutElement[]) => {
  const seen = new Set<string>();

  return elements.map((element) => {
    if (!seen.has(element.id)) {
      seen.add(element.id);
      return element;
    }

    const id = genId(seen);
    seen.add(id);
    return { ...element, id };
  });
};

const separateTouchingDesks = (elements: LayoutElement[]) => {
  const next = elements.map((element) => ({ ...element }));
  const desksByRow = new Map<string, LayoutElement[]>();

  next
    .filter((element) => element.elementType === 'DESK' && element.rotation % 180 === 0)
    .forEach((desk) => {
      const rowKey = String(Math.round(desk.y));
      desksByRow.set(rowKey, [...(desksByRow.get(rowKey) || []), desk]);
    });

  desksByRow.forEach((desks) => {
    desks.sort((a, b) => a.x - b.x);

    for (let index = 1; index < desks.length; index += 1) {
      const previous = desks[index - 1];
      const current = desks[index];
      const minimumX = previous.x + previous.width + 12;

      if (current.x < minimumX) {
        current.x = minimumX;
      }
    }
  });

  return next;
};

function createEmptyLayout(spaceId: string, spaceName: string): Layout {
  return {
    id: `layout-${spaceId}`,
    name: spaceName,
    code: spaceId,
    width: 1200,
    height: 800,
    spaceId,
    elements: [],
  };
}

interface InventoryMapState {
  layout: Layout;
  activeSpaceId: string | null;
  mode: EditorMode;
  selectedElementId: string | null;
  hoveredElementId: string | null;
  inspectedStationId: string | null;
  showGrid: boolean;
  scale: number;
  stagePosition: { x: number; y: number };
  placingType: ElementType | null;
  isSaving: boolean;

  setMode: (mode: EditorMode) => void;
  selectElement: (id: string | null) => void;
  hoverElement: (id: string | null) => void;
  inspectStation: (stationId: string | null) => void;
  toggleGrid: () => void;
  setScale: (scale: number) => void;
  setStagePosition: (pos: { x: number; y: number }) => void;
  startPlacing: (type: ElementType) => void;
  cancelPlacing: () => void;

  addElement: (x: number, y: number) => void;
  moveElement: (id: string, x: number, y: number) => void;
  updateElement: (id: string, updates: Partial<LayoutElement>) => void;
  rotateElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  deleteElement: (id: string) => void;

  saveLayout: () => Promise<void>;
  loadLayout: (spaceId?: string, spaceName?: string) => Promise<void>;
  switchToSpace: (spaceId: string, spaceName: string) => Promise<void>;
}

const defaultsForType = (type: ElementType): Partial<LayoutElement> => {
  switch (type) {
    case 'WALL': return { width: 200, height: 8, layer: 'structural', zIndex: 1 };
    case 'PARTITION': return { width: 160, height: 4, layer: 'structural', zIndex: 2 };
    case 'DESK': return { width: 140, height: 70, layer: 'furniture', zIndex: 10 };
    case 'CHAIR': return { width: 40, height: 40, layer: 'furniture', zIndex: 9 };
    case 'PRINTER': return { width: 74, height: 54, layer: 'furniture', zIndex: 11 };
    case 'SWITCH': return { width: 96, height: 42, layer: 'furniture', zIndex: 11 };
    case 'LABEL': return { width: 100, height: 24, layer: 'labels', zIndex: 20, label: 'Rótulo' };
    case 'ROOM_BLOCK': return { width: 200, height: 150, layer: 'structural', zIndex: 0 };
    default: return { width: 100, height: 50, layer: 'furniture', zIndex: 5 };
  }
};

const normalizeLayout = (layout: Layout): Layout => ({
  ...layout,
  id: layout.id || `layout-${layout.spaceId || 'default'}`,
  elements: separateTouchingDesks(ensureUniqueElementIds(layout.elements)).sort((a, b) => a.zIndex - b.zIndex),
});

export const useInventoryMapStore = create<InventoryMapState>((set, get) => ({
  layout: mockLayout,
  activeSpaceId: mockLayout.spaceId || null,
  mode: 'VIEW',
  selectedElementId: null,
  hoveredElementId: null,
  inspectedStationId: null,
  showGrid: true,
  scale: 1,
  stagePosition: { x: 0, y: 0 },
  placingType: null,
  isSaving: false,

  setMode: (mode) => set({ mode, selectedElementId: null, placingType: null }),
  selectElement: (id) => set({ selectedElementId: id }),
  hoverElement: (id) => set({ hoveredElementId: id }),
  inspectStation: (stationId) => set({ inspectedStationId: stationId }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  setScale: (scale) => set({ scale: Math.max(0.3, Math.min(3, scale)) }),
  setStagePosition: (pos) => set({ stagePosition: pos }),
  startPlacing: (type) => set({ placingType: type }),
  cancelPlacing: () => set({ placingType: null }),

  addElement: (x, y) => {
    const { placingType } = get();
    if (!placingType) return;
    const defaults = defaultsForType(placingType);
    const existingIds = new Set(get().layout.elements.map((element) => element.id));
    const el: LayoutElement = {
      id: genId(existingIds),
      elementType: placingType,
      x,
      y,
      width: defaults.width!,
      height: defaults.height!,
      rotation: 0,
      layer: defaults.layer!,
      zIndex: defaults.zIndex!,
      label: defaults.label,
    };
    set((s) => ({
      layout: normalizeLayout({ ...s.layout, elements: [...s.layout.elements, el] }),
      placingType: null,
      selectedElementId: el.id,
    }));
  },

  moveElement: (id, x, y) => {
    set((s) => ({
      layout: normalizeLayout({
        ...s.layout,
        elements: s.layout.elements.map((el) => el.id === id ? { ...el, x, y } : el),
      }),
    }));
  },

  updateElement: (id, updates) => {
    set((s) => ({
      layout: normalizeLayout({
        ...s.layout,
        elements: s.layout.elements.map((el) => el.id === id ? { ...el, ...updates } : el),
      }),
    }));
  },

  rotateElement: (id) => {
    set((s) => ({
      layout: normalizeLayout({
        ...s.layout,
        elements: s.layout.elements.map((el) => el.id === id ? { ...el, rotation: (el.rotation + 90) % 360 } : el),
      }),
    }));
  },

  duplicateElement: (id) => {
    const el = get().layout.elements.find((element) => element.id === id);
    if (!el) return;
    const existingIds = new Set(get().layout.elements.map((element) => element.id));
    const metadata = { ...el.metadata };
    if (el.elementType === 'PRINTER' || el.elementType === 'SWITCH') {
      delete metadata.assetId;
    }
    const newEl = {
      ...el,
      id: genId(existingIds),
      x: el.x + 20,
      y: el.y + 20,
      stationId: undefined,
      metadata,
    };
    set((s) => ({
      layout: normalizeLayout({ ...s.layout, elements: [...s.layout.elements, newEl] }),
      selectedElementId: newEl.id,
    }));
  },

  deleteElement: (id) => {
    set((s) => ({
      layout: normalizeLayout({
        ...s.layout,
        elements: s.layout.elements.filter((el) => el.id !== id),
      }),
      selectedElementId: s.selectedElementId === id ? null : s.selectedElementId,
    }));
  },

  saveLayout: async () => {
    const { layout, activeSpaceId } = get();
    if (!activeSpaceId) return;
    set({ isSaving: true });
    try {
      const saved = await inventoryApi.saveLayout(activeSpaceId, {
        id: layout.id,
        name: layout.name,
        code: layout.code,
        width: layout.width,
        height: layout.height,
        spaceId: Number(activeSpaceId),
        elements: layout.elements,
      });
      set({
        layout: normalizeLayout({
          id: saved.id,
          name: saved.name,
          code: saved.code,
          width: saved.width,
          height: saved.height,
          spaceId: String(saved.spaceId),
          elements: saved.elements,
        }),
        isSaving: false,
      });
    } catch (error) {
      set({ isSaving: false });
      throw error;
    }
  },

  loadLayout: async (spaceId, spaceName) => {
    const targetSpaceId = spaceId || get().activeSpaceId || mockLayout.spaceId || null;
    if (!targetSpaceId) {
      set({ layout: mockLayout, activeSpaceId: mockLayout.spaceId || null });
      return;
    }

    const remoteLayout = await inventoryApi.getLayout(targetSpaceId);
    if (remoteLayout) {
      set({
        layout: normalizeLayout({
          id: remoteLayout.id,
          name: remoteLayout.name,
          code: remoteLayout.code,
          width: remoteLayout.width,
          height: remoteLayout.height,
          spaceId: String(remoteLayout.spaceId),
          elements: remoteLayout.elements,
        }),
        activeSpaceId: String(remoteLayout.spaceId),
      });
      return;
    }

    if (mockLayout.spaceId === targetSpaceId) {
      set({ layout: normalizeLayout({ ...mockLayout }), activeSpaceId: targetSpaceId });
      return;
    }

    set({
      layout: createEmptyLayout(targetSpaceId, spaceName || targetSpaceId),
      activeSpaceId: targetSpaceId,
      mode: 'VIEW',
      selectedElementId: null,
      placingType: null,
      scale: 1,
      stagePosition: { x: 0, y: 0 },
    });
  },

  switchToSpace: async (spaceId, spaceName) => {
    set({
      activeSpaceId: spaceId,
      mode: 'VIEW',
      selectedElementId: null,
      placingType: null,
      scale: 1,
      stagePosition: { x: 0, y: 0 },
    });
    await get().loadLayout(spaceId, spaceName);
  },
}));
