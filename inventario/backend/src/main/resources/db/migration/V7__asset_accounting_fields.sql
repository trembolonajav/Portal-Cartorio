-- Campos contábeis e de vida útil do patrimônio (Ficha do patrimônio 3b).
alter table inventory.assets add column if not exists fiscal_note varchar(120);
alter table inventory.assets add column if not exists accounting_category varchar(120);
alter table inventory.assets add column if not exists acquisition_value numeric(14, 2);
alter table inventory.assets add column if not exists depreciation_rate numeric(5, 2);
alter table inventory.assets add column if not exists useful_life_years integer;
alter table inventory.assets add column if not exists warranty_until date;
