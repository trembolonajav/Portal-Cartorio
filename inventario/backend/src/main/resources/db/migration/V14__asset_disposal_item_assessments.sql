alter table inventory.asset_disposal_items
    add column if not exists item_reason varchar(40),
    add column if not exists physical_condition varchar(120),
    add column if not exists evaluation_description varchar(2000),
    add column if not exists technical_notes varchar(2000),
    add column if not exists requires_data_sanitization boolean not null default false,
    add column if not exists data_sanitization_completed boolean not null default false;

alter table inventory.asset_disposal_items
    drop constraint if exists asset_disposal_items_item_reason_check;

alter table inventory.asset_disposal_items
    add constraint asset_disposal_items_item_reason_check
    check (item_reason is null or item_reason in ('OBSOLESCENCE', 'IRREPAIRABLE_DEFECT', 'PHYSICAL_DAMAGE', 'LOSS', 'REPLACEMENT', 'DONATION', 'DISCARD', 'SALE', 'OTHER'));

alter table inventory.asset_disposal_documents
    add column if not exists disposal_item_id bigint
    references inventory.asset_disposal_items(id) on delete restrict;

create index if not exists ix_asset_disposal_documents_item
    on inventory.asset_disposal_documents(disposal_item_id);
