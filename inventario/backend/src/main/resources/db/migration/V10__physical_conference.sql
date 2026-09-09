-- Conferência física de patrimônio (módulo mobile).
-- Histórico append-only + denormalização da última conferência no ativo e na estação.

create table if not exists inventory.physical_checks (
    id                    bigserial primary key,
    asset_id              bigint not null references inventory.assets(id) on delete cascade,
    station_id            bigint references inventory.stations(id) on delete set null,
    expected_station_id   bigint references inventory.stations(id) on delete set null,
    result                varchar(30)  not null,   -- FOUND, NOT_FOUND, DIVERGENCE
    divergence_type       varchar(40),             -- WRONG_LOCATION, WRONG_OWNER, ... (nulo quando result != DIVERGENCE)
    note                  varchar(2000),
    checked_by            varchar(160) not null,
    checked_at            timestamp    not null default now(),
    created_at            timestamp    not null default now(),
    updated_at            timestamp    not null default now()
);
create index if not exists idx_physical_checks_asset   on inventory.physical_checks(asset_id);
create index if not exists idx_physical_checks_station on inventory.physical_checks(station_id);

-- Última conferência física (denormalizada) no ativo
alter table inventory.assets add column if not exists last_check_at     timestamp;
alter table inventory.assets add column if not exists last_check_by     varchar(160);
alter table inventory.assets add column if not exists last_check_result varchar(30);

-- Selo de conferência na estação
alter table inventory.stations add column if not exists last_conference_at timestamp;
alter table inventory.stations add column if not exists last_conference_by varchar(160);
