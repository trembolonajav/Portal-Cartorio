-- Termos de responsabilidade e solicitações (categorias do Arquivo).

-- ============================ Termos de responsabilidade ============================
create table if not exists inventory.responsibility_terms (
    id bigserial primary key,
    number varchar(30) not null unique,
    status varchar(30) not null check (status in ('DRAFT', 'WAITING_SIGNATURE', 'ACTIVE', 'RETURNED', 'CANCELLED')),
    employee_id uuid,
    employee_name_snapshot varchar(160) not null,
    department_snapshot varchar(160),
    location_snapshot varchar(160),
    notes varchar(4000),
    term_generated_at timestamp,
    signed_document_uploaded_at timestamp,
    active_since timestamp,
    returned_at timestamp,
    cancel_reason varchar(2000),
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table if not exists inventory.responsibility_term_items (
    id bigserial primary key,
    term_id bigint not null references inventory.responsibility_terms(id) on delete cascade,
    asset_id bigint not null references inventory.assets(id) on delete restrict,
    asset_code_snapshot varchar(60) not null,
    description_snapshot varchar(255) not null,
    category_snapshot varchar(80) not null,
    manufacturer_snapshot varchar(120),
    model_snapshot varchar(120),
    serial_number_snapshot varchar(120),
    station_snapshot varchar(160),
    status_snapshot varchar(20) not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create unique index if not exists ux_responsibility_term_items_term_asset
    on inventory.responsibility_term_items (term_id, asset_id);

create table if not exists inventory.responsibility_term_documents (
    id bigserial primary key,
    term_id bigint not null references inventory.responsibility_terms(id) on delete cascade,
    type varchar(30) not null check (type in ('SIGNED_TERM', 'OTHER')),
    file_name varchar(255) not null,
    file_path varchar(500),
    mime_type varchar(120),
    uploaded_by varchar(120),
    uploaded_at timestamp not null default now(),
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create index if not exists ix_responsibility_terms_status on inventory.responsibility_terms(status);
create index if not exists ix_responsibility_term_items_term on inventory.responsibility_term_items(term_id);
create index if not exists ix_responsibility_term_documents_term on inventory.responsibility_term_documents(term_id);

-- ============================ Solicitações ============================
create table if not exists inventory.asset_requests (
    id bigserial primary key,
    number varchar(30) not null unique,
    type varchar(30) not null check (type in ('NEW_EQUIPMENT', 'REPAIR', 'RELOCATION', 'SUPPLY', 'OTHER')),
    priority varchar(20) not null check (priority in ('LOW', 'MEDIUM', 'HIGH')),
    status varchar(20) not null check (status in ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    title varchar(160) not null,
    description varchar(4000) not null,
    requested_by varchar(120),
    department varchar(160),
    decision_note varchar(2000),
    decided_by varchar(120),
    decided_at timestamp,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create index if not exists ix_asset_requests_status on inventory.asset_requests(status);

-- ============================ Triggers updated_at ============================
drop trigger if exists trg_responsibility_terms_updated_at on inventory.responsibility_terms;
create trigger trg_responsibility_terms_updated_at
before update on inventory.responsibility_terms
for each row execute function inventory.set_updated_at();

drop trigger if exists trg_responsibility_term_items_updated_at on inventory.responsibility_term_items;
create trigger trg_responsibility_term_items_updated_at
before update on inventory.responsibility_term_items
for each row execute function inventory.set_updated_at();

drop trigger if exists trg_responsibility_term_documents_updated_at on inventory.responsibility_term_documents;
create trigger trg_responsibility_term_documents_updated_at
before update on inventory.responsibility_term_documents
for each row execute function inventory.set_updated_at();

drop trigger if exists trg_asset_requests_updated_at on inventory.asset_requests;
create trigger trg_asset_requests_updated_at
before update on inventory.asset_requests
for each row execute function inventory.set_updated_at();
