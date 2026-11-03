alter table inventory.physical_checks
    add column if not exists condition_grade varchar(30),
    add column if not exists functional_status varchar(30),
    add column if not exists condition_notes varchar(1000);

alter table inventory.physical_checks drop constraint if exists ck_physical_checks_condition_grade;
alter table inventory.physical_checks add constraint ck_physical_checks_condition_grade check (
    condition_grade is null or condition_grade in ('GOOD', 'FAIR', 'POOR', 'UNSERVICEABLE')
);

alter table inventory.physical_checks drop constraint if exists ck_physical_checks_functional_status;
alter table inventory.physical_checks add constraint ck_physical_checks_functional_status check (
    functional_status is null or functional_status in ('WORKING', 'PARTIALLY_WORKING', 'NOT_WORKING')
);

alter table inventory.unregistered_stock_items
    add column if not exists condition_grade varchar(30),
    add column if not exists functional_status varchar(30),
    add column if not exists condition_notes varchar(1000);

alter table inventory.unregistered_stock_items drop constraint if exists ck_unregistered_items_condition_grade;
alter table inventory.unregistered_stock_items add constraint ck_unregistered_items_condition_grade check (
    condition_grade is null or condition_grade in ('GOOD', 'FAIR', 'POOR', 'UNSERVICEABLE')
);

alter table inventory.unregistered_stock_items drop constraint if exists ck_unregistered_items_functional_status;
alter table inventory.unregistered_stock_items add constraint ck_unregistered_items_functional_status check (
    functional_status is null or functional_status in ('WORKING', 'PARTIALLY_WORKING', 'NOT_WORKING')
);
