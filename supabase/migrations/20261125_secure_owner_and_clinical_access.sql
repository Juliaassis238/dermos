-- Secure DermOS onboarding and grant the explicitly approved initial owner.
-- Intended only for project uoybeuklmoonyttgrilj after reviewing the target Auth user.

create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles as p
  where p.id = auth.uid()
    and p.active = true
  limit 1;
$$;

create or replace function public.can_read_clinical_data()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_role() in ('owner'::public.app_role, 'doctor'::public.app_role, 'assistant'::public.app_role),
    false
  );
$$;

revoke all on function public.current_role() from public, anon;
revoke all on function public.can_read_clinical_data() from public, anon;
grant execute on function public.current_role() to authenticated;
grant execute on function public.can_read_clinical_data() to authenticated;

-- Profiles can be read by their user; only an owner may manage non-owner staff.
-- No user can create or promote their own profile to owner.
revoke all on table public.profiles from anon, authenticated;
grant select, insert, update on table public.profiles to authenticated;

drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_self_read on public.profiles;
drop policy if exists profiles_owner_read on public.profiles;
drop policy if exists profiles_owner_insert_staff on public.profiles;
drop policy if exists profiles_owner_update_staff on public.profiles;

create policy profiles_self_read
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_owner_read
  on public.profiles for select to authenticated
  using ((select public.current_role()) = 'owner'::public.app_role);

create policy profiles_owner_insert_staff
  on public.profiles for insert to authenticated
  with check (
    (select public.current_role()) = 'owner'::public.app_role
    and role <> 'owner'::public.app_role
    and id <> (select auth.uid())
  );

create policy profiles_owner_update_staff
  on public.profiles for update to authenticated
  using (
    (select public.current_role()) = 'owner'::public.app_role
    and id <> (select auth.uid())
  )
  with check (
    (select public.current_role()) = 'owner'::public.app_role
    and id <> (select auth.uid())
    and role <> 'owner'::public.app_role
  );

-- Replace broad policies with explicit authenticated role scopes.
drop policy if exists patients_clinical_read on public.patients;
drop policy if exists patients_clinical_write on public.patients;
create policy patients_clinical_read
  on public.patients for select to authenticated
  using ((select public.can_read_clinical_data()));
create policy patients_clinical_insert
  on public.patients for insert to authenticated
  with check ((select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role, 'assistant'::public.app_role));
create policy patients_clinical_update
  on public.patients for update to authenticated
  using ((select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role, 'assistant'::public.app_role))
  with check ((select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role, 'assistant'::public.app_role));
-- No DELETE policy: patient removal is an active=false update so history remains intact.

drop policy if exists appointments_read on public.appointments;
drop policy if exists appointments_write on public.appointments;
create policy appointments_read
  on public.appointments for select to authenticated
  using ((select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role, 'assistant'::public.app_role));
create policy appointments_insert
  on public.appointments for insert to authenticated
  with check ((select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role, 'assistant'::public.app_role));
create policy appointments_update
  on public.appointments for update to authenticated
  using ((select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role, 'assistant'::public.app_role))
  with check ((select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role, 'assistant'::public.app_role));
-- Appointment cancellation is a status update; direct DELETE remains unavailable.

drop policy if exists encounters_read on public.encounters;
drop policy if exists encounters_write on public.encounters;
create policy encounters_read
  on public.encounters for select to authenticated
  using ((select public.can_read_clinical_data()));
create policy encounters_insert
  on public.encounters for insert to authenticated
  with check ((select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role));
-- Encounters are append-only through the client; corrections should be addenda.

drop policy if exists lesions_read on public.lesions;
drop policy if exists lesions_write on public.lesions;
create policy lesions_read
  on public.lesions for select to authenticated
  using ((select public.can_read_clinical_data()));
create policy lesions_insert
  on public.lesions for insert to authenticated
  with check ((select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role));

drop policy if exists attachments_read on public.attachments;
drop policy if exists attachments_write on public.attachments;
create policy attachments_read
  on public.attachments for select to authenticated
  using ((select public.can_read_clinical_data()));
create policy attachments_insert
  on public.attachments for insert to authenticated
  with check ((select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role, 'assistant'::public.app_role));

drop policy if exists prescriptions_read on public.prescriptions;
drop policy if exists prescriptions_write on public.prescriptions;
create policy prescriptions_read
  on public.prescriptions for select to authenticated
  using ((select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role, 'assistant'::public.app_role));
create policy prescriptions_insert
  on public.prescriptions for insert to authenticated
  with check ((select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role));

drop policy if exists prescription_items_read on public.prescription_items;
drop policy if exists prescription_items_write on public.prescription_items;
create policy prescription_items_read
  on public.prescription_items for select to authenticated
  using ((select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role, 'assistant'::public.app_role));
create policy prescription_items_insert
  on public.prescription_items for insert to authenticated
  with check ((select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role));

drop policy if exists audit_logs_read on public.audit_logs;
create policy audit_logs_read
  on public.audit_logs for select to authenticated
  using ((select public.current_role()) = 'owner'::public.app_role);

-- Keep the bucket private and require a clinical role for file access.
update storage.buckets
set public = false
where id = 'clinical-files';

drop policy if exists clinical_files_select on storage.objects;
drop policy if exists clinical_files_insert on storage.objects;
drop policy if exists clinical_files_update on storage.objects;
drop policy if exists clinical_files_delete on storage.objects;

create policy clinical_files_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'clinical-files'
    and (select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role, 'assistant'::public.app_role)
  );

create policy clinical_files_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'clinical-files'
    and (select public.current_role()) in ('owner'::public.app_role, 'doctor'::public.app_role, 'assistant'::public.app_role)
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
-- No client UPDATE/DELETE policies are created for clinical files.

-- Bootstrap the approved, already-confirmed Auth user without hard-coding a generated UUID.
do $$
declare
  owner_user_id uuid;
begin
  select u.id
    into owner_user_id
  from auth.users as u
  where lower(u.email) = lower('marianam_gil@hotmail.com')
    and u.email_confirmed_at is not null
  limit 1;

  if owner_user_id is null then
    raise exception 'Confirmed Auth user marianam_gil@hotmail.com was not found; no owner profile was created.';
  end if;

  insert into public.profiles (id, full_name, role, active)
  values (owner_user_id, 'Mariana Gil', 'owner'::public.app_role, true)
  on conflict (id) do update
    set full_name = excluded.full_name,
        role = 'owner'::public.app_role,
        active = true,
        updated_at = now();

  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (
    owner_user_id,
    'initial_owner_provisioned',
    'profile',
    owner_user_id,
    jsonb_build_object('role', 'owner', 'provisioning', 'explicit user confirmation')
  );
end;
$$;
