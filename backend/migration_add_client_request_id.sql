-- GOAT migration: client_request_id 분리
-- 목적:
-- - request_id는 DB 내부 PK로 서버가 생성하는 uuid를 사용한다.
-- - client_request_id는 프론트/시연/테스트에서 전달한 requestId 문자열을 저장한다.

alter table public.recommendation_requests
add column if not exists client_request_id text;

create index if not exists idx_recommendation_requests_client_request_id
on public.recommendation_requests (client_request_id);
