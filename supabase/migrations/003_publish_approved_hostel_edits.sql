-- Published owner-approved listing overrides, kept separate from the source hostel JSON.
-- The public directory can read approved changes; only the protected admin RPC can publish them.
create table if not exists public.published_hostel_overrides (
  hostel_id text primary key,
  changes jsonb not null check (jsonb_typeof(changes) = 'object'),
  approved_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.published_hostel_overrides enable row level security;
revoke all on public.published_hostel_overrides from anon, authenticated;
grant select on public.published_hostel_overrides to anon, authenticated;

drop policy if exists "Public can read published hostel overrides" on public.published_hostel_overrides;
create policy "Public can read published hostel overrides"
  on public.published_hostel_overrides for select to anon, authenticated
  using (true);

create or replace function public.admin_publish_hostel_edit_request(
  p_request_id uuid,
  p_admin_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.hostel_edit_requests%rowtype;
  v_changes jsonb;
begin
  if not public.is_portal_admin() then
    raise exception 'Administrator access required';
  end if;

  select * into v_request
  from public.hostel_edit_requests
  where id = p_request_id and status = 'pending'
  for update;

  if not found then
    raise exception 'Pending edit request not found';
  end if;

  if v_request.hostel_id like 'TEST-%' then
    raise exception 'Fictional TEST listings cannot be published';
  end if;

  if not exists (
    select 1 from public.hostel_claims c
    where c.user_id = v_request.user_id
      and c.hostel_id = v_request.hostel_id
      and c.status = 'approved'
  ) then
    raise exception 'An approved claim for this exact listing is required';
  end if;

  -- Copy only the explicitly supported public fields. Never publish owner_notes
  -- or arbitrary client-supplied JSON keys.
  v_changes := jsonb_build_object(
    'hostel_name', case when jsonb_typeof(v_request.proposed_changes->'hostel_name') = 'string'
      then v_request.proposed_changes->'hostel_name' else null end,
    'contact_email', case when jsonb_typeof(v_request.proposed_changes->'contact_email') = 'string'
      then v_request.proposed_changes->'contact_email' else null end,
    'website', case when jsonb_typeof(v_request.proposed_changes->'website') = 'string'
      then v_request.proposed_changes->'website' else null end,
    'photo_urls', case when jsonb_typeof(v_request.proposed_changes->'photo_urls') = 'array'
      then v_request.proposed_changes->'photo_urls' else '[]'::jsonb end,
    'description', case when jsonb_typeof(v_request.proposed_changes->'description') = 'string'
      then v_request.proposed_changes->'description' else null end
  );

  if coalesce(length(btrim(v_changes->>'hostel_name')), 0) = 0 then
    raise exception 'A public hostel name is required';
  end if;

  insert into public.published_hostel_overrides(hostel_id, changes, approved_by, updated_at)
  values (v_request.hostel_id, v_changes, auth.uid(), now())
  on conflict (hostel_id) do update
    set changes = excluded.changes,
        approved_by = excluded.approved_by,
        updated_at = excluded.updated_at;

  update public.hostel_edit_requests
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      admin_notes = p_admin_notes
  where id = v_request.id and status = 'pending';
end;
$$;

revoke all on function public.admin_publish_hostel_edit_request(uuid, text) from public, anon;
grant execute on function public.admin_publish_hostel_edit_request(uuid, text) to authenticated;
