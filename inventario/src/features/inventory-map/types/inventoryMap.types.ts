export type ElementType = 'WALL' | 'PARTITION' | 'DESK' | 'CHAIR' | 'PRINTER' | 'SWITCH' | 'LABEL' | 'ROOM_BLOCK';
export type EditorMode = 'VIEW' | 'EDIT';
export type StationStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
export type AssetStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'DISPOSED' | 'IN_STOCK';
export type SpaceType = 'UNIT' | 'BUILDING' | 'FLOOR' | 'SECTOR';

export interface LayoutElement {
  id: string;
  elementType: ElementType;
  layer: 'structural' | 'furniture' | 'labels';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label?: string;
  fillColor?: string;
  strokeColor?: string;
  fontSize?: number;
  stationId?: string;
  zIndex: number;
  metadata?: Record<string, unknown>;
}

export interface Station {
  id: string;
  code: string;
  name: string;
  description?: string;
  locationCode?: string;
  responsibleUserId?: string;
  responsibleEmployeeId?: string;
  status: StationStatus;
  layoutElementId?: string;
  observation?: string;
  spaceId?: string;
  positionX?: number;
  positionY?: number;
  positionRotation?: number;
  lastConferenceAt?: string;
  lastConferenceBy?: string;
}

export type CheckResult = 'FOUND' | 'NOT_FOUND' | 'DIVERGENCE';
export type DivergenceType =
  | 'WRONG_LOCATION' | 'WRONG_OWNER' | 'WRONG_DESCRIPTION' | 'NO_TAG'
  | 'DAMAGED' | 'DISPOSED_FOUND' | 'NEW_UNREGISTERED';

export interface Department {
  id: string;
  name: string;
}

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';

export interface Employee {
  id: string;
  fullName: string;
  cpf: string;
  status: EmployeeStatus;
  departmentId?: string;
  stationId?: string;
}

/** @deprecated use Employee */
export interface Person {
  id: string;
  name: string;
  email: string;
  department: string;
}

export type AssetOrigin = 'MANUAL' | 'LEGACY_GLPI';

export interface Asset {
  id: string;
  assetCode: string;
  type: string;
  description: string;
  serialNumber?: string;
  status: AssetStatus;
  origin?: AssetOrigin;
  manufacturer?: string;
  model?: string;
  processor?: string;
  os?: string;
  glpiGroup?: string;
  importedAt?: string;
  stationId?: string;
  assignedAt?: string;
  acquisitionDate?: string;
  fiscalNote?: string;
  accountingCategory?: string;
  acquisitionValue?: number;
  depreciationRate?: number;
  usefulLifeYears?: number;
  warrantyUntil?: string;
  lastCheckAt?: string;
  lastCheckBy?: string;
  lastCheckResult?: CheckResult;
}

export interface AssetAssignment {
  id: string;
  assetId: string;
  stationId: string;
  assignedUserId?: string;
  assignedAt: string;
  status: 'ACTIVE' | 'RETURNED';
}

export interface Layout {
  id: string;
  name: string;
  code: string;
  width: number;
  height: number;
  spaceId?: string;
  elements: LayoutElement[];
}

export interface Space {
  id: string;
  name: string;
  type: SpaceType;
  parentId?: string;
  order: number;
}
