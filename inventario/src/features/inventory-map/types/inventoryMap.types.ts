export type ElementType = 'WALL' | 'PARTITION' | 'DESK' | 'CHAIR' | 'PRINTER' | 'SWITCH' | 'LABEL' | 'ROOM_BLOCK';
export type EditorMode = 'VIEW' | 'EDIT';
export type StationStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
export type AssetStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'DISPOSED' | 'IN_STOCK' | 'VOIDED';
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

// Mobília do ambiente (camada visual atrás das estações; não é inventário).
export type FurnitureKind =
  | 'wall'
  | 'partition'
  | 'door-left'
  | 'door-right'
  | 'cabinet'
  | 'meeting'
  | 'printer'
  | 'mfp'
  | 'phone'
  | 'label'
  | 'asset'
  | 'wall-module';

export interface FurnitureItem {
  id: string;
  kind: FurnitureKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label?: string;
  assetKey?: string;
  /** Parede desenhada por cantos (polilinha, coords absolutas do canvas). Quando presente,
   * a parede é renderizada como polilinha com emendas limpas, não como retângulo. */
  points?: number[][];
  /** Espessura da parede-polilinha (px). */
  thickness?: number;
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
  jobTitle?: string;
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
  accountingGroup?: string;
  accountingTreatment?: string;
  acquisitionValue?: number;
  depreciationRate?: number;
  usefulLifeYears?: number;
  usefulLifeMonths?: number;
  residualValue?: number;
  depreciationStartDate?: string;
  depreciationMethod?: string;
  policyVersion?: number;
  warrantyUntil?: string;
  notes?: string;
  lastCheckAt?: string;
  lastCheckBy?: string;
  lastCheckResult?: CheckResult;
  voidedAt?: string;
  voidedBy?: string;
  voidReason?: string;
  nfeAccessKey?: string;
  fiscalNoteSeries?: string;
  supplierName?: string;
  acquisitionBatch?: string;
  nfItemCode?: string;
  supplierOrder?: string;
  initialCondition?: string;
  conditionGrade?: string;
  functionalStatus?: string;
  conditionNotes?: string;
  partNumber?: string;
  regulatoryModel?: string;
  ncm?: string;
  ean?: string;
  upc?: string;
  color?: string;
  ram?: string;
  storage?: string;
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
