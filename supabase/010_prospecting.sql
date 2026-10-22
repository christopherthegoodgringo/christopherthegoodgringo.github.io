-- Christopher The Good Gringo: Prospecting tab in the admin page.
-- prospects: one row per business the admin is reaching out to (WhatsApp, email, language, status, notes).
-- prospect_templates: the editable WhatsApp and email messages (Spanish and English).
-- Admins only (public.is_portal_admin()). Safe to run more than once.

create table if not exists public.prospects (
  listing_type text not null check (listing_type in ('hotels','hostels','restaurants','bars','street-food')),
  listing_id text not null check (char_length(listing_id) <= 200),
  listing_name text check (char_length(listing_name) <= 200),
  whatsapp text check (char_length(whatsapp) <= 40),
  email text check (char_length(email) <= 200),
  language text not null default 'es' check (language in ('es','en')),
  status text not null default 'new' check (status in ('new','whatsapped','emailed','both','replied','claimed','not_interested')),
  notes text check (char_length(notes) <= 2000),
  last_contacted_at timestamptz,
  contact_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (listing_type, listing_id)
);
alter table public.prospects enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'prospects' and policyname = 'admins manage prospects') then
    create policy "admins manage prospects" on public.prospects for all to authenticated
      using (public.is_portal_admin()) with check (public.is_portal_admin());
  end if;
end $$;

create table if not exists public.prospect_templates (
  id text primary key check (id in ('whatsapp_es','whatsapp_en','email_es','email_en')),
  subject text check (char_length(subject) <= 300),
  body text not null check (char_length(body) <= 4000),
  updated_at timestamptz not null default now()
);
alter table public.prospect_templates enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'prospect_templates' and policyname = 'admins manage templates') then
    create policy "admins manage templates" on public.prospect_templates for all to authenticated
      using (public.is_portal_admin()) with check (public.is_portal_admin());
  end if;
end $$;
-- Placeholders the admin page fills in: {name} {city} {finder} {finder_label} {claim} {plans}
