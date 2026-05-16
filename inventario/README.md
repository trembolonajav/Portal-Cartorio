# Asset Guardian

Stack inicial para rodar o sistema com:
- frontend React/Vite servido por Nginx
- backend Java Spring Boot
- PostgreSQL
- orquestracao via Docker Compose

## Subir o ambiente

```bash
copy .env.example .env
docker compose up --build -d
```

Aplicacao:
- Frontend: `http://localhost`
- Backend health: `http://localhost/actuator/health`
- API: `http://localhost/api/v1`

## Acesso

Perfis iniciais:
- `admin` / `admin123`
- `operadora` / `operadora123`

O perfil `admin` pode alterar estrutura, estações, espaços, funcionários e departamentos.
O perfil `operadora` fica restrito ao fluxo patrimonial: cadastrar, editar e movimentar patrimônios.

Troque as credenciais no arquivo `.env` antes de uso contínuo.

## Máquina mais simples

O backend está configurado com heap mais contida para reduzir consumo:
- `JAVA_OPTS=-Xms128m -Xmx512m`

## Backup do banco

```powershell
./ops/backup/postgres-backup.ps1
```

## Restore do banco

```powershell
./ops/backup/postgres-restore.ps1 -BackupFile .\backups\asset_guardian_YYYY-MM-DD_HH-mm-ss.dump
```

## Go-Live

Checklist de liberacao:

- [go-live-checklist.md](c:/Users/gabri/Downloads/asset-guardian-main%20(1)/asset-guardian-main/docs/go-live-checklist.md)
