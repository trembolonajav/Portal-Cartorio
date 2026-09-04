import { useState, useMemo, useCallback } from 'react';
import { Upload, FileSpreadsheet, Check, AlertTriangle, Filter, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppShell from '@/components/layout/AppShell';
import { useInventoryStore } from '@/features/inventory-map/store/useInventoryStore';
import type { AssetStatus } from '@/features/inventory-map/types/inventoryMap.types';
import { toast } from 'sonner';

interface ImportRow {
  assetCode: string;
  type: string;
  originalName: string;
  description: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  status: string;
  glpiGroup: string;
  glpiUser: string;
  location: string;
  sourceFile: string;
  processor: string;
  os: string;
  needsReview: boolean;
  reviewReason: string;
}

const STATUS_MAP: Record<string, AssetStatus> = {
  ACTIVE: 'ACTIVE',
  IN_STOCK: 'IN_STOCK',
  INACTIVE: 'INACTIVE',
  MAINTENANCE: 'MAINTENANCE',
  DISPOSED: 'DISPOSED',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativo',
  IN_STOCK: 'Em Estoque',
  INACTIVE: 'Inativo',
  MAINTENANCE: 'Manutenção',
  DISPOSED: 'Baixado',
};

const parseCSV = (text: string): ImportRow[] => {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  const separator = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].replace(/^\uFEFF/, '').split(separator).map(header => header.trim().replace(/^"|"$/g, ''));

  return lines.slice(1).map(line => {
    const values = line.split(separator).map(value => value.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((header, index) => { row[header] = values[index] || ''; });

    return {
      assetCode: row['Código'] || row['assetCode'] || '',
      type: row['Tipo'] || row['type'] || '',
      originalName: row['Nome Original'] || row['originalName'] || '',
      description: row['Descrição'] || row['description'] || '',
      serialNumber: row['Nº Série'] || row['serialNumber'] || '',
      manufacturer: row['Fabricante'] || row['manufacturer'] || '',
      model: row['Modelo'] || row['model'] || '',
      status: row['Status'] || row['status'] || 'ACTIVE',
      glpiGroup: row['Grupo GLPI'] || row['glpiGroup'] || '',
      glpiUser: row['Usuário GLPI'] || row['glpiUser'] || '',
      location: row['Localização'] || row['location'] || '',
      sourceFile: row['Arquivo Origem'] || row['sourceFile'] || '',
      processor: row['Processador'] || row['processor'] || '',
      os: row['S.O.'] || row['os'] || '',
      needsReview: (row['Motivo Revisão'] || row['reviewReason'] || '').length > 0,
      reviewReason: row['Motivo Revisão'] || row['reviewReason'] || '',
    };
  }).filter(item => item.assetCode);
};

const parseJSON = (text: string): ImportRow[] => {
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item: any) => item.assetCode).map((item: any) => ({
      assetCode: item.assetCode || '',
      type: item.type || '',
      originalName: item.originalName || '',
      description: item.description || '',
      serialNumber: item.serialNumber || '',
      manufacturer: item.manufacturer || '',
      model: item.model || '',
      status: item.status || 'ACTIVE',
      glpiGroup: item.glpiGroup || '',
      glpiUser: item.glpiUser || '',
      location: item.location || '',
      sourceFile: item.sourceFile || '',
      processor: item.processor || '',
      os: item.os || '',
      needsReview: !!item.needsReview || !!item.reviewReason,
      reviewReason: item.reviewReason || '',
    }));
  } catch {
    return [];
  }
};

const ImportarPage = () => {
  const { importAssets, assets } = useInventoryStore();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState('ALL');
  const [tab, setTab] = useState<'ready' | 'review'>('ready');
  const [imported, setImported] = useState(false);

  const handleFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const text = loadEvent.target?.result as string;
      const parsed = file.name.endsWith('.json') ? parseJSON(text) : parseCSV(text);
      if (parsed.length === 0) {
        toast.error('Nenhum item encontrado no arquivo');
        return;
      }
      setRows(parsed);
      setSelected(new Set(parsed.filter(item => !item.needsReview).map(item => item.assetCode)));
      setImported(false);
      toast.success(`${parsed.length} itens carregados`);
    };
    reader.readAsText(file, 'UTF-8');
  }, []);

  const readyRows = useMemo(() => rows.filter(row => !row.needsReview), [rows]);
  const reviewRows = useMemo(() => rows.filter(row => row.needsReview), [rows]);
  const displayRows = tab === 'ready' ? readyRows : reviewRows;
  const filteredRows = useMemo(() => filterType === 'ALL' ? displayRows : displayRows.filter(row => row.type === filterType), [displayRows, filterType]);
  const types = useMemo(() => [...new Set(rows.map(row => row.type))].sort(), [rows]);
  const existingCodes = useMemo(() => new Set(assets.map(asset => asset.assetCode)), [assets]);

  const toggleAll = () => {
    const currentCodes = filteredRows.map(row => row.assetCode);
    const allSelected = currentCodes.every(code => selected.has(code));
    const next = new Set(selected);
    currentCodes.forEach(code => allSelected ? next.delete(code) : next.add(code));
    setSelected(next);
  };

  const toggleOne = (code: string) => {
    const next = new Set(selected);
    next.has(code) ? next.delete(code) : next.add(code);
    setSelected(next);
  };

  const handleImport = async () => {
    const toImport = rows.filter(row => selected.has(row.assetCode));
    if (toImport.length === 0) {
      toast.error('Selecione itens para importar');
      return;
    }

    const assetItems = toImport.map(row => ({
      assetCode: row.assetCode,
      type: row.type,
      description: row.description || row.originalName,
      serialNumber: row.serialNumber || undefined,
      status: (STATUS_MAP[row.status] || 'ACTIVE') as AssetStatus,
      origin: 'LEGACY_GLPI' as const,
      manufacturer: row.manufacturer || undefined,
      model: row.model || undefined,
      processor: row.processor || undefined,
      os: row.os || undefined,
      glpiGroup: row.glpiGroup || undefined,
      importedAt: new Date().toISOString(),
    }));

    try {
      const result = await importAssets(assetItems);
      setImported(true);
      toast.success(`${result.imported} importados, ${result.skipped} já existiam`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao importar patrimônios');
    }
  };

  const typeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach(row => { map[row.type] = (map[row.type] || 0) + 1; });
    return map;
  }, [rows]);

  return (
    <AppShell active="importar">
      <div className="flex h-full flex-col gap-5 px-4 py-6 md:px-7">
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-[34px] font-semibold leading-none text-primary">Importar planilha</h2>
          <p className="text-sm text-muted-foreground">Carregue itens do GLPI (CSV/JSON) — serão marcados como legado</p>
        </div>
      {rows.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="text-center space-y-2">
            <FileSpreadsheet className="h-16 w-16 mx-auto text-muted-foreground/40" />
            <h2 className="text-lg font-semibold">Importar dados do GLPI</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Faça upload do arquivo CSV ou JSON sanitizado. Os itens serão marcados como legado no sistema.
            </p>
          </div>
          <label className="cursor-pointer">
            <input type="file" accept=".csv,.json,.txt" className="hidden" onChange={handleFile} />
            <div className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition text-sm font-medium">
              <Upload className="h-4 w-4" />
              Selecionar arquivo
            </div>
          </label>
        </div>
      ) : (
        <>
          <div className="px-6 py-3 border-b border-border bg-card flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" />
              <span className="text-sm font-medium">{readyRows.length} prontos</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">{reviewRows.length} revisão</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                <Badge key={type} variant="outline" className="text-[10px]">{type}: {count}</Badge>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{selected.size} selecionados</span>
              <Button size="sm" onClick={handleImport} disabled={imported || selected.size === 0} className="text-xs">
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Importar Selecionados ({selected.size})
              </Button>
            </div>
          </div>

          <div className="px-6 pt-3 flex items-center gap-3">
            <div className="flex items-center gap-3">
              <Button variant={tab === 'ready' ? 'default' : 'outline'} size="sm" className="text-xs" onClick={() => setTab('ready')}>
                <Check className="h-3 w-3 mr-1" />
                Prontos ({readyRows.length})
              </Button>
              <Button variant={tab === 'review' ? 'default' : 'outline'} size="sm" className="text-xs" onClick={() => setTab('review')}>
                <AlertTriangle className="h-3 w-3 mr-1" />
                Revisão ({reviewRows.length})
              </Button>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px] h-8 text-xs">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos tipos</SelectItem>
                  {types.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-1 overflow-auto px-6 py-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={filteredRows.length > 0 && filteredRows.every(row => selected.has(row.assetCode))} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead className="w-[100px]">Código</TableHead>
                  <TableHead className="w-[90px]">Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[100px]">Fabricante</TableHead>
                  <TableHead className="w-[100px]">Nº Série</TableHead>
                  <TableHead className="w-[90px]">Status</TableHead>
                  <TableHead className="w-[120px]">Grupo GLPI</TableHead>
                  {tab === 'review' && <TableHead className="w-[180px]">Motivo</TableHead>}
                  <TableHead className="w-[80px]">Existe?</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row, index) => {
                  const exists = existingCodes.has(row.assetCode);
                  return (
                    <TableRow key={`${row.assetCode}-${index}`} className={exists ? 'opacity-60' : ''}>
                      <TableCell>
                        <Checkbox checked={selected.has(row.assetCode)} onCheckedChange={() => toggleOne(row.assetCode)} />
                      </TableCell>
                      <TableCell><span className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted">{row.assetCode}</span></TableCell>
                      <TableCell className="text-xs">{row.type}</TableCell>
                      <TableCell className="text-sm font-medium truncate max-w-[300px]" title={row.description}>{row.description || row.originalName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.manufacturer || '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{row.serialNumber || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          row.status === 'ACTIVE' ? 'bg-success/10 text-success border-success/20 text-[10px]' :
                          row.status === 'IN_STOCK' ? 'bg-blue-50 text-blue-700 border-blue-200 text-[10px]' :
                          'bg-muted text-muted-foreground border-border text-[10px]'
                        }>
                          {STATUS_LABELS[row.status] || row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]" title={row.glpiGroup}>{row.glpiGroup || '-'}</TableCell>
                      {tab === 'review' && <TableCell><span className="text-xs text-amber-600">{row.reviewReason}</span></TableCell>}
                      <TableCell>
                        {exists ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Sim</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
      </div>
    </AppShell>
  );
};

export default ImportarPage;
