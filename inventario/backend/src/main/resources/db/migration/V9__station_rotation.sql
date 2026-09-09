-- Rotação da estação na planta (editor de planta / mapa por espaço).
-- Graus 0/90/180/270; nulo = 0.
alter table inventory.stations add column if not exists position_rotation integer;
