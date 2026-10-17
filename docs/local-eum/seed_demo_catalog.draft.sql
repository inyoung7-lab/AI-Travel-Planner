-- GENERATED from docs/local-eum/demo-catalog.json by scripts/local-eum/prepare-demo-seed.mjs
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
[
  {
    "code": "DEMO-01",
    "reuse_experience_id": 102,
    "expected_title": "성수동 공방 체험",
    "template_id": 102,
    "title": "성수동 공방 체험",
    "region_code": "SEOUL",
    "place_name": "성수 수제화 희망플랫폼",
    "road_address": "서울특별시 성동구 아차산로 53",
    "source_url": "https://www.sd.go.kr/main/contents.do?key=1734",
    "date": "2026-11-15",
    "time": "11:00",
    "duration_min": 120,
    "fee_amount": 18000,
    "capacity": 6,
    "description": "성수동 수제화 거리를 살펴보는 개발 시연 코스입니다.",
    "detail_description": "수제화 거리 탐방과 가죽 소품 체험 예시를 연결한 시연용 일정입니다. 성수 수제화 희망플랫폼의 실제 주소를 사용하지만, 시설과 협의된 상품이 아닙니다. 공방 내부 활동과 결과물 제작은 협의 전 시연 내용이며 제공을 보장하지 않습니다.",
    "steps": [
      {
        "elapsed_min": 0,
        "duration_min": 15,
        "title": "집결",
        "description": "시연 설정: 지정 시설 앞에서 일정 안내를 확인합니다. 세부 집결 지점은 현장 협의 전입니다.",
        "step_order": 1
      },
      {
        "elapsed_min": 15,
        "duration_min": 25,
        "title": "수제화 거리 탐방",
        "description": "시연 설정: 수제화 거리의 상점과 골목을 살펴보는 시간입니다.",
        "step_order": 2
      },
      {
        "elapsed_min": 40,
        "duration_min": 60,
        "title": "가죽 소품 체험 예시",
        "description": "시설 협의 전 시연 활동입니다. 실제 공방 입장이나 재료 제공을 보장하지 않습니다.",
        "step_order": 3
      },
      {
        "elapsed_min": 100,
        "duration_min": 20,
        "title": "결과물 정리",
        "description": "시연 설정: 체험 예시를 정리하고 마무리합니다.",
        "step_order": 4
      }
    ],
    "precautions": [
      "모든 일정·참가비·정원·제공사항은 개발 시연 설정이며 실제 예약 및 시설과의 운영 협약을 뜻하지 않습니다.",
      "공방 내부 활동은 협의 전 시연 내용입니다.",
      "재료·도구·결과물 제공 여부는 확정되지 않았습니다."
    ],
    "inclusions": [
      "시연 설정: 코스 안내와 일정표 예시"
    ],
    "preparation_items": [
      "시연 권장 준비물: 편한 신발",
      "시연 권장 준비물: 개인 물과 계절에 맞는 옷"
    ]
  },
  {
    "code": "DEMO-02",
    "template_id": 102,
    "title": "북촌 전통공예 체험",
    "region_code": "SEOUL",
    "place_name": "북촌전통공예체험관",
    "road_address": "서울특별시 종로구 북촌로12길 24-5",
    "source_url": "https://www.jongno.go.kr/mayor/bbs/selectBoardArticle.do?bbsId=BBSMSTR_000000001618&menuId=388338&menuNo=388338&nttId=250534",
    "date": "2026-11-07",
    "time": "13:00",
    "duration_min": 90,
    "fee_amount": 22000,
    "capacity": 6,
    "description": "북촌의 전통공예를 주제로 구성한 시연용 코스입니다.",
    "detail_description": "실제 체험관 주소를 배경으로 전통공예 소개와 한지 공예 예시를 살펴보도록 구성했습니다. 시설에서 운영하는 공식 프로그램과 별개의 개발 시연이며, 입장·강사·재료 제공은 협의되지 않았습니다.",
    "step_titles": [
      "집결",
      "북촌 전통공예 소개",
      "한지 공예 체험 예시",
      "마무리"
    ],
    "precautions": [
      "모든 일정·참가비·정원·제공사항은 개발 시연 설정이며 실제 예약 및 시설과의 운영 협약을 뜻하지 않습니다.",
      "시설의 공식 운영 프로그램과 별개의 시연용 코스입니다.",
      "공예 체험과 재료 제공은 시설 협의 전입니다."
    ],
    "steps": [
      {
        "elapsed_min": 0,
        "duration_min": 15,
        "title": "집결",
        "description": "시연 설정: 집결 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 1
      },
      {
        "elapsed_min": 15,
        "duration_min": 15,
        "title": "북촌 전통공예 소개",
        "description": "시연 설정: 북촌 전통공예 소개 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 2
      },
      {
        "elapsed_min": 30,
        "duration_min": 45,
        "title": "한지 공예 체험 예시",
        "description": "시연 설정: 한지 공예 체험 예시 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 3
      },
      {
        "elapsed_min": 75,
        "duration_min": 15,
        "title": "마무리",
        "description": "시연 설정: 마무리 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 4
      }
    ],
    "inclusions": [
      "시연 설정: 코스 안내와 일정표 예시"
    ],
    "preparation_items": [
      "시연 권장 준비물: 편한 신발",
      "시연 권장 준비물: 개인 물과 계절에 맞는 옷"
    ]
  },
  {
    "code": "DEMO-03",
    "template_id": 101,
    "title": "통인시장 서촌 맛 탐방",
    "region_code": "SEOUL",
    "place_name": "통인시장",
    "road_address": "서울특별시 종로구 자하문로15길 18",
    "source_url": "https://korean.visitseoul.net/attractions/통인시장/KOP000281",
    "date": "2026-11-08",
    "time": "11:00",
    "duration_min": 90,
    "fee_amount": 17000,
    "capacity": 8,
    "description": "서촌 시장 골목과 음식 문화를 살펴보는 시연 일정입니다.",
    "detail_description": "통인시장의 실제 주소를 활용해 시장의 역사와 음식 탐방을 연결한 시연용 산책입니다. 상인회나 개별 점포와 협의된 상품이 아니며, 음식·엽전·시식이 포함된 실제 예약 상품이 아닙니다.",
    "step_titles": [
      "집결",
      "시장의 역사",
      "시장 음식 탐방",
      "마무리"
    ],
    "precautions": [
      "모든 일정·참가비·정원·제공사항은 개발 시연 설정이며 실제 예약 및 시설과의 운영 협약을 뜻하지 않습니다.",
      "음식 구입비와 시식 제공 여부는 시연 참가비에 포함된 것으로 보장하지 않습니다.",
      "개별 점포의 영업 여부는 별도 확인이 필요합니다."
    ],
    "steps": [
      {
        "elapsed_min": 0,
        "duration_min": 15,
        "title": "집결",
        "description": "시연 설정: 집결 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 1
      },
      {
        "elapsed_min": 15,
        "duration_min": 15,
        "title": "시장의 역사",
        "description": "시연 설정: 시장의 역사 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 2
      },
      {
        "elapsed_min": 30,
        "duration_min": 45,
        "title": "시장 음식 탐방",
        "description": "시연 설정: 시장 음식 탐방 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 3
      },
      {
        "elapsed_min": 75,
        "duration_min": 15,
        "title": "마무리",
        "description": "시연 설정: 마무리 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 4
      }
    ],
    "inclusions": [
      "시연 설정: 코스 안내와 일정표 예시"
    ],
    "preparation_items": [
      "시연 권장 준비물: 편한 신발",
      "시연 권장 준비물: 개인 물과 계절에 맞는 옷"
    ]
  },
  {
    "code": "DEMO-04",
    "reuse_experience_id": 101,
    "expected_title": "전통시장 함께 걷기",
    "template_id": 101,
    "title": "광장시장 음식문화 산책",
    "region_code": "SEOUL",
    "place_name": "광장시장",
    "road_address": "서울특별시 종로구 창경궁로 88",
    "source_url": "https://korean.visitseoul.net/editorspicks/도심속에%20숨어있는%20우리의%20전통,%20서울%20전통시장%20투어_/32649",
    "date": "2026-11-14",
    "time": "11:00",
    "duration_min": 90,
    "fee_amount": 18000,
    "capacity": 8,
    "description": "광장시장의 음식 문화를 관찰하는 개발 시연 산책입니다.",
    "detail_description": "기존 시장 체험을 보강한 공통 상세정보 예시입니다. 실제 시장 주소를 사용하고, 전통시장 소개와 음식문화 관찰을 시연 일정으로 구성했습니다. 기존 운영 회차 1·2번의 시간과 참가비는 보존하며 이 일정은 별도 시연 회차입니다.",
    "step_titles": [
      "집결",
      "전통시장 소개",
      "음식문화 관찰",
      "마무리"
    ],
    "precautions": [
      "모든 일정·참가비·정원·제공사항은 개발 시연 설정이며 실제 예약 및 시설과의 운영 협약을 뜻하지 않습니다.",
      "음식 구매·시식·점포 방문은 확정된 제공 사항이 아닙니다.",
      "상인과 방문객의 통행을 방해하지 않는 시연 동선을 가정합니다."
    ],
    "steps": [
      {
        "elapsed_min": 0,
        "duration_min": 15,
        "title": "집결",
        "description": "시연 설정: 집결 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 1
      },
      {
        "elapsed_min": 15,
        "duration_min": 15,
        "title": "전통시장 소개",
        "description": "시연 설정: 전통시장 소개 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 2
      },
      {
        "elapsed_min": 30,
        "duration_min": 45,
        "title": "음식문화 관찰",
        "description": "시연 설정: 음식문화 관찰 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 3
      },
      {
        "elapsed_min": 75,
        "duration_min": 15,
        "title": "마무리",
        "description": "시연 설정: 마무리 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 4
      }
    ],
    "inclusions": [
      "시연 설정: 코스 안내와 일정표 예시"
    ],
    "preparation_items": [
      "시연 권장 준비물: 편한 신발",
      "시연 권장 준비물: 개인 물과 계절에 맞는 옷"
    ]
  },
  {
    "code": "DEMO-05",
    "template_id": 101,
    "title": "망원시장 동네밥상 탐방",
    "region_code": "SEOUL",
    "place_name": "망원시장",
    "road_address": "서울특별시 마포구 포은로6길 27",
    "source_url": "https://stage-kr.visitseoul.net/shopping/망원시장/KOP037950",
    "date": "2026-11-21",
    "time": "11:00",
    "duration_min": 90,
    "fee_amount": 16000,
    "capacity": 8,
    "description": "동네 시장 골목과 먹거리 이야기를 연결한 시연 코스입니다.",
    "detail_description": "망원시장의 실제 주소에서 시작하는 동네밥상 탐방 예시입니다. 시장 골목을 살피고 먹거리 이야기를 나누는 시연 구성이며, 실제 음식 제공이나 제휴 점포 방문을 보장하지 않습니다.",
    "step_titles": [
      "집결",
      "시장 골목 탐방",
      "지역 먹거리 이야기",
      "마무리"
    ],
    "precautions": [
      "모든 일정·참가비·정원·제공사항은 개발 시연 설정이며 실제 예약 및 시설과의 운영 협약을 뜻하지 않습니다.",
      "개별 음식값은 확정 제공 사항이 아닙니다.",
      "개별 점포의 영업시간과 방문 동선은 협의 전입니다."
    ],
    "steps": [
      {
        "elapsed_min": 0,
        "duration_min": 15,
        "title": "집결",
        "description": "시연 설정: 집결 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 1
      },
      {
        "elapsed_min": 15,
        "duration_min": 15,
        "title": "시장 골목 탐방",
        "description": "시연 설정: 시장 골목 탐방 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 2
      },
      {
        "elapsed_min": 30,
        "duration_min": 45,
        "title": "지역 먹거리 이야기",
        "description": "시연 설정: 지역 먹거리 이야기 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 3
      },
      {
        "elapsed_min": 75,
        "duration_min": 15,
        "title": "마무리",
        "description": "시연 설정: 마무리 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 4
      }
    ],
    "inclusions": [
      "시연 설정: 코스 안내와 일정표 예시"
    ],
    "preparation_items": [
      "시연 권장 준비물: 편한 신발",
      "시연 권장 준비물: 개인 물과 계절에 맞는 옷"
    ]
  },
  {
    "code": "DEMO-06",
    "title": "부산 F1963 문화공간 투어",
    "region_code": "BUSAN",
    "place_name": "F1963",
    "road_address": "부산광역시 수영구 구락로123번길 20",
    "source_url": "https://www.visitbusan.net/archive/dataSearch/view.nm?dataSid=METADATA013878",
    "date": "2026-11-22",
    "time": "13:00",
    "duration_min": 90,
    "fee_amount": 15000,
    "capacity": 8,
    "description": "산업공간과 문화공간을 주제로 구성한 시연 일정입니다.",
    "detail_description": "F1963의 실제 주소를 배경으로 공간의 변화와 문화공간 탐방을 구성한 개발 시연입니다. 공식 도슨트·전시 관람·입장권이 포함된 상품이나 시설과 협약한 투어가 아닙니다.",
    "step_titles": [
      "집결",
      "산업공간의 역사",
      "문화공간 탐방",
      "마무리"
    ],
    "precautions": [
      "모든 일정·참가비·정원·제공사항은 개발 시연 설정이며 실제 예약 및 시설과의 운영 협약을 뜻하지 않습니다.",
      "전시와 개별 시설의 입장료·운영 여부는 확인 전입니다.",
      "공식 해설 프로그램이나 제휴 투어가 아닙니다."
    ],
    "steps": [
      {
        "elapsed_min": 0,
        "duration_min": 15,
        "title": "집결",
        "description": "시연 설정: 집결 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 1
      },
      {
        "elapsed_min": 15,
        "duration_min": 15,
        "title": "산업공간의 역사",
        "description": "시연 설정: 산업공간의 역사 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 2
      },
      {
        "elapsed_min": 30,
        "duration_min": 45,
        "title": "문화공간 탐방",
        "description": "시연 설정: 문화공간 탐방 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 3
      },
      {
        "elapsed_min": 75,
        "duration_min": 15,
        "title": "마무리",
        "description": "시연 설정: 마무리 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 4
      }
    ],
    "inclusions": [
      "시연 설정: 코스 안내와 일정표 예시"
    ],
    "preparation_items": [
      "시연 권장 준비물: 편한 신발",
      "시연 권장 준비물: 개인 물과 계절에 맞는 옷"
    ]
  },
  {
    "code": "DEMO-07",
    "title": "감천문화마을 골목 여행",
    "region_code": "BUSAN",
    "place_name": "감천문화마을 안내센터",
    "road_address": "부산광역시 사하구 감내2로 203",
    "source_url": "https://www.gamcheon.or.kr/gamcheon/page/user/intro4",
    "date": "2026-11-28",
    "time": "10:00",
    "duration_min": 120,
    "fee_amount": 18000,
    "capacity": 8,
    "description": "마을의 골목과 예술을 살펴보는 시연용 여행입니다.",
    "detail_description": "감천문화마을 안내센터의 실제 주소를 집결 기준으로 삼은 시연 코스입니다. 마을 역사 소개·골목 예술 관찰·전망 포인트를 예시로 구성했습니다. 실제 해설사 배정이나 시설 예약과 연결되지 않습니다.",
    "steps": [
      {
        "elapsed_min": 0,
        "duration_min": 15,
        "title": "집결",
        "description": "시연 설정: 안내센터 주소를 기준으로 모입니다. 세부 집결 지점은 확정 전입니다.",
        "step_order": 1
      },
      {
        "elapsed_min": 15,
        "duration_min": 25,
        "title": "마을 역사 소개",
        "description": "시연용 이야기 순서입니다. 공식 해설 프로그램과는 별개입니다.",
        "step_order": 2
      },
      {
        "elapsed_min": 40,
        "duration_min": 65,
        "title": "골목 예술 탐방",
        "description": "시연 설정: 주민 생활공간을 존중하며 골목의 예술을 관찰합니다.",
        "step_order": 3
      },
      {
        "elapsed_min": 105,
        "duration_min": 15,
        "title": "전망 포인트 및 마무리",
        "description": "전망 관찰과 마무리를 가정한 시연 일정입니다. 구체적 포인트는 협의 전입니다.",
        "step_order": 4
      }
    ],
    "precautions": [
      "모든 일정·참가비·정원·제공사항은 개발 시연 설정이며 실제 예약 및 시설과의 운영 협약을 뜻하지 않습니다.",
      "주민 생활공간에서는 촬영 동의를 구하고 소음을 줄여야 합니다.",
      "출입 제한·방문 시간 등 실제 마을 운영 안내를 별도로 확인해야 합니다."
    ],
    "inclusions": [
      "시연 설정: 코스 안내와 일정표 예시"
    ],
    "preparation_items": [
      "시연 권장 준비물: 편한 신발",
      "시연 권장 준비물: 개인 물과 계절에 맞는 옷"
    ]
  },
  {
    "code": "DEMO-08",
    "title": "마산 창동예술촌 아트워크",
    "region_code": "CHANGWON",
    "place_name": "창동예술촌아트센터",
    "road_address": "경상남도 창원시 마산합포구 오동서6길 24",
    "source_url": "https://www.changwon.go.kr/tour/index.do?menuCode=001_003000000000&tourProgramNo=207",
    "date": "2026-11-29",
    "time": "13:00",
    "duration_min": 90,
    "fee_amount": 16000,
    "capacity": 6,
    "description": "창동예술촌의 골목을 살피는 시연용 아트워크입니다.",
    "detail_description": "창동예술촌아트센터의 실제 주소를 기준으로 예술촌 소개와 골목 산책을 연결한 개발 시연입니다. 전시 관람·작가 면담·공방 체험은 확정 제공 사항이 아닙니다.",
    "step_titles": [
      "집결",
      "창동예술촌 소개",
      "예술 골목 산책",
      "마무리"
    ],
    "precautions": [
      "모든 일정·참가비·정원·제공사항은 개발 시연 설정이며 실제 예약 및 시설과의 운영 협약을 뜻하지 않습니다.",
      "작품 촬영과 실내 출입은 실제 시설 안내에 따라야 합니다.",
      "작가 방문이나 전시 입장이 보장된 상품이 아닙니다."
    ],
    "steps": [
      {
        "elapsed_min": 0,
        "duration_min": 15,
        "title": "집결",
        "description": "시연 설정: 집결 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 1
      },
      {
        "elapsed_min": 15,
        "duration_min": 15,
        "title": "창동예술촌 소개",
        "description": "시연 설정: 창동예술촌 소개 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 2
      },
      {
        "elapsed_min": 30,
        "duration_min": 45,
        "title": "예술 골목 산책",
        "description": "시연 설정: 예술 골목 산책 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 3
      },
      {
        "elapsed_min": 75,
        "duration_min": 15,
        "title": "마무리",
        "description": "시연 설정: 마무리 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 4
      }
    ],
    "inclusions": [
      "시연 설정: 코스 안내와 일정표 예시"
    ],
    "preparation_items": [
      "시연 권장 준비물: 편한 신발",
      "시연 권장 준비물: 개인 물과 계절에 맞는 옷"
    ]
  },
  {
    "code": "DEMO-09",
    "title": "진해해양공원 바다 이야기",
    "region_code": "CHANGWON",
    "place_name": "진해해양공원",
    "road_address": "경상남도 창원시 진해구 명동로 62",
    "source_url": "https://www.cwsisul.or.kr/_jhmapark/_sub04/sub04_01.html",
    "date": "2026-12-05",
    "time": "13:00",
    "duration_min": 90,
    "fee_amount": 15000,
    "capacity": 10,
    "description": "해양공원의 문화와 경관을 관찰하는 시연 일정입니다.",
    "detail_description": "진해해양공원의 실제 주소에서 시작해 해양문화와 경관 관찰을 연결한 시연 코스입니다. 개별 시설 입장료와 운영 여부는 확인 전이며, 시연 참가비가 실제 시설 이용권을 뜻하지 않습니다.",
    "step_titles": [
      "집결",
      "해양공원 소개",
      "해양문화·경관 관찰",
      "마무리"
    ],
    "precautions": [
      "모든 일정·참가비·정원·제공사항은 개발 시연 설정이며 실제 예약 및 시설과의 운영 협약을 뜻하지 않습니다.",
      "개별 시설 입장료와 운영 여부는 확인 전입니다.",
      "전망 시설·전시관의 입장권은 제공하지 않는 시연 설정입니다."
    ],
    "steps": [
      {
        "elapsed_min": 0,
        "duration_min": 15,
        "title": "집결",
        "description": "시연 설정: 집결 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 1
      },
      {
        "elapsed_min": 15,
        "duration_min": 15,
        "title": "해양공원 소개",
        "description": "시연 설정: 해양공원 소개 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 2
      },
      {
        "elapsed_min": 30,
        "duration_min": 45,
        "title": "해양문화·경관 관찰",
        "description": "시연 설정: 해양문화·경관 관찰 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 3
      },
      {
        "elapsed_min": 75,
        "duration_min": 15,
        "title": "마무리",
        "description": "시연 설정: 마무리 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 4
      }
    ],
    "inclusions": [
      "시연 설정: 코스 안내와 일정표 예시"
    ],
    "preparation_items": [
      "시연 권장 준비물: 편한 신발",
      "시연 권장 준비물: 개인 물과 계절에 맞는 옷"
    ]
  },
  {
    "code": "DEMO-10",
    "title": "경화역 철길 사진 산책",
    "region_code": "CHANGWON",
    "place_name": "경화역공원 주차장",
    "road_address": "경상남도 창원시 진해구 진해대로 665",
    "source_url": "https://korean.visitkorea.or.kr/detail/rem_detail.do?cotid=ff9311bf-04e5-4fb5-8a1a-0b57b184d3c2",
    "venue": {
      "place_name": "경화역공원",
      "road_address": "경상남도 창원시 진해구 진해대로 649",
      "source_url": "https://japanese.visitkorea.or.kr/svc/contents/contentsView.do?vcontsId=84311"
    },
    "date": "2026-12-06",
    "time": "14:00",
    "duration_min": 90,
    "fee_amount": 12000,
    "capacity": 10,
    "description": "겨울 철길의 풍경을 관찰하는 시연용 사진 산책입니다.",
    "detail_description": "경화역공원 주차장 주소를 시연 집결 기준으로 하고 공원 철길 주변 사진 산책을 구성했습니다. 12월 겨울 일정으로 벚꽃 개화를 안내하지 않습니다. 실제 진행자 배정·촬영 수업·시설 운영 협약은 없습니다.",
    "step_titles": [
      "집결",
      "옛 철길 이야기",
      "사진 산책",
      "마무리"
    ],
    "precautions": [
      "모든 일정·참가비·정원·제공사항은 개발 시연 설정이며 실제 예약 및 시설과의 운영 협약을 뜻하지 않습니다.",
      "겨울 시연 일정이므로 벚꽃이 피는 시기로 안내하지 않습니다.",
      "안전하게 개방된 산책 공간만 이용하며 실제 시설 안내를 따라야 합니다."
    ],
    "steps": [
      {
        "elapsed_min": 0,
        "duration_min": 15,
        "title": "집결",
        "description": "시연 설정: 집결 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 1
      },
      {
        "elapsed_min": 15,
        "duration_min": 15,
        "title": "옛 철길 이야기",
        "description": "시연 설정: 옛 철길 이야기 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 2
      },
      {
        "elapsed_min": 30,
        "duration_min": 45,
        "title": "사진 산책",
        "description": "시연 설정: 사진 산책 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 3
      },
      {
        "elapsed_min": 75,
        "duration_min": 15,
        "title": "마무리",
        "description": "시연 설정: 마무리 순서입니다. 실제 시설의 공식 운영 프로그램과는 별개입니다.",
        "step_order": 4
      }
    ],
    "inclusions": [
      "시연 설정: 코스 안내와 일정표 예시"
    ],
    "preparation_items": [
      "시연 권장 준비물: 편한 신발",
      "시연 권장 준비물: 개인 물과 계절에 맞는 옷"
    ]
  }
]
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
