-- Lado em que a divisória do guichê é desenhada na planta, em relação à tela.
-- LEFT, RIGHT, BOTH, NONE; nulo = automático (pela quantidade de divisórias cadastradas).
alter table inventory.stations add column if not exists partition_side varchar(10);
