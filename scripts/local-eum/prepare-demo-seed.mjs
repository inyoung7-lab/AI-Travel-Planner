import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const source = JSON.parse(await readFile(resolve(root, 'docs/local-eum/demo-catalog.json'), 'utf8'));
const expectedCodes = Array.from({ length: 10 }, (_, i) => `DEMO-${String(i + 1).padStart(2, '0')}`);
if (JSON.stringify(source.experiences.map(item => item.code)) !== JSON.stringify(expectedCodes)) throw new Error('Expected exactly DEMO-01 through DEMO-10');

const entries = source.experiences.map(item => {
  const steps = item.steps ?? item.step_titles.map((title, index) => ({
    elapsed_min: [0, 15, 30, 75][index], duration_min: [15, 15, 45, 15][index], title,
    description: `시연 설정: ${title} 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.`,
  }));
  if (steps.length !== 4 || steps.some((step, i) => step.elapsed_min !== (i === 0 ? 0 : steps[i - 1].elapsed_min + steps[i - 1].duration_min))
    || steps[3].elapsed_min + steps[3].duration_min !== item.duration_min) throw new Error(`Invalid timeline: ${item.code}`);
  if (!['SEOUL', 'BUSAN', 'CHANGWON'].includes(item.region_code) || item.fee_amount < 0 || item.capacity < 1) throw new Error(`Invalid demo: ${item.code}`);
  return {
    ...item, steps: steps.map((step, i) => ({ ...step, step_order: i + 1 })),
    inclusions: ['시연 설정: 코스 안내와 일정표 예시'],
    preparation_items: ['시연 권장 준비물: 편한 신발', '시연 권장 준비물: 개인 물과 계절에 맞는 옷'],
    precautions: [source.notice, ...item.precautions],
  };
});
const json = JSON.stringify(entries, null, 2);
if (json.includes('$catalog$')) throw new Error('Unsafe SQL dollar quote delimiter');
const sql = `-- GENERATED from docs/local-eum/demo-catalog.json by scripts/local-eum/prepare-demo-seed.mjs
-- 승인 대기 / local-eum-dev / rhkaxmqdkztpbljkunxb
-- 선행: experience_details_places, demo_catalog 마이그레이션.
-- 기존 HOST 500, 체험 101/102 재사용. 체험 101 제목의 첫 변경은 승인 내용에 포함.
-- 기존 회차는 모두 보존하고 별도 시연 회차 10개를 추가. 회차 1·2 전체 행 보존 검사.
-- 좌표는 입력하지 않음. 재실행 시 이미 등록된 DEMO는 건드리지 않음.
begin;
set local lock_timeout = '5s';
lock table public.lc_experiences, public.lc_sessions, public.lc_places,
  public.lc_program_templates in share row exclusive mode;

do $seed$
declare
  item jsonb;
  place jsonb;
  experience_key bigint;
  meeting_key bigint;
  venue_key bigint;
  sequence_row record;
  sequence_name text;
  last_sequence_value bigint;
  last_row_id bigint;
  template_key bigint;
  culture_template_key bigint;
  preserved_sessions jsonb;
  current_experience public.lc_experiences;
begin
  if not exists (
    select 1 from public.lc_hosts h join public.lc_user_roles r on r.user_id = h.auth_user_id
    where h.host_id = 500 and h.approval_status = 'APPROVED' and h.is_public and r.role = 'HOST'
  ) then
    raise exception 'Expected approved public test HOST 500 with HOST role; stop and inspect';
  end if;
  select jsonb_agg(to_jsonb(s) order by s.session_id) into preserved_sessions
  from public.lc_sessions s where s.session_id in (1,2,3,4);
  if jsonb_array_length(coalesce(preserved_sessions, '[]'::jsonb)) <> 4 then
    raise exception 'Expected existing sessions 1 through 4; stop and inspect';
  end if;

  -- 기존 수동 ID 삽입으로 identity가 뒤처져 있어도 기존 PK와 충돌하지 않도록 전진만 시킨다.
  -- sequence 번호는 트랜잭션 롤백 후에도 건너뛸 수 있지만 기존 행은 변경하지 않는다.
  for sequence_row in select * from (values
    ('lc_experiences','experience_id'), ('lc_sessions','session_id'),
    ('lc_places','place_id'), ('lc_program_templates','template_id')
  ) as sequences(table_name,column_name) loop
    sequence_name := pg_get_serial_sequence('public.'||sequence_row.table_name,sequence_row.column_name);
    execute format('select last_value from %s',sequence_name) into last_sequence_value;
    execute format('select coalesce(max(%I),0) from public.%I',sequence_row.column_name,sequence_row.table_name) into last_row_id;
    if last_row_id >= last_sequence_value then
      perform setval(sequence_name::regclass,last_row_id,true);
    end if;
  end loop;

  select template_id into culture_template_key from public.lc_program_templates
    where seed_code = 'LE-DEMO-CULTURE';
  if culture_template_key is null then
    insert into public.lc_program_templates(title,description,duration_min,default_fee_amount,is_active,seed_code)
    values ('로컬이음 지역문화 탐방','개발 시연용 지역문화 코스 원형. 실제 예약 불가.',90,0,true,'LE-DEMO-CULTURE')
    returning template_id into culture_template_key;
  end if;

  for item in select value from jsonb_array_elements($catalog$
${json}
$catalog$::jsonb) loop
    select * into current_experience from public.lc_experiences where demo_code = item->>'code';
    if found then
      if current_experience.host_id <> 500 then
        raise exception 'Demo code belongs to a different HOST: %', item->>'code';
      end if;
      continue; -- HOST가 수정한 제목/일정/금액/장소를 재시드로 덮어쓰지 않는다.
    end if;

    experience_key := null;
    if item ? 'reuse_experience_id' then
      select * into current_experience from public.lc_experiences
        where experience_id = (item->>'reuse_experience_id')::bigint;
      if not found or current_experience.host_id <> 500
        or current_experience.title <> item->>'expected_title'
        or current_experience.demo_code is not null
        or current_experience.detail_description is not null
        or current_experience.venue_place_id is not null
        or cardinality(current_experience.inclusions) > 0
        or cardinality(current_experience.preparation_items) > 0
        or cardinality(current_experience.precautions) > 0
        or current_experience.hero_image_url is not null
        or exists (select 1 from public.lc_experience_steps s where s.experience_id=current_experience.experience_id) then
        raise exception 'Existing experience has unexpected or edited details; inspect before enriching: %', item->>'code';
      end if;
      experience_key := current_experience.experience_id;
    end if;

    insert into public.lc_places(owner_host_id,place_name,road_address,directions,map_provider,
      source_reference,is_confirmed,seed_code)
    values (500,item->>'place_name',item->>'road_address',
      '주소 기준 시연 집결 장소입니다. 세부 집결 지점과 실제 방문 가능 여부는 확정 전입니다.',
      'KAKAO',item->>'source_url',true,'LE-'||(item->>'code')||'-MEETING')
    returning place_id into meeting_key;
    venue_key := meeting_key;
    if item ? 'venue' then
      place := item->'venue';
      insert into public.lc_places(owner_host_id,place_name,road_address,directions,map_provider,
        source_reference,is_confirmed,seed_code)
      values (500,place->>'place_name',place->>'road_address',
        '집결 장소와 구분한 실제 시설 주소입니다. 상세 이동 동선은 확정 전입니다.',
        'KAKAO',place->>'source_url',true,'LE-'||(item->>'code')||'-VENUE')
      returning place_id into venue_key;
    end if;

    template_key := coalesce((item->>'template_id')::bigint,culture_template_key);
    if not exists (select 1 from public.lc_program_templates where template_id=template_key and is_active) then
      raise exception 'Expected active program template is missing';
    end if;
    if experience_key is null then
      insert into public.lc_experiences(host_id,template_id,title,description,region_code,status)
      values (500,template_key,item->>'title',item->>'description',item->>'region_code','PUBLISHED')
      returning experience_id into experience_key;
    end if;
    -- 첫 승인 시 체험 공통 상세만 보강. 기존 짧은 소개와 기존 회차 값은 유지한다.
    update public.lc_experiences set
      title = item->>'title', detail_description = item->>'detail_description',
      region_code = item->>'region_code', venue_place_id = venue_key,
      inclusions = array(select jsonb_array_elements_text(item->'inclusions')),
      preparation_items = array(select jsonb_array_elements_text(item->'preparation_items')),
      precautions = array(select jsonb_array_elements_text(item->'precautions')),
      is_demo = true, demo_code = item->>'code'
    where experience_id=experience_key;

    insert into public.lc_experience_steps(experience_id,step_order,elapsed_min,duration_min,title,description)
    select experience_key,s.step_order,s.elapsed_min,s.duration_min,s.title,s.description
    from jsonb_to_recordset(item->'steps') as s(
      step_order smallint,elapsed_min integer,duration_min integer,title text,description text);

    insert into public.lc_sessions(experience_id,starts_at,ends_at,meeting_place,recruit_deadline,
      min_people,capacity,fee_amount,status,meeting_place_id,seed_code)
    values (experience_key,
      ((item->>'date')||'T'||(item->>'time')||':00+09:00')::timestamptz,
      ((item->>'date')||'T'||(item->>'time')||':00+09:00')::timestamptz
        + make_interval(mins=>(item->>'duration_min')::integer),
      item->>'place_name',null,2,(item->>'capacity')::integer,(item->>'fee_amount')::integer,
      'RECRUITING',meeting_key,'LE-'||(item->>'code')||'-SESSION');
  end loop;

  if preserved_sessions is distinct from (
    select jsonb_agg(to_jsonb(s) order by s.session_id) from public.lc_sessions s where s.session_id in (1,2,3,4)
  ) then
    raise exception 'Protected sessions changed; entire seed is rolled back';
  end if;
  if (select count(*) from public.lc_experiences where demo_code ~ '^DEMO-(0[1-9]|10)$') <> 10 then
    raise exception 'Expected exactly 10 demo experience codes';
  end if;
end;
$seed$;
commit;

select e.demo_code,e.experience_id,e.title,s.session_id,s.starts_at,s.fee_amount,s.capacity
from public.lc_experiences e join public.lc_sessions s on s.experience_id=e.experience_id
where s.seed_code='LE-'||e.demo_code||'-SESSION'
order by e.demo_code;
`;
const destination = resolve(root, 'docs/local-eum/seed_demo_catalog.draft.sql');
await writeFile(destination, sql, 'utf8');
const migrationPaths = ['20261016_experience_details_places.draft.sql','20261016_demo_catalog.draft.sql'];
const migrations = await Promise.all(migrationPaths.map(path => readFile(resolve(root,'docs/local-eum/migrations',path),'utf8')));
const combined = [...migrations,sql].map(text => text.replace(/^(?:begin|commit);[ \t]*\r?$/gmi,''));
await writeFile(resolve(root,'docs/local-eum/apply_demo_catalog.review.sql'),
  `-- 승인 검토용 통합 SQL / local-eum-dev / rhkaxmqdkztpbljkunxb\n-- 실행 전 프로젝트 이름·ID를 확인하고 명시 승인을 받을 것.\n-- 전체 확장과 시드를 한 트랜잭션으로 실행. 기존 회차 1·2·3·4 보존.\nbegin;\n${combined.join('\n\n')}\ncommit;\n`,'utf8');
console.log(`Prepared ${entries.length} demo experiences, ${entries.reduce((n,x)=>n+x.steps.length,0)} steps; no database requests.`);
