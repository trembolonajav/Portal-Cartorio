# Go-Live Checklist

## Objetivo

Checklist para liberar o sistema para alimentacao controlada em ambiente interno.

## 1. Infraestrutura

- [ ] `docker compose up --build -d` sobe sem erro
- [ ] `docker compose ps` mostra `frontend`, `backend` e `postgres` como `healthy` ou `up`
- [ ] `http://localhost` responde
- [ ] `http://localhost/actuator/health` responde `UP`
- [ ] Volume do Postgres esta persistente
- [ ] Login com `admin` funciona
- [ ] Login com `operadora` funciona

## 2. Persistencia Real

- [ ] Criar departamento persiste no banco
- [ ] Criar funcionario persiste no banco
- [ ] Criar espaco persiste no banco
- [ ] Criar estacao persiste no banco
- [ ] Criar patrimonio persiste no banco
- [ ] Vincular patrimonio a estacao persiste no banco
- [ ] Transferir patrimonio persiste no banco
- [ ] Alterar responsavel da estacao persiste no banco
- [ ] Historico de patrimonio persiste no banco
- [ ] Historico de estacao persiste no banco
- [ ] Layout do mapa persiste no banco

## 3. Prova de Recuperacao

- [ ] Dar `F5` no frontend e confirmar que nada some
- [ ] Fechar e abrir o navegador e confirmar que nada some
- [ ] Reiniciar container do frontend e confirmar que nada some
- [ ] Reiniciar container do backend e confirmar que nada some
- [ ] Reiniciar container do banco e confirmar que nada some

## 4. Backup e Restore

- [ ] Rodar `./ops/backup/postgres-backup.ps1`
- [ ] Confirmar que um arquivo `.dump` foi criado em `backups/`
- [ ] Restaurar com `./ops/backup/postgres-restore.ps1 -BackupFile <arquivo>`
- [ ] Confirmar que os dados retornaram corretamente apos o restore

## 5. Fluxos Minimos de Operacao

- [ ] Cadastrar departamento
- [ ] Cadastrar funcionario
- [ ] Cadastrar espaco
- [ ] Cadastrar estacao
- [ ] Cadastrar patrimonio
- [ ] Vincular patrimonio
- [ ] Desvincular patrimonio
- [ ] Transferir patrimonio
- [ ] Editar estacao
- [ ] Alterar responsavel da estacao
- [ ] Navegar entre espacos do mapa
- [ ] Salvar e recarregar layout do mapa
- [ ] Operadora nao enxerga/executa acoes estruturais
- [ ] Backend retorna `403` quando a operadora tenta acao administrativa

## 6. Padrão de Cadastro

### Patrimonio

- [ ] Codigo patrimonial obrigatorio e unico
- [ ] Tipo/categoria padronizado
- [ ] Descricao obrigatoria
- [ ] Serial informado quando existir
- [ ] Status preenchido com valores padronizados
- [ ] Origem definida: `MANUAL` ou `LEGACY_GLPI`

### Funcionario

- [ ] Nome completo obrigatorio
- [ ] CPF unico
- [ ] Departamento definido quando aplicavel
- [ ] Status preenchido

### Estacao

- [ ] Codigo unico
- [ ] Nome obrigatorio
- [ ] Espaco vinculado quando aplicavel
- [ ] Status preenchido
- [ ] Responsavel atual definido quando aplicavel

## 7. Regra de Carga Inicial

Ordem recomendada:

1. Departamentos
2. Espacos
3. Estacoes
4. Funcionarios
5. Patrimonios novos
6. Importacao do legado
7. Saneamento do legado
8. Conferencia e vinculos finais

## 8. Regra do Legado

- [ ] Item legado entra com `origin = LEGACY_GLPI`
- [ ] Item com dado incompleto entra como pendente de conferencia no processo operacional
- [ ] Dado legado nao confiavel nao deve ser tratado como definitivo sem saneamento

## 9. Criterio de Liberacao

O sistema esta liberado para alimentacao controlada quando:

- todos os itens das secoes 1 a 5 estiverem concluidos
- o padrao de cadastro estiver alinhado com o time
- a regra de carga inicial estiver definida
- backup e restore tiverem sido testados com sucesso
