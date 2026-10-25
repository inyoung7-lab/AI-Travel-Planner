begin;
create or replace function public.travel_tour_region(p jsonb) returns text language sql immutable set search_path='' as $$
 select coalesce(case p->>'lDongRegnCd'
 when '12' then case when coalesce(p->>'addr1','')~'^전남광주통합특별시[ ]+(동구|서구|남구|북구|광산구)( |$)' then '광주' else '전남' end when '11' then '서울' when '26' then '부산' when '27' then '대구' when '28' then '인천' when '29' then '광주' when '30' then '대전' when '31' then '울산' when '36' then '세종' when '41' then '경기' when '42' then '강원' when '51' then '강원' when '43' then '충북' when '44' then '충남' when '45' then '전북' when '52' then '전북' when '46' then '전남' when '47' then '경북' when '48' then '경남' when '49' then '제주' when '50' then '제주' end,
 case p->>'areacode' when '1' then '서울' when '2' then '인천' when '3' then '대전' when '4' then '대구' when '5' then '광주' when '6' then '부산' when '7' then '울산' when '8' then '세종' when '31' then '경기' when '32' then '강원' when '33' then '충북' when '34' then '충남' when '35' then '경북' when '36' then '경남' when '37' then '전북' when '38' then '전남' when '39' then '제주' end);
$$;
revoke all on function public.travel_tour_region(jsonb) from public,anon,authenticated;
grant execute on function public.travel_tour_region(jsonb) to service_role;
create or replace function public.travel_apply_tour_page(p_run uuid,p_page integer,p_total integer,p_rows jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
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

update public.comm_place p set region=public.travel_tour_region(s.payload)
from public.travel_tour_source s where p.ext_key='tourapi:'||s.content_id and p.region is distinct from public.travel_tour_region(s.payload);
update public.comm_place_tour_detail d set payload=d.payload||jsonb_build_object('region',p.region)
from public.comm_place p where d.place_id=p.place_id and p.ext_key like 'tourapi:%' and d.payload->>'region' is distinct from p.region;

commit;
