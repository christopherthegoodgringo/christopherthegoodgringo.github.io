-- Require an approved claim before an owner can submit listing changes.
-- Run this migration in the Supabase SQL Editor for the portal to enforce the rule.
drop policy if exists "Users can submit own hostel edit requests" on public.hostel_edit_requests;
create policy "Users can submit own hostel edit requests"
  on public.hostel_edit_requests for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null
    and admin_notes is null
    and exists (
      select 1
      from public.hostel_claims c
      where c.user_id = (select auth.uid())
        and c.hostel_id = hostel_edit_requests.hostel_id
        and c.status = 'approved'
    )
  );
