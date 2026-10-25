begin;
alter table public.travel_search_log add column legacy_source_id text unique;
create table public.travel_itineraries (
 user_id uuid not null references auth.users(id) on delete cascade,
 client_id varchar(120) not null,
 payload jsonb not null,
 is_current boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(user_id,client_id),
 constraint travel_itinerary_payload check(coalesce(jsonb_typeof(payload)='object' and jsonb_typeof(payload->'days')='array' and jsonb_array_length(payload->'days') between 1 and 5,false) and octet_length(payload::text)<=262144),
 constraint travel_itinerary_client_id check(length(btrim(client_id)) between 1 and 120)
);
create unique index travel_one_current_itinerary on public.travel_itineraries(user_id) where is_current;
create index travel_itineraries_updated on public.travel_itineraries(user_id,updated_at desc);
alter table public.travel_itineraries enable row level security;
revoke all on public.travel_itineraries from anon,authenticated;
grant select,insert,update,delete on public.travel_itineraries to authenticated;
grant all on public.travel_itineraries to service_role;
create policy itinerary_owner on public.travel_itineraries for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create function public.travel_save_itinerary(p_client_id text,p_payload jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_payload jsonb;begin
 if auth.uid() is null then raise insufficient_privilege;end if;
 perform pg_advisory_xact_lock(hashtextextended('itineraries:'||auth.uid()::text,0));
 update public.travel_itineraries set is_current=false where user_id=auth.uid() and is_current;
 v_payload:=p_payload||jsonb_build_object('savedId',p_client_id,'savedAt',now());
 insert into public.travel_itineraries(user_id,client_id,payload,is_current) values(auth.uid(),p_client_id,v_payload,true)
 on conflict(user_id,client_id) do update set payload=excluded.payload,is_current=true,updated_at=now();
 return v_payload;end $$;
create function public.travel_open_itinerary(p_client_id text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_payload jsonb;begin
 if auth.uid() is null then raise insufficient_privilege;end if;
 perform pg_advisory_xact_lock(hashtextextended('itineraries:'||auth.uid()::text,0));
 select payload into v_payload from public.travel_itineraries where user_id=auth.uid() and client_id=p_client_id;
 if not found then raise no_data_found;end if;
 update public.travel_itineraries set is_current=false where user_id=auth.uid() and is_current;
 update public.travel_itineraries set is_current=true where user_id=auth.uid() and client_id=p_client_id;
 return v_payload;end $$;
create function public.travel_import_itineraries(p_entries jsonb,p_current text) returns integer language plpgsql security invoker set search_path='' as $$
declare v_count integer;begin
 if auth.uid() is null then raise insufficient_privilege;end if;
 if jsonb_typeof(p_entries)<>'array' or jsonb_array_length(p_entries)>200 then raise check_violation;end if;
 perform pg_advisory_xact_lock(hashtextextended('itineraries:'||auth.uid()::text,0));
 insert into public.travel_itineraries(user_id,client_id,payload)
 select auth.uid(),entry->>'savedId',entry from jsonb_array_elements(p_entries) entry
 on conflict(user_id,client_id) do nothing;
 get diagnostics v_count=row_count;
 if not exists(select 1 from public.travel_itineraries where user_id=auth.uid() and is_current) then
 update public.travel_itineraries set is_current=true where user_id=auth.uid() and client_id=coalesce(p_current,(p_entries->0)->>'savedId');end if;
 return v_count;end $$;
revoke all on function public.travel_save_itinerary(text,jsonb),public.travel_open_itinerary(text),public.travel_import_itineraries(jsonb,text) from public,anon;
grant execute on function public.travel_save_itinerary(text,jsonb),public.travel_open_itinerary(text),public.travel_import_itineraries(jsonb,text) to authenticated;
commit;
