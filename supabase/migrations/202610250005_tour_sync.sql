begin;
create table public.travel_tour_source (
 content_id text primary key,
 modified_time text not null,
 is_active boolean not null,
 payload_hash text not null,
 payload jsonb not null,
 synced_at timestamptz not null default now()
);
create table public.travel_tour_sync_state (
 id integer primary key check(id=1),
 run_id uuid,
 lease_until timestamptz,
 started_at timestamptz,
 last_success_started_at timestamptz,
 last_completed_at timestamptz,
 since_day text,
 next_page integer not null default 1,
 page_size integer not null default 1000,
 total_count integer not null default 0,
 processed_count integer not null default 0,
 changed_count integer not null default 0,
 status text not null default 'idle',
 last_error text
);
insert into public.travel_tour_sync_state(id) values(1);
alter table public.travel_tour_source enable row level security;
alter table public.travel_tour_sync_state enable row level security;
revoke all on public.travel_tour_source,public.travel_tour_sync_state from public,anon,authenticated;
grant select,insert,update on public.travel_tour_source,public.travel_tour_sync_state to service_role;

create or replace function public.travel_tour_region(p jsonb) returns text language sql immutable set search_path='' as $$
 select coalesce(case p->>'lDongRegnCd'
 when '12' then case when coalesce(p->>'addr1','')~'^전남광주통합특별시[ ]+(동구|서구|남구|북구|광산구)( |$)' then '광주' else '전남' end when '11' then '서울' when '26' then '부산' when '27' then '대구' when '28' then '인천' when '29' then '광주' when '30' then '대전' when '31' then '울산' when '36' then '세종' when '41' then '경기' when '42' then '강원' when '51' then '강원' when '43' then '충북' when '44' then '충남' when '45' then '전북' when '52' then '전북' when '46' then '전남' when '47' then '경북' when '48' then '경남' when '49' then '제주' when '50' then '제주' end,
 case p->>'areacode' when '1' then '서울' when '2' then '인천' when '3' then '대전' when '4' then '대구' when '5' then '광주' when '6' then '부산' when '7' then '울산' when '8' then '세종' when '31' then '경기' when '32' then '강원' when '33' then '충북' when '34' then '충남' when '35' then '경북' when '36' then '경남' when '37' then '전북' when '38' then '전남' when '39' then '제주' end);
$$;
revoke all on function public.travel_tour_region(jsonb) from public,anon,authenticated;
grant execute on function public.travel_tour_region(jsonb) to service_role;

create function public.travel_start_tour_sync(p_run uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.travel_tour_sync_state;
begin
 select * into s from public.travel_tour_sync_state where id=1 for update;
 if s.lease_until>now() then return null; end if;
 if s.status='idle' then
   update public.travel_tour_sync_state set started_at=now(),since_day=case when last_success_started_at is null then null else to_char((last_success_started_at at time zone 'Asia/Seoul')-interval '1 day','YYYYMMDD') end,
     next_page=1,total_count=0,processed_count=0,changed_count=0 where id=1;
 end if;
 update public.travel_tour_sync_state set run_id=p_run,lease_until=now()+interval '10 minutes',status='running',last_error=null where id=1 returning * into s;
 return to_jsonb(s);
end $$;

create function public.travel_apply_tour_page(p_run uuid,p_page integer,p_total integer,p_rows jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.travel_tour_sync_state; changed_n integer;
begin
 select * into s from public.travel_tour_sync_state where id=1 for update;
 if s.run_id is distinct from p_run or s.status<>'running' then raise exception 'SYNC_LEASE_LOST';end if;
 if p_page<s.next_page then return to_jsonb(s);end if;
 if p_page<>s.next_page or jsonb_typeof(p_rows)<>'array' then raise exception 'SYNC_PAGE_ORDER';end if;
 if exists(select 1 from jsonb_array_elements(p_rows) r where coalesce(r->>'contentid','')!~'^[0-9]+$' or coalesce(r->>'showflag','') not in ('0','1')) then raise exception 'SYNC_INVALID_ROW';end if;

 with incoming as (select distinct on (r->>'contentid') r from jsonb_array_elements(p_rows) r),
 changed as (
  insert into public.travel_tour_source(content_id,modified_time,is_active,payload_hash,payload)
  select r->>'contentid',coalesce(r->>'modifiedtime',''),r->>'showflag'='1',md5(r::text),r from incoming
  on conflict(content_id) do update set modified_time=excluded.modified_time,is_active=excluded.is_active,payload_hash=excluded.payload_hash,payload=excluded.payload,synced_at=now()
  where travel_tour_source.payload_hash is distinct from excluded.payload_hash
  returning *
 ), normalized as (
  select c.*,left(coalesce(payload->>'title',''),200) name,
   left(concat_ws(' ',nullif(payload->>'addr1',''),nullif(payload->>'addr2','')),300) address,
   public.travel_tour_region(payload) region,
   case when coalesce(payload->>'mapy','')~'^-?[0-9]+(\.[0-9]+)?$' and (payload->>'mapy')::numeric between -90 and 90 then nullif((payload->>'mapy')::double precision,0) end lat,
   case when coalesce(payload->>'mapx','')~'^-?[0-9]+(\.[0-9]+)?$' and (payload->>'mapx')::numeric between -180 and 180 then nullif((payload->>'mapx')::double precision,0) end lng
  from changed c
 ), places as (
  insert into public.comm_place(ext_key,name,address,region,lat,lng)
  select 'tourapi:'||content_id,name,address,region,lat,lng from normalized
  where length(btrim(name))>0 and (is_active or exists(select 1 from public.comm_place p where p.ext_key='tourapi:'||content_id))
  on conflict(ext_key) do update set name=excluded.name,address=excluded.address,region=excluded.region,lat=excluded.lat,lng=excluded.lng
  returning place_id,ext_key
 ), details as (
  insert into public.comm_place_tour_detail(place_id,content_id,payload,synced_at)
  select p.place_id,n.content_id,jsonb_build_object('source','tourapi','contentId',n.content_id,'contentTypeId',n.payload->>'contenttypeid','sourceModifiedTime',n.modified_time,
   'isActive',n.is_active,'summaryOnly',true,'name',n.name,'address',n.address,'region',n.region,'lat',n.lat,'lng',n.lng,'overview','',
   'category',case n.payload->>'contenttypeid' when '12' then '관광지' when '14' then '문화시설' when '15' then '축제·공연' when '25' then '여행코스' when '28' then '레포츠' when '32' then '숙박' when '38' then '쇼핑' when '39' then '음식점' else '기타' end,
   'phone',coalesce(n.payload->>'tel',''),'images',case when n.payload->>'cpyrhtDivCd' in ('Type1','Type3') and coalesce(n.payload->>'firstimage','')<>'' then jsonb_build_array(replace(n.payload->>'firstimage','http://tong.visitkorea.or.kr/','https://tong.visitkorea.or.kr/')) else '[]'::jsonb end,'imageSource','한국관광공사 TourAPI'),now()
  from normalized n join places p on p.ext_key='tourapi:'||n.content_id
  on conflict(place_id) do update set payload=case when comm_place_tour_detail.payload->>'source'='tourapi' and coalesce((comm_place_tour_detail.payload->>'summaryOnly')::boolean,false)=false
    then comm_place_tour_detail.payload||jsonb_build_object('isActive',excluded.payload->'isActive','sourceModifiedTime',excluded.payload->>'sourceModifiedTime','detailStale',coalesce(comm_place_tour_detail.payload->>'sourceModifiedTime','')<>excluded.payload->>'sourceModifiedTime')
    else excluded.payload end,synced_at=now()
  returning place_id
 ) select count(*)::integer into changed_n from changed;

 update public.travel_tour_sync_state set next_page=p_page+1,total_count=p_total,processed_count=processed_count+jsonb_array_length(p_rows),changed_count=changed_count+changed_n,
  lease_until=now()+interval '10 minutes' where id=1;
 if p_page*s.page_size>=p_total or jsonb_array_length(p_rows)=0 then
  update public.travel_tour_sync_state set status='idle',lease_until=null,last_success_started_at=started_at,last_completed_at=now(),next_page=1 where id=1;
 end if;
 select * into s from public.travel_tour_sync_state where id=1;
 return to_jsonb(s);
end $$;

create function public.travel_stop_tour_sync(p_run uuid,p_error text) returns void language sql security invoker set search_path='' as $$
 update public.travel_tour_sync_state set status='paused',lease_until=null,last_error=left(p_error,300) where id=1 and run_id=p_run and status='running';
$$;
revoke all on function public.travel_start_tour_sync(uuid),public.travel_apply_tour_page(uuid,integer,integer,jsonb),public.travel_stop_tour_sync(uuid,text) from public,anon,authenticated;
grant execute on function public.travel_start_tour_sync(uuid),public.travel_apply_tour_page(uuid,integer,integer,jsonb),public.travel_stop_tour_sync(uuid,text) to service_role;

create view public.travel_saved_tour_catalog with(security_invoker=true) as
select p.place_id,p.name,p.address,p.region,p.lat,p.lng,p.ext_key,concat_ws(' ',p.name,p.region,p.address,d.payload->>'category') search_text,
 jsonb_build_object('source','tourapi','contentId',d.content_id,'contentTypeId',d.payload->>'contentTypeId','category',d.payload->>'category',
  'overview',left(coalesce(d.payload->>'overview',''),180),'images',case when jsonb_typeof(d.payload->'images')='array' and jsonb_array_length(d.payload->'images')>0 then jsonb_build_array(d.payload->'images'->0) else '[]'::jsonb end) detail
from public.comm_place p join public.comm_place_tour_detail d using(place_id)
where p.ext_key like 'tourapi:%' and d.payload->>'source'='tourapi' and coalesce(d.payload->>'isActive','true')<>'false';
grant select on public.travel_saved_tour_catalog to anon,authenticated,service_role;
create function public.travel_tour_catalog_counts() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('total',coalesce(sum(n),0),'regions',coalesce(jsonb_object_agg(region,n),'{}'::jsonb))
 from (select coalesce(region,'지역 미지정') region,count(*) n from public.travel_saved_tour_catalog where detail->>'contentTypeId'='12' group by coalesce(region,'지역 미지정')) x;
$$;
revoke all on function public.travel_tour_catalog_counts() from public;
grant execute on function public.travel_tour_catalog_counts() to anon,authenticated,service_role;
commit;
