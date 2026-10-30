create table if not exists inventory.asset_documents (
    id bigserial primary key,
    document_type varchar(30) not null,
    title varchar(240) not null,
    description varchar(2000),
    document_number varchar(120),
    issue_date date,
    supplier_name varchar(180),
    file_name varchar(255) not null,
    file_path varchar(1000) not null,
    mime_type varchar(120) not null,
    file_size bigint not null,
    uploaded_by varchar(120),
    uploaded_at timestamp not null default now(),
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    constraint asset_documents_type_check check (
        document_type in ('INVOICE', 'RECEIPT_TERM', 'WARRANTY', 'MANUAL', 'OTHER')
    )
);

create table if not exists inventory.asset_document_links (
    document_id bigint not null references inventory.asset_documents(id) on delete cascade,
    asset_id bigint not null references inventory.assets(id) on delete cascade,
    primary key (document_id, asset_id)
);

create index if not exists ix_asset_documents_type on inventory.asset_documents(document_type);
create index if not exists ix_asset_documents_number on inventory.asset_documents(document_number);
create index if not exists ix_asset_document_links_asset on inventory.asset_document_links(asset_id);

drop trigger if exists trg_asset_documents_updated_at on inventory.asset_documents;
create trigger trg_asset_documents_updated_at
before update on inventory.asset_documents
for each row execute function inventory.set_updated_at();
