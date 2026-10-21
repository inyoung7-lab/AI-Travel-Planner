-- Clean public-facing copy for language-friends sessions already published
-- by 20261020_language_friends_publish.applied.sql.
begin;

do $preflight$
begin
  if (select count(*) from public.lc_experiences
      where experience_id in (113, 114, 115) and status = 'PUBLISHED' and not is_demo) <> 3
    or (select count(*) from public.lc_sessions
      where (session_id, experience_id, status) in (
        (17, 113, 'RECRUITING'), (18, 114, 'RECRUITING'), (19, 115, 'RECRUITING')
      )) <> 3 then
    raise exception 'The three public language-friends records changed; no copy was updated';
  end if;
end;
$preflight$;

update public.lc_experiences
set inclusions = case experience_id
  when 113 then array['호스트 진행 안내', '개인 산책 표현 카드 1장']
  when 114 then array['호스트 진행 안내', '개인 언어 비교 카드 1장']
  when 115 then array['호스트 진행 안내', '개인 한·일 문화 표현 카드 1장']
end
where experience_id in (113, 114, 115);

update public.lc_experience_steps
set description = case
      when experience_id = 114 and step_order = 2 then '별칭과 오늘 나누고 싶은 인사 표현을 고릅니다.'
      when experience_id = 115 and step_order = 5 then '한국어와 일본어로 문화 감상 표현을 개인 카드에 기록합니다.'
      else description
    end,
    translations = case
      when experience_id = 114 and step_order = 2 then translations || jsonb_build_object(
        'en', translations->'en' || jsonb_build_object('description', 'Choose a nickname and a greeting expression to share today.'),
        'ja', translations->'ja' || jsonb_build_object('description', 'ニックネームと今日共有したい挨拶表現を選びます。'))
      when experience_id = 115 and step_order = 5 then translations || jsonb_build_object(
        'en', translations->'en' || jsonb_build_object('description', 'Write an expression about the cultural scene in Korean and Japanese on a personal card.'),
        'ja', translations->'ja' || jsonb_build_object('description', '文化的な風景について、韓国語と日本語の表現を個人用カードに記録します。'))
      else translations
    end
where (experience_id, step_order) in ((114, 2), (115, 5));

update public.lc_places
set directions = case place_id
  when 17 then '서울숲 방문자센터 건물 외부에서 만납니다.'
  when 18 then '부산시민공원 방문자센터 건물 외부에서 만납니다.'
end
where (place_id, directions) in (
  (17, '방문자센터 바깥 집결. 정확한 출입구와 현장 동선은 운영 전 확인합니다.'),
  (18, '방문자센터 외부 집결. 정확한 출입구와 현장 동선은 운영 전 확인합니다.')
);

do $verify$
begin
  if (select count(*) from public.lc_experiences
      where experience_id in (113, 114, 115)
        and inclusions[1] = '호스트 진행 안내'
        and inclusions[1] not like '%시연%') <> 3 then
    raise exception 'Public inclusion copy verification failed';
  end if;
  if (select count(*) from public.lc_experience_steps
      where (experience_id, step_order, description) in (
        (114, 2, '별칭과 오늘 나누고 싶은 인사 표현을 고릅니다.'),
        (115, 5, '한국어와 일본어로 문화 감상 표현을 개인 카드에 기록합니다.')
      )) <> 2 then
    raise exception 'Public itinerary copy verification failed';
  end if;
end;
$verify$;

commit;
