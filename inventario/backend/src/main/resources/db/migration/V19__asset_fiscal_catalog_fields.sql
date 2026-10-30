-- Campos fiscais da NF e catálogo do modelo exibidos na ficha de patrimônio.
alter table inventory.assets
    add column if not exists nfe_access_key varchar(60),
    add column if not exists fiscal_note_series varchar(20),
    add column if not exists supplier_name varchar(160),
    add column if not exists acquisition_batch varchar(160),
    add column if not exists nf_item_code varchar(60),
    add column if not exists supplier_order varchar(60),
    add column if not exists initial_condition varchar(120),
    add column if not exists part_number varchar(120),
    add column if not exists regulatory_model varchar(120),
    add column if not exists ncm varchar(20),
    add column if not exists ean varchar(20),
    add column if not exists upc varchar(20),
    add column if not exists color varchar(60);
