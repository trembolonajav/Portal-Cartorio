create table if not exists inventory.asset_disposals (
    id bigserial primary key,
    number varchar(30) not null unique,
    status varchar(30) not null check (status in ('DRAFT', 'WAITING_SIGNATURE', 'FINALIZED', 'CANCELLED')),
    reason varchar(40) not null check (reason in ('OBSOLESCENCE', 'IRREPAIRABLE_DEFECT', 'PHYSICAL_DAMAGE', 'LOSS', 'REPLACEMENT', 'DONATION', 'DISCARD', 'SALE', 'OTHER')),
    destination varchar(120) not null,
    justification varchar(4000) not null,
    notes varchar(4000),
    requested_by varchar(120),
    authorized_by_name varchar(160) not null,
    authorization_date date,
    term_generated_at timestamp,
    signed_document_uploaded_at timestamp,
    finalized_at timestamp,
    cancelled_at timestamp,
    cancel_reason varchar(2000),
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table if not exists inventory.asset_disposal_items (
    id bigserial primary key,
    disposal_id bigint not null references inventory.asset_disposals(id) on delete cascade,
    asset_id bigint not null references inventory.assets(id) on delete restrict,
    asset_code_snapshot varchar(60) not null,
    description_snapshot varchar(255) not null,
    category_snapshot varchar(80) not null,
    manufacturer_snapshot varchar(120),
    model_snapshot varchar(120),
    serial_number_snapshot varchar(120),
    department_snapshot varchar(160),
    station_snapshot varchar(160),
    responsible_snapshot varchar(160),
    status_snapshot varchar(20) not null,
    origin_snapshot varchar(30) not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create unique index if not exists ux_asset_disposal_items_disposal_asset
    on inventory.asset_disposal_items (disposal_id, asset_id);

create table if not exists inventory.asset_disposal_documents (
    id bigserial primary key,
    disposal_id bigint not null references inventory.asset_disposals(id) on delete cascade,
    type varchar(30) not null check (type in ('SIGNED_TERM', 'PHOTO', 'TECHNICAL_REPORT', 'OTHER')),
    file_name varchar(255) not null,
    file_path varchar(500),
    mime_type varchar(120),
    uploaded_by varchar(120),
    uploaded_at timestamp not null default now(),
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table if not exists inventory.asset_disposal_events (
    id bigserial primary key,
    disposal_id bigint not null references inventory.asset_disposals(id) on delete cascade,
    event_type varchar(40) not null,
    description varchar(2000) not null,
    username varchar(120),
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create index if not exists ix_asset_disposals_status on inventory.asset_disposals(status);
create index if not exists ix_asset_disposal_items_asset on inventory.asset_disposal_items(asset_id);
create index if not exists ix_asset_disposal_documents_disposal on inventory.asset_disposal_documents(disposal_id);
create index if not exists ix_asset_disposal_events_disposal on inventory.asset_disposal_events(disposal_id);

drop trigger if exists trg_asset_disposals_updated_at on inventory.asset_disposals;
create trigger trg_asset_disposals_updated_at
before update on inventory.asset_disposals
for each row execute function inventory.set_updated_at();

drop trigger if exists trg_asset_disposal_items_updated_at on inventory.asset_disposal_items;
create trigger trg_asset_disposal_items_updated_at
before update on inventory.asset_disposal_items
for each row execute function inventory.set_updated_at();

drop trigger if exists trg_asset_disposal_documents_updated_at on inventory.asset_disposal_documents;
create trigger trg_asset_disposal_documents_updated_at
before update on inventory.asset_disposal_documents
for each row execute function inventory.set_updated_at();

drop trigger if exists trg_asset_disposal_events_updated_at on inventory.asset_disposal_events;
create trigger trg_asset_disposal_events_updated_at
before update on inventory.asset_disposal_events
for each row execute function inventory.set_updated_at();
