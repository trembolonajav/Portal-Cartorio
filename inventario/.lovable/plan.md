

# Plano: Sanitizar e Importar Dados do GLPI

## Contexto da Analise

Analisei os 6 CSVs do GLPI. Eis o inventario:

| CSV | Conteudo | Qtd linhas | Problemas |
|-----|----------|-----------|-----------|
| glpi_1 | Computadores (PC/Notebook) | 55 | Codigo patrimonio ja presente no "Nome" (PC-1052, NOTEBOOK-1852). Tem serial, modelo, processador |
| glpi_2 | Monitores | 130 | Muitos SEM codigo unico (ex: "DELL E178WFP" repetido 6x). Alguns TEM (DELL 0022, DELL 1745) |
| glpi_3 | Switches | 6 | Limpo, codigos claros (SWITCH 1735) |
| glpi_4 | Perifericos diversos | 226 | Mouse, Teclado, Webcam, Headset, Leitor Biometrico, Hub USB, Impressora, Scanner. Mistura de itens COM e SEM patrimonio |
| glpi_5 | Impressoras/Scanners dedicados | 40 | Relativamente limpo |
| glpi_6 | Usuarios | ~50 uteis | Muitas linhas vazias, poucos com sobrenome |

### Problemas identificados

1. **Monitores sem codigo unico**: "DELL E178WFP", "DELL P2219H", "DELL SE2216H" aparecem varias vezes sem numero de patrimonio — impossivel distinguir qual e qual
2. **Duplicatas reais**: PC-1894 aparece 2x com seriais diferentes (provavelmente reaproveitamento de codigo)
3. **DELL 1749** (monitor) aparece 2x com usuarios diferentes
4. **Itens "disponivel"**: usuarios marcados como "disponivel" = item em estoque
5. **Itens em "Armario T.i" / "Caixa 3/4/5"**: tambem sao estoque
6. **Nomes inconsistentes**: "DELL - 0058" vs "DELL 0022" vs "DELL0067" — separadores variados
7. **Categorias misturadas no glpi_4**: Mouse, Teclado, Webcam, Headset, Leitor Biometrico, Hub USB tudo junto

### Regra de extração de codigo patrimonial

```text
"PC-1052"           → assetCode: "1052",  type: CPU
"NOTEBOOK-1852"     → assetCode: "1852",  type: Notebook
"DELL 0022"         → assetCode: "0022",  type: Monitor (arquivo 2)
"MOUSE 1345"        → assetCode: "1345",  type: Mouse
"TECLADO 1072"      → assetCode: "1072",  type: Teclado
"HEADSET ZOX 1861"  → assetCode: "1861",  type: Headset
"Webcam 1254"       → assetCode: "1254",  type: Webcam
"SWITCH 1735"       → assetCode: "1735",  type: Outro
"Leitor Bio. 1315"  → assetCode: "1315",  type: Outro
"DELL E178WFP"      → SEM CODIGO → gerar "LGCY-MON-001" etc.
```

## Plano em 2 Etapas

### Etapa 1 — Script de sanitizacao (gerar relatorio Excel)

Rodar um script Python que:
- Le os 6 CSVs
- Extrai `assetCode` do campo "Nome" usando regex
- Mapeia para as categorias do sistema (CPU, Monitor, Mouse, Teclado, Headset, Webcam, Notebook, Outro)
- Detecta itens SEM codigo e gera codigos temporarios `LGCY-XXX-NNN`
- Mapeia "disponivel" / "Armario T.i" / "Caixa" → status `IN_STOCK`
- Detecta duplicatas de codigo
- Monta descrição rica: `"Dell OptiPlex 3080 | i5-10500T | Win10 Pro"` (para PCs)
- Gera um Excel com 3 abas:
  - **Prontos para Importar**: itens com codigo unico, dados limpos
  - **Precisam Revisao**: itens sem codigo, duplicatas, dados ambiguos
  - **Resumo**: contagem por categoria, status, departamento

O Excel permite voce revisar antes de qualquer importacao.

### Etapa 2 — Pagina de importação no sistema

Criar uma pagina `/importar` com:
- Upload de CSV/JSON sanitizado
- Preview em tabela dos itens a importar
- Marcacao automatica como origem `LEGADO` (campo novo no tipo Asset)
- Filtro para ver "Prontos" vs "Precisam Revisao"
- Botao "Importar Selecionados" que alimenta o store
- Badge "Legado" visivel na listagem de patrimonios para distinguir dados importados dos novos

### Mudancas no modelo de dados

```typescript
// Adicionar ao Asset:
interface Asset {
  // ... campos existentes
  origin?: 'MANUAL' | 'LEGACY_GLPI';  // novo
  manufacturer?: string;               // novo (Dell, Samsung, etc.)
  model?: string;                      // novo (OptiPlex 3080, etc.)
  processor?: string;                  // novo (para PCs)
  os?: string;                         // novo (para PCs)
  glpiGroup?: string;                  // novo (setor original do GLPI)
  importedAt?: string;                 // novo
}
```

## Resultado esperado

- Excel de revisao entregue em `/mnt/documents/` para voce validar ANTES de importar
- ~350+ itens com codigo unico prontos para importar
- ~30-50 itens sinalizados para revisao manual (monitores sem patrimonio, duplicatas)
- Nenhum dado entra no sistema sem sua aprovacao

