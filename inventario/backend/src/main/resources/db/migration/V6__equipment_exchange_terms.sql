-- Termos de troca de equipamento (categoria do Arquivo).

create table if not exists inventory.equipment_exchange_terms (
    id bigserial primary key,
    number varchar(30) not null unique,
    status varchar(30) not null check (status in ('DRAFT', 'WAITING_SIGNATURE', 'ACTIVE', 'CANCELLED')),

    retired_asset_id bigint not null references inventory.assets(id) on delete restrict,
    retired_code_snapshot varchar(60) not null,
    retired_description_snapshot varchar(255) not null,
    retired_serial_snapshot varchar(120),
    retired_station_snapshot varchar(160),
    retired_responsible_snapshot varchar(160),

    delivered_asset_id bigint not null references inventory.assets(id) on delete restrict,
    delivered_code_snapshot varchar(60) not null,
    delivered_description_snapshot varchar(255) not null,
    delivered_serial_snapshot varchar(120),
    delivered_station_snapshot varchar(160),

    responsible_name varchar(160),
    location_snapshot varchar(160),
    ticket_ref varchar(60),
    sector varchar(160),
    reason varchar(160),
    notes varchar(4000),

    term_generated_at timestamp,
    signed_document_uploaded_at timestamp,
    active_since timestamp,
    cancel_reason varchar(2000),
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table if not exists inventory.equipment_exchange_term_documents (
    id bigserial primary key,
    term_id bigint not null references inventory.equipment_exchange_terms(id) on delete cascade,
    type varchar(30) not null check (type in ('SIGNED_TERM', 'OTHER')),
    file_name varchar(255) not null,
    file_path varchar(500),
    mime_type varchar(120),
    uploaded_by varchar(120),
    uploaded_at timestamp not null default now(),
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create index if not exists ix_equipment_exchange_terms_status on inventory.equipment_exchange_terms(status);
create index if not exists ix_equipment_exchange_term_documents_term on inventory.equipment_exchange_term_documents(term_id);

drop trigger if exists trg_equipment_exchange_terms_updated_at on inventory.equipment_exchange_terms;
create trigger trg_equipment_exchange_terms_updated_at
before update on inventory.equipment_exchange_terms
for each row execute function inventory.set_updated_at();

drop trigger if exists trg_equipment_exchange_term_documents_updated_at on inventory.equipment_exchange_term_documents;
create trigger trg_equipment_exchange_term_documents_updated_at
before update on inventory.equipment_exchange_term_documents
for each row execute function inventory.set_updated_at();
