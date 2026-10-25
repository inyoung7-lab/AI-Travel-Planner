# Supabase 데이터 구조

인증 계정은 `auth.users.id`(UUID)로 통합합니다. 비밀번호는 Supabase Auth에서 관리합니다.

```mermaid
erDiagram
    AUTH_USERS ||--|| TRAVEL_PROFILES : profile
    TRAVEL_PROFILES ||--o{ COMM_POST : writes
    TRAVEL_PROFILES ||--o{ COMM_COMMENT : writes
    TRAVEL_PROFILES ||--o{ MYTRIP_PLAN : owns
    TRAVEL_PROFILES ||--o{ MYTRIP_WISH : saves
    COMM_POST ||--o{ COMM_POST_PLACE : tags
    COMM_POST ||--o{ COMM_POST_IMAGE : images
    COMM_POST ||--o{ COMM_COMMENT : comments
    COMM_PLACE ||--o{ COMM_POST_PLACE : reviews
    COMM_PLACE ||--o| COMM_PLACE_TOUR_DETAIL : detail
    MYTRIP_PLAN ||--o{ MYTRIP_PLACE : places
    COMM_PLACE ||--o{ MYTRIP_PLACE : included
    COMM_PLACE ||--o{ MYTRIP_WISH : saved
```

정확한 컬럼·제약·RLS·RPC는 [전환 마이그레이션](../supabase/migrations/202610250001_travel_supabase.sql)을 기준으로 합니다.
호스트 및 체험의 기존 `lc_*` 테이블은 그대로 사용하며 동일한 `auth.users.id`를 참조합니다.
검색 이력은 `travel_search_log`에 저장하며 서버가 검증한 브라우저 범위를 사용합니다. 일반 브라우저에는 조회 권한을 주지 않습니다.
