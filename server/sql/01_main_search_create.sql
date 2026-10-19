-- Feature-owned core objects. This file does not create/reference shared PLACE or MEMBER.
-- Place catalog and shared-key mapping are intentionally excluded pending team decisions.
-- External place identity uses (SOURCE_CODE, SOURCE_PLACE_ID); no UUIDs.
-- Minimum intended database: Oracle Database 12c Release 1 (12.1), for identity columns.

CREATE TABLE TRAVEL_SEARCH_LOG (
  search_id       NUMBER GENERATED ALWAYS AS IDENTITY,
  actor_key       VARCHAR2(128),
  query_text      VARCHAR2(1000) NOT NULL,
  conditions_json CLOB NOT NULL,
  matched_count   NUMBER(10) DEFAULT 0 NOT NULL,
  returned_count  NUMBER(10) DEFAULT 0 NOT NULL,
  searched_at     TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT travel_search_log_pk PRIMARY KEY (search_id),
  CONSTRAINT travel_search_matched_ck
    CHECK (matched_count >= 0 AND matched_count = TRUNC(matched_count)),
  CONSTRAINT travel_search_returned_ck
    CHECK (returned_count >= 0 AND returned_count = TRUNC(returned_count)),
  CONSTRAINT travel_search_count_order_ck CHECK (returned_count <= matched_count)
  -- Oracle 12.1.0.2+: uncomment the next constraint for database JSON syntax validation.
  -- Earlier releases: leave it commented and validate JSON in the server. Server validation
  -- of the expected condition schema is required on every supported version.
  -- , CONSTRAINT travel_search_cond_json_ck CHECK (conditions_json IS JSON)
);

CREATE INDEX travel_search_actor_date_ix
  ON TRAVEL_SEARCH_LOG (actor_key, searched_at);

CREATE TABLE TRAVEL_SEARCH_PLACE (
  search_id       NUMBER NOT NULL,
  source_code     VARCHAR2(40)  NOT NULL,
  source_place_id VARCHAR2(120) NOT NULL,
  result_position NUMBER(6) NOT NULL,
  rank_score      NUMBER(12, 6),
  clicked_at      TIMESTAMP WITH TIME ZONE,
  CONSTRAINT travel_search_place_pk
    PRIMARY KEY (search_id, source_code, source_place_id),
  CONSTRAINT travel_search_pos_uq UNIQUE (search_id, result_position),
  CONSTRAINT travel_search_pos_ck
    CHECK (result_position > 0 AND result_position = TRUNC(result_position)),
  CONSTRAINT travel_search_place_search_fk
    FOREIGN KEY (search_id) REFERENCES TRAVEL_SEARCH_LOG (search_id)
    ON DELETE CASCADE
);

-- clicked_at means first opening of the actual detail page for this search result.
-- Do not set it for a "detail page is preparing" notice/action. Preserve first value, e.g.:
-- UPDATE ... SET clicked_at = COALESCE(clicked_at, :now) WHERE ...

CREATE INDEX travel_search_place_ref_ix
  ON TRAVEL_SEARCH_PLACE (source_code, source_place_id, search_id);

-- App-internal API result-return and actual detail-open counts, not UI impressions or
-- national tourism popularity. Return date uses searched_at; click date uses clicked_at.
-- Both dates use the explicit Asia/Seoul timezone; the two event types can fall on different days.
CREATE VIEW V_TRAVEL_DAILY_INTEREST AS
SELECT
  activity_day,
  source_code,
  source_place_id,
  SUM(result_return_count) AS result_return_count,
  SUM(detail_click_count) AS detail_click_count
FROM (
  SELECT
    TRUNC(CAST(s.searched_at AT TIME ZONE 'Asia/Seoul' AS DATE)) AS activity_day,
    sp.source_code,
    sp.source_place_id,
    COUNT(*) AS result_return_count,
    0 AS detail_click_count
  FROM TRAVEL_SEARCH_PLACE sp
  JOIN TRAVEL_SEARCH_LOG s ON s.search_id = sp.search_id
  GROUP BY
    TRUNC(CAST(s.searched_at AT TIME ZONE 'Asia/Seoul' AS DATE)),
    sp.source_code,
    sp.source_place_id

  UNION ALL

  SELECT
    TRUNC(CAST(sp.clicked_at AT TIME ZONE 'Asia/Seoul' AS DATE)) AS activity_day,
    sp.source_code,
    sp.source_place_id,
    0 AS result_return_count,
    COUNT(*) AS detail_click_count
  FROM TRAVEL_SEARCH_PLACE sp
  WHERE sp.clicked_at IS NOT NULL
  GROUP BY
    TRUNC(CAST(sp.clicked_at AT TIME ZONE 'Asia/Seoul' AS DATE)),
    sp.source_code,
    sp.source_place_id
)
GROUP BY activity_day, source_code, source_place_id;

-- Growth calculation in API/reporting: compare latest 7 complete Asia/Seoul days to the
-- preceding 7 complete days; exclude the current partial day. Aggregate result-return counts.
-- Prior=0/current>0: report "newly observed (zero baseline)", not a percentage.
-- Both zero: "no activity". Otherwise calculate (current - prior) / prior * 100.
