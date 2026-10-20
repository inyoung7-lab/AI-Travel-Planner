-- Applied to local-eum-dev on 2026-10-20 after review; retained as the reviewed source.
-- Draft English/Japanese translations for the 18 itinerary steps
-- belonging to Local Eum language-friends experiences 113, 114, and 115.
-- Target project: local-eum-dev (rhkaxmqdkztpbljkunxb)
-- Re-running is blocked by the existing-translation guard. All added translations remain review_status DRAFT.
-- It does not change experience/session status or available_languages.

begin;
set local lock_timeout = '5s';

do $$
declare
  changed integer;
begin
  if (select count(*) from public.lc_experiences
      where experience_id in (113, 114, 115) and host_id = 500 and status = 'DRAFT') <> 3 then
    raise exception 'Expected draft experiences 113-115 owned by host 500; abort';
  end if;

  if (select count(*) from public.lc_sessions
      where experience_id in (113, 114, 115) and status = 'DRAFT') <> 3 then
    raise exception 'Expected one draft session for each experience 113-115; abort';
  end if;

  if (select count(*) from public.lc_experience_steps
      where experience_id in (113, 114, 115)) <> 18 then
    raise exception 'Expected exactly 18 itinerary steps for experiences 113-115; abort';
  end if;

  if (select array_agg(step_id order by experience_id, step_order)
      from public.lc_experience_steps where experience_id in (113, 114, 115))
      is distinct from array[67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84]::bigint[] then
    raise exception 'Itinerary step IDs changed; review target rows before applying';
  end if;

  if (select count(*) from public.lc_experience_steps
      where experience_id in (113, 114, 115)
        and (coalesce(translations, '{}'::jsonb) ? 'en'
          or coalesce(translations, '{}'::jsonb) ? 'ja')) <> 0 then
    raise exception 'Some target itinerary translations already exist; review rows before applying';
  end if;

  with payload(experience_id, step_order, source_title, en_title, en_description, ja_title, ja_description) as (
    values
      (113,1,'첫 인사와 안전 안내','Introductions and safety briefing','The host explains the walking route, pedestrian safety, photography, and privacy guidelines.','自己紹介と安全案内','ホストが散策ルート、歩行時の安全、写真撮影、個人情報の取り扱いについて説明します。'),
      (113,2,'이름과 취향 카드','Names and interest cards','Choose an interest card; participants may use a nickname and share which languages feel comfortable for conversation.','名前と好みのカード','好みのカードを選びます。名前の代わりにニックネームを使い、会話しやすい言語を共有できます。'),
      (113,3,'서울숲 관찰 산책','A Seoul Forest observation walk','Walk along public paths, choose a tree, resting place, or sound to notice, and describe it in a language you know.','ソウルの森を観察する散歩','公共の遊歩道を歩き、木々、休憩場所、音の中から一つ選んで、知っている言語で説明します。'),
      (113,4,'짝 바꾸기와 여행 질문','Partner switch and travel questions','Change partners once. Ask what each person most wants to do while traveling and try rephrasing the answer.','ペアを替えて旅の質問','一度ペアを替え、旅先で一番やってみたいことを尋ね、答えを別の表現で言い換えてみます。'),
      (113,5,'오늘 배운 말 정리','Review phrases learned today','Write three memorable phrases on a personal card. Do not write contact details or other personal information on it.','今日覚えた表現のまとめ','印象に残った表現を三つ、個人用カードに書きます。連絡先などの個人情報は記入しません。'),
      (113,6,'단체 마무리','Group wrap-up','Share one sentence about the walk and finish at the designated public path.','全員で振り返り','散歩の感想を一言ずつ共有し、指定された公共の遊歩道で解散します。'),
      (114,1,'첫 인사와 안전 안내','Introductions and safety briefing','The host explains the park walking route, safety rules, and respectful conversation about regional expressions.','自己紹介と安全案内','ホストが公園内の散策ルート、安全ルール、地域表現を尊重する会話について説明します。'),
      (114,2,'이름과 오늘의 표현','Names and an expression for today','Choose a nickname and a greeting you would like to learn today. The host-led language has not yet been confirmed.','名前と今日の表現','ニックネームと今日覚えたい挨拶を選びます。ホストが実際に案内できる言語はまだ確認されていません。'),
      (114,3,'시민공원 관찰 산책','A Busan Citizens Park observation walk','On public paths, notice a sign, resting place, or tree and describe what you see using a familiar expression.','釜山市民公園を観察する散歩','公共の遊歩道で案内標識、休憩場所、木々を観察し、見つけたものを慣れた表現で説明します。'),
      (114,4,'표현 세 가지 비교','Compare three expressions','Compare standard Korean, Busan expressions, and English only when reviewed reference material is available. Do not teach unsupported dialect claims.','三つの表現を比べる','確認済みの資料がある場合に限り、標準語、釜山の表現、英語表現を比べます。根拠のない方言表現は教えません。'),
      (114,5,'나만의 비교 카드','A personal comparison card','Write each expression, its meaning, and a suitable context on a personal card. Mark anything that still needs checking.','自分だけの比較カード','表現、意味、使う場面を個人用カードに記入し、確認が必要な内容には印を付けます。'),
      (114,6,'단체 마무리','Group wrap-up','Share one expression you learned and finish on a public path in the park.','全員で振り返り','新しく知った表現を一つ共有し、公園の公共遊歩道で解散します。'),
      (115,1,'첫 인사와 안전 안내','Introductions and safety briefing','The host explains the narrow-alley walking route, safety guidance, and permission rules for photographing artwork or people.','自己紹介と安全案内','ホストが細い路地の歩き方、安全上の注意、作品や人物を撮影する際の許可について説明します。'),
      (115,2,'이름과 문화 취향 카드','Names and culture-interest cards','Choose a nickname and a color, sound, or place you like, then share which languages feel comfortable for conversation.','名前と文化の好みカード','ニックネームと好きな色、音、場所を選び、会話しやすい言語を共有します。'),
      (115,3,'창동 골목 관찰 산책','A walk observing Changdong alleys','From public pedestrian areas, observe street colors, signs, and building walls. Do not enter galleries or workshops.','昌洞の路地を観察する散歩','公共の歩行エリアから街の色、案内表示、建物の壁を観察します。ギャラリーや工房には入りません。'),
      (115,4,'한·일 감상 표현 나누기','Share impressions in Korean and Japanese','Describe a scene in words you know and look together for a way to express the impression in the other language.','韓国語と日本語で感想を共有','知っている表現で街の一場面を描写し、その印象を相手の言語で表す方法を一緒に探します。'),
      (115,5,'문화 표현 카드','Culture-expression card','Write a pair of Korean and Japanese expressions about the scene on a personal card. The translations are unreviewed host drafts.','文化表現カード','街の印象を表す韓国語と日本語の表現を一組、個人用カードに記録します。翻訳はホスト確認前の草案です。'),
      (115,6,'단체 마무리','Group wrap-up','Share one expression you want to remember and finish in the designated public pedestrian area.','全員で振り返り','覚えておきたい表現を一つ共有し、指定された公共の歩行エリアで解散します。')
  ), updated as (
    update public.lc_experience_steps s
       set translations = jsonb_set(
         jsonb_set(coalesce(s.translations, '{}'::jsonb), '{en}',
           jsonb_build_object('title', p.en_title, 'description', p.en_description, 'review_status', 'DRAFT'), true),
         '{ja}', jsonb_build_object('title', p.ja_title, 'description', p.ja_description, 'review_status', 'DRAFT'), true)
      from payload p
     where s.experience_id = p.experience_id
       and s.step_order = p.step_order
       and s.title = p.source_title
       and not (coalesce(s.translations, '{}'::jsonb) ?| array['en', 'ja'])
     returning s.step_id
  )
  select count(*) into changed from updated;

  if changed <> 18 then
    raise exception 'Expected to add 18 draft itinerary translations, updated %; abort', changed;
  end if;

  if (select count(*) from public.lc_experience_steps
      where experience_id in (113, 114, 115)
        and translations->'en'->>'review_status' = 'DRAFT'
        and translations->'ja'->>'review_status' = 'DRAFT') <> 18 then
    raise exception 'Post-check failed: all 18 rows must remain draft translations';
  end if;
end $$;

commit;
