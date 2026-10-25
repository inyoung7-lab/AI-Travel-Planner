begin;
create table public.travel_site_activity (
 event_key text primary key,
 kind text not null check(kind in ('search','result','view')),
 place_key text,
 place jsonb,
 occurred_at timestamptz not null default now(),
 check ((kind='search' and place_key is null) or (kind in ('result','view') and place_key is not null and place is not null))
);
create index travel_site_activity_time on public.travel_site_activity(occurred_at);
alter table public.travel_site_activity enable row level security;
revoke all on public.travel_site_activity from public,anon,authenticated;
grant select,insert on public.travel_site_activity to service_role;
-- Import only real, already-recorded searches. No sample counts or browser identifiers.
insert into public.travel_site_activity(event_key,kind,occurred_at)
select 'legacy-search:'||search_id,'search',searched_at from public.travel_search_log;
commit;
