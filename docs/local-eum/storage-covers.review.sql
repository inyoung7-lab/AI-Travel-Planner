-- LOCAL EUM demo covers — review before running
-- Target project: local-eum-dev / rhkaxmqdkztpbljkunxb
-- No application secret is required by this SQL. Do not run against another project.
-- The Storage objects themselves are uploaded separately through Supabase Dashboard.
-- This script creates no storage.objects write/delete policy. Public bucket means public image reads.

-- STEP A — run this part first to create or safely verify the public bucket.
-- It refuses to change an existing bucket with a different access or file-type configuration.
begin;
do $bucket$
declare
  existing storage.buckets%rowtype;
begin
  select * into existing from storage.buckets where id = 'local-eum-media';
  if found then
    if existing.public is distinct from true
      or existing.file_size_limit is distinct from 400000
      or existing.allowed_mime_types is distinct from array['image/webp']::text[] then
      raise exception 'Bucket local-eum-media already exists with a different configuration; inspect it before continuing';
    end if;
  else
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('local-eum-media', 'local-eum-media', true, 400000, array['image/webp']::text[]);
  end if;
end;
$bucket$;
commit;

-- Upload the ten files under experiences/{experience_id}/cover.webp in Storage.
-- Do not continue until all ten uploads succeed. Check Storage > Policies:
-- there must be no anonymous/authenticated INSERT, UPDATE, or DELETE policy for this bucket.

-- STEP B — only after uploading all objects, update the ten demo rows' image URL and alt text.
-- Existing demo program, session, host, place, schedule, and access columns are untouched.
-- This section is transactional and aborts if a demo row is missing, was changed, or already has an image.
begin;
do $rows$
declare
  demo record;
  changed_count integer;
begin
  for demo in
    select * from (values
      ('DEMO-01', 102), ('DEMO-02', 103), ('DEMO-03', 104), ('DEMO-04', 101),
      ('DEMO-05', 105), ('DEMO-06', 106), ('DEMO-07', 107), ('DEMO-08', 108),
      ('DEMO-09', 109), ('DEMO-10', 110)
    ) as expected(demo_code, experience_id)
  loop
    if not exists (
      select 1 from public.lc_experiences e
      where e.demo_code = demo.demo_code
        and e.experience_id = demo.experience_id
        and e.is_demo is true
        and e.hero_image_url is null
        and e.hero_image_alt is null
    ) then
      raise exception 'Unexpected or missing experience row for % (id %); no rows were updated', demo.demo_code, demo.experience_id;
    end if;
  end loop;

  update public.lc_experiences e
  set hero_image_url = format(
        'https://rhkaxmqdkztpbljkunxb.supabase.co/storage/v1/object/public/local-eum-media/experiences/%s/cover.webp',
        e.experience_id
      ),
      hero_image_alt = 'AI 생성 시연 이미지 · 실제 시설 사진이 아닙니다.'
  where e.is_demo is true
    and e.demo_code in ('DEMO-01','DEMO-02','DEMO-03','DEMO-04','DEMO-05','DEMO-06','DEMO-07','DEMO-08','DEMO-09','DEMO-10')
    and e.hero_image_url is null
    and e.hero_image_alt is null;

  get diagnostics changed_count = row_count;
  if changed_count <> 10 then
    raise exception 'Expected to update 10 image rows, changed %; rolling back', changed_count;
  end if;
end;
$rows$;
commit;

-- Verify after Step B:
-- select demo_code, experience_id, hero_image_url, hero_image_alt
-- from public.lc_experiences
-- where is_demo and demo_code like 'DEMO-%'
-- order by demo_code;
