-- Least-privilege administrative access for a separately provisioned receptionist.
-- The reception role can use only a minimal contact directory and schedule view.
-- It receives no direct RLS access to clinical patient data, notes, charts, files or prescriptions.

-- Enforce the same attachment policy in Storage, not only in browser controls.
update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array['image/jpeg', 'image/png', 'application/pdf']::text[]
where id = 'clinical-files';

create view public.patient_directory
with (security_barrier = true)
as
select
  p.id,
  p.full_name,
  p.preferred_name,
  p.phone,
  p.email,
  p.active,
  p.created_at,
  p.updated_at
from public.patients as p
where p.active = true
  and (select public.current_role()) in (
    'owner'::public.app_role,
    'doctor'::public.app_role,
    'assistant'::public.app_role,
    'reception'::public.app_role
  );

create view public.appointment_schedule
with (security_barrier = true)
as
select
  a.id,
  a.patient_id,
  p.full_name as patient_name,
  a.starts_at,
  case
    when lower(btrim(a.appointment_type)) like 'consulta%' then 'Consulta'
    when lower(btrim(a.appointment_type)) like 'retorno%' then 'Retorno'
    when lower(btrim(a.appointment_type)) like 'procedimento%' then 'Procedimento'
    else 'Atendimento'
  end as appointment_type,
  a.status
from public.appointments as a
join public.patients as p on p.id = a.patient_id
where (select public.current_role()) in (
  'owner'::public.app_role,
  'doctor'::public.app_role,
  'assistant'::public.app_role,
  'reception'::public.app_role
);

revoke all on public.patient_directory from public, anon;
revoke all on public.appointment_schedule from public, anon;
grant select on public.patient_directory to authenticated;
grant select on public.appointment_schedule to authenticated;

create or replace function public.create_reception_patient(
  p_full_name text,
  p_preferred_name text,
  p_phone text,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  new_patient_id uuid;
  clean_name text := btrim(coalesce(p_full_name, ''));
  clean_preferred_name text := nullif(btrim(coalesce(p_preferred_name, '')), '');
  clean_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  clean_email text := nullif(btrim(coalesce(p_email, '')), '');
begin
  if auth.uid() is null or public.current_role() is distinct from 'reception'::public.app_role then
    raise exception 'Acesso administrativo de recepção necessário.' using errcode = '42501';
  end if;
  if clean_name = '' or char_length(clean_name) > 160 then
    raise exception 'Nome obrigatório, com no máximo 160 caracteres.' using errcode = '22023';
  end if;
  if clean_preferred_name is not null and char_length(clean_preferred_name) > 120 then
    raise exception 'Nome preferido excede 120 caracteres.' using errcode = '22023';
  end if;
  if clean_phone is not null and char_length(clean_phone) > 30 then
    raise exception 'Telefone excede 30 caracteres.' using errcode = '22023';
  end if;
  if clean_email is not null and char_length(clean_email) > 254 then
    raise exception 'E-mail excede 254 caracteres.' using errcode = '22023';
  end if;

  insert into public.patients (full_name, preferred_name, phone, email, created_by)
  values (clean_name, clean_preferred_name, clean_phone, clean_email, auth.uid())
  returning id into new_patient_id;

  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (auth.uid(), 'reception_patient_created', 'patient', new_patient_id, '{}'::jsonb);

  return new_patient_id;
end;
$$;

create or replace function public.update_reception_patient(
  p_patient_id uuid,
  p_full_name text,
  p_preferred_name text,
  p_phone text,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  clean_name text := btrim(coalesce(p_full_name, ''));
  clean_preferred_name text := nullif(btrim(coalesce(p_preferred_name, '')), '');
  clean_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  clean_email text := nullif(btrim(coalesce(p_email, '')), '');
begin
  if auth.uid() is null or public.current_role() is distinct from 'reception'::public.app_role then
    raise exception 'Acesso administrativo de recepção necessário.' using errcode = '42501';
  end if;
  if clean_name = '' or char_length(clean_name) > 160 then
    raise exception 'Nome obrigatório, com no máximo 160 caracteres.' using errcode = '22023';
  end if;
  if clean_preferred_name is not null and char_length(clean_preferred_name) > 120 then
    raise exception 'Nome preferido excede 120 caracteres.' using errcode = '22023';
  end if;
  if clean_phone is not null and char_length(clean_phone) > 30 then
    raise exception 'Telefone excede 30 caracteres.' using errcode = '22023';
  end if;
  if clean_email is not null and char_length(clean_email) > 254 then
    raise exception 'E-mail excede 254 caracteres.' using errcode = '22023';
  end if;

  update public.patients
  set full_name = clean_name,
      preferred_name = clean_preferred_name,
      phone = clean_phone,
      email = clean_email,
      updated_at = now()
  where id = p_patient_id and active = true;
  if not found then
    raise exception 'Paciente ativo não encontrado.' using errcode = 'P0002';
  end if;

  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (auth.uid(), 'reception_patient_contact_updated', 'patient', p_patient_id, '{}'::jsonb);

  return p_patient_id;
end;
$$;

create or replace function public.archive_reception_patient(p_patient_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if auth.uid() is null or public.current_role() is distinct from 'reception'::public.app_role then
    raise exception 'Acesso administrativo de recepção necessário.' using errcode = '42501';
  end if;

  update public.patients
  set active = false, updated_at = now()
  where id = p_patient_id and active = true;
  if not found then
    raise exception 'Paciente ativo não encontrado.' using errcode = 'P0002';
  end if;

  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (auth.uid(), 'reception_patient_archived', 'patient', p_patient_id, '{}'::jsonb);

  return p_patient_id;
end;
$$;

create or replace function public.create_reception_appointment(
  p_patient_id uuid,
  p_starts_at timestamptz,
  p_appointment_type text,
  p_status public.appointment_status
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  new_appointment_id uuid;
  clean_type text := case lower(btrim(coalesce(p_appointment_type, '')))
    when 'consulta' then 'Consulta'
    when 'retorno' then 'Retorno'
    when 'procedimento' then 'Procedimento'
    when 'atendimento' then 'Atendimento'
    else null
  end;
begin
  if auth.uid() is null or public.current_role() is distinct from 'reception'::public.app_role then
    raise exception 'Acesso administrativo de recepção necessário.' using errcode = '42501';
  end if;
  if p_starts_at is null or clean_type is null then
    raise exception 'Data e tipo de atendimento válidos são obrigatórios.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.patients where id = p_patient_id and active = true) then
    raise exception 'Paciente ativo não encontrado.' using errcode = 'P0002';
  end if;

  insert into public.appointments (patient_id, starts_at, appointment_type, status, created_by)
  values (p_patient_id, p_starts_at, clean_type, coalesce(p_status, 'scheduled'::public.appointment_status), auth.uid())
  returning id into new_appointment_id;

  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (auth.uid(), 'reception_appointment_created', 'appointment', new_appointment_id, '{}'::jsonb);

  return new_appointment_id;
end;
$$;

create or replace function public.update_reception_appointment(
  p_appointment_id uuid,
  p_patient_id uuid,
  p_starts_at timestamptz,
  p_appointment_type text,
  p_status public.appointment_status
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  clean_type text := case lower(btrim(coalesce(p_appointment_type, '')))
    when 'consulta' then 'Consulta'
    when 'retorno' then 'Retorno'
    when 'procedimento' then 'Procedimento'
    when 'atendimento' then 'Atendimento'
    else null
  end;
begin
  if auth.uid() is null or public.current_role() is distinct from 'reception'::public.app_role then
    raise exception 'Acesso administrativo de recepção necessário.' using errcode = '42501';
  end if;
  if p_starts_at is null or clean_type is null then
    raise exception 'Data e tipo de atendimento válidos são obrigatórios.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.patients where id = p_patient_id and active = true) then
    raise exception 'Paciente ativo não encontrado.' using errcode = 'P0002';
  end if;

  update public.appointments
  set patient_id = p_patient_id,
      starts_at = p_starts_at,
      appointment_type = clean_type,
      status = p_status,
      updated_at = now()
  where id = p_appointment_id;
  if not found then
    raise exception 'Agendamento não encontrado.' using errcode = 'P0002';
  end if;

  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (auth.uid(), 'reception_appointment_updated', 'appointment', p_appointment_id, '{}'::jsonb);

  return p_appointment_id;
end;
$$;

revoke all on function public.create_reception_patient(text, text, text, text) from public, anon;
revoke all on function public.update_reception_patient(uuid, text, text, text, text) from public, anon;
revoke all on function public.archive_reception_patient(uuid) from public, anon;
revoke all on function public.create_reception_appointment(uuid, timestamptz, text, public.appointment_status) from public, anon;
revoke all on function public.update_reception_appointment(uuid, uuid, timestamptz, text, public.appointment_status) from public, anon;
grant execute on function public.create_reception_patient(text, text, text, text) to authenticated;
grant execute on function public.update_reception_patient(uuid, text, text, text, text) to authenticated;
grant execute on function public.archive_reception_patient(uuid) to authenticated;
grant execute on function public.create_reception_appointment(uuid, timestamptz, text, public.appointment_status) to authenticated;
grant execute on function public.update_reception_appointment(uuid, uuid, timestamptz, text, public.appointment_status) to authenticated;
