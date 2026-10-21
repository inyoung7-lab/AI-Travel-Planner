-- Keep generated-image disclosure without the obsolete demo wording.
begin;

do $preflight$
begin
  if (select count(*) from public.lc_experiences
      where experience_id in (113, 114, 115) and status = 'PUBLISHED' and not is_demo) <> 3 then
    raise exception 'Expected the three published language-friends experiences';
  end if;
end;
$preflight$;

update public.lc_experiences
set hero_image_alt = case experience_id
  when 113 then '서울숲 산책길에서 대화를 나누는 참가자들의 AI 생성 이미지'
  when 114 then '부산시민공원 산책로에서 이야기를 나누는 참가자들의 AI 생성 이미지'
  when 115 then '창동 도심의 좁은 예술 골목을 걷는 참가자들의 AI 생성 이미지'
end,
updated_at = now()
where experience_id in (113, 114, 115);

commit;
