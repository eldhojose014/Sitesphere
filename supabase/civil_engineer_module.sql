-- =====================================================================
-- SiteSphere - Civil Engineer module (Building Plans)
-- Run this once in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Safe to re-run.
-- =====================================================================

-- 1) TABLE ------------------------------------------------------------
create table if not exists public.building_plans (
  plan_id        bigint generated always as identity primary key,
  plan_title     text        not null,
  plan_type      text        not null default 'Architectural',
  floor_level    text,
  revision       text        not null default 'R0',
  status         text        not null default 'Draft'
                 check (status in ('Draft', 'Under Review', 'Approved', 'Superseded')),
  description    text,
  storage_path   text        not null,
  original_name  text,
  mime_type      text,
  size_bytes     bigint,
  uploaded_by    uuid        default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- project_id must have the same type as projects.project_id, whatever it is.
do $$
declare
  project_id_type text;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'building_plans'
      and column_name = 'project_id'
  ) then
    select format_type(a.atttypid, a.atttypmod)
      into project_id_type
      from pg_attribute a
     where a.attrelid = 'public.projects'::regclass
       and a.attname = 'project_id'
       and not a.attisdropped;

    execute format(
      'alter table public.building_plans
         add column project_id %s not null
         references public.projects(project_id) on delete cascade',
      project_id_type
    );
  end if;
end $$;

create index if not exists building_plans_project_idx on public.building_plans (project_id);
create index if not exists building_plans_status_idx  on public.building_plans (status);

-- 2) HELPER: role of the logged-in user ------------------------------
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users
  where user_id = auth.uid() and status = 'Active'
  limit 1;
$$;

grant execute on function public.current_user_role() to authenticated;

-- 3) ROW LEVEL SECURITY ----------------------------------------------
alter table public.building_plans enable row level security;

drop policy if exists "plans_select" on public.building_plans;
create policy "plans_select" on public.building_plans
  for select to authenticated
  using (
    public.current_user_role() in ('Civil Engineer', 'Contractor/Administrator')
    or (public.current_user_role() = 'Site Supervisor' and status = 'Approved')
  );

drop policy if exists "plans_insert" on public.building_plans;
create policy "plans_insert" on public.building_plans
  for insert to authenticated
  with check (public.current_user_role() in ('Civil Engineer', 'Contractor/Administrator'));

drop policy if exists "plans_update" on public.building_plans;
create policy "plans_update" on public.building_plans
  for update to authenticated
  using (public.current_user_role() in ('Civil Engineer', 'Contractor/Administrator'))
  with check (public.current_user_role() in ('Civil Engineer', 'Contractor/Administrator'));

drop policy if exists "plans_delete" on public.building_plans;
create policy "plans_delete" on public.building_plans
  for delete to authenticated
  using (public.current_user_role() in ('Civil Engineer', 'Contractor/Administrator'));

-- Civil Engineers need to read the project list (to pick a project / show names).
drop policy if exists "projects_select_civil_engineer" on public.projects;
create policy "projects_select_civil_engineer" on public.projects
  for select to authenticated
  using (public.current_user_role() = 'Civil Engineer');

-- 4) STORAGE BUCKET (private) ----------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('building-plans', 'building-plans', false, 26214400)  -- 25 MB
on conflict (id) do update set file_size_limit = excluded.file_size_limit, public = false;

drop policy if exists "plans_files_select" on storage.objects;
create policy "plans_files_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'building-plans'
    and (
      public.current_user_role() in ('Civil Engineer', 'Contractor/Administrator')
      or (
        public.current_user_role() = 'Site Supervisor'
        and exists (
          select 1 from public.building_plans bp
          where bp.storage_path = storage.objects.name and bp.status = 'Approved'
        )
      )
    )
  );

drop policy if exists "plans_files_insert" on storage.objects;
create policy "plans_files_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'building-plans'
    and public.current_user_role() in ('Civil Engineer', 'Contractor/Administrator')
  );

drop policy if exists "plans_files_update" on storage.objects;
create policy "plans_files_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'building-plans'
    and public.current_user_role() in ('Civil Engineer', 'Contractor/Administrator')
  );

drop policy if exists "plans_files_delete" on storage.objects;
create policy "plans_files_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'building-plans'
    and public.current_user_role() in ('Civil Engineer', 'Contractor/Administrator')
  );
