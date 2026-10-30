-- Estado atual do bem, separado da condicao historica na aquisicao.
alter table inventory.assets
    add column if not exists condition_grade varchar(30),
    add column if not exists functional_status varchar(30),
    add column if not exists condition_notes varchar(1000);

alter table inventory.assets drop constraint if exists ck_assets_condition_grade;
alter table inventory.assets add constraint ck_assets_condition_grade check (
    condition_grade is null or condition_grade in ('NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'UNSERVICEABLE')
);

alter table inventory.assets drop constraint if exists ck_assets_functional_status;
alter table inventory.assets add constraint ck_assets_functional_status check (
    functional_status is null or functional_status in ('WORKING', 'PARTIALLY_WORKING', 'NOT_TESTED', 'NOT_WORKING')
);

alter table inventory.responsibility_term_items
    add column if not exists condition_grade_snapshot varchar(30),
    add column if not exists functional_status_snapshot varchar(30),
    add column if not exists condition_notes_snapshot varchar(1000);
