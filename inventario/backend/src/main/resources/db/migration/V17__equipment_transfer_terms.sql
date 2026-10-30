-- Termos de transferencia de equipamento: o mesmo bem muda de estacao/responsavel.

create table if not exists inventory.equipment_transfer_terms (
    id bigserial primary key,
    number varchar(30) not null unique,
    status varchar(30) not null check (status in ('DRAFT', 'WAITING_SIGNATURE', 'COMPLETED', 'CANCELLED')),

    asset_id bigint not null references inventory.assets(id) on delete restrict,
    asset_code_snapshot varchar(60) not null,
    asset_description_snapshot varchar(255) not null,
    asset_manufacturer_snapshot varchar(120),
    asset_model_snapshot varchar(120),
    asset_serial_snapshot varchar(120),

    from_station_snapshot varchar(160),
    from_responsible_snapshot varchar(160),

    to_station_id bigint references inventory.stations(id) on delete set null,
    to_station_snapshot varchar(160),
    to_responsible_name varchar(160),
    to_sector varchar(160),

    reason varchar(160),
    ticket_ref varchar(60),
    technician_name varchar(160),
    notes varchar(4000),

    term_generated_at timestamp,
    signed_document_uploaded_at timestamp,
    active_since timestamp,
    completed_at timestamp,
    cancel_reason varchar(2000),
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create index if not exists ix_equipment_transfer_terms_status on inventory.equipment_transfer_terms(status);
create index if not exists ix_equipment_transfer_terms_asset on inventory.equipment_transfer_terms(asset_id);

drop trigger if exists trg_equipment_transfer_terms_updated_at on inventory.equipment_transfer_terms;
create trigger trg_equipment_transfer_terms_updated_at
before update on inventory.equipment_transfer_terms
for each row execute function inventory.set_updated_at();
