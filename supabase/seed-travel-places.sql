-- Existing public sample places; preserves the IDs referenced by the UI.
begin;
insert into public.comm_place(place_id,name,address,region,ext_key) values
(1,'제주 애월','제주특별자치도 제주시 애월읍','제주','sample:1'),
(2,'제주 협재해변','제주특별자치도 제주시 한림읍 협재리','제주','sample:2'),
(3,'여수 해양케이블카','전남 여수시 돌산읍 돌산로','전남','sample:3'),
(4,'여수 오동도','전남 여수시 수정동 오동도','전남','sample:4'),
(5,'순천만 국가정원','전남 순천시 국가정원1호길','전남','sample:5'),
(6,'순천 낙안읍성','전남 순천시 낙안면','전남','sample:6'),
(7,'부산 흰여울문화마을','부산 영도구 흰여울길','부산','sample:7'),
(8,'서울 성수동','서울 성동구 성수동','서울','sample:8')
on conflict do nothing;
commit;
