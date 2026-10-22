-- Social media tab: Shorts made by Claude for Christopher to review.
-- video_url: a finished video Claude made (the publish function uploads it to YouTube from this link).
-- change_request: what Christopher wants different; status 'changes' sends the Short back to Claude.
-- made_by: 'claude' for Shorts Claude made, null for ones Christopher added.
alter table public.social_posts add column if not exists video_url text check (char_length(video_url) <= 1000);
alter table public.social_posts add column if not exists change_request text check (char_length(change_request) <= 2000);
alter table public.social_posts add column if not exists made_by text check (made_by in ('claude'));
alter table public.social_posts add column if not exists version integer not null default 1;
alter table public.social_posts drop constraint if exists social_posts_status_check;
alter table public.social_posts add constraint social_posts_status_check
  check (status in ('idea','draft','review','changes','approved','publishing','scheduled','published','failed'));
select 'ok' as result;
