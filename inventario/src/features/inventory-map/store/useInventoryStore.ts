import { create } from 'zustand';
import { inventoryApi } from '@/lib/inventory-api';
import { getCurrentUsername } from '@/lib/auth';
import type { Station, Person, Asset, AssetAssignment, Department, Employee, Space, CheckResult, DivergenceType, FurnitureItem, FurnitureKind } from '../types/inventoryMap.types';
import type { ApiLayout, ApiLayoutElement } from '@/lib/inventory-api';

const kindToElementType = (k: FurnitureKind): ApiLayoutElement['elementType'] =>
  k === 'wall' ? 'WALL' : k === 'partition' ? 'PARTITION' : k === 'label' ? 'LABEL' : 'ROOM_BLOCK';
const elementTypeToKind = (t: string): FurnitureKind =>
  t === 'WALL' ? 'wall' : t === 'PARTITION' ? 'partition' : t === 'LABEL' ? 'label' : 'cabinet';

export type HistoryActionType = string;

export interface HistoryEntry {
  id: string;
  action: HistoryActionType;
  description: string;
  assetId?: string;
  stationFromId?: string;
  stationToId?: string;
  timestamp: string;
}

interface InventoryState {
  stations: Station[];
  people: Person[];
  assets: Asset[];
  assignments: AssetAssignment[];
  history: HistoryEntry[];
  departments: Department[];
  employees: Employee[];
  spaces: Space[];
  isLoading: boolean;
  error: string | null;

  addAsset: (asset: Omit<Asset, 'id'>) => Promise<string>;
  updateAsset: (id: string, updates: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  importAssets: (items: Omit<Asset, 'id'>[]) => Promise<{ imported: number; skipped: number }>;
  isAssetCodeUnique: (code: string, excludeId?: string) => boolean;

  addStation: (station: Omit<Station, 'id'>) => Promise<void>;
  updateStation: (id: string, updates: Partial<Station>) => Promise<void>;
  deleteStation: (id: string) => Promise<void>;

  addDepartment: (name: string) => Promise<void>;
  updateDepartment: (id: string, name: string) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;

  addEmployee: (data: Omit<Employee, 'id'>) => Promise<void>;
  updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;

  addSpace: (data: Omit<Space, 'id'>) => Promise<void>;
  updateSpace: (id: string, updates: Partial<Space>) => Promise<void>;
  deleteSpace: (id: string) => Promise<void>;
  getChildSpaces: (parentId?: string) => Space[];
  getSpacePath: (spaceId: string) => Space[];

  linkAsset: (assetId: string, stationId: string) => Promise<{ ok: boolean; error?: string }>;
  unlinkAsset: (assetId: string) => Promise<void>;
  transferAsset: (assetId: string, toStationId: string) => Promise<{ ok: boolean; error?: string }>;
  recordCheck: (assetId: string, body: { result: CheckResult; divergenceType?: DivergenceType | null; stationId?: string | null; registerMovement?: boolean; note?: string }) => Promise<{ ok: boolean; error?: string }>;
  finalizeConference: (stationId: string) => Promise<void>;
  loadFurniture: (spaceId: string) => Promise<FurnitureItem[]>;
  saveFurniture: (spaceId: string, items: FurnitureItem[]) => Promise<void>;

  changeStationResponsible: (stationId: string, newEmployeeId: string | null, forceMove?: boolean) => Promise<void>;

  getAssetsForStation: (stationId: string) => Asset[];
  getStationForAsset: (assetId: string) => Station | null;
  getActiveAssignment: (assetId: string) => AssetAssignment | null;
  getEmployeeForStation: (stationId: string) => Employee | null;

  getHistoryForStation: (stationId: string) => HistoryEntry[];
  getHistoryForAsset: (assetId: string) => HistoryEntry[];
  loadStationHistory: (stationId: string) => Promise<void>;
  loadAssetHistory: (assetId: string) => Promise<void>;

  init: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const toId = (value: number | string | null | undefined) => value === null || value === undefined ? undefined : String(value);

const buildAssignments = (assets: Asset[], employees: Employee[]): AssetAssignment[] => {
  return assets
    .filter(asset => !!asset.stationId)
    .map(asset => ({
      id: `aa-${asset.id}`,
      assetId: asset.id,
      stationId: asset.stationId!,
      assignedUserId: employees.find(e => e.stationId === asset.stationId)?.id,
      assignedAt: asset.assignedAt || new Date().toISOString(),
      status: 'ACTIVE' as const,
    }));
};

const mergeHistory = (current: HistoryEntry[], next: HistoryEntry[], predicate: (item: HistoryEntry) => boolean) => {
  return [...current.filter(item => !predicate(item)), ...next].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
};

export const useInventoryStore = create<InventoryState>((set, get) => ({
  stations: [],
  people: [],
  assets: [],
  assignments: [],
  history: [],
  departments: [],
  employees: [],
  spaces: [],
  isLoading: false,
  error: null,

  init: async () => {
    await get().refreshAll();
  },

  refreshAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const [departmentsRaw, spacesRaw, employeesRaw, stationsRaw, assetsRaw] = await Promise.all([
        inventoryApi.listDepartments(),
        inventoryApi.listSpaces(),
        inventoryApi.listEmployees(),
        inventoryApi.listStations(),
        inventoryApi.listAssets(),
      ]);

      const departments: Department[] = departmentsRaw.map(item => ({
        id: String(item.id),
        name: item.name,
      }));

      const employees: Employee[] = employeesRaw.map(item => ({
        id: String(item.id),
        fullName: item.fullName,
        cpf: item.cpf || '',
        status: item.status,
        departmentId: toId(item.departmentId),
        stationId: toId(item.stationId),
      }));

      const stations: Station[] = stationsRaw.map(item => ({
        id: String(item.id),
        code: item.code,
        name: item.name,
        description: item.description || undefined,
        locationCode: item.locationCode || undefined,
        status: item.status,
        observation: item.observation || undefined,
        layoutElementId: item.layoutElementRef || undefined,
        spaceId: toId(item.spaceId),
        responsibleEmployeeId: toId(item.responsibleEmployeeId),
        positionX: item.positionX ?? undefined,
        positionY: item.positionY ?? undefined,
        positionRotation: item.positionRotation ?? undefined,
        lastConferenceAt: item.lastConferenceAt || undefined,
        lastConferenceBy: item.lastConferenceBy || undefined,
      }));

      const assets = assetsRaw.map(item => ({
        id: String(item.assetId),
        assetCode: item.assetCode,
        type: item.assetType,
        description: item.assetDescription,
        serialNumber: item.serialNumber || undefined,
        manufacturer: item.manufacturer || undefined,
        model: item.model || undefined,
        processor: item.processor || undefined,
        os: item.operatingSystem || undefined,
        status: item.assetStatus,
        origin: item.assetOrigin,
        stationId: toId(item.stationId),
        assignedAt: item.assignedAt || undefined,
        acquisitionDate: item.acquisitionDate || undefined,
        fiscalNote: item.fiscalNote || undefined,
        accountingCategory: item.accountingCategory || undefined,
        acquisitionValue: item.acquisitionValue ?? undefined,
        depreciationRate: item.depreciationRate ?? undefined,
        usefulLifeYears: item.usefulLifeYears ?? undefined,
        warrantyUntil: item.warrantyUntil || undefined,
        lastCheckAt: item.lastCheckAt || undefined,
        lastCheckBy: item.lastCheckBy || undefined,
        lastCheckResult: item.lastCheckResult || undefined,
      })) as (Asset & { stationId?: string; assignedAt?: string })[];

      const spaces: Space[] = spacesRaw.map(item => ({
        id: String(item.id),
        name: item.name,
        type: item.type,
        parentId: toId(item.parentId),
        order: item.sortOrder,
      }));

      set({
        departments,
        employees,
        stations,
        assets: assets as Asset[],
        spaces,
        assignments: buildAssignments(assets as (Asset & { stationId?: string; assignedAt?: string })[], employees),
        people: [],
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : 'Erro ao carregar dados' });
      throw error;
    }
  },

  isAssetCodeUnique: (code, excludeId) => !get().assets.some(a => a.assetCode === code && a.id !== excludeId),

  addDepartment: async (name) => {
    await inventoryApi.createDepartment({ name });
    await get().refreshAll();
  },

  updateDepartment: async (id, name) => {
    await inventoryApi.updateDepartment(id, { name });
    await get().refreshAll();
  },

  deleteDepartment: async (id) => {
    await inventoryApi.deleteDepartment(id);
    await get().refreshAll();
  },

  addSpace: async (data) => {
    await inventoryApi.createSpace({
      name: data.name,
      type: data.type,
      parentId: data.parentId ? Number(data.parentId) : undefined,
      sortOrder: data.order,
    });
    await get().refreshAll();
  },

  updateSpace: async (id, updates) => {
    const current = get().spaces.find(space => space.id === id);
    if (!current) return;
    await inventoryApi.updateSpace(id, {
      name: updates.name ?? current.name,
      type: updates.type ?? current.type,
      parentId: updates.parentId ? Number(updates.parentId) : current.parentId ? Number(current.parentId) : undefined,
      sortOrder: updates.order ?? current.order,
    });
    await get().refreshAll();
  },

  deleteSpace: async (id) => {
    await inventoryApi.deleteSpace(id);
    await get().refreshAll();
  },

  addEmployee: async (data) => {
    const created = await inventoryApi.createEmployee({
      fullName: data.fullName,
      cpf: data.cpf,
      status: data.status,
      departmentId: data.departmentId || null,
    });
    if (data.stationId) {
      await inventoryApi.changeResponsible(data.stationId, { employeeId: created.id });
    }
    await get().refreshAll();
  },

  updateEmployee: async (id, updates) => {
    const current = get().employees.find(employee => employee.id === id);
    if (!current) return;
    await inventoryApi.updateEmployee(id, {
      fullName: updates.fullName ?? current.fullName,
      cpf: updates.cpf ?? current.cpf,
      status: updates.status ?? current.status,
      departmentId: updates.departmentId === undefined
        ? (current.departmentId || null)
        : (updates.departmentId || null),
    });

    const previousStationId = current.stationId || null;
    const nextStationId = updates.stationId === undefined ? previousStationId : (updates.stationId || null);

    if (previousStationId && previousStationId !== nextStationId) {
      await inventoryApi.changeResponsible(previousStationId, { employeeId: null });
    }
    if (nextStationId && nextStationId !== previousStationId) {
      await inventoryApi.changeResponsible(nextStationId, { employeeId: id });
    }

    await get().refreshAll();
  },

  deleteEmployee: async (id) => {
    const current = get().employees.find(employee => employee.id === id);
    if (current?.stationId) {
      await inventoryApi.changeResponsible(current.stationId, { employeeId: null });
    }
    await inventoryApi.deleteEmployee(id);
    await get().refreshAll();
  },

  addStation: async (station) => {
    await inventoryApi.createStation({
      code: station.code,
      name: station.name,
      locationCode: station.locationCode,
      description: station.description,
      status: station.status,
      observation: station.observation,
      layoutElementRef: station.layoutElementId,
      spaceId: station.spaceId ? Number(station.spaceId) : null,
    });
    await get().refreshAll();
  },

  updateStation: async (id, updates) => {
    const current = get().stations.find(station => station.id === id);
    if (!current) return;
    await inventoryApi.updateStation(id, {
      code: updates.code ?? current.code,
      name: updates.name ?? current.name,
      locationCode: updates.locationCode ?? current.locationCode,
      description: updates.description ?? current.description,
      status: updates.status ?? current.status,
      observation: updates.observation ?? current.observation,
      layoutElementRef: updates.layoutElementId ?? current.layoutElementId,
      positionX: updates.positionX ?? current.positionX,
      positionY: updates.positionY ?? current.positionY,
      positionRotation: updates.positionRotation ?? current.positionRotation,
      spaceId: updates.spaceId === undefined
        ? (current.spaceId ? Number(current.spaceId) : null)
        : (updates.spaceId ? Number(updates.spaceId) : null),
    });
    await get().refreshAll();
  },

  deleteStation: async (id) => {
    await inventoryApi.deleteStation(id);
    await get().refreshAll();
  },

  addAsset: async (assetData) => {
    const created = await inventoryApi.createAsset({
      assetCode: assetData.assetCode,
      type: assetData.type,
      description: assetData.description,
      serialNumber: assetData.serialNumber,
      status: assetData.status,
      origin: assetData.origin,
      manufacturer: assetData.manufacturer,
      model: assetData.model,
      processor: assetData.processor,
      operatingSystem: assetData.os,
    });
    await get().refreshAll();
    return String(created.assetId);
  },

  updateAsset: async (id, updates) => {
    const current = get().assets.find(asset => asset.id === id);
    if (!current) throw new Error('Patrimonio nao encontrado');
    await inventoryApi.updateAsset(id, {
      assetCode: updates.assetCode ?? current.assetCode,
      type: updates.type ?? current.type,
      description: updates.description ?? current.description,
      serialNumber: updates.serialNumber ?? current.serialNumber,
      status: updates.status ?? current.status,
      origin: updates.origin ?? current.origin,
      manufacturer: updates.manufacturer ?? current.manufacturer,
      model: updates.model ?? current.model,
      processor: updates.processor ?? current.processor,
      operatingSystem: updates.os ?? current.os,
    });
    await get().refreshAll();
  },

  deleteAsset: async (id) => {
    await inventoryApi.deleteAsset(id);
    await get().refreshAll();
  },

  importAssets: async (items) => {
    let imported = 0;
    let skipped = 0;
    for (const item of items) {
      try {
        await inventoryApi.createAsset({
          assetCode: item.assetCode,
          type: item.type,
          description: item.description,
          serialNumber: item.serialNumber,
          status: item.status,
          origin: item.origin,
          manufacturer: item.manufacturer,
          model: item.model,
          processor: item.processor,
          operatingSystem: item.os,
        });
        imported++;
      } catch {
        skipped++;
      }
    }
    await get().refreshAll();
    return { imported, skipped };
  },

  linkAsset: async (assetId, stationId) => {
    try {
      await inventoryApi.linkAsset(assetId, { stationId: Number(stationId), performedBy: getCurrentUsername() || undefined });
      await get().refreshAll();
      await get().loadStationHistory(stationId);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Erro ao vincular' };
    }
  },

  unlinkAsset: async (assetId) => {
    const assignment = get().getActiveAssignment(assetId);
    await inventoryApi.unlinkAsset(assetId, getCurrentUsername() || undefined);
    await get().refreshAll();
    if (assignment) {
      await get().loadStationHistory(assignment.stationId);
    }
  },

  transferAsset: async (assetId, toStationId) => {
    try {
      const current = get().getActiveAssignment(assetId);
      await inventoryApi.transferAsset(assetId, { toStationId: Number(toStationId), performedBy: getCurrentUsername() || undefined });
      await get().refreshAll();
      if (current) await get().loadStationHistory(current.stationId);
      await get().loadStationHistory(toStationId);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Erro ao transferir' };
    }
  },

  recordCheck: async (assetId, body) => {
    try {
      await inventoryApi.recordCheck(assetId, {
        result: body.result,
        divergenceType: body.divergenceType ?? null,
        stationId: body.stationId ? Number(body.stationId) : null,
        registerMovement: body.registerMovement ?? false,
        note: body.note,
      });
      await get().refreshAll();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Erro ao registrar conferência' };
    }
  },

  finalizeConference: async (stationId) => {
    await inventoryApi.finalizeConference(stationId);
    await get().refreshAll();
  },

  loadFurniture: async (spaceId) => {
    try {
      const layout = await inventoryApi.getLayout(spaceId);
      if (!layout?.elements) return [];
      return layout.elements
        .filter((el) => el.id !== '_empty')
        .map((el) => ({
          id: el.id,
          kind: ((el.metadata?.kind as FurnitureKind) ?? elementTypeToKind(el.elementType)),
          x: el.x, y: el.y, width: el.width, height: el.height, rotation: el.rotation || 0,
          label: el.label || undefined,
        }));
    } catch { return []; }
  },

  saveFurniture: async (spaceId, items) => {
    const space = get().spaces.find((s) => s.id === spaceId);
    const list = items.length ? items : [{ id: '_empty', kind: 'label', x: 0, y: 0, width: 0, height: 0, rotation: 0 } as FurnitureItem];
    const elements = list.map((f, i) => ({
      id: f.id,
      elementType: kindToElementType(f.kind),
      layer: f.kind === 'wall' || f.kind === 'partition' ? 'structural' : f.kind === 'label' ? 'labels' : 'furniture',
      x: Math.round(f.x), y: Math.round(f.y), width: Math.round(f.width), height: Math.round(f.height),
      rotation: Math.round(f.rotation), label: f.label, zIndex: i, metadata: { kind: f.kind },
    })) as ApiLayoutElement[];
    await inventoryApi.saveLayout(spaceId, {
      id: '', name: space?.name || 'Ambiente', code: `ENV-${spaceId}`,
      width: 2000, height: 1400, spaceId: Number(spaceId), elements,
    } as ApiLayout);
  },

  changeStationResponsible: async (stationId, newEmployeeId, forceMove = false) => {
    await inventoryApi.changeResponsible(stationId, {
      employeeId: newEmployeeId || null,
      forceMove,
    });
    await get().refreshAll();
    await get().loadStationHistory(stationId);
  },

  getAssetsForStation: (stationId) => {
    const activeIds = get().assignments.filter(item => item.stationId === stationId && item.status === 'ACTIVE').map(item => item.assetId);
    return get().assets.filter(asset => activeIds.includes(asset.id));
  },

  getStationForAsset: (assetId) => {
    const assignment = get().getActiveAssignment(assetId);
    return assignment ? get().stations.find(station => station.id === assignment.stationId) || null : null;
  },

  getActiveAssignment: (assetId) => get().assignments.find(item => item.assetId === assetId && item.status === 'ACTIVE') || null,
  getEmployeeForStation: (stationId) => {
    const station = get().stations.find(item => item.id === stationId);
    if (station?.responsibleEmployeeId) {
      return get().employees.find(employee => employee.id === station.responsibleEmployeeId && employee.status === 'ACTIVE') || null;
    }
    return get().employees.find(employee => employee.stationId === stationId && employee.status === 'ACTIVE') || null;
  },
  getHistoryForStation: (stationId) => get().history.filter(item => item.stationToId === stationId || item.stationFromId === stationId),
  getHistoryForAsset: (assetId) => get().history.filter(item => item.assetId === assetId),

  loadStationHistory: async (stationId) => {
    const raw = await inventoryApi.stationHistory(stationId);
    const mapped = raw.map((item, index) => ({
      id: `station-${stationId}-${item.timestamp}-${index}`,
      action: item.type,
      description: item.description,
      stationToId: stationId,
      timestamp: item.timestamp,
    }));
    set(state => ({ history: mergeHistory(state.history, mapped, item => item.stationToId === stationId || item.stationFromId === stationId) }));
  },

  loadAssetHistory: async (assetId) => {
    const raw = await inventoryApi.assetHistory(assetId);
    const mapped = raw.map((item, index) => ({
      id: `asset-${assetId}-${item.timestamp}-${index}`,
      action: item.type,
      description: item.description,
      assetId,
      timestamp: item.timestamp,
    }));
    set(state => ({ history: mergeHistory(state.history, mapped, item => item.assetId === assetId) }));
  },

  getChildSpaces: (parentId) => get().spaces.filter(space => space.parentId === parentId).sort((a, b) => a.order - b.order),

  getSpacePath: (spaceId) => {
    const path: Space[] = [];
    let current = get().spaces.find(space => space.id === spaceId);
    while (current) {
      path.unshift(current);
      current = current.parentId ? get().spaces.find(space => space.id === current!.parentId) : undefined;
    }
    return path;
  },
}));
