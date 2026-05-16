drop view if exists inventory.vw_asset_inventory;

create view inventory.vw_asset_inventory as
select
    a.id as asset_id,
    a.asset_code,
    a.type as asset_type,
    a.description as asset_description,
    a.serial_number,
    a.manufacturer,
    a.model,
    a.processor,
    a.operating_system,
    a.status as asset_status,
    a.origin as asset_origin,
    st.id as station_id,
    st.code as station_code,
    st.name as station_name,
    st.status as station_status,
    e.id as employee_id,
    e.full_name as employee_name,
    d.id as department_id,
    d.name as department_name,
    aa.assigned_at,
    a.last_inventory_check_at,
    a.updated_at as asset_updated_at
from inventory.assets a
left join inventory.asset_assignments aa
    on aa.asset_id = a.id
   and aa.status = 'ACTIVE'
left join inventory.stations st
    on st.id = aa.station_id
left join inventory.station_responsibilities sr
    on sr.station_id = st.id
   and sr.is_current = true
left join public.employees e
    on e.id = sr.employee_id
left join public.departments d
    on d.id = e.department_id;
