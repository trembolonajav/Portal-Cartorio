create table inventory.conference_finalizations (
    id bigserial primary key,
    station_id bigint references inventory.stations(id) on delete set null,
    checked_by varchar(160) not null,
    checked_at timestamp not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);
create index idx_conference_finalizations_station on inventory.conference_finalizations(station_id);

-- Preserve the latest finalization that was already saved before this migration.
insert into inventory.conference_finalizations (station_id, checked_by, checked_at)
select id, coalesce(last_conference_by, 'Não informado'), last_conference_at
from inventory.stations where last_conference_at is not null;
