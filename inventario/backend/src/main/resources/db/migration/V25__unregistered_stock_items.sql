create sequence if not exists inventory.unregistered_stock_item_code_seq start with 1;

create table if not exists inventory.unregistered_stock_items (
    id                  bigserial primary key,
    provisional_code    varchar(40) not null unique,
    type                 varchar(80) not null,
    description          varchar(255) not null,
    manufacturer         varchar(120),
    model                varchar(120),
    serial_number        varchar(120),
    notes                varchar(2000),
    status               varchar(20) not null default 'PENDING',
    registered_asset_id  bigint references inventory.assets(id),
    found_by             varchar(160),
    found_at             timestamp not null default now(),
    resolved_by          varchar(160),
    resolved_at          timestamp,
    created_at           timestamp not null default now(),
    updated_at           timestamp not null default now(),
    constraint chk_unregistered_stock_item_status
        check (status in ('PENDING', 'REGISTERED'))
);

create index if not exists idx_unregistered_stock_items_status
    on inventory.unregistered_stock_items(status, found_at desc);

create table if not exists inventory.unregistered_stock_item_photos (
    id                  bigserial primary key,
    item_id             bigint not null references inventory.unregistered_stock_items(id) on delete cascade,
    file_name           varchar(255) not null,
    file_path           varchar(1000) not null,
    mime_type           varchar(120) not null,
    file_size           bigint not null,
    uploaded_by         varchar(160),
    uploaded_at         timestamp not null default now(),
    created_at          timestamp not null default now(),
    updated_at          timestamp not null default now()
);

create index if not exists idx_unregistered_stock_item_photos_item
    on inventory.unregistered_stock_item_photos(item_id);

drop trigger if exists trg_unregistered_stock_items_updated_at on inventory.unregistered_stock_items;
create trigger trg_unregistered_stock_items_updated_at
before update on inventory.unregistered_stock_items
for each row execute function inventory.set_updated_at();

drop trigger if exists trg_unregistered_stock_item_photos_updated_at on inventory.unregistered_stock_item_photos;
create trigger trg_unregistered_stock_item_photos_updated_at
before update on inventory.unregistered_stock_item_photos
for each row execute function inventory.set_updated_at();
