-- DermOS · schema inicial para Supabase/PostgreSQL
-- Este arquivo é uma base técnica para homologação. Não inserir dados reais antes de revisar RLS,
-- retenção, backups, contrato e requisitos jurídicos/operacionais.

create extension if not exists pgcrypto;

create type public.app_role as enum ('owner', 'doctor', 'assistant', 'reception', 'finance');
create type public.encounter_status as enum ('draft', 'signed', 'cancelled');
create type public.appointment_status as enum ('scheduled', 'confirmed', 'waiting', 'completed', 'cancelled', 'no_show');
create type public.lesion_status as enum ('active', 'monitoring', 'resolved');
create type public.attachment_kind as enum ('exam', 'clinical_photo', 'consent', 'other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role app_role not null default 'assistant',
  crm text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  preferred_name text,
  birth_date date,
  cpf_last4 text,
  phone text,
  email text,
  fototipo text,
  allergies text,
  current_medications text,
  emergency_contact text,
  lgpd_notice_at timestamptz,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz,
  appointment_type text not null,
  status appointment_status not null default 'scheduled',
  notes text,
  external_provider text,
  external_id text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.encounters (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete set null,
  professional_id uuid not null references public.profiles(id),
  status encounter_status not null default 'draft',
  chief_complaint text,
  history text,
  physical_exam text,
  assessment text,
  plan text,
  fototipo text,
  topography text,
  lesion_description text,
  procedure_notes text,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lesions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  encounter_id uuid references public.encounters(id) on delete set null,
  code text not null,
  body_region text not null,
  topography text,
  morphology text,
  size_mm numeric(6,2),
  status lesion_status not null default 'active',
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  encounter_id uuid references public.encounters(id) on delete set null,
  uploaded_by uuid not null references public.profiles(id),
  kind attachment_kind not null,
  storage_path text not null unique,
  display_name text not null,
  mime_type text not null,
  size_bytes bigint,
  captured_at timestamptz,
  body_region text,
  comparison_group text,
  created_at timestamptz not null default now()
);

create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  encounter_id uuid references public.encounters(id) on delete set null,
  professional_id uuid not null references public.profiles(id),
  status encounter_status not null default 'draft',
  prescription_type text not null default 'simple',
  is_controlled boolean not null default false,
  instructions text,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prescription_items (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions(id) on delete cascade,
  medication text not null,
  concentration text,
  pharmaceutical_form text,
  dosage text,
  duration text,
  instructions text,
  sort_order integer not null default 0
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index patients_name_idx on public.patients using gin (to_tsvector('simple', full_name));
create index appointments_starts_at_idx on public.appointments(starts_at);
create index encounters_patient_idx on public.encounters(patient_id, created_at desc);
create index attachments_patient_idx on public.attachments(patient_id, created_at desc);
create index audit_logs_resource_idx on public.audit_logs(resource_type, resource_id, occurred_at desc);

-- Helper functions for RLS. Review with the responsible security/privacy professional.
create or replace function public.current_role() returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active = true limit 1;
$$;

create or replace function public.can_read_clinical_data() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role() in ('owner', 'doctor', 'assistant'), false);
$$;

revoke all on function public.current_role() from public, anon;
revoke all on function public.can_read_clinical_data() from public, anon;
grant execute on function public.current_role() to authenticated;
grant execute on function public.can_read_clinical_data() to authenticated;

alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.encounters enable row level security;
alter table public.lesions enable row level security;
alter table public.attachments enable row level security;
alter table public.prescriptions enable row level security;
alter table public.prescription_items enable row level security;
alter table public.audit_logs enable row level security;

-- Client grants are explicit. RLS then limits those operations by active profile role.
revoke all on table public.profiles from anon, authenticated;
grant select, insert, update on table public.profiles to authenticated;
revoke all on table public.patients from anon, authenticated;
grant select, insert, update on table public.patients to authenticated;
revoke all on table public.appointments from anon, authenticated;
grant select, insert, update on table public.appointments to authenticated;
revoke all on table public.encounters from anon, authenticated;
grant select, insert on table public.encounters to authenticated;
revoke all on table public.lesions from anon, authenticated;
grant select, insert on table public.lesions to authenticated;
revoke all on table public.attachments from anon, authenticated;
grant select, insert on table public.attachments to authenticated;
revoke all on table public.prescriptions from anon, authenticated;
grant select, insert on table public.prescriptions to authenticated;
revoke all on table public.prescription_items from anon, authenticated;
grant select, insert on table public.prescription_items to authenticated;
revoke all on table public.audit_logs from anon, authenticated;
grant select on table public.audit_logs to authenticated;

create policy profiles_self_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_owner_read on public.profiles for select to authenticated using ((select public.current_role()) = 'owner'::public.app_role);
create policy profiles_owner_insert_staff on public.profiles for insert to authenticated with check (
  (select public.current_role()) = 'owner'::public.app_role and role <> 'owner'::public.app_role and id <> (select auth.uid())
);
create policy profiles_owner_update_staff on public.profiles for update to authenticated using (
  (select public.current_role()) = 'owner'::public.app_role and id <> (select auth.uid())
) with check (
  (select public.current_role()) = 'owner'::public.app_role and id <> (select auth.uid()) and role <> 'owner'::public.app_role
);

create policy patients_clinical_read on public.patients for select to authenticated using ((select public.can_read_clinical_data()));
create policy patients_clinical_insert on public.patients for insert to authenticated with check (
  (select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role, 'assistant'::public.app_role)
);
create policy patients_clinical_update on public.patients for update to authenticated using (
  (select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role, 'assistant'::public.app_role)
) with check (
  (select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role, 'assistant'::public.app_role)
);

create policy appointments_read on public.appointments for select to authenticated using (
  (select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role, 'assistant'::public.app_role)
);
create policy appointments_insert on public.appointments for insert to authenticated with check (
  (select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role, 'assistant'::public.app_role)
);
create policy appointments_update on public.appointments for update to authenticated using (
  (select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role, 'assistant'::public.app_role)
) with check (
  (select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role, 'assistant'::public.app_role)
);

create policy encounters_read on public.encounters for select to authenticated using ((select public.can_read_clinical_data()));
create policy encounters_insert on public.encounters for insert to authenticated with check (
  (select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role)
);
create policy lesions_read on public.lesions for select to authenticated using ((select public.can_read_clinical_data()));
create policy lesions_insert on public.lesions for insert to authenticated with check (
  (select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role)
);
create policy attachments_read on public.attachments for select to authenticated using ((select public.can_read_clinical_data()));
create policy attachments_insert on public.attachments for insert to authenticated with check (
  (select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role, 'assistant'::public.app_role)
);
create policy prescriptions_read on public.prescriptions for select to authenticated using (
  (select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role, 'assistant'::public.app_role)
);
create policy prescriptions_insert on public.prescriptions for insert to authenticated with check (
  (select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role)
);
create policy prescription_items_read on public.prescription_items for select to authenticated using (
  (select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role, 'assistant'::public.app_role)
);
create policy prescription_items_insert on public.prescription_items for insert to authenticated with check (
  (select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role)
);
create policy audit_logs_read on public.audit_logs for select to authenticated using ((select public.current_role()) = 'owner'::public.app_role);

-- Clinical files remain private and client-side write access is limited to upload-only.
insert into storage.buckets (id, name, public) values ('clinical-files', 'clinical-files', false)
on conflict (id) do update set public = false;
create policy clinical_files_select on storage.objects for select to authenticated using (
  bucket_id = 'clinical-files' and (select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role, 'assistant'::public.app_role)
);
create policy clinical_files_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'clinical-files'
  and (select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role, 'assistant'::public.app_role)
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Do not enable self-service profile creation. Apply the secure owner bootstrap and
-- reception directory/schedule RPC migrations only for the intended DermOS project.
