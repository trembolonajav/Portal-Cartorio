import type { Layout, Station, Person, Asset, AssetAssignment, Department, Employee, Space } from '../types/inventoryMap.types';

export const mockPeople: Person[] = [
  { id: 'p1', name: 'Gabriel Santos', email: 'gabriel@veredito.com', department: 'T.I.' },
  { id: 'p2', name: 'Maria Silva', email: 'maria@veredito.com', department: 'Jurídico' },
  { id: 'p3', name: 'Ana Costa', email: 'ana@veredito.com', department: 'Financeiro' },
  { id: 'p4', name: 'Carlos Oliveira', email: 'carlos@veredito.com', department: 'Operações' },
];

export const mockDepartments: Department[] = [
  { id: 'dep1', name: 'T.I.' },
  { id: 'dep2', name: 'Jurídico' },
  { id: 'dep3', name: 'Financeiro' },
  { id: 'dep4', name: 'Operações' },
  { id: 'dep5', name: 'Escritura' },
];

export const mockEmployees: Employee[] = [
  { id: 'emp1', fullName: 'Gabriel Santos', cpf: '123.456.789-00', status: 'ACTIVE', departmentId: 'dep1', stationId: 'st1' },
  { id: 'emp2', fullName: 'Maria Silva', cpf: '234.567.890-11', status: 'ACTIVE', departmentId: 'dep2', stationId: 'st2' },
  { id: 'emp3', fullName: 'Ana Costa', cpf: '345.678.901-22', status: 'ACTIVE', departmentId: 'dep3', stationId: 'st3' },
  { id: 'emp4', fullName: 'Carlos Oliveira', cpf: '456.789.012-33', status: 'ACTIVE', departmentId: 'dep4', stationId: 'st4' },
  { id: 'emp5', fullName: 'Fernanda Lima', cpf: '567.890.123-44', status: 'INACTIVE' },
];

export const mockStations: Station[] = [
  { id: 'st1', code: 'D-08', name: 'Estação D-08', status: 'ACTIVE', responsibleUserId: 'p1', locationCode: 'Ala Norte' },
  { id: 'st2', code: 'D-05', name: 'Estação D-05', status: 'ACTIVE', responsibleUserId: 'p2', locationCode: 'Ala Norte' },
  { id: 'st3', code: 'D-12', name: 'Estação D-12', status: 'ACTIVE', responsibleUserId: 'p3', locationCode: 'Ala Sul' },
  { id: 'st4', code: 'D-03', name: 'Estação D-03', status: 'MAINTENANCE', responsibleUserId: 'p4', locationCode: 'Ala Sul' },
  { id: 'st5', code: 'D-15', name: 'Estação D-15', status: 'INACTIVE', locationCode: 'Ala Leste' },
  { id: 'st6', code: 'D-20', name: 'Estação D-20', status: 'ACTIVE', locationCode: 'Ala Leste' },
];

export const mockAssets: Asset[] = [
  { id: 'a1', assetCode: 'VRT-022', type: 'CPU', description: 'Dell Vostro 3710', serialNumber: 'SN-DV3710-001', status: 'ACTIVE' },
  { id: 'a2', assetCode: 'VRT-105', type: 'Monitor', description: 'Dell UltraSharp 27"', serialNumber: 'SN-DU27-001', status: 'ACTIVE' },
  { id: 'a3', assetCode: 'VRT-098', type: 'Nobreak', description: 'APC Back-UPS 600VA', serialNumber: 'SN-APC600-001', status: 'ACTIVE' },
  { id: 'a4', assetCode: 'VRT-112', type: 'Mouse', description: 'Logitech G203', serialNumber: 'SN-LG203-001', status: 'ACTIVE' },
  { id: 'a5', assetCode: 'VRT-201', type: 'Notebook', description: 'Lenovo ThinkPad T14', serialNumber: 'SN-LTP14-001', status: 'ACTIVE' },
  { id: 'a6', assetCode: 'VRT-202', type: 'Monitor', description: 'Dell P2422H 24"', serialNumber: 'SN-DP24-001', status: 'ACTIVE' },
  { id: 'a7', assetCode: 'VRT-301', type: 'Teclado', description: 'Logitech MX Keys', serialNumber: 'SN-LMXK-001', status: 'ACTIVE' },
  { id: 'a8', assetCode: 'VRT-302', type: 'Mouse', description: 'Logitech MX Master 3', serialNumber: 'SN-LMX3-001', status: 'ACTIVE' },
  { id: 'a9', assetCode: 'VRT-303', type: 'Monitor', description: 'Samsung 32" Curvo', serialNumber: 'SN-SS32-001', status: 'ACTIVE' },
  { id: 'a10', assetCode: 'VRT-304', type: 'CPU', description: 'Dell OptiPlex 7000', serialNumber: 'SN-DO7K-001', status: 'MAINTENANCE' },
  { id: 'a11', assetCode: 'VRT-305', type: 'Headset', description: 'Jabra Evolve2 75', serialNumber: 'SN-JE275-001', status: 'ACTIVE' },
  { id: 'a12', assetCode: 'VRT-306', type: 'Webcam', description: 'Logitech Brio 500', serialNumber: 'SN-LB500-001', status: 'ACTIVE' },
];

export const mockAssignments: AssetAssignment[] = [
  { id: 'aa1', assetId: 'a1', stationId: 'st1', assignedUserId: 'p1', assignedAt: '2024-01-15', status: 'ACTIVE' },
  { id: 'aa2', assetId: 'a2', stationId: 'st1', assignedUserId: 'p1', assignedAt: '2024-01-15', status: 'ACTIVE' },
  { id: 'aa3', assetId: 'a3', stationId: 'st1', assignedUserId: 'p1', assignedAt: '2024-01-15', status: 'ACTIVE' },
  { id: 'aa4', assetId: 'a4', stationId: 'st1', assignedUserId: 'p1', assignedAt: '2024-01-15', status: 'ACTIVE' },
  { id: 'aa5', assetId: 'a5', stationId: 'st2', assignedUserId: 'p2', assignedAt: '2024-02-01', status: 'ACTIVE' },
  { id: 'aa6', assetId: 'a6', stationId: 'st2', assignedUserId: 'p2', assignedAt: '2024-02-01', status: 'ACTIVE' },
  { id: 'aa7', assetId: 'a7', stationId: 'st3', assignedUserId: 'p3', assignedAt: '2024-03-10', status: 'ACTIVE' },
  { id: 'aa8', assetId: 'a8', stationId: 'st3', assignedUserId: 'p3', assignedAt: '2024-03-10', status: 'ACTIVE' },
  { id: 'aa9', assetId: 'a9', stationId: 'st3', assignedUserId: 'p3', assignedAt: '2024-03-10', status: 'ACTIVE' },
  { id: 'aa10', assetId: 'a10', stationId: 'st4', assignedUserId: 'p4', assignedAt: '2024-04-01', status: 'ACTIVE' },
  { id: 'aa11', assetId: 'a11', stationId: 'st4', assignedUserId: 'p4', assignedAt: '2024-04-01', status: 'ACTIVE' },
  { id: 'aa12', assetId: 'a12', stationId: 'st4', assignedUserId: 'p4', assignedAt: '2024-04-01', status: 'ACTIVE' },
];

export const mockSpaces: Space[] = [
  { id: 'sp1', name: 'Escritório Principal', type: 'UNIT', order: 0 },
  { id: 'sp2', name: 'Térreo', type: 'FLOOR', parentId: 'sp1', order: 0 },
  { id: 'sp3', name: 'Recepção', type: 'SECTOR', parentId: 'sp2', order: 0 },
  { id: 'sp4', name: 'Financeiro', type: 'SECTOR', parentId: 'sp2', order: 1 },
  { id: 'sp5', name: '1º Andar', type: 'FLOOR', parentId: 'sp1', order: 1 },
  { id: 'sp6', name: 'Jurídico', type: 'SECTOR', parentId: 'sp5', order: 0 },
  { id: 'sp7', name: 'Ala Norte', type: 'SECTOR', parentId: 'sp5', order: 1 },
  { id: 'sp8', name: 'Ala Sul', type: 'SECTOR', parentId: 'sp5', order: 2 },
  { id: 'sp9', name: '8º Andar', type: 'FLOOR', parentId: 'sp1', order: 2 },
  { id: 'sp10', name: 'BBS', type: 'SECTOR', parentId: 'sp9', order: 0 },
  { id: 'sp11', name: 'Aoka', type: 'SECTOR', parentId: 'sp9', order: 1 },
];

export const mockLayout: Layout = {
  id: 'layout1',
  name: 'Escritório Principal — 1º Andar',
  code: 'EP-001',
  spaceId: 'sp5',
  width: 1200,
  height: 800,
  elements: [
    // Outer walls
    { id: 'w1', elementType: 'WALL', layer: 'structural', x: 40, y: 40, width: 1120, height: 8, rotation: 0, zIndex: 1 },
    { id: 'w2', elementType: 'WALL', layer: 'structural', x: 40, y: 40, width: 8, height: 720, rotation: 0, zIndex: 1 },
    { id: 'w3', elementType: 'WALL', layer: 'structural', x: 40, y: 752, width: 1120, height: 8, rotation: 0, zIndex: 1 },
    { id: 'w4', elementType: 'WALL', layer: 'structural', x: 1152, y: 40, width: 8, height: 720, rotation: 0, zIndex: 1 },
    // Internal partitions
    { id: 'pt1', elementType: 'PARTITION', layer: 'structural', x: 580, y: 48, width: 4, height: 340, rotation: 0, zIndex: 2 },
    { id: 'pt2', elementType: 'PARTITION', layer: 'structural', x: 48, y: 400, width: 536, height: 4, rotation: 0, zIndex: 2 },
    { id: 'pt3', elementType: 'PARTITION', layer: 'structural', x: 580, y: 460, width: 4, height: 296, rotation: 0, zIndex: 2 },

    // Desks - Ala Norte (top-left)
    { id: 'd1', elementType: 'DESK', layer: 'furniture', x: 100, y: 100, width: 140, height: 70, rotation: 0, stationId: 'st1', label: 'D-08', zIndex: 10 },
    { id: 'd2', elementType: 'DESK', layer: 'furniture', x: 300, y: 100, width: 140, height: 70, rotation: 0, stationId: 'st2', label: 'D-05', zIndex: 10 },
    { id: 'd3', elementType: 'DESK', layer: 'furniture', x: 100, y: 240, width: 140, height: 70, rotation: 0, zIndex: 10 },

    // Desks - Ala Norte (top-right)
    { id: 'd4', elementType: 'DESK', layer: 'furniture', x: 640, y: 100, width: 140, height: 70, rotation: 0, stationId: 'st3', label: 'D-12', zIndex: 10 },
    { id: 'd5', elementType: 'DESK', layer: 'furniture', x: 840, y: 100, width: 140, height: 70, rotation: 0, stationId: 'st4', label: 'D-03', zIndex: 10 },
    { id: 'd6', elementType: 'DESK', layer: 'furniture', x: 1000, y: 100, width: 140, height: 70, rotation: 0, zIndex: 10 },

    // Desks - Ala Sul (bottom)
    { id: 'd7', elementType: 'DESK', layer: 'furniture', x: 100, y: 500, width: 140, height: 70, rotation: 0, stationId: 'st5', label: 'D-15', zIndex: 10 },
    { id: 'd8', elementType: 'DESK', layer: 'furniture', x: 300, y: 500, width: 140, height: 70, rotation: 0, stationId: 'st6', label: 'D-20', zIndex: 10 },
    { id: 'd9', elementType: 'DESK', layer: 'furniture', x: 640, y: 500, width: 140, height: 70, rotation: 0, zIndex: 10 },
    { id: 'd10', elementType: 'DESK', layer: 'furniture', x: 840, y: 500, width: 140, height: 70, rotation: 0, zIndex: 10 },

    // Chairs
    { id: 'c1', elementType: 'CHAIR', layer: 'furniture', x: 145, y: 180, width: 40, height: 40, rotation: 0, zIndex: 9 },
    { id: 'c2', elementType: 'CHAIR', layer: 'furniture', x: 345, y: 180, width: 40, height: 40, rotation: 0, zIndex: 9 },
    { id: 'c3', elementType: 'CHAIR', layer: 'furniture', x: 145, y: 320, width: 40, height: 40, rotation: 0, zIndex: 9 },
    { id: 'c4', elementType: 'CHAIR', layer: 'furniture', x: 685, y: 180, width: 40, height: 40, rotation: 0, zIndex: 9 },
    { id: 'c5', elementType: 'CHAIR', layer: 'furniture', x: 885, y: 180, width: 40, height: 40, rotation: 0, zIndex: 9 },
    { id: 'c6', elementType: 'CHAIR', layer: 'furniture', x: 1045, y: 180, width: 40, height: 40, rotation: 0, zIndex: 9 },
    { id: 'c7', elementType: 'CHAIR', layer: 'furniture', x: 145, y: 580, width: 40, height: 40, rotation: 0, zIndex: 9 },
    { id: 'c8', elementType: 'CHAIR', layer: 'furniture', x: 345, y: 580, width: 40, height: 40, rotation: 0, zIndex: 9 },
    { id: 'c9', elementType: 'CHAIR', layer: 'furniture', x: 685, y: 580, width: 40, height: 40, rotation: 0, zIndex: 9 },
    { id: 'c10', elementType: 'CHAIR', layer: 'furniture', x: 885, y: 580, width: 40, height: 40, rotation: 0, zIndex: 9 },

    // Labels
    { id: 'l1', elementType: 'LABEL', layer: 'labels', x: 250, y: 60, width: 100, height: 24, rotation: 0, label: 'Ala Norte', zIndex: 20 },
    { id: 'l2', elementType: 'LABEL', layer: 'labels', x: 250, y: 460, width: 100, height: 24, rotation: 0, label: 'Ala Sul', zIndex: 20 },
    { id: 'l3', elementType: 'LABEL', layer: 'labels', x: 800, y: 60, width: 100, height: 24, rotation: 0, label: 'Ala Leste', zIndex: 20 },
  ],
};
