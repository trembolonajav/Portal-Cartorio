# Portal Indio Artiaga

Sistema interno do Cartorio Indio Artiaga para chamados, administracao de usuarios e inventario patrimonial de TI.

O repositorio sobe dois frontends integrados:

- Portal: chamados, relatorios, funcionarios, departamentos e configuracoes.
- Inventario: patrimonios, estacoes, mapa de ambientes, movimentacoes e baixas patrimoniais.

## Stack

- Frontend do Portal: React 19, TypeScript, Vite, Tailwind CSS, shadcn/Radix UI
- Backend do Portal: Java 21, Spring Boot 3, Spring Web, Spring Data JPA
- Frontend do Inventario: React, TypeScript, Vite
- Backend do Inventario: Java 21, Spring Boot
- Banco: PostgreSQL 16 com um database e schemas separados
- Runtime recomendado: Docker Compose

## Modulos

### Portal

- Login por usuario, e-mail e senha.
- Perfis `usuario`, `operador` e `admin`.
- Chamados com solicitante, responsavel, prioridade, status, comentarios e registro de resolucao.
- Visao restrita do funcionario para abrir e acompanhar os proprios chamados.
- Fluxo do operador para assumir, interagir e resolver chamados.
- Modulo administrativo para funcionarios e departamentos.
- Relatorios administrativos com exportacao de chamados, funcionarios e inventario.

### Inventario

- Cadastro e consulta de patrimonios, com ficha detalhada (dados contabeis, depreciacao, garantia e vida util).
- Catalogo de tipos de patrimonio com recortes ilustrados (mobiliario e equipamentos).
- Categorias de patrimonio, incluindo CPU, monitor, perifericos, impressora, switch e leitor biometrico.
- Hierarquia de espacos: Unidade -> Andar -> Departamento.
- Estacoes, departamentos, responsaveis e vinculos de bens.
- Mapa patrimonial ilustrado (visao superior): cada patrimonio vinculado desenha seu recorte na estacao; editor de planta com arrastar, girar e encaixe na grade; visao geral agrupada por unidade.
- Arquivo: termos de responsabilidade, termos de troca de equipamento e solicitacoes, com PDF gerado.
- Movimentacao e historico patrimonial.
- Baixas patrimoniais com termo gerado, anexo assinado, finalizacao e rastreabilidade.
- Conferencia fisica (PWA mobile) para inventario presencial. Veja a secao dedicada.

## Conferencia fisica (PWA mobile)

Aplicativo web instalavel (PWA) para conferir o patrimonio andando pelo cartorio, no celular, usando o mesmo backend e login do Inventario.

- Acesso: abrir `http://IP-DO-SERVIDOR:8082` no navegador do celular e usar "Adicionar a tela inicial / Instalar". O app abre em `/conferencia`, em tela cheia.
- Login proprio (Basic token), com opcao "manter conectado". O perfil `usuario` (estagiario) cai direto na conferencia; `operador` e `admin` tambem podem usar.
- Navegacao por Unidade -> Andar -> Departamento -> Estacao, com progresso e cores de status (verde conferido, amarelo divergencia, vermelho nao localizado, cinza pendente).
- Por estacao: marcar cada patrimonio como Encontrado, Divergencia (com tipo e observacao) ou Nao localizado; finalizar a estacao grava o selo de conferencia (data e responsavel).
- "Adicionar patrimonio" por codigo: se ja existe em outra estacao, transfere para ca registrando a movimentacao; se existe sem local, vincula; se nao existe, abre o cadastro com o codigo preenchido.
- Toda conferencia gera historico append-only (quem, quando, resultado) e a ultima conferencia fica registrada no patrimonio.

Permissoes do estagiario (`usuario`): ve o inventario e faz a conferencia (incluir e movimentar por conferencia), mas nunca exclui nem edita cadastros administrativos.

Endpoints principais da conferencia (API do Inventario):

- `POST /api/v1/assets/{id}/check`
- `GET /api/v1/assets/{id}/checks`
- `POST /api/v1/stations/{id}/finalize-conference`

## Subir com Docker

Na raiz do repositorio:

```bash
docker compose up -d --build
```

Depois acesse:

| Servico | Endereco local |
| --- | --- |
| Portal | `http://localhost:8080` |
| API do Portal | `http://localhost:8081/api` |
| Inventario | `http://localhost:8082` |
| API do Inventario | `http://localhost:8083/api/v1` |
| PostgreSQL | `localhost:5432` |

Para acessar a partir de outra maquina da mesma rede, use o IP do servidor Docker:

```text
http://IP-DO-SERVIDOR:8080
http://IP-DO-SERVIDOR:8082
```

Exemplo:

```text
http://192.168.0.186:8080
http://192.168.0.186:8082
```

O Portal e o Inventario usam o hostname acessado no navegador para navegar entre os modulos. Em rede, nao troque o endereco por `localhost` em maquinas clientes.

## Servicos do Compose

O `docker-compose.yml` sobe:

- `postgres`: PostgreSQL com volume persistente `postgres_data`
- `backend`: API do Portal na porta 8081
- `frontend`: Portal servido por Nginx na porta 8080
- `inventory-backend`: API do Inventario exposta na porta 8083
- `inventory-frontend`: Inventario servido por Nginx na porta 8082

## Banco unificado

O database principal e `cart_rio_hub`.

- Cadastros centrais ficam no schema `public`, como `departments`, `employees`, `user_account` e chamados.
- Tabelas patrimoniais ficam no schema `inventory`, como `assets`, `stations`, `spaces`, vinculos, movimentacoes e baixas.
- Funcionarios e departamentos do Inventario sao compartilhados com o Portal.

O volume do Postgres preserva os dados entre rebuilds. Nao use `docker compose down -v` em ambiente com dados que precisam ser mantidos.

## Primeiro administrador

Por padrao, dados de demonstracao do Portal nao sao carregados. Se o banco veio de um backup, use o administrador existente no backup.

Para criar um administrador inicial em um banco novo:

```cmd
docker exec -i NOME_DO_CONTAINER_POSTGRES psql -U cart_rio -d cart_rio_hub -c "insert into user_account (id, username, nome_completo, email, password) values ('00000000-0000-4000-8000-000000000001', 'admin', 'Administrador', 'admin@cartorio.local', '123456') on conflict (id) do nothing;"
docker exec -i NOME_DO_CONTAINER_POSTGRES psql -U cart_rio -d cart_rio_hub -c "insert into user_roles (user_id, role) values ('00000000-0000-4000-8000-000000000001', 'admin') on conflict do nothing;"
```

Consulte o nome real do container antes:

```bash
docker compose ps
```

Em desenvolvimento local deste repositorio, o nome costuma ser parecido com:

```text
portalindioartiaga-postgres-1
```

Troque a senha inicial depois do primeiro acesso.

## Funcionarios e perfis

Funcionarios cadastrados no Portal podem ter conta de acesso vinculada.

- `usuario`: abre chamado, acompanha os proprios chamados e interage enquanto o chamado estiver aberto.
- `operador`: atende chamados e opera o Inventario sem permissoes administrativas destrutivas.
- `admin`: administra cadastros, relatorios, chamados e configuracoes.

No cadastro de funcionario, o Portal permite definir login, perfil e senha inicial. Na edicao, a senha pode ser trocada informando uma nova senha e sua confirmacao.

## Dados de demonstracao

O backend do Portal so carrega dados de demonstracao quando `APP_SEED_DEMO_DATA=true`.

O valor padrao e:

```text
APP_SEED_DEMO_DATA=false
```

Isso evita subir chamados e funcionarios mockados em ambiente real.

## Backup do banco

Para gerar um SQL a partir do Postgres em execucao:

```cmd
docker exec NOME_DO_CONTAINER_POSTGRES pg_dump -U cart_rio -d cart_rio_hub > backup.sql
```

No PowerShell, prefira gerar o arquivo com encoding UTF-8:

```powershell
docker exec NOME_DO_CONTAINER_POSTGRES pg_dump -U cart_rio -d cart_rio_hub | Out-File -Encoding utf8 backup.sql
```

Guarde o backup fora da pasta do volume Docker e fora de repositorios publicos.

## Restaurar backup SQL

Com o Postgres iniciado e o arquivo na pasta atual:

```cmd
docker exec -i NOME_DO_CONTAINER_POSTGRES psql -U cart_rio -d cart_rio_hub < backup.sql
```

Se um backup criado no PowerShell gerar erro de encoding ao restaurar, gere novamente em UTF-8 ou converta o arquivo antes da restauracao.

## Atualizar codigo sem apagar o banco

Em uma instalacao clonada com Git:

```bash
git pull
docker compose up -d --build
```

Esse fluxo atualiza imagens e containers mantendo o volume do Postgres.

Evite este comando em producao:

```bash
docker compose down -v
```

O `-v` remove o volume e apaga o banco local do Compose.

## Desenvolvimento local sem Docker

Backend do Portal:

```bash
cd backend
mvn spring-boot:run
```

Frontend do Portal:

```bash
bun install
bun run dev
```

O Vite do Portal usa proxy para `http://localhost:8081` nas chamadas `/api`.

## Endpoints do Portal

Endpoints principais:

- `POST /api/auth/login`
- `GET /api/dashboard`
- `GET /api/tickets`
- `GET /api/tickets/{numero}`
- `PATCH /api/tickets/{numero}`
- `GET /api/tickets/{numero}/comments`
- `POST /api/tickets/{numero}/comments`
- `GET /api/departments`
- `GET /api/employees`
- `GET /api/setores`
- `GET /api/categorias`

## Comandos uteis

Ver containers:

```bash
docker compose ps
```

Ver logs:

```bash
docker compose logs -f backend inventory-backend
```

Rebuild somente do Portal:

```bash
docker compose up -d --build backend frontend
```

Rebuild somente do Inventario:

```bash
docker compose up -d --build inventory-backend inventory-frontend
```
