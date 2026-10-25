begin;
create or replace view public.travel_saved_tour_catalog with(security_invoker=true) as
select p.place_id,p.name,p.address,p.region,p.lat,p.lng,p.ext_key,concat_ws(' ',p.name,p.region,p.address,d.payload->>'category') search_text,
 jsonb_build_object('source','tourapi','contentId',d.content_id,'contentTypeId',d.payload->>'contentTypeId','category',d.payload->>'category',
  'overview',left(coalesce(d.payload->>'overview',''),180),'images',case when jsonb_typeof(d.payload->'images')='array' and jsonb_array_length(d.payload->'images')>0 then jsonb_build_array(d.payload->'images'->0) else '[]'::jsonb end) detail
from public.comm_place p join public.comm_place_tour_detail d using(place_id)
where p.ext_key like 'tourapi:%' and d.payload->>'source'='tourapi' and coalesce(d.payload->>'isActive','true')<>'false';
grant select on public.travel_saved_tour_catalog to anon,authenticated,service_role;
commit;
