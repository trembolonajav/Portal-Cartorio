-- Especificacoes de hardware (memoria RAM e armazenamento) exibidas na ficha de patrimonio,
-- principalmente para computadores. Config estruturada, sem poluir o nome do bem.
alter table inventory.assets
    add column if not exists ram varchar(60),
    add column if not exists storage varchar(120);
