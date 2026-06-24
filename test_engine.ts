import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getGoatRecommendations, type GoatPlace, type RecommendationInput } from './backend/recommendationEngine.ts';

type TestCase = {
  id: string;
  input: RecommendationInput;
  expectedTopPlaceIds: string[];
  expectedSeedPoolSize?: number;
  expectedCandidatePoolSize?: number;
  expectedPoolPolicy?: 'ALL58' | 'PRIMARY43';
  expectedAdaptivePoolRetryUsed?: boolean;
};

const __dirname = dirname(fileURLToPath(import.meta.url));

function readJson<T>(relativePath: string): T {
  const filePath = join(__dirname, relativePath);
  return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
}

const places = readJson<GoatPlace[]>('data/goat_places_all58.json');
const cases = readJson<TestCase[]>('data/recommendation_test_cases.json');

let passCount = 0;
let failCount = 0;

for (const tc of cases) {
  const res = getGoatRecommendations({ requestId: tc.id, ...tc.input }, places);
  const data = res.resultData;
  const actualIds = data?.recommendations.map((r) => r.placeId) ?? [];
  const expectedIds = tc.expectedTopPlaceIds;

  const checks = [
    data?.seedPoolSize === (tc.expectedSeedPoolSize ?? 58),
    tc.expectedCandidatePoolSize === undefined || data?.candidatePoolSize === tc.expectedCandidatePoolSize,
    tc.expectedPoolPolicy === undefined || data?.poolPolicy === tc.expectedPoolPolicy,
    tc.expectedAdaptivePoolRetryUsed === undefined || data?.adaptivePoolRetryUsed === tc.expectedAdaptivePoolRetryUsed,
    expectedIds.every((id, index) => actualIds[index] === id)
  ];

  const passed = checks.every(Boolean);
  if (passed) passCount += 1;
  else failCount += 1;

  console.log(
    `${passed ? 'PASS' : 'FAIL'} ${tc.id}`,
    '| seed:', data?.seedPoolSize,
    '| pool:', data?.candidatePoolSize,
    data?.poolPolicy,
    '| retry:', data?.adaptivePoolRetryUsed,
    '| fallback:', data?.fallbackUsed,
    '| actual:', actualIds.join(','),
    '| expected:', expectedIds.join(',')
  );
}

console.log(`
Recommendation test result: ${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exitCode = 1;
}
