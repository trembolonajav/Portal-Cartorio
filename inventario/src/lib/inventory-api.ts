import { apiDelete, apiGet, apiPost, apiPostForm, apiPut, apiUrl } from "@/lib/api";
import type { AssetStatus, EmployeeStatus, SpaceType, StationStatus } from "@/features/inventory-map/types/inventoryMap.types";

export interface ApiDepartment {
  id: string;
  name: string;
}

export interface ApiSpace {
  id: number;
  name: string;
  type: SpaceType;
  parentId: number | null;
  sortOrder: number;
}

export interface ApiEmployee {
  id: string;
  fullName: string;
  cpf: string | null;
  jobTitle: string | null;
  status: EmployeeStatus;
  departmentId: string | null;
  departmentName: string | null;
  stationId: number | null;
  stationCode: string | null;
}

export interface ApiStation {
  id: number;
  code: string;
  name: string;
  locationCode: string | null;
  description: string | null;
  status: StationStatus;
  observation: string | null;
  spaceId: number | null;
  spaceName: string | null;
  layoutElementRef: string | null;
  positionX: number | null;
  positionY: number | null;
  positionRotation: number | null;
  lastConferenceAt: string | null;
  lastConferenceBy: string | null;
  lastInventoryCheckAt: string | null;
  responsibleEmployeeId: string | null;
  responsibleEmployeeName: string | null;
  responsibleDepartmentId: string | null;
  responsibleDepartmentName: string | null;
  assetCount: number;
}

export interface ApiAsset {
  assetId: number;
  assetCode: string;
  assetType: string;
  assetDescription: string;
  serialNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  processor: string | null;
  operatingSystem: string | null;
  assetStatus: AssetStatus;
  assetOrigin: "MANUAL" | "LEGACY_GLPI";
  stationId: number | null;
  stationCode: string | null;
  stationName: string | null;
  stationStatus: StationStatus | null;
  employeeId: string | null;
  employeeName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  assignedAt: string | null;
  acquisitionDate?: string | null;
  fiscalNote?: string | null;
  accountingCategory?: string | null;
  accountingGroup?: string | null;
  accountingTreatment?: string | null;
  acquisitionValue?: number | null;
  depreciationRate?: number | null;
  usefulLifeYears?: number | null;
  usefulLifeMonths?: number | null;
  residualValue?: number | null;
  depreciationStartDate?: string | null;
  depreciationMethod?: string | null;
  policyVersion?: number | null;
  warrantyUntil?: string | null;
  notes?: string | null;
  lastInventoryCheckAt: string | null;
  assetUpdatedAt: string | null;
  lastCheckAt?: string | null;
  lastCheckBy?: string | null;
  lastCheckResult?: CheckResult | null;
  voidedAt?: string | null;
  voidedBy?: string | null;
  voidReason?: string | null;
  nfeAccessKey?: string | null;
  fiscalNoteSeries?: string | null;
  supplierName?: string | null;
  acquisitionBatch?: string | null;
  nfItemCode?: string | null;
  supplierOrder?: string | null;
  initialCondition?: string | null;
  conditionGrade?: string | null;
  functionalStatus?: string | null;
  conditionNotes?: string | null;
  partNumber?: string | null;
  regulatoryModel?: string | null;
  ncm?: string | null;
  ean?: string | null;
  upc?: string | null;
  color?: string | null;
  ram?: string | null;
  storage?: string | null;
}

export type ApiAssetDocumentType = "INVOICE" | "RECEIPT_TERM" | "WARRANTY" | "MANUAL" | "OTHER";

export interface ApiAssetDocumentAsset {
  id: number;
  assetCode: string;
  type: string;
  description: string;
}

export interface ApiAssetDocument {
  id: number;
  type: ApiAssetDocumentType;
  title: string;
  description: string | null;
  documentNumber: string | null;
  issueDate: string | null;
  supplierName: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: string | null;
  uploadedAt: string;
  assets: ApiAssetDocumentAsset[];
}

export type CheckResult = "FOUND" | "NOT_FOUND" | "DIVERGENCE";
export type DivergenceType =
  | "WRONG_LOCATION" | "WRONG_OWNER" | "WRONG_DESCRIPTION" | "NO_TAG"
  | "DAMAGED" | "DISPOSED_FOUND" | "NEW_UNREGISTERED";

export interface ApiPhysicalCheckPhoto {
  id: number;
  checkId: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
  url: string;
  uploadedBy: string | null;
  uploadedAt: string;
}

export interface ApiPhysicalCheck {
  id: number;
  assetId: number;
  assetCode: string;
  assetDescription: string;
  stationId: number | null;
  stationCode: string | null;
  expectedStationId: number | null;
  expectedStationCode: string | null;
  result: CheckResult;
  divergenceType: DivergenceType | null;
  note: string | null;
  checkedBy: string;
  checkedAt: string;
  photos: ApiPhysicalCheckPhoto[];
}

export interface ApiUnregisteredStockItemPhoto {
  id: number;
  itemId: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: string | null;
  uploadedAt: string;
}

export interface ApiUnregisteredStockItem {
  id: number;
  provisionalCode: string;
  type: string;
  description: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  notes: string | null;
  status: "PENDING" | "REGISTERED";
  registeredAssetId: number | null;
  registeredAssetCode: string | null;
  foundBy: string | null;
  foundAt: string;
  resolvedBy: string | null;
  resolvedAt: string | null;
  photos: ApiUnregisteredStockItemPhoto[];
}

export interface ApiConferenceFinalization {
  id: number;
  stationId: number | null;
  stationCode: string | null;
  stationName: string | null;
  checkedBy: string;
  checkedAt: string;
}

export interface ConferenceChecksFilter {
  stationId?: number | null;
  result?: CheckResult | null;
  checkedBy?: string | null;
  from?: string | null;
  to?: string | null;
}

export interface ApiMovement {
  id: number;
  assetId: number | null;
  assetCode: string | null;
  assetType: string | null;
  assetDescription: string | null;
  movementType: string;
  movedAt: string;
  fromStationCode?: string | null;
  fromStationName?: string | null;
  toStationCode?: string | null;
  toStationName?: string | null;
  fromEmployeeName?: string | null;
  toEmployeeName?: string | null;
  performedBy?: string | null;
  reason?: string | null;
}

export interface ApiHistoryEvent {
  type: string;
  description: string;
  timestamp: string;
  fromStationId?: number | null;
  fromStationCode?: string | null;
  toStationId?: number | null;
  toStationCode?: string | null;
  fromEmployeeId?: string | null;
  fromEmployeeName?: string | null;
  fromDepartmentName?: string | null;
  toEmployeeId?: string | null;
  toEmployeeName?: string | null;
  toDepartmentName?: string | null;
  performedBy?: string | null;
  reason?: string | null;
  sourceProcessType?: string | null;
  sourceProcessId?: number | null;
  sourceProcessNumber?: string | null;
}

export interface ApiLayoutElement {
  id: string;
  elementType: "WALL" | "PARTITION" | "DESK" | "CHAIR" | "PRINTER" | "SWITCH" | "LABEL" | "ROOM_BLOCK";
  layer: "structural" | "furniture" | "labels";
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

export interface ApiLayout {
  id: string;
  name: string;
  code: string;
  width: number;
  height: number;
  spaceId: number;
  elements: ApiLayoutElement[];
}

export interface ApiAuthMe {
  username: string;
  role: "ADMIN" | "OPERATOR" | "USER";
  roles: ("ADMIN" | "OPERATOR" | "USER")[];
  displayRole: string;
}

export type ApiDisposalStatus = "DRAFT" | "WAITING_SIGNATURE" | "FINALIZED" | "CANCELLED";
export type ApiDisposalReason = "OBSOLESCENCE" | "IRREPAIRABLE_DEFECT" | "PHYSICAL_DAMAGE" | "LOSS" | "REPLACEMENT" | "DONATION" | "DISCARD" | "SALE" | "OTHER";
export type ApiDisposalDocumentType = "SIGNED_TERM" | "PHOTO" | "TECHNICAL_REPORT" | "DISPOSAL_RECEIPT" | "ORIGINAL_PROCESS" | "OTHER";

export interface ApiAssetDisposalItem {
  id: number;
  assetId: number;
  assetCode: string;
  description: string;
  category: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  department: string | null;
  station: string | null;
  responsible: string | null;
  status: string;
  origin: string;
  itemReason: ApiDisposalReason | null;
  physicalCondition: string | null;
  evaluationDescription: string | null;
  technicalNotes: string | null;
  requiresDataSanitization: boolean;
  dataSanitizationCompleted: boolean;
}

export interface ApiAssetDisposalDocument {
  id: number;
  type: ApiDisposalDocumentType;
  fileName: string;
  mimeType: string | null;
  uploadedBy: string | null;
  uploadedAt: string;
  disposalItemId: number | null;
  assetCode: string | null;
}

export interface ApiAssetPolicy {
  id: number;
  assetType: string;
  accountingCategory: string;
  accountingGroup: string | null;
  accountingTreatment: string;
  usefulLifeMonths: number;
  annualRate: number;
  residualRate: number;
  depreciationMethod: string;
  policyVersion: number;
  active: boolean;
  updatedAt: string;
}

export interface ApiAssetPayload {
  assetCode: string;
  type: string;
  description: string;
  serialNumber?: string;
  status: AssetStatus;
  origin?: "MANUAL" | "LEGACY_GLPI";
  manufacturer?: string;
  model?: string;
  processor?: string;
  operatingSystem?: string;
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
  warrantyUntil?: string;
  notes?: string;
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

export interface ApiAssetDisposalMaterial {
  id: number;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  notes: string | null;
  containsSensitiveData: boolean;
}

export interface ApiAssetDisposalEvent {
  id: number;
  type: string;
  description: string;
  username: string | null;
  createdAt: string;
}

export interface ApiAssetDisposal {
  id: number;
  number: string;
  status: ApiDisposalStatus;
  reason: ApiDisposalReason;
  destination: string;
  justification: string;
  notes: string | null;
  requestedBy: string | null;
  authorizedByName: string;
  authorizationDate: string | null;
  createdAt: string;
  termGeneratedAt: string | null;
  signedDocumentUploadedAt: string | null;
  finalizedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  itemCount: number;
  assetCount: number;
  materialCount: number;
  items: ApiAssetDisposalItem[];
  materials: ApiAssetDisposalMaterial[];
  documents: ApiAssetDisposalDocument[];
  events: ApiAssetDisposalEvent[];
}

export type ApiResponsibilityTermStatus = "DRAFT" | "WAITING_SIGNATURE" | "ACTIVE" | "RETURNED" | "CANCELLED";

export interface ApiResponsibilityTermItem {
  id: number;
  assetId: number;
  assetCode: string;
  description: string;
  category: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  station: string | null;
  status: string;
  conditionGrade: string | null;
  functionalStatus: string | null;
  conditionNotes: string | null;
}

export interface ApiResponsibilityTermDocument {
  id: number;
  type: string;
  fileName: string;
  mimeType: string | null;
  uploadedBy: string | null;
  uploadedAt: string;
}

export interface ApiResponsibilityTerm {
  id: number;
  number: string;
  status: ApiResponsibilityTermStatus;
  employeeId: string | null;
  employeeName: string;
  employeeJobTitle: string | null;
  department: string | null;
  location: string | null;
  notes: string | null;
  termGeneratedAt: string | null;
  signedDocumentUploadedAt: string | null;
  activeSince: string | null;
  returnedAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  itemCount: number;
  items: ApiResponsibilityTermItem[];
  documents: ApiResponsibilityTermDocument[];
}

export type ApiExchangeTermStatus = "DRAFT" | "WAITING_SIGNATURE" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type ApiExchangeInspectionResult = "CONFIRMED" | "PARTIAL" | "NOT_CONFIRMED";
export type ApiExchangeCondition = "GOOD" | "NORMAL_WEAR" | "DAMAGED" | "INCOMPLETE";
export type ApiExchangeRetiredDestination = "MAINTENANCE" | "STOCK" | "DISPOSAL_EVALUATION";

export interface ApiEquipmentExchangeTermDocument {
  id: number;
  type: string;
  fileName: string;
  mimeType: string | null;
  uploadedBy: string | null;
  uploadedAt: string;
}

export interface ApiEquipmentExchangeTerm {
  id: number;
  number: string;
  status: ApiExchangeTermStatus;
  retiredAssetId: number;
  retiredCode: string;
  retiredDescription: string;
  retiredSerial: string | null;
  retiredStation: string | null;
  retiredResponsible: string | null;
  deliveredAssetId: number;
  deliveredCode: string;
  deliveredDescription: string;
  deliveredSerial: string | null;
  deliveredStation: string | null;
  responsibleName: string | null;
  location: string | null;
  ticketRef: string | null;
  sector: string | null;
  reason: string | null;
  reportedProblem: string | null;
  inspectionResult: ApiExchangeInspectionResult | null;
  diagnosis: string | null;
  returnedCondition: ApiExchangeCondition | null;
  retiredDestination: ApiExchangeRetiredDestination | null;
  technicianName: string | null;
  notes: string | null;
  termGeneratedAt: string | null;
  signedDocumentUploadedAt: string | null;
  activeSince: string | null;
  completedAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  documents: ApiEquipmentExchangeTermDocument[];
}

export type ApiAssetRequestType = "NEW_EQUIPMENT" | "REPAIR" | "RELOCATION" | "SUPPLY" | "OTHER";
export type ApiAssetRequestPriority = "LOW" | "MEDIUM" | "HIGH";
export type ApiAssetRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface ApiAssetRequest {
  id: number;
  number: string;
  type: ApiAssetRequestType;
  priority: ApiAssetRequestPriority;
  status: ApiAssetRequestStatus;
  title: string;
  description: string;
  requestedBy: string | null;
  department: string | null;
  decisionNote: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export const inventoryApi = {
  me: () => apiGet<ApiAuthMe>("/auth/me"),
  listDepartments: () => apiGet<ApiDepartment[]>("/departments"),
  createDepartment: (body: { name: string }) => apiPost<ApiDepartment>("/departments", body),
  updateDepartment: (id: string, body: { name: string }) => apiPut<ApiDepartment>(`/departments/${id}`, body),
  deleteDepartment: (id: string) => apiDelete(`/departments/${id}`),

  listSpaces: () => apiGet<ApiSpace[]>("/spaces"),
  createSpace: (body: { name: string; type: SpaceType; parentId?: number; sortOrder?: number }) => apiPost<ApiSpace>("/spaces", body),
  updateSpace: (id: string, body: { name: string; type: SpaceType; parentId?: number; sortOrder?: number }) => apiPut<ApiSpace>(`/spaces/${id}`, body),
  deleteSpace: (id: string) => apiDelete(`/spaces/${id}`),

  listEmployees: () => apiGet<ApiEmployee[]>("/employees"),
  createEmployee: (body: { fullName: string; cpf?: string; jobTitle?: string | null; status: EmployeeStatus; departmentId?: string | null }) => apiPost<ApiEmployee>("/employees", body),
  updateEmployee: (id: string, body: { fullName: string; cpf?: string; jobTitle?: string | null; status: EmployeeStatus; departmentId?: string | null }) => apiPut<ApiEmployee>(`/employees/${id}`, body),
  deleteEmployee: (id: string) => apiDelete(`/employees/${id}`),

  listStations: () => apiGet<ApiStation[]>("/stations"),
  createStation: (body: { code: string; name: string; locationCode?: string; description?: string; status: StationStatus; observation?: string; spaceId?: number | null; layoutElementRef?: string; positionX?: number | null; positionY?: number | null; positionRotation?: number | null }) => apiPost<ApiStation>("/stations", body),
  updateStation: (id: string, body: { code: string; name: string; locationCode?: string; description?: string; status: StationStatus; observation?: string; spaceId?: number | null; layoutElementRef?: string; positionX?: number | null; positionY?: number | null; positionRotation?: number | null }) => apiPut<ApiStation>(`/stations/${id}`, body),
  deleteStation: (id: string) => apiDelete(`/stations/${id}`),
  changeResponsible: (id: string, body: { employeeId?: string | null; forceMove?: boolean; notes?: string }) => apiPut<ApiStation>(`/stations/${id}/responsible`, body),
  stationHistory: (id: string) => apiGet<ApiHistoryEvent[]>(`/stations/${id}/history`),

  // Conferência física (mobile)
  recordCheck: (assetId: string, body: { result: CheckResult; divergenceType?: DivergenceType | null; stationId?: number | null; registerMovement?: boolean; note?: string }) => apiPost<ApiPhysicalCheck>(`/assets/${assetId}/check`, body),
  conferenceFinalizations: (stationId: string) => apiGet<ApiHistoryEvent[]>(`/stations/${stationId}/conference-finalizations`),
  stationChecks: (stationId: string) => apiGet<ApiPhysicalCheck[]>(`/stations/${stationId}/checks`),
  checkHistory: (assetId: string) => apiGet<ApiPhysicalCheck[]>(`/assets/${assetId}/checks`),
  finalizeConference: (stationId: string) => apiPost<void>(`/stations/${stationId}/finalize-conference`),
  stockChecks: () => apiGet<ApiPhysicalCheck[]>("/stock/checks"),
  stockFinalizations: () => apiGet<ApiHistoryEvent[]>("/stock/conference-finalizations"),
  finalizeStockConference: () => apiPost<void>("/stock/finalize-conference"),
  listUnregisteredStockItems: () => apiGet<ApiUnregisteredStockItem[]>("/stock/unregistered-items"),
  createUnregisteredStockItem: (body: { type: string; description: string; manufacturer?: string; model?: string; serialNumber?: string; notes?: string }) =>
    apiPost<ApiUnregisteredStockItem>("/stock/unregistered-items", body),
  uploadUnregisteredStockItemPhoto: (itemId: number | string, file: File | Blob) => {
    const form = new FormData();
    form.append("file", file);
    return apiPostForm<ApiUnregisteredStockItemPhoto>(`/stock/unregistered-items/${itemId}/photos`, form);
  },
  resolveUnregisteredStockItem: (itemId: number | string, assetCode: string) =>
    apiPost<ApiUnregisteredStockItem>(`/stock/unregistered-items/${itemId}/resolve`, { assetCode }),
  unregisteredStockItemPhotoUrl: (id: number | string) => apiUrl(`/unregistered-stock-item-photos/${id}/file`),
  uploadCheckPhoto: (checkId: number | string, file: File | Blob) => {
    const form = new FormData();
    form.append("file", file);
    return apiPostForm<ApiPhysicalCheckPhoto>(`/checks/${checkId}/photos`, form);
  },
  checkPhotos: (checkId: number | string) => apiGet<ApiPhysicalCheckPhoto[]>(`/checks/${checkId}/photos`),
  checkPhotoUrl: (id: number | string) => apiUrl(`/check-photos/${id}/file`),
  conferenceChecks: (filter: ConferenceChecksFilter = {}) => {
    const params = new URLSearchParams();
    if (filter.stationId != null) params.set("stationId", String(filter.stationId));
    if (filter.result) params.set("result", filter.result);
    if (filter.checkedBy) params.set("checkedBy", filter.checkedBy);
    if (filter.from) params.set("from", filter.from);
    if (filter.to) params.set("to", filter.to);
    const qs = params.toString();
    return apiGet<ApiPhysicalCheck[]>(`/conference/checks${qs ? `?${qs}` : ""}`);
  },
  conferenceAllFinalizations: () => apiGet<ApiConferenceFinalization[]>(`/conference/finalizations`),

  listAssets: () => apiGet<ApiAsset[]>("/assets-flat"),
  createAsset: (body: ApiAssetPayload) => apiPost<ApiAsset>("/assets", body),
  updateAsset: (id: string, body: ApiAssetPayload) => apiPut<ApiAsset>(`/assets/${id}`, body),
  voidAsset: (id: string, reason: string) => apiPost<ApiAsset>(`/assets/${id}/void`, { reason }),
  linkAsset: (id: string, body: { stationId: number; performedBy?: string; reason?: string }) => apiPost<ApiAsset>(`/assets/${id}/link`, body),
  unlinkAsset: (id: string, reason: string) => apiPost<ApiAsset>(`/assets/${id}/unlink?reason=${encodeURIComponent(reason)}`),
  transferAsset: (id: string, body: { toStationId: number; performedBy?: string; reason?: string }) => apiPost<ApiAsset>(`/assets/${id}/transfer`, body),
  assetHistory: (id: string) => apiGet<ApiHistoryEvent[]>(`/assets/${id}/history`),
  movements: () => apiGet<ApiMovement[]>("/movements"),

  listAssetDocuments: (assetId?: string) => apiGet<ApiAssetDocument[]>(`/asset-documents${assetId ? `?assetId=${encodeURIComponent(assetId)}` : ""}`),
  assetDocumentUrl: (id: number | string) => apiUrl(`/asset-documents/${id}/file`),
  uploadAssetDocument: (input: {
    type: ApiAssetDocumentType;
    title: string;
    description?: string;
    documentNumber?: string;
    issueDate?: string;
    supplierName?: string;
    assetIds?: Array<number | string>;
    file: File;
  }) => {
    const form = new FormData();
    form.append("type", input.type);
    form.append("title", input.title);
    if (input.description) form.append("description", input.description);
    if (input.documentNumber) form.append("documentNumber", input.documentNumber);
    if (input.issueDate) form.append("issueDate", input.issueDate);
    if (input.supplierName) form.append("supplierName", input.supplierName);
    input.assetIds?.forEach(id => form.append("assetIds", String(id)));
    form.append("file", input.file);
    return apiPostForm<ApiAssetDocument>("/asset-documents", form);
  },

  listAssetPolicies: () => apiGet<ApiAssetPolicy[]>("/asset-policies"),
  updateAssetPolicy: (id: number, body: Omit<ApiAssetPolicy, "id" | "annualRate" | "policyVersion" | "updatedAt"> & { applyToExisting: boolean }) =>
    apiPut<ApiAssetPolicy>(`/asset-policies/${id}`, body),

  listDisposals: () => apiGet<ApiAssetDisposal[]>("/asset-disposals"),
  listOpenDisposalAssetIds: () => apiGet<number[]>("/asset-disposals/open-asset-ids"),
  listDisposalsForAsset: (assetId: string) => apiGet<ApiAssetDisposal[]>(`/asset-disposals/by-asset/${assetId}`),
  getDisposal: (id: string) => apiGet<ApiAssetDisposal>(`/asset-disposals/${id}`),
  createDisposal: (body: { assetIds: number[]; itemAssessments: Array<{ assetId: number; reason: ApiDisposalReason; physicalCondition?: string; evaluationDescription?: string; technicalNotes?: string; requiresDataSanitization: boolean; dataSanitizationCompleted: boolean }>; materials: Array<{ category: string; description: string; quantity: number; unit: string; notes?: string; containsSensitiveData: boolean }>; reason: ApiDisposalReason; destination: string; justification: string; notes?: string; authorizedByName: string; authorizationDate?: string; requestedBy?: string }) => apiPost<ApiAssetDisposal>("/asset-disposals", body),
  generateDisposalTerm: (id: string, username?: string) => apiPost<ApiAssetDisposal>(`/asset-disposals/${id}/generate-term${username ? `?username=${encodeURIComponent(username)}` : ""}`),
  disposalTermUrl: (id: string) => apiUrl(`/asset-disposals/${id}/term`),
  disposalSignatureSheetUrl: (id: string) => apiUrl(`/asset-disposals/${id}/signature-sheet`),
  uploadSignedDisposalTerm: (id: string, file: File, username?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (username) form.append("username", username);
    return apiPostForm<ApiAssetDisposal>(`/asset-disposals/${id}/upload-signed-term`, form);
  },
  uploadDisposalDocument: (id: string, type: ApiDisposalDocumentType, file: File, username?: string, disposalItemId?: number | null) => {
    const form = new FormData();
    form.append("type", type);
    form.append("file", file);
    if (username) form.append("username", username);
    if (disposalItemId) form.append("disposalItemId", String(disposalItemId));
    return apiPostForm<ApiAssetDisposal>(`/asset-disposals/${id}/documents`, form);
  },
  updateDisposalItemAssessment: (id: string, itemId: string, body: { assetId: number; reason: ApiDisposalReason; physicalCondition?: string; evaluationDescription?: string; technicalNotes?: string; requiresDataSanitization: boolean; dataSanitizationCompleted: boolean }) =>
    apiPut<ApiAssetDisposal>(`/asset-disposals/${id}/items/${itemId}/assessment`, body),
  disposalDocumentUrl: (id: string, documentId: string) => apiUrl(`/asset-disposals/${id}/documents/${documentId}`),
  finalizeDisposal: (id: string, username?: string) => apiPost<ApiAssetDisposal>(`/asset-disposals/${id}/finalize${username ? `?username=${encodeURIComponent(username)}` : ""}`),
  cancelDisposal: (id: string, body: { reason: string; username?: string }) => apiPost<ApiAssetDisposal>(`/asset-disposals/${id}/cancel`, body),

  // Termos de responsabilidade
  listResponsibilityTerms: () => apiGet<ApiResponsibilityTerm[]>("/responsibility-terms"),
  getResponsibilityTerm: (id: string) => apiGet<ApiResponsibilityTerm>(`/responsibility-terms/${id}`),
  createResponsibilityTerm: (body: { employeeId: string; assetIds: number[]; notes?: string }) => apiPost<ApiResponsibilityTerm>("/responsibility-terms", body),
  generateResponsibilityTerm: (id: string, username?: string) => apiPost<ApiResponsibilityTerm>(`/responsibility-terms/${id}/generate-term${username ? `?username=${encodeURIComponent(username)}` : ""}`),
  responsibilityTermUrl: (id: string) => apiUrl(`/responsibility-terms/${id}/term`),
  responsibilityTermSignedUrl: (id: string) => apiUrl(`/responsibility-terms/${id}/signed-term`),
  uploadSignedResponsibilityTerm: (id: string, file: File, username?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (username) form.append("username", username);
    return apiPostForm<ApiResponsibilityTerm>(`/responsibility-terms/${id}/upload-signed-term`, form);
  },
  activateResponsibilityTerm: (id: string, username?: string) => apiPost<ApiResponsibilityTerm>(`/responsibility-terms/${id}/activate${username ? `?username=${encodeURIComponent(username)}` : ""}`),
  returnResponsibilityTerm: (id: string, username?: string) => apiPost<ApiResponsibilityTerm>(`/responsibility-terms/${id}/return${username ? `?username=${encodeURIComponent(username)}` : ""}`),

  // Termos de troca de equipamento
  listExchangeTerms: () => apiGet<ApiEquipmentExchangeTerm[]>("/equipment-exchange-terms"),
  getExchangeTerm: (id: string) => apiGet<ApiEquipmentExchangeTerm>(`/equipment-exchange-terms/${id}`),
  createExchangeTerm: (body: { retiredAssetId: number; deliveredAssetId: number; responsibleName?: string; ticketRef?: string; sector?: string; reason?: string; reportedProblem: string; inspectionResult: ApiExchangeInspectionResult; diagnosis: string; returnedCondition: ApiExchangeCondition; retiredDestination: ApiExchangeRetiredDestination; technicianName?: string; notes?: string }) => apiPost<ApiEquipmentExchangeTerm>("/equipment-exchange-terms", body),
  generateExchangeTerm: (id: string, username?: string) => apiPost<ApiEquipmentExchangeTerm>(`/equipment-exchange-terms/${id}/generate-term${username ? `?username=${encodeURIComponent(username)}` : ""}`),
  exchangeTermUrl: (id: string) => apiUrl(`/equipment-exchange-terms/${id}/term`),
  uploadSignedExchangeTerm: (id: string, file: File, username?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (username) form.append("username", username);
    return apiPostForm<ApiEquipmentExchangeTerm>(`/equipment-exchange-terms/${id}/upload-signed-term`, form);
  },
  activateExchangeTerm: (id: string, username?: string) => apiPost<ApiEquipmentExchangeTerm>(`/equipment-exchange-terms/${id}/activate${username ? `?username=${encodeURIComponent(username)}` : ""}`),
  completeExchangeTerm: (id: string) => apiPost<ApiEquipmentExchangeTerm>(`/equipment-exchange-terms/${id}/complete`),

  // Solicitações
  listAssetRequests: () => apiGet<ApiAssetRequest[]>("/asset-requests"),
  createAssetRequest: (body: { type: ApiAssetRequestType; priority?: ApiAssetRequestPriority; title: string; description: string; requestedBy?: string; department?: string }) => apiPost<ApiAssetRequest>("/asset-requests", body),
  approveAssetRequest: (id: string, body?: { note?: string; username?: string }) => apiPost<ApiAssetRequest>(`/asset-requests/${id}/approve`, body ?? {}),
  rejectAssetRequest: (id: string, body?: { note?: string; username?: string }) => apiPost<ApiAssetRequest>(`/asset-requests/${id}/reject`, body ?? {}),

  getLayout: (spaceId: string) => apiGet<ApiLayout | null>(`/layouts/${spaceId}`),
  saveLayout: (spaceId: string, body: ApiLayout) => apiPut<ApiLayout>(`/layouts/${spaceId}`, body),
};
