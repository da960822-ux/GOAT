# 추천 엔진 테스트 실행 및 requestId 저장 기준

## 1. 추천 엔진 테스트 실행

패키지 루트에서 실행한다.

```bash
npm install
npm run test:recommend
```

정상 기준은 13개 테스트가 모두 `PASS`로 출력되는 것이다. `abstract-mood-only`는 `adaptivePoolRetryUsed: true`가 정상이다.

## 2. TypeScript/ESM 설정

- `package.json`의 `type`은 `module`이다.
- 테스트 실행은 `tsx test_engine.ts`를 사용한다.
- `tsconfig.json`은 `module/moduleResolution: NodeNext` 기준이다.
- JSON 파일은 import attributes 대신 `readFileSync + JSON.parse`로 읽어 ESM 충돌 가능성을 줄였다.

## 3. requestId 저장 기준

API 요청의 `requestId`는 DB PK가 아니다.

```txt
request_id = 서버 생성 uuid
client_request_id = 프론트/시연/테스트에서 보낸 requestId
```

기존 DB에 이미 `recommendation_requests` 테이블을 만든 경우 아래 파일을 추가 실행한다.

```sql
backend/migration_add_client_request_id.sql
```
