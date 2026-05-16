create schema if not exists inventory;

create table if not exists inventory.spaces (
    id bigserial primary key,
    name varchar(160) not null,
    type varchar(20) not null check (type in ('UNIT', 'BUILDING', 'FLOOR', 'SECTOR')),
    parent_id bigint references inventory.spaces(id) on delete cascade,
    sort_order integer not null default 0,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table if not exists inventory.stations (
    id bigserial primary key,
    code varchar(40) not null unique,
    name varchar(160) not null,
    description varchar(2000),
    location_code varchar(80),
    status varchar(20) not null check (status in ('ACTIVE', 'INACTIVE', 'MAINTENANCE')),
    observation varchar(2000),
    space_id bigint references inventory.spaces(id) on delete set null,
    layout_element_ref varchar(80),
    last_inventory_check_at timestamp,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table if not exists inventory.station_responsibilities (
    id bigserial primary key,
    station_id bigint not null references inventory.stations(id) on delete cascade,
    employee_id uuid not null references public.employees(id) on delete restrict,
    started_at timestamp not null default now(),
    ended_at timestamp,
    is_current boolean not null default true,
    notes varchar(2000),
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create unique index if not exists ux_station_responsibilities_current
    on inventory.station_responsibilities (station_id)
    where is_current = true;

create table if not exists inventory.assets (
    id bigserial primary key,
    asset_code varchar(60) not null unique,
    type varchar(80) not null,
    description varchar(255) not null,
    serial_number varchar(120),
    status varchar(20) not null check (status in ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'DISPOSED', 'IN_STOCK')),
    origin varchar(30) not null default 'MANUAL' check (origin in ('MANUAL', 'LEGACY_GLPI')),
    manufacturer varchar(120),
    model varchar(120),
    processor varchar(255),
    operating_system varchar(120),
    acquisition_date date,
    notes varchar(2000),
    last_inventory_check_at timestamp,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table if not exists inventory.asset_assignments (
    id bigserial primary key,
    asset_id bigint not null references inventory.assets(id) on delete cascade,
    station_id bigint not null references inventory.stations(id) on delete restrict,
    assigned_by varchar(120),
    assigned_at timestamp not null default now(),
    unassigned_at timestamp,
    status varchar(20) not null check (status in ('ACTIVE', 'RETURNED')),
    notes varchar(2000),
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create unique index if not exists ux_asset_assignments_active
    on inventory.asset_assignments (asset_id)
    where status = 'ACTIVE';

create table if not exists inventory.asset_movements (
    id bigserial primary key,
    asset_id bigint not null references inventory.assets(id) on delete cascade,
    movement_type varchar(30) not null check (movement_type in ('CREATED', 'UPDATED', 'LINKED', 'UNLINKED', 'TRANSFERRED', 'STATUS_CHANGED', 'INVENTORY_CHECKED')),
    from_station_id bigint references inventory.stations(id) on delete set null,
    to_station_id bigint references inventory.stations(id) on delete set null,
    from_employee_id uuid references public.employees(id) on delete set null,
    to_employee_id uuid references public.employees(id) on delete set null,
    moved_by varchar(120),
    reason varchar(2000),
    moved_at timestamp not null default now(),
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create index if not exists ix_spaces_parent_id on inventory.spaces(parent_id);
create index if not exists ix_stations_space_id on inventory.stations(space_id);
create index if not exists ix_assets_status on inventory.assets(status);
create index if not exists ix_asset_assignments_station_status on inventory.asset_assignments(station_id, status);
create index if not exists ix_asset_movements_asset_id on inventory.asset_movements(asset_id);
create index if not exists ix_station_responsibilities_employee_id on inventory.station_responsibilities(employee_id);

create or replace function inventory.set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_spaces_updated_at on inventory.spaces;
create trigger trg_spaces_updated_at
before update on inventory.spaces
for each row execute function inventory.set_updated_at();

drop trigger if exists trg_stations_updated_at on inventory.stations;
create trigger trg_stations_updated_at
before update on inventory.stations
for each row execute function inventory.set_updated_at();

drop trigger if exists trg_station_responsibilities_updated_at on inventory.station_responsibilities;
create trigger trg_station_responsibilities_updated_at
before update on inventory.station_responsibilities
for each row execute function inventory.set_updated_at();

drop trigger if exists trg_assets_updated_at on inventory.assets;
create trigger trg_assets_updated_at
before update on inventory.assets
for each row execute function inventory.set_updated_at();

drop trigger if exists trg_asset_assignments_updated_at on inventory.asset_assignments;
create trigger trg_asset_assignments_updated_at
before update on inventory.asset_assignments
for each row execute function inventory.set_updated_at();

drop trigger if exists trg_asset_movements_updated_at on inventory.asset_movements;
create trigger trg_asset_movements_updated_at
before update on inventory.asset_movements
for each row execute function inventory.set_updated_at();

create or replace view inventory.vw_asset_inventory as
select
    a.id as asset_id,
    a.asset_code,
    a.type as asset_type,
    a.description as asset_description,
    a.serial_number,
    a.status as asset_status,
    a.origin as asset_origin,
    st.id as station_id,
    st.code as station_code,
    st.name as station_name,
    st.status as station_status,
    e.id as employee_id,
    e.full_name as employee_name,
    d.id as department_id,
    d.name as department_name,
    aa.assigned_at,
    a.last_inventory_check_at,
    a.updated_at as asset_updated_at
from inventory.assets a
left join inventory.asset_assignments aa
    on aa.asset_id = a.id
   and aa.status = 'ACTIVE'
left join inventory.stations st
    on st.id = aa.station_id
left join inventory.station_responsibilities sr
    on sr.station_id = st.id
   and sr.is_current = true
left join public.employees e
    on e.id = sr.employee_id
left join public.departments d
    on d.id = e.department_id;
