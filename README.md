# Portal Índio Artiaga

Sistema interno de gestão de chamados.

## Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS, shadcn/Radix UI
- Backend: Java 21, Spring Boot 3, Spring Web, Spring Data JPA
- Banco: PostgreSQL 16, com database unico e schemas separados
- Runtime local: Docker Compose

## Como subir

```bash
docker compose up --build
```

Depois acesse:

- Frontend: http://localhost:8080
- Backend: http://localhost:8081/api
- Postgres: localhost:5432

Credencial inicial para teste:

- Usuário: `admin`
- Senha: `123456`

## Serviços

O `docker-compose.yml` sobe os servicos:

- `postgres`: banco PostgreSQL com volume persistente
- `backend`: API Java/Spring Boot
- `frontend`: build React servido por Nginx, com proxy `/api` para o backend
- `inventory-backend`: API Java/Spring Boot do modulo de inventario
- `inventory-frontend`: interface atual do modulo de inventario

## Banco unificado

O database principal agora e `cart_rio_hub`.

- Cadastros centrais ficam no schema `public`: `departments`, `employees`, `user_account`
- Tabelas patrimoniais ficam no schema `inventory`: `assets`, `stations`, `spaces`, `asset_assignments`, `asset_movements`
- O inventario nao cria mais banco separado `asset_guardian`
- Funcionarios e departamentos sao lidos do portal principal

## Desenvolvimento local sem Docker

Backend:

```bash
cd backend
mvn spring-boot:run
```

Frontend:

```bash
bun install
bun run dev
```

O Vite usa proxy para `http://localhost:8081` nas chamadas `/api`.

## Endpoints principais

- `POST /api/auth/login`
- `GET /api/dashboard`
- `GET /api/tickets`
- `GET /api/tickets/{numero}`
- `PATCH /api/tickets/{numero}`
- `GET /api/tickets/{numero}/comments`
- `POST /api/tickets/{numero}/comments`
- `GET /api/setores`
- `GET /api/categorias`

## Dados iniciais

Na primeira subida, o backend popula o Postgres com:

- usuário `admin`
- setores e categorias básicas
- chamados e comentários de exemplo

Se quiser recriar os dados do zero, remova o volume:

```bash
docker compose down -v
docker compose up --build
```
