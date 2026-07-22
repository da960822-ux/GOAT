# Spec: Recommendation Score Contract and Audit Persistence

## Objective

Type the recommendation engine's real score output in the public OpenAPI contract and persist searchable, versioned audit metadata without exposing internal candidate-selection details to ordinary users. Existing recommendation, idempotency, crowd refresh, bookmark, feedback, and course behavior must remain backward compatible.

## Tech Stack

- TypeScript 5.9, Express 5, Zod, Orval
- Drizzle ORM with PostgreSQL on Supabase
- Supabase CLI migrations under `supabase/migrations`

## Commands

- API contract generation: `corepack pnpm --filter @workspace/api-spec run codegen`
- API verification: `corepack pnpm --filter @workspace/api-server run verify`
- API typecheck: `corepack pnpm --filter @workspace/api-server run typecheck`
- Workspace typecheck: `corepack pnpm run typecheck`
- Workspace build: `corepack pnpm run build`
- Local migration reset: `corepack pnpm exec supabase db reset`
- Database lint: `corepack pnpm exec supabase db lint --local --schema public --level warning --fail-on error`

## Project Structure

- `lib/travel-domain/src`: network/DB-free recommendation data and pure scoring policy
- `lib/db/src/schema`: Drizzle schema and database relations
- `artifacts/api-server/src`: recommendation persistence and HTTP responses
- `lib/api-spec/openapi.yaml`: public HTTP contract
- `supabase/migrations`: ordered Supabase schema changes
- `artifacts/api-server/scripts`: contract verification scripts

## Contract and Naming

- HTTP `requestId` is a per-request correlation ID.
- `recommendation_requests.id` is an internal idempotency workflow record.
- Public `recommendationId` is `recommendation_sessions.id`, the persisted recommendation session.
- `recommendation_session_places.id` identifies one persisted card snapshot.
- Child-table `recommendation_id` foreign keys always reference `recommendation_sessions.id`.
- Engine warnings are session-scoped. Card-specific cautions are stored on the card snapshot.

## Score Policy

Penalty fields are non-negative magnitudes and are subtracted by the formula.

```text
base_score = mood_score + condition_score
selection_score = base_score + origin_distance_bonus + route_distance_bonus - duplicate_penalty
                  - exposure_penalty + coverage_boost + low_exposure_boost
display_score = clamp(base_score + origin_distance_bonus + route_distance_bonus - duplicate_penalty, 0, 100)
```

Ranges for `goat-score-v2`:

- mood score 0..45; condition score 0..45; base score 0..90
- origin and route bonuses 0..10 each; duplicate penalty 0..6; exposure penalty 0..5
- coverage boost 0..3; low-exposure boost 0..3
- selection score -11..116; display score 0..100

Card 1 does not receive origin, route, exposure, coverage, or low-exposure corrections. Legacy `goat-score-v1` score/audit JSON remains readable and is normalized with zero origin bonus and `NONE` distance sources.

## API Behavior

- Existing `score` and `reason` fields remain unchanged.
- Cards add typed `scoreSummary`, `scoreDetails`, `reasons`, and `cautions` fields.
- `scoreSummary` and `scoreDetails` are nullable for legacy or invalid persisted JSON; newly created recommendations always return both.
- Public responses include the policy version, typed score summary/detail, origin status, and route information. Candidate-pool audit JSON remains server-side.
- Existing dynamic crowd lookup remains outside the persisted score snapshot.

## Persistence Behavior

- Sessions store `policy_version`, origin status/notice, fallback metadata, and audit JSON schema v2.
- Frequently aggregated score components are stored as numeric card columns.
- Warning codes are stored one row per session and code in `recommendation_session_warnings`.
- Audit and score JSONB are validated with internal Zod schemas before writes and after reads.
- Invalid or unknown legacy JSON yields nullable detail fields plus a structured server warning; it does not fail the entire recommendation response.
- Existing `recommendation_logs` is retained and deprecated. It is not a source for new writes.

## Testing Strategy

- Contract tests assert explicit OpenAPI schemas and backward-compatible fields.
- Unit tests verify score ranges, formulas, and audit JSON validation.
- Persistence verification covers schema relations, constraints, idempotency, and response normalization.
- Typecheck, build, Supabase local reset, and database lint are final gates.

## Boundaries

- Always: preserve existing API fields, validate JSON at boundaries, keep external calls outside DB transactions, and use additive migrations.
- Ask first: deleting legacy tables or changing public identifier semantics.
- Never: expose internal audit details to ordinary users, store unauthenticated recommendation sessions, or change crowd refresh behavior in this work.

## Success Criteria

- OpenAPI no longer uses untyped free-form objects for recommendation cards and score breakdowns.
- New recommendation rows contain versioned audit metadata and queryable score components.
- Warning trends can be queried by warning code without unpacking JSON arrays.
- New and legacy recommendation responses conform to one backward-compatible DTO.
- Concurrent idempotent requests still produce only one saved recommendation and one warning set.
- All verification commands that are available in the local environment pass.

## Implementation Tasks

1. Add failing contract/runtime-schema verification for the new typed fields and versioned audit shape.
2. Add the Supabase migration and matching Drizzle schema for sessions, card score columns, cautions, and warnings.
3. Add typed score/audit Zod schemas and propagate the engine audit result through the service boundary.
4. Persist and safely read the new audit data while retaining the existing short transaction and idempotency flow.
5. Update OpenAPI, regenerate clients, and verify legacy response normalization.
6. Run migration, contract, typecheck, build, and five-axis code review gates.

## Open Questions

None. The approved implementation plan fixes the remaining policy decisions.
