# Mapeamento de tabelas para unificacao

Data do levantamento: 2026-05-08

## Bancos atuais

- `cart_rio_hub`: portal principal, chamados, usuarios, setores e o novo cadastro canonico.
- `asset_guardian`: inventario, patrimonio, locais, estacoes, funcionarios e departamentos proprios.

## Resumo de tabelas

### Portal principal (`cart_rio_hub`)

| Tabela | Linhas atuais | Papel atual | Destino |
| --- | ---: | --- | --- |
| `departments` | 6 | Cadastro canonico novo de departamentos | Manter como fonte unica |
| `employees` | 6 | Cadastro canonico novo de funcionarios | Manter como fonte unica |
| `user_account` | 6 | Conta de login | Manter, vinculada a `employees` |
| `user_roles` | 6 | Perfis das contas | Manter |
| `setor` | 6 | Cadastro antigo de setores dos chamados | Migrar para `departments` e depois descontinuar |
| `categoria` | 6 | Categorias de chamado | Manter |
| `ticket` | 12 | Chamados | Manter, trocando `setor_id` por `department_id` em fase futura |
| `ticket_comment` | 13 | Comentarios de chamados | Manter |

### Inventario (`asset_guardian`)

| Tabela | Linhas atuais | Papel atual | Destino |
| --- | ---: | --- | --- |
| `departments` | 0 | Departamentos proprios do inventario | Migrar para `cart_rio_hub.departments` |
| `employees` | 0 | Funcionarios proprios do inventario | Migrar para `cart_rio_hub.employees` |
| `assets` | 0 | Patrimonios/equipamentos | Manter como modulo inventario |
| `stations` | 0 | Estacoes/postos/local fisico | Manter como modulo inventario |
| `spaces` | 0 | Hierarquia de espacos | Manter como modulo inventario |
| `space_layouts` | 0 | Layout/mapa dos espacos | Manter como modulo inventario |
| `asset_assignments` | 0 | Vinculo ativo/historico entre patrimonio e estacao | Manter como modulo inventario |
| `asset_movements` | 0 | Historico de movimentacoes | Manter, ajustando FKs de funcionario |
| `station_responsibilities` | 0 | Responsavel atual/historico por estacao | Manter, ajustando FK de funcionario |
| `flyway_schema_history` | 2 | Controle Flyway do inventario | Manter apenas enquanto inventario tiver migrations proprias |

## Modelo canonico recomendado

### Departamentos

Fonte final:

```text
cart_rio_hub.departments
```

Colunas atuais:

| Coluna | Tipo | Observacao |
| --- | --- | --- |
| `id` | `uuid` | PK canonica |
| `name` | `varchar` | Nome unico do departamento |
| `active` | `boolean` | Status operacional |

Origem dos dados:

| Origem | Campo origem | Destino |
| --- | --- | --- |
| `cart_rio_hub.setor` | `id` | `departments.id`, quando for migracao interna controlada |
| `cart_rio_hub.setor` | `nome` | `departments.name` |
| `cart_rio_hub.setor` | `ativo` | `departments.active` |
| `asset_guardian.departments` | `id` bigint | Nao copiar como PK final; usar tabela de mapa |
| `asset_guardian.departments` | `name` | `departments.name` |

Tabela temporaria recomendada:

```sql
create table migration_department_map (
  source_system varchar(40) not null,
  old_id varchar(80) not null,
  old_name varchar(120) not null,
  new_department_id uuid not null references departments(id),
  match_strategy varchar(40) not null,
  reviewed boolean not null default false,
  primary key (source_system, old_id)
);
```

Regras de casamento:

1. Mesmo nome normalizado: casar automaticamente.
2. Nome parecido: enviar para revisao manual.
3. Nome inexistente: criar novo departamento canonico.

## Funcionarios

Fonte final:

```text
cart_rio_hub.employees
```

Colunas atuais:

| Coluna | Tipo | Observacao |
| --- | --- | --- |
| `id` | `uuid` | PK canonica |
| `full_name` | `varchar` | Nome completo |
| `cpf` | `varchar` | Unico, quando existir |
| `email` | `varchar` | Unico, quando existir |
| `status` | `varchar` | `ACTIVE` ou `INACTIVE` |
| `department_id` | `uuid` | FK para `departments.id` |

Origem dos dados:

| Origem | Campo origem | Destino |
| --- | --- | --- |
| `cart_rio_hub.user_account` | `id` | Pode ser reaproveitado como `employees.id` quando ainda nao houver funcionario |
| `cart_rio_hub.user_account` | `nome_completo` | `employees.full_name` |
| `cart_rio_hub.user_account` | `email` | `employees.email` |
| `asset_guardian.employees` | `id` bigint | Nao copiar como PK final; usar tabela de mapa |
| `asset_guardian.employees` | `full_name` | `employees.full_name` |
| `asset_guardian.employees` | `cpf` | `employees.cpf` |
| `asset_guardian.employees` | `status` | `employees.status` |
| `asset_guardian.employees` | `department_id` | resolver via `migration_department_map` |

Tabela temporaria recomendada:

```sql
create table migration_employee_map (
  source_system varchar(40) not null,
  old_id varchar(80) not null,
  old_name varchar(160) not null,
  old_cpf varchar(14),
  old_email varchar(180),
  new_employee_id uuid not null references employees(id),
  match_strategy varchar(40) not null,
  reviewed boolean not null default false,
  primary key (source_system, old_id)
);
```

Regras de casamento:

1. Mesmo CPF: casar automaticamente.
2. Mesmo email: casar automaticamente.
3. Mesmo nome + mesmo departamento: revisar antes de casar.
4. Nome parecido sem CPF/email: nao casar automaticamente.

## Contas de acesso

Fonte final:

```text
cart_rio_hub.user_account
```

Regra final:

- Usuario deixa de representar pessoa.
- Usuario representa somente credencial de acesso.
- `user_account.employee_id` aponta para a pessoa real em `employees`.
- Todo usuario deve ter funcionario.
- Nem todo funcionario precisa ter usuario.

## Relacionamentos que precisam mudar

### Portal

| Tabela | Coluna atual | Problema | Destino |
| --- | --- | --- | --- |
| `ticket` | `setor_id uuid -> setor.id` | Usa cadastro antigo | Criar `department_id uuid -> departments.id` |
| `ticket` | `criado_por_id uuid -> user_account.id` | OK para auditoria de usuario | Manter |
| `ticket` | `atribuidoa_id uuid -> user_account.id` | OK se responsavel for usuario | Manter ou avaliar `employee_id` se puder atribuir a funcionario sem login |
| `ticket_comment` | `autor_id uuid -> user_account.id` | OK, comentario e auditoria devem apontar conta | Manter |

### Inventario

| Tabela | Coluna atual | Problema | Destino |
| --- | --- | --- | --- |
| `employees.department_id bigint -> departments.id` | FK local do inventario | Duplicidade | Remover quando `employees` local sair |
| `station_responsibilities.employee_id bigint -> employees.id` | FK para funcionario local bigint | Trocar para `employee_uuid uuid -> cart_rio_hub.employees.id` |
| `asset_movements.from_employee_id bigint` | FK para funcionario local bigint | Trocar para `from_employee_uuid uuid` |
| `asset_movements.to_employee_id bigint` | FK para funcionario local bigint | Trocar para `to_employee_uuid uuid` |
| `vw_asset_inventory.employee_id bigint` | View usa funcionario local | Ajustar para retornar UUID canonico |
| `vw_asset_inventory.department_id bigint` | View usa departamento local | Ajustar para retornar UUID canonico |

## Conflito principal

O portal usa `uuid` nas tabelas novas e antigas. O inventario usa `bigint` com `bigserial`.

Nao converter PK bigint do inventario diretamente para UUID sem mapa.

Recomendacao:

1. Manter IDs bigint das tabelas puramente patrimoniais: `assets`, `stations`, `spaces`, `asset_assignments`, `asset_movements`, `space_layouts`.
2. Migrar somente identidade organizacional para UUID canonico: `departments`, `employees`, `user_account`.
3. Criar colunas UUID novas no inventario antes de remover colunas bigint antigas.
4. Popular colunas UUID via tabelas `migration_*_map`.
5. Validar todos os vinculos.
6. So depois remover FKs antigas.

## Ordem segura de migracao

1. Backup dos dois bancos.
2. Criar `migration_department_map`.
3. Casar `setor` e `asset_guardian.departments` com `cart_rio_hub.departments`.
4. Criar `migration_employee_map`.
5. Casar `user_account` e `asset_guardian.employees` com `cart_rio_hub.employees`.
6. Adicionar colunas UUID no inventario:
   - `station_responsibilities.employee_uuid`
   - `asset_movements.from_employee_uuid`
   - `asset_movements.to_employee_uuid`
7. Popular colunas UUID usando `migration_employee_map`.
8. Criar FKs novas para `cart_rio_hub.employees`, se tudo estiver no mesmo database/schema.
9. Ajustar backend do inventario para usar UUID.
10. Ajustar views.
11. Remover telas de cadastro de funcionario/departamento do inventario.
12. Remover colunas/tabelas antigas somente depois de validacao.

## Validacoes obrigatorias

```sql
-- Departamentos sem mapeamento
select *
from asset_guardian.departments d
where not exists (
  select 1
  from migration_department_map m
  where m.source_system = 'asset_guardian'
    and m.old_id = d.id::text
);

-- Funcionarios sem mapeamento
select *
from asset_guardian.employees e
where not exists (
  select 1
  from migration_employee_map m
  where m.source_system = 'asset_guardian'
    and m.old_id = e.id::text
);

-- Responsabilidades sem funcionario canonico
select sr.*
from asset_guardian.station_responsibilities sr
left join migration_employee_map m
  on m.source_system = 'asset_guardian'
 and m.old_id = sr.employee_id::text
where m.new_employee_id is null;
```

Observacao: hoje `asset_guardian` esta em outro database, entao as queries acima representam a logica de migracao. Para executar com FK real entre tabelas, o inventario precisa estar no mesmo database do portal, preferencialmente em schema separado ou com tabelas patrimoniais migradas para `cart_rio_hub`.
