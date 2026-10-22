-- Christopher The Good Gringo: ebook store.
-- Buyers pay with a Stripe Payment Link (one per ebook, metadata ebook=<id>). Stripe's checkout.session.completed
-- reaches the stripe-webhook function, which records the order here and asks the ebook-delivery function to email
-- the download link. The download page (/ebook-download.html?session_id=...) asks ebook-delivery for short-lived
-- signed links to the English and Spanish PDFs kept in the private "ebooks" storage bucket.
-- Safe to run more than once.

create table if not exists public.ebooks (
  id text primary key,
  title text not null,
  title_es text,
  price_cents integer not null default 999,
  payment_link_id text,
  payment_link_url text,
  file_en text,            -- path inside the private "ebooks" bucket, e.g. colombia-on-a-budget/en.pdf
  file_es text,
  active boolean not null default false,
  sort integer not null default 0
);
alter table public.ebooks enable row level security;
drop policy if exists "anyone reads active ebooks" on public.ebooks;
create policy "anyone reads active ebooks" on public.ebooks for select to anon, authenticated using (active);
drop policy if exists "admins manage ebooks" on public.ebooks;
create policy "admins manage ebooks" on public.ebooks for all to authenticated
  using ((select public.is_portal_admin())) with check ((select public.is_portal_admin()));

create table if not exists public.ebook_orders (
  id bigint generated always as identity primary key,
  session_id text not null unique,
  ebook_id text not null references public.ebooks(id),
  email text,
  amount_cents integer not null default 0,
  currency text not null default 'usd',
  language text,
  created_at timestamptz not null default now(),
  emailed_at timestamptz,
  email_error text,
  downloads integer not null default 0,
  last_download_at timestamptz
);
create index if not exists ebook_orders_created on public.ebook_orders (created_at desc);
alter table public.ebook_orders enable row level security;
drop policy if exists "admins read ebook orders" on public.ebook_orders;
create policy "admins read ebook orders" on public.ebook_orders for select to authenticated using ((select public.is_portal_admin()));

insert into storage.buckets (id, name, public) values ('ebooks', 'ebooks', false) on conflict (id) do nothing;
