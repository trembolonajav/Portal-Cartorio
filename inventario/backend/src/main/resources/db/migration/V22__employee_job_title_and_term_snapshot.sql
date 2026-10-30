alter table public.employees
    add column if not exists job_title varchar(160);

alter table inventory.responsibility_terms
    add column if not exists employee_job_title_snapshot varchar(160);

create or replace function inventory.sync_pending_responsibility_term_job_title()
returns trigger
language plpgsql
as $$
begin
    update inventory.responsibility_terms
       set employee_job_title_snapshot = nullif(btrim(new.job_title), '')
     where employee_id = new.id
       and status in ('DRAFT', 'WAITING_SIGNATURE')
       and signed_document_uploaded_at is null;
    return new;
end;
$$;

drop trigger if exists trg_sync_pending_responsibility_term_job_title on public.employees;
create trigger trg_sync_pending_responsibility_term_job_title
after update of job_title on public.employees
for each row
execute function inventory.sync_pending_responsibility_term_job_title();
