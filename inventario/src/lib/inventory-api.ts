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
  acquisitionValue?: number | null;
  depreciationRate?: number | null;
  usefulLifeYears?: number | null;
  warrantyUntil?: string | null;
  lastInventoryCheckAt: string | null;
  assetUpdatedAt: string | null;
}

export interface ApiHistoryEvent {
  type: string;
  description: string;
  timestamp: string;
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
}

export interface ApiAssetDisposalDocument {
  id: number;
  type: string;
  fileName: string;
  mimeType: string | null;
  uploadedBy: string | null;
  uploadedAt: string;
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
  items: ApiAssetDisposalItem[];
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

export type ApiExchangeTermStatus = "DRAFT" | "WAITING_SIGNATURE" | "ACTIVE" | "CANCELLED";

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
  notes: string | null;
  termGeneratedAt: string | null;
  signedDocumentUploadedAt: string | null;
  activeSince: string | null;
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
  createEmployee: (body: { fullName: string; cpf?: string; status: EmployeeStatus; departmentId?: string | null }) => apiPost<ApiEmployee>("/employees", body),
  updateEmployee: (id: string, body: { fullName: string; cpf?: string; status: EmployeeStatus; departmentId?: string | null }) => apiPut<ApiEmployee>(`/employees/${id}`, body),
  deleteEmployee: (id: string) => apiDelete(`/employees/${id}`),

  listStations: () => apiGet<ApiStation[]>("/stations"),
  createStation: (body: { code: string; name: string; locationCode?: string; description?: string; status: StationStatus; observation?: string; spaceId?: number | null; layoutElementRef?: string; positionX?: number | null; positionY?: number | null; positionRotation?: number | null }) => apiPost<ApiStation>("/stations", body),
  updateStation: (id: string, body: { code: string; name: string; locationCode?: string; description?: string; status: StationStatus; observation?: string; spaceId?: number | null; layoutElementRef?: string; positionX?: number | null; positionY?: number | null; positionRotation?: number | null }) => apiPut<ApiStation>(`/stations/${id}`, body),
  deleteStation: (id: string) => apiDelete(`/stations/${id}`),
  changeResponsible: (id: string, body: { employeeId?: string | null; forceMove?: boolean; notes?: string }) => apiPut<ApiStation>(`/stations/${id}/responsible`, body),
  stationHistory: (id: string) => apiGet<ApiHistoryEvent[]>(`/stations/${id}/history`),

  listAssets: () => apiGet<ApiAsset[]>("/assets-flat"),
  createAsset: (body: { assetCode: string; type: string; description: string; serialNumber?: string; status: AssetStatus; origin?: "MANUAL" | "LEGACY_GLPI"; manufacturer?: string; model?: string; processor?: string; operatingSystem?: string; notes?: string }) => apiPost<ApiAsset>("/assets", body),
  updateAsset: (id: string, body: { assetCode: string; type: string; description: string; serialNumber?: string; status: AssetStatus; origin?: "MANUAL" | "LEGACY_GLPI"; manufacturer?: string; model?: string; processor?: string; operatingSystem?: string; notes?: string }) => apiPut<ApiAsset>(`/assets/${id}`, body),
  deleteAsset: (id: string) => apiDelete(`/assets/${id}`),
  linkAsset: (id: string, body: { stationId: number; performedBy?: string; reason?: string }) => apiPost<ApiAsset>(`/assets/${id}/link`, body),
  unlinkAsset: (id: string, performedBy?: string) => apiPost<ApiAsset>(`/assets/${id}/unlink${performedBy ? `?performedBy=${encodeURIComponent(performedBy)}` : ""}`),
  transferAsset: (id: string, body: { toStationId: number; performedBy?: string; reason?: string }) => apiPost<ApiAsset>(`/assets/${id}/transfer`, body),
  assetHistory: (id: string) => apiGet<ApiHistoryEvent[]>(`/assets/${id}/history`),

  listDisposals: () => apiGet<ApiAssetDisposal[]>("/asset-disposals"),
  getDisposal: (id: string) => apiGet<ApiAssetDisposal>(`/asset-disposals/${id}`),
  createDisposal: (body: { assetIds: number[]; reason: ApiDisposalReason; destination: string; justification: string; notes?: string; authorizedByName: string; authorizationDate?: string; requestedBy?: string }) => apiPost<ApiAssetDisposal>("/asset-disposals", body),
  generateDisposalTerm: (id: string, username?: string) => apiPost<ApiAssetDisposal>(`/asset-disposals/${id}/generate-term${username ? `?username=${encodeURIComponent(username)}` : ""}`),
  disposalTermUrl: (id: string) => apiUrl(`/asset-disposals/${id}/term`),
  disposalSignatureSheetUrl: (id: string) => apiUrl(`/asset-disposals/${id}/signature-sheet`),
  uploadSignedDisposalTerm: (id: string, file: File, username?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (username) form.append("username", username);
    return apiPostForm<ApiAssetDisposal>(`/asset-disposals/${id}/upload-signed-term`, form);
  },
  finalizeDisposal: (id: string, username?: string) => apiPost<ApiAssetDisposal>(`/asset-disposals/${id}/finalize${username ? `?username=${encodeURIComponent(username)}` : ""}`),
  cancelDisposal: (id: string, body: { reason: string; username?: string }) => apiPost<ApiAssetDisposal>(`/asset-disposals/${id}/cancel`, body),

  // Termos de responsabilidade
  listResponsibilityTerms: () => apiGet<ApiResponsibilityTerm[]>("/responsibility-terms"),
  getResponsibilityTerm: (id: string) => apiGet<ApiResponsibilityTerm>(`/responsibility-terms/${id}`),
  createResponsibilityTerm: (body: { employeeId: string; assetIds: number[]; notes?: string }) => apiPost<ApiResponsibilityTerm>("/responsibility-terms", body),
  generateResponsibilityTerm: (id: string, username?: string) => apiPost<ApiResponsibilityTerm>(`/responsibility-terms/${id}/generate-term${username ? `?username=${encodeURIComponent(username)}` : ""}`),
  responsibilityTermUrl: (id: string) => apiUrl(`/responsibility-terms/${id}/term`),
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
  createExchangeTerm: (body: { retiredAssetId: number; deliveredAssetId: number; responsibleName?: string; ticketRef?: string; sector?: string; reason?: string; notes?: string }) => apiPost<ApiEquipmentExchangeTerm>("/equipment-exchange-terms", body),
  generateExchangeTerm: (id: string, username?: string) => apiPost<ApiEquipmentExchangeTerm>(`/equipment-exchange-terms/${id}/generate-term${username ? `?username=${encodeURIComponent(username)}` : ""}`),
  exchangeTermUrl: (id: string) => apiUrl(`/equipment-exchange-terms/${id}/term`),
  uploadSignedExchangeTerm: (id: string, file: File, username?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (username) form.append("username", username);
    return apiPostForm<ApiEquipmentExchangeTerm>(`/equipment-exchange-terms/${id}/upload-signed-term`, form);
  },
  activateExchangeTerm: (id: string, username?: string) => apiPost<ApiEquipmentExchangeTerm>(`/equipment-exchange-terms/${id}/activate${username ? `?username=${encodeURIComponent(username)}` : ""}`),

  // Solicitações
  listAssetRequests: () => apiGet<ApiAssetRequest[]>("/asset-requests"),
  createAssetRequest: (body: { type: ApiAssetRequestType; priority?: ApiAssetRequestPriority; title: string; description: string; requestedBy?: string; department?: string }) => apiPost<ApiAssetRequest>("/asset-requests", body),
  approveAssetRequest: (id: string, body?: { note?: string; username?: string }) => apiPost<ApiAssetRequest>(`/asset-requests/${id}/approve`, body ?? {}),
  rejectAssetRequest: (id: string, body?: { note?: string; username?: string }) => apiPost<ApiAssetRequest>(`/asset-requests/${id}/reject`, body ?? {}),

  getLayout: (spaceId: string) => apiGet<ApiLayout | null>(`/layouts/${spaceId}`),
  saveLayout: (spaceId: string, body: ApiLayout) => apiPut<ApiLayout>(`/layouts/${spaceId}`, body),
};
