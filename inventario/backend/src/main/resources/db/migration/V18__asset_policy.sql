create table if not exists inventory.asset_policies (
    id bigserial primary key,
    asset_type varchar(80) not null unique,
    accounting_category varchar(120) not null,
    accounting_group varchar(120),
    accounting_treatment varchar(40) not null default 'CONTROLLED_ASSET',
    useful_life_months integer not null check (useful_life_months > 0),
    residual_rate numeric(5, 2) not null default 0 check (residual_rate between 0 and 100),
    depreciation_method varchar(30) not null default 'LINEAR',
    policy_version integer not null default 1,
    active boolean not null default true,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp
);

alter table inventory.assets
    add column if not exists accounting_group varchar(120),
    add column if not exists accounting_treatment varchar(40),
    add column if not exists useful_life_months integer,
    add column if not exists residual_value numeric(14, 2),
    add column if not exists depreciation_start_date date,
    add column if not exists depreciation_method varchar(30),
    add column if not exists policy_version integer,
    add column if not exists policy_applied_at timestamp;

insert into inventory.asset_policies
    (asset_type, accounting_category, accounting_group, accounting_treatment, useful_life_months, residual_rate, depreciation_method)
values
    ('Mouse', 'Equipamentos de informatica', 'Perifericos de informatica', 'CONTROLLED_ASSET', 60, 0, 'LINEAR'),
    ('Teclado', 'Equipamentos de informatica', 'Perifericos de informatica', 'CONTROLLED_ASSET', 60, 0, 'LINEAR'),
    ('Headset', 'Equipamentos de informatica', 'Perifericos de informatica', 'CONTROLLED_ASSET', 60, 0, 'LINEAR'),
    ('Webcam', 'Equipamentos de informatica', 'Perifericos de informatica', 'CONTROLLED_ASSET', 60, 0, 'LINEAR'),
    ('Monitor', 'Equipamentos de informatica', 'Monitores', 'FIXED_ASSET', 60, 0, 'LINEAR'),
    ('CPU', 'Equipamentos de informatica', 'Computadores', 'FIXED_ASSET', 60, 0, 'LINEAR'),
    ('Desktop', 'Equipamentos de informatica', 'Computadores', 'FIXED_ASSET', 60, 0, 'LINEAR'),
    ('Notebook', 'Equipamentos de informatica', 'Computadores portateis', 'FIXED_ASSET', 60, 0, 'LINEAR'),
    ('Impressora', 'Equipamentos de informatica', 'Impressao e digitalizacao', 'FIXED_ASSET', 60, 0, 'LINEAR'),
    ('Scanner', 'Equipamentos de informatica', 'Impressao e digitalizacao', 'FIXED_ASSET', 60, 0, 'LINEAR'),
    ('Switch', 'Equipamentos de informatica', 'Infraestrutura de rede', 'FIXED_ASSET', 60, 0, 'LINEAR'),
    ('DVR', 'Equipamentos de seguranca', 'CFTV', 'FIXED_ASSET', 60, 0, 'LINEAR'),
    ('NVR', 'Equipamentos de seguranca', 'CFTV', 'FIXED_ASSET', 60, 0, 'LINEAR'),
    ('Camera CFTV', 'Equipamentos de seguranca', 'CFTV', 'FIXED_ASSET', 60, 0, 'LINEAR'),
    ('Nobreak', 'Equipamentos de informatica', 'Energia e protecao', 'FIXED_ASSET', 60, 0, 'LINEAR'),
    ('Mobiliario', 'Moveis e utensilios', 'Mobiliario', 'FIXED_ASSET', 120, 0, 'LINEAR'),
    ('Leitor biometrico', 'Equipamentos de informatica', 'Perifericos de informatica', 'CONTROLLED_ASSET', 60, 0, 'LINEAR'),
    ('Outro', 'Bens patrimoniais', 'Outros', 'CONTROLLED_ASSET', 60, 0, 'LINEAR')
on conflict (asset_type) do nothing;

update inventory.assets a
set accounting_category = coalesce(a.accounting_category, p.accounting_category),
    accounting_group = coalesce(a.accounting_group, p.accounting_group),
    accounting_treatment = coalesce(a.accounting_treatment, p.accounting_treatment),
    useful_life_months = coalesce(a.useful_life_months, p.useful_life_months),
    useful_life_years = coalesce(a.useful_life_years, p.useful_life_months / 12),
    depreciation_rate = coalesce(a.depreciation_rate, round((1200.0 / p.useful_life_months)::numeric, 2)),
    residual_value = coalesce(a.residual_value, 0),
    depreciation_method = coalesce(a.depreciation_method, p.depreciation_method),
    policy_version = coalesce(a.policy_version, p.policy_version),
    policy_applied_at = coalesce(a.policy_applied_at, current_timestamp)
from inventory.asset_policies p
where lower(a.type) = lower(p.asset_type);
