alter table inventory.equipment_exchange_terms
    add column if not exists reported_problem varchar(2000),
    add column if not exists inspection_result varchar(30),
    add column if not exists diagnosis varchar(2000),
    add column if not exists returned_condition varchar(30),
    add column if not exists retired_destination varchar(40),
    add column if not exists technician_name varchar(160),
    add column if not exists completed_at timestamp;

alter table inventory.equipment_exchange_terms
    drop constraint if exists equipment_exchange_terms_status_check;

alter table inventory.equipment_exchange_terms
    add constraint equipment_exchange_terms_status_check
    check (status in ('DRAFT', 'WAITING_SIGNATURE', 'ACTIVE', 'COMPLETED', 'CANCELLED'));

alter table inventory.equipment_exchange_terms
    add constraint equipment_exchange_terms_inspection_result_check
    check (inspection_result is null or inspection_result in ('CONFIRMED', 'PARTIAL', 'NOT_CONFIRMED'));

alter table inventory.equipment_exchange_terms
    add constraint equipment_exchange_terms_returned_condition_check
    check (returned_condition is null or returned_condition in ('GOOD', 'NORMAL_WEAR', 'DAMAGED', 'INCOMPLETE'));

alter table inventory.equipment_exchange_terms
    add constraint equipment_exchange_terms_retired_destination_check
    check (retired_destination is null or retired_destination in ('MAINTENANCE', 'STOCK', 'DISPOSAL_EVALUATION'));

alter table inventory.asset_movements
    drop constraint if exists asset_movements_movement_type_check;

alter table inventory.asset_movements
    add constraint asset_movements_movement_type_check
    check (movement_type in ('CREATED', 'UPDATED', 'LINKED', 'UNLINKED', 'TRANSFERRED', 'STATUS_CHANGED', 'INVENTORY_CHECKED', 'VOIDED', 'EXCHANGED'));
