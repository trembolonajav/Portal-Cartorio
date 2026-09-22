create table if not exists inventory.asset_disposal_materials (
    id bigserial primary key,
    disposal_id bigint not null references inventory.asset_disposals(id) on delete cascade,
    category varchar(80) not null,
    description varchar(255) not null,
    quantity integer not null check (quantity > 0),
    unit varchar(30) not null,
    notes varchar(2000),
    contains_sensitive_data boolean not null default false,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create index if not exists ix_asset_disposal_materials_disposal
    on inventory.asset_disposal_materials(disposal_id);

drop trigger if exists trg_asset_disposal_materials_updated_at on inventory.asset_disposal_materials;
create trigger trg_asset_disposal_materials_updated_at
before update on inventory.asset_disposal_materials
for each row execute function inventory.set_updated_at();

alter table inventory.asset_disposal_documents
    drop constraint if exists asset_disposal_documents_type_check;

alter table inventory.asset_disposal_documents
    add constraint asset_disposal_documents_type_check
    check (type in ('SIGNED_TERM', 'PHOTO', 'TECHNICAL_REPORT', 'DISPOSAL_RECEIPT', 'ORIGINAL_PROCESS', 'OTHER'));
