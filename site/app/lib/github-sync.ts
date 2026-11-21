import { buildSyncPlan, CATEGORY_LABELS, createFileDiff, normalizeSyncStore, requiredRemotePaths, type RemoteFiles, type SyncPlan } from './account-sync';

const OWNER = 'crydabd-creator';
const REPO = 'nikke';
const BASE_BRANCH = 'main';
const API_ROOT = `https://api.github.com/repos/${OWNER}/${REPO}`;
const API_VERSION = '2026-03-10';
const CACHE_PATH = 'nikke-account-status/references/site-account-data.json';

type GithubRef = { object: { sha: string } };
type GithubCommit = { sha: string; tree: { sha: string } };
type GithubTree = { sha: string };
type GithubPull = { number: number; html_url: string; title: string };

function headers(token?: string) {
  const result: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': API_VERSION,
    'User-Agent': 'oh-my-commander-site',
  };
  if (token) result.Authorization = `Bearer ${token}`;
  return result;
}

async function github<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_ROOT}${path}`, { ...init, headers: { ...headers(token), ...(init.headers ?? {}) } });
  if (!response.ok) {
    let message = `GitHub 요청 실패 (${response.status})`;
    try {
      const data = await response.json() as { message?: string };
      if (data.message) message = `${message}: ${data.message}`;
    } catch {}
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

function encodePath(path: string) {
  return path.split('/').map(encodeURIComponent).join('/');
}

async function rawFile(path: string, ref: string): Promise<string | null> {
  const response = await fetch(`https://raw.githubusercontent.com/${OWNER}/${REPO}/${encodeURIComponent(ref)}/${encodePath(path)}`, {
    headers: { 'User-Agent': 'oh-my-commander-site' },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub 파일을 읽지 못했습니다 (${response.status}): ${path}`);
  return response.text();
}

async function baseSha(token?: string) {
  const ref = await github<GithubRef>(`/git/ref/heads/${BASE_BRANCH}`, {}, token);
  return ref.object.sha;
}

export async function prepareSync(value: unknown, token?: string): Promise<{ baseSha: string; plan: SyncPlan }> {
  const store = normalizeSyncStore(value);
  const sha = await baseSha(token);
  const paths = requiredRemotePaths();
  const entries = await Promise.all(paths.map(async path => [path, await rawFile(path, sha)] as const));
  const remote: RemoteFiles = Object.fromEntries(entries);
  return { baseSha: sha, plan: buildSyncPlan(store, remote) };
}

function summary(plan: SyncPlan) {
  return {
    categories: plan.categories.map(category => CATEGORY_LABELS[category]),
    files: plan.files.map(file => ({
      path: file.path,
      reason: file.reason,
      status: file.status,
      previousLines: file.previousLines,
      nextLines: file.nextLines,
    })),
  };
}

export async function previewSync(value: unknown, token?: string) {
  const prepared = await prepareSync(value, token);
  return {
    repository: `${OWNER}/${REPO}`,
    baseBranch: BASE_BRANCH,
    baseSha: prepared.baseSha,
    canCreatePr: Boolean(token),
    ...summary(prepared.plan),
  };
}

export async function previewFileSync(value: unknown, requestedPath: unknown, expectedBaseSha: unknown, token?: string) {
  if (typeof requestedPath !== 'string' || requestedPath.length > 500) {
    const error = new Error('확인할 파일 경로가 올바르지 않습니다.');
    Object.assign(error, { status: 400 });
    throw error;
  }
  const prepared = await prepareSync(value, token);
  if (typeof expectedBaseSha === 'string' && expectedBaseSha && prepared.baseSha !== expectedBaseSha) {
    const error = new Error('미리보기 이후 저장소가 변경되었습니다. 변경 파일을 다시 확인해 주세요.');
    Object.assign(error, { status: 409 });
    throw error;
  }
  const file = prepared.plan.files.find(candidate => candidate.path === requestedPath);
  if (!file) {
    const error = new Error('현재 미리보기에 포함된 변경 파일이 아닙니다.');
    Object.assign(error, { status: 404 });
    throw error;
  }
  return { baseSha: prepared.baseSha, ...createFileDiff(file) };
}

export async function createSyncPullRequest(value: unknown, expectedBaseSha: unknown, token: string) {
  if (!token) throw new Error('GITHUB_TOKEN 비밀값이 설정되지 않았습니다.');
  const prepared = await prepareSync(value, token);
  if (typeof expectedBaseSha === 'string' && expectedBaseSha && prepared.baseSha !== expectedBaseSha) {
    const error = new Error('미리보기 이후 저장소가 변경되었습니다. 변경 파일을 다시 확인해 주세요.');
    Object.assign(error, { status: 409 });
    throw error;
  }
  if (prepared.plan.files.length === 0) return { noChanges: true, ...summary(prepared.plan) };

  const parent = await github<GithubCommit>(`/git/commits/${prepared.baseSha}`, {}, token);
  const tree = await github<GithubTree>('/git/trees', {
    method: 'POST',
    body: JSON.stringify({
      base_tree: parent.tree.sha,
      tree: prepared.plan.files.map(file => ({ path: file.path, mode: '100644', type: 'blob', content: file.content })),
    }),
  }, token);
  const commit = await github<GithubCommit>('/git/commits', {
    method: 'POST',
    body: JSON.stringify({
      message: 'Sync NIKKE account data from 오!나의지휘관',
      tree: tree.sha,
      parents: [prepared.baseSha],
    }),
  }, token);
  const date = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const suffix = crypto.randomUUID().slice(0, 8);
  const branch = `oh-my-commander/account-sync-${date}-${suffix}`;
  await github('/git/refs', {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit.sha }),
  }, token);
  const categoryNames = prepared.plan.categories.map(category => CATEGORY_LABELS[category]).join(', ');
  const pull = await github<GithubPull>('/pulls', {
    method: 'POST',
    body: JSON.stringify({
      title: '오!나의지휘관 계정 데이터 동기화',
      head: branch,
      base: BASE_BRANCH,
      body: `오!나의지휘관 사이트에서 확인한 계정 데이터를 기존 Markdown DB에 동기화합니다.\n\n- 변경 분야: ${categoryNames || '캐시·스킬 정책 정리'}\n- 기준 자료: \`nikke-account-status/references/*.md\`\n- 자동 생성 캐시: \`${CACHE_PATH}\`\n- 기존 상세 기록, 수동 메모, 레이드 데이터는 유지됩니다.\n- canonical reference와 agents/skills 복사본은 같은 내용으로 갱신됩니다.`,
      maintainer_can_modify: true,
      draft: false,
    }),
  }, token);
  return {
    noChanges: false,
    pullRequest: { number: pull.number, url: pull.html_url, title: pull.title, branch },
    ...summary(prepared.plan),
  };
}
