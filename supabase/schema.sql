-- DermOS · schema inicial para Supabase/PostgreSQL
-- Este arquivo é uma base técnica para homologação. Não inserir dados reais antes de revisar RLS,
-- retenção, backups, contrato e requisitos jurídicos/operacionais.

create extension if not exists pgcrypto;

enum app_role as ('owner', 'doctor', 'assistant', 'reception', 'finance');
enum encounter_status as ('draft', 'signed', 'cancelled');
enum appointment_status as ('scheduled', 'confirmed', 'waiting', 'completed', 'cancelled', 'no_show');
enum lesion_status as ('active', 'monitoring', 'resolved');
enum attachment_kind as ('exam', 'clinical_photo', 'consent', 'other');

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
create or replace function public.current_role() returns app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active = true limit 1;
$$;

create or replace function public.can_read_clinical_data() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_role() in ('owner', 'doctor', 'assistant');
$$;

alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.encounters enable row level security;
alter table public.lesions enable row level security;
alter table public.attachments enable row level security;
alter table public.prescriptions enable row level security;
alter table public.prescription_items enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_self_read on public.profiles for select using (id = auth.uid());
create policy patients_clinical_read on public.patients for select using (public.can_read_clinical_data());
create policy patients_clinical_write on public.patients for all using (public.current_role() in ('owner', 'doctor', 'assistant')) with check (public.current_role() in ('owner', 'doctor', 'assistant'));
create policy appointments_read on public.appointments for select using (public.current_role() is not null);
create policy appointments_write on public.appointments for all using (public.current_role() in ('owner', 'doctor', 'assistant', 'reception')) with check (public.current_role() in ('owner', 'doctor', 'assistant', 'reception'));
create policy encounters_read on public.encounters for select using (public.can_read_clinical_data());
create policy encounters_write on public.encounters for all using (public.current_role() in ('owner', 'doctor')) with check (public.current_role() in ('owner', 'doctor'));
create policy lesions_read on public.lesions for select using (public.can_read_clinical_data());
create policy lesions_write on public.lesions for all using (public.current_role() in ('owner', 'doctor')) with check (public.current_role() in ('owner', 'doctor'));
create policy attachments_read on public.attachments for select using (public.can_read_clinical_data());
create policy attachments_write on public.attachments for all using (public.current_role() in ('owner', 'doctor', 'assistant')) with check (public.current_role() in ('owner', 'doctor', 'assistant'));
create policy prescriptions_read on public.prescriptions for select using (public.current_role() in ('owner', 'doctor', 'assistant'));
create policy prescriptions_write on public.prescriptions for all using (public.current_role() in ('owner', 'doctor')) with check (public.current_role() in ('owner', 'doctor'));
create policy prescription_items_read on public.prescription_items for select using (public.current_role() in ('owner', 'doctor', 'assistant'));
create policy prescription_items_write on public.prescription_items for all using (public.current_role() in ('owner', 'doctor')) with check (public.current_role() in ('owner', 'doctor'));
create policy audit_logs_read on public.audit_logs for select using (public.current_role() = 'owner');

-- Bucket privado sugerido: clinical-files. Criar pelo Dashboard/Storage e aplicar políticas
-- baseadas em auth.uid(), patient_id e profile role; não tornar público.
