-- Fotos (provas) vinculadas a cada conferência física.
-- Arquivo em disco (volume inventory_storage), 1..N fotos por physical_check.

create table if not exists inventory.physical_check_photos (
    id                 bigserial primary key,
    physical_check_id  bigint not null references inventory.physical_checks(id) on delete cascade,
    file_name          varchar(255)  not null,
    file_path          varchar(1000) not null,
    mime_type          varchar(120)  not null,
    file_size          bigint        not null,
    uploaded_by        varchar(160),
    uploaded_at        timestamp     not null default now(),
    created_at         timestamp     not null default now(),
    updated_at         timestamp     not null default now()
);

create index if not exists idx_check_photos_check on inventory.physical_check_photos(physical_check_id);

drop trigger if exists trg_check_photos_updated_at on inventory.physical_check_photos;
create trigger trg_check_photos_updated_at
before update on inventory.physical_check_photos
for each row execute function inventory.set_updated_at();
