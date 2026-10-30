alter table inventory.asset_movements
    add column if not exists source_process_type varchar(30),
    add column if not exists source_process_id bigint,
    add column if not exists source_process_number varchar(30);

create index if not exists ix_asset_movements_source_process
    on inventory.asset_movements(source_process_type, source_process_id);
