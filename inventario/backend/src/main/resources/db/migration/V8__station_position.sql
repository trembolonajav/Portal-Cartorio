-- Posição da estação na planta (editor de planta / mapa por espaço).
alter table inventory.stations add column if not exists position_x integer;
alter table inventory.stations add column if not exists position_y integer;
