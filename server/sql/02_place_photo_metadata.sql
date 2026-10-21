-- Applied automatically at API startup. Files stay under public/images/place-preview; Oracle stores their metadata.
CREATE TABLE COMM_PLACE_PHOTO (
  place_id NUMBER(30) PRIMARY KEY REFERENCES COMM_PLACE(place_id),
  photo_path VARCHAR2(300 CHAR) NOT NULL,
  image_source VARCHAR2(500 CHAR) NOT NULL,
  source_url VARCHAR2(1500 CHAR),
  photo_subject VARCHAR2(300 CHAR),
  is_regional NUMBER(1) DEFAULT 0 NOT NULL CHECK (is_regional IN (0, 1)),
  tour_content_id VARCHAR2(30 CHAR),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
)
/
INSERT INTO COMM_PLACE_PHOTO (place_id, photo_path, image_source, source_url, photo_subject, is_regional, tour_content_id)
SELECT 1, '/images/place-preview/aewol-coast.jpg', '지역 대표 이미지 · 한국관광공사 TourAPI', NULL, '애월해안도로', 1, '2791501' FROM dual
WHERE NOT EXISTS (SELECT 1 FROM COMM_PLACE_PHOTO WHERE place_id = 1)
/
INSERT INTO COMM_PLACE_PHOTO (place_id, photo_path, image_source, source_url, photo_subject, is_regional, tour_content_id)
SELECT 3, '/images/place-preview/yeosu-cable-car.png', '한국관광공사 TourAPI · 공공누리 제1유형', 'https://www.visitkorea.or.kr/', '여수 해상케이블카', 0, '1997202' FROM dual
WHERE NOT EXISTS (SELECT 1 FROM COMM_PLACE_PHOTO WHERE place_id = 3)
/
INSERT INTO COMM_PLACE_PHOTO (place_id, photo_path, image_source, source_url, photo_subject, is_regional, tour_content_id)
SELECT 8, '/images/place-preview/seongsu-cafe-street.jpg', '지역 대표 이미지 · 한국관광공사 TourAPI', NULL, '성수동 카페거리', 1, '2930901' FROM dual
WHERE NOT EXISTS (SELECT 1 FROM COMM_PLACE_PHOTO WHERE place_id = 8)
/
INSERT INTO COMM_PLACE_PHOTO (place_id, photo_path, image_source, source_url, photo_subject, is_regional, tour_content_id)
SELECT 1003, '/images/place-preview/incheon-chinatown.jpg', '이강철 · Wikimedia Commons · CC BY-SA 4.0 · 960px 축소', 'https://commons.wikimedia.org/wiki/File:%EC%9D%B8%EC%B2%9C_%EC%B0%A8%EC%9D%B4%EB%82%98%ED%83%80%EC%9A%B4_%EC%A0%95%EB%AC%B8_Incheon_chinatown%2C_Main_gate.jpg', '인천 차이나타운 정문', 0, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM COMM_PLACE_PHOTO WHERE place_id = 1003)
/
INSERT INTO COMM_PLACE_PHOTO (place_id, photo_path, image_source, source_url, photo_subject, is_regional, tour_content_id)
SELECT 1012, '/images/place-preview/yangnim-penguin-village.jpg', '지역 대표 이미지 · 한국관광공사 TourAPI · 공공누리 제1유형', 'https://www.visitkorea.or.kr/', '양림동 펭귄마을공예거리', 1, '2603494' FROM dual
WHERE NOT EXISTS (SELECT 1 FROM COMM_PLACE_PHOTO WHERE place_id = 1012)
/
INSERT INTO COMM_PLACE_PHOTO (place_id, photo_path, image_source, source_url, photo_subject, is_regional, tour_content_id)
SELECT 1017, '/images/place-preview/dongpirang-village.jpg', 'Mobius6 · Wikimedia Commons · CC BY-SA 4.0 · 960px 축소', 'https://commons.wikimedia.org/wiki/File:Dongpirang_Village_20190511_04.jpg', '동피랑 벽화마을', 0, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM COMM_PLACE_PHOTO WHERE place_id = 1017)
/
INSERT INTO COMM_PLACE_PHOTO (place_id, photo_path, image_source, source_url, photo_subject, is_regional, tour_content_id)
SELECT 1020, '/images/place-preview/changwonjungang-station.jpg', 'Choi2451 · Wikimedia Commons · CC BY-SA 3.0 · 960px 축소', 'https://commons.wikimedia.org/wiki/File:Changwon_Central_Station.jpg', '창원중앙역', 0, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM COMM_PLACE_PHOTO WHERE place_id = 1020)
/
INSERT INTO COMM_PLACE_PHOTO (place_id, photo_path, image_source, source_url, photo_subject, is_regional, tour_content_id)
SELECT 1021, '/images/place-preview/kyungnam-university.jpg', 'Worlf4218 · Wikimedia Commons · CC0 · 960px 축소', 'https://commons.wikimedia.org/wiki/File:Kyungnam_University_6.jpg', '경남대학교 캠퍼스', 0, NULL FROM dual
WHERE NOT EXISTS (SELECT 1 FROM COMM_PLACE_PHOTO WHERE place_id = 1021)
/
