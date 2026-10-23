import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildSyncPlan, CANONICAL_ROOT, CACHE_FILE, MIRROR_ROOT, requiredRemotePaths, type RemoteFiles } from '../app/lib/account-sync.ts';

const repositoryRoot = resolve(process.env.NIKKE_REPO_ROOT || resolve('..', 'github-nikke-source'));
const remote: RemoteFiles = {};
for (const path of requiredRemotePaths()) {
  try {
    remote[path] = await readFile(resolve(repositoryRoot, path), 'utf8');
  } catch {
    remote[path] = null;
  }
}

const accountPath = `${CANONICAL_ROOT}/references/account-status.md`;
remote[accountPath] = (remote[accountPath] ?? '').replace('| 지휘관 레벨 | 477 |', '| 지휘관 레벨 | 476 |');

const store = {
  account: {
    commander: '시계대가리볼따구', server: 'Korea', uid: '14796867', commanderLevel: '477',
    synchro: '361', outpost: '538', power: '643690', jewels: '44585', goldMileage: '410',
    silverMileage: '330', coreDust: '102', goal: '솔로 레이드 in 10%',
  },
  nikkes: [{
    name: '드레이크',
    limit: '4코강',
    skills: '8/7/7',
    skillNotes: '사이트에서 입력한 테스트 상세. 기존 스킬 효과는 유지해야 한다.',
    level: '361',
    power: '103744',
    element: '수냉',
    weapon: 'SR',
    burst: 'Ⅱ',
    class: 'Supporter',
    corporation: 'MISSILIS',
    rarity: 'SSR',
    collection: 'SSR 애장품 빌런 피규어 4단계 테스트',
    overload: '헬멧 +1: 공격력 10%',
  }],
  updatedAt: '2026-08-25T00:00:00.000Z',
};

const plan = buildSyncPlan(store, remote);
const planned = new Map(plan.files.map(file => [file.path, file.content]));
const canonical = (reference: string) => planned.get(`${CANONICAL_ROOT}/${reference}`) ?? remote[`${CANONICAL_ROOT}/${reference}`] ?? '';

assert.deepEqual(plan.categories, ['account', 'growth', 'skills', 'overload', 'collection', 'element', 'weapon', 'burst', 'class']);
for (const reference of [
  'references/account-status.md', 'references/combat-status.md', 'references/skill-details.md',
  'references/overload-details.md', 'references/collection-details.md', 'references/element-classification.md',
  'references/weapon-classification.md', 'references/burst-classification.md', 'references/class-classification.md',
]) {
  assert.equal(planned.get(`${MIRROR_ROOT}/${reference}`), canonical(reference), `${reference} mirror mismatch`);
}

assert.match(canonical('references/account-status.md'), /\| 지휘관 레벨 \| 477 \|/);
assert.match(canonical('references/account-status.md'), /\| 전초기지 레벨 \| 538 \|/);
assert.match(canonical('references/account-status.md'), /\| 전투력 \| 643690 \|/);
assert.match(canonical('references/account-status.md'), /\| 쥬얼 \| 44585 \|/);
assert.match(canonical('references/account-status.md'), /\| 골드 마일리지 티켓 \| 410 \|/);
assert.match(canonical('references/account-status.md'), /\| 실버 마일리지 티켓 \| 330 \|/);
assert.match(canonical('references/account-status.md'), /슈가는 애장품 투자 우선순위를 낮춘 상태다/);
assert.match(canonical('references/combat-status.md'), /\| 드레이크 \| 103744 \| 8\/7\/7 \| 헬멧 \+1: 공격력 10% \|/);
assert.match(canonical('references/combat-status.md'), /사이트 편집 캐릭터 레벨/);
assert.match(canonical('references/skill-details.md'), /스킬 1 \| 오버 차지 \| 8/);
assert.match(canonical('references/skill-details.md'), /기존 스킬 효과는 유지해야 한다/);
assert.match(canonical('references/skill-details.md'), /일반 공격 10회 명중 시/);
assert.match(canonical('references/overload-details.md'), /사이트 편집 오버로드 상세/);
assert.match(canonical('references/overload-details.md'), /전체 합산 옵션/);
assert.match(canonical('references/collection-details.md'), /사이트 편집 소장품·애장품 상세/);
assert.match(canonical('references/collection-details.md'), /장비 능력치/);
assert.match(canonical('references/element-classification.md'), /## 수냉[\s\S]*드레이크/);
assert.doesNotMatch(canonical('references/element-classification.md').match(/## 작열[\s\S]*?(?=## 풍압)/)?.[0] ?? '', /드레이크/);

const cachePath = `${CANONICAL_ROOT}/${CACHE_FILE}`;
const cache = JSON.parse(planned.get(cachePath) ?? '{}');
assert.equal(cache.source, 'nikke-account-status/references Markdown DB');
assert.equal(cache.cache, true);
assert.equal(cache.account.commanderLevel, '477');
assert.equal(cache.account.outpost, '538');
assert.equal(cache.account.power, '643690');
assert.equal(cache.account.jewels, '44585');
assert.equal(cache.account.goldMileage, '410');
assert.equal(cache.account.silverMileage, '330');
assert.ok(cache.nikkes.length > 100, 'cache must retain Markdown-only characters');
const drake = cache.nikkes.find((item: { name: string }) => item.name === '드레이크');
assert.equal(drake.power, '103744');
assert.equal(drake.skills, '8/7/7');
assert.equal(drake.element, '수냉');
assert.equal(drake.collection, 'SSR 애장품 빌런 피규어 4단계 테스트');
assert.equal(planned.get(`${MIRROR_ROOT}/${CACHE_FILE}`), planned.get(cachePath));

const skill = planned.get(`${CANONICAL_ROOT}/SKILL.md`) ?? remote[`${CANONICAL_ROOT}/SKILL.md`] ?? '';
assert.match(skill, /`references\/`의 Markdown 문서가 계정 DB의 유일한 기준 자료/);
assert.match(skill, /sync_account_db\.py --repo-root \. --write/);
assert.doesNotMatch(skill, /사이트 입력값의 단일 원본/);
assert.ok(plan.files.every(file => !/raid/i.test(file.path)), 'raid data must not be part of the sync plan');

const syncedRemote: RemoteFiles = { ...remote };
for (const file of plan.files) syncedRemote[file.path] = file.content;
const overloadOnlyStore = structuredClone(store);
overloadOnlyStore.nikkes[0].overload = '헬멧 +2: 공격력 12%';
overloadOnlyStore.updatedAt = '2026-08-25T00:01:00.000Z';
const overloadOnlyPlan = buildSyncPlan(overloadOnlyStore, syncedRemote);
assert.deepEqual(overloadOnlyPlan.categories, ['overload']);
assert.deepEqual(new Set(overloadOnlyPlan.files.map(file => file.path)), new Set([
  `${CANONICAL_ROOT}/references/account-status.md`, `${MIRROR_ROOT}/references/account-status.md`,
  `${CANONICAL_ROOT}/references/combat-status.md`, `${MIRROR_ROOT}/references/combat-status.md`,
  `${CANONICAL_ROOT}/references/overload-details.md`, `${MIRROR_ROOT}/references/overload-details.md`,
  `${CANONICAL_ROOT}/${CACHE_FILE}`, `${MIRROR_ROOT}/${CACHE_FILE}`,
]));

console.log(`account-sync: ${plan.files.length} full-sync files and ${overloadOnlyPlan.files.length} overload-only files passed all invariants`);
