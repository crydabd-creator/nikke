export type SyncNikke = {
  id?: string;
  name: string;
  limit?: string;
  skills?: string;
  skillNotes?: string;
  level?: string;
  power?: string;
  element?: string;
  weapon?: string;
  burst?: string;
  class?: string;
  corporation?: string;
  rarity?: string;
  collection?: string;
  overload?: string;
};

export type SyncAccount = {
  commander?: string;
  server?: string;
  uid?: string;
  commanderLevel?: string;
  synchro?: string;
  outpost?: string;
  power?: string;
  jewels?: string;
  goldMileage?: string;
  silverMileage?: string;
  coreDust?: string;
  goal?: string;
};

export type SyncStore = { account: SyncAccount; nikkes: SyncNikke[]; updatedAt?: string };
export type SyncCategory = 'account' | 'growth' | 'skills' | 'overload' | 'collection' | 'element' | 'weapon' | 'burst' | 'class';
export type SourceData = {
  schemaVersion: 2;
  source: 'nikke-account-status/references Markdown DB';
  cache: true;
  generatedAt: string;
  account: Record<string, string>;
  nikkes: Array<Record<string, string>>;
};

export type RemoteFiles = Record<string, string | null>;
export type PlannedFile = { path: string; content: string; previousContent: string | null; reason: string; previousLines: number; nextLines: number; status: 'create' | 'update' };
export type SyncPlan = { categories: SyncCategory[]; sourceData: SourceData; files: PlannedFile[] };
export type FileDiffLine = { type: 'context' | 'add' | 'remove'; text: string; oldLine: number | null; newLine: number | null };

type NikkeField = Exclude<keyof SyncNikke, 'id' | 'name'>;
type ChangeSet = {
  accountFields: Set<keyof SyncAccount>;
  nikkeFields: Map<string, Set<NikkeField>>;
  categories: SyncCategory[];
};

export const CANONICAL_ROOT = 'nikke-account-status';
export const MIRROR_ROOT = 'nikke-account-status/agents/skills/nikke-account-status';
export const CACHE_FILE = 'references/site-account-data.json';

const REFERENCES = [
  'references/account-status.md',
  'references/combat-status.md',
  'references/skill-details.md',
  'references/overload-details.md',
  'references/collection-details.md',
  'references/element-classification.md',
  'references/weapon-classification.md',
  'references/burst-classification.md',
  'references/class-classification.md',
] as const;

export const CATEGORY_LABELS: Record<SyncCategory, string> = {
  account: '계정 상태',
  growth: '레벨·전투력·돌파',
  skills: '스킬',
  overload: '오버로드',
  collection: '소장품·애장품',
  element: '속성 분류',
  weapon: '무기 분류',
  burst: '버스트 분류',
  class: '클래스 분류',
};

const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as SyncCategory[];
const REFERENCE_BY_CATEGORY: Record<SyncCategory, string[]> = {
  account: ['references/account-status.md'],
  growth: ['references/account-status.md', 'references/combat-status.md'],
  skills: ['references/account-status.md', 'references/combat-status.md', 'references/skill-details.md'],
  overload: ['references/account-status.md', 'references/combat-status.md', 'references/overload-details.md'],
  collection: ['references/account-status.md', 'references/collection-details.md'],
  element: ['references/element-classification.md'],
  weapon: ['references/weapon-classification.md'],
  burst: ['references/burst-classification.md'],
  class: ['references/class-classification.md'],
};

const REFERENCE_REASON: Record<string, string> = {
  'references/account-status.md': '계정 전체 상태와 캐릭터 육성 요약 직접 갱신',
  'references/combat-status.md': '캐릭터 레벨·전투력·스킬·오버로드 요약 직접 갱신',
  'references/skill-details.md': '스킬 레벨과 사이트 편집 상세 직접 갱신',
  'references/overload-details.md': '기존 부위별 옵션을 보존하며 사이트 편집 내용 갱신',
  'references/collection-details.md': '기존 소장품·애장품 기록을 보존하며 사이트 편집 내용 갱신',
  'references/element-classification.md': '속성 분류 목록 직접 갱신',
  'references/weapon-classification.md': '무기 분류 목록 직접 갱신',
  'references/burst-classification.md': '버스트 단계 분류 목록 직접 갱신',
  'references/class-classification.md': '클래스 분류 목록 직접 갱신',
};

const ACCOUNT_LABELS: Record<keyof SyncAccount, string[]> = {
  commander: ['지휘관명'], server: ['서버'], uid: ['UID'], commanderLevel: ['지휘관 레벨'],
  synchro: ['싱크로 디바이스 레벨', '싱크로 레벨'], outpost: ['전초기지 레벨'], power: ['전투력', '메인덱 전투력'],
  jewels: ['쥬얼'], goldMileage: ['골드 마일리지 티켓', '골드 마일리지'], silverMileage: ['실버 마일리지 티켓', '실버 마일리지'],
  coreDust: ['시간당 코어 더스트'], goal: ['주요 목표', '현재 목표'],
};

function lf(content: string | null | undefined) { return (content ?? '').replace(/\r\n/g, '\n'); }
function clean(value: unknown, max = 5000) { return typeof value === 'string' ? value.replace(/\u0000/g, '').trim().slice(0, max) : ''; }
function normalizedLines(content: string | null) { return content === null || content === '' ? [] : lf(content).split('\n'); }

export function createFileDiff(file: PlannedFile) {
  const before = normalizedLines(file.previousContent);
  const after = normalizedLines(file.content);
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix += 1;
  let suffix = 0;
  while (suffix < before.length - prefix && suffix < after.length - prefix && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix += 1;
  const beforeEnd = before.length - suffix;
  const afterEnd = after.length - suffix;
  const lines: FileDiffLine[] = [];
  for (let index = Math.max(0, prefix - 3); index < prefix; index += 1) lines.push({ type: 'context', text: before[index], oldLine: index + 1, newLine: index + 1 });
  for (let index = prefix; index < beforeEnd; index += 1) lines.push({ type: 'remove', text: before[index], oldLine: index + 1, newLine: null });
  for (let index = prefix; index < afterEnd; index += 1) lines.push({ type: 'add', text: after[index], oldLine: null, newLine: index + 1 });
  for (let offset = 0; offset < Math.min(suffix, 3); offset += 1) lines.push({ type: 'context', text: before[beforeEnd + offset], oldLine: beforeEnd + offset + 1, newLine: afterEnd + offset + 1 });
  return {
    path: file.path, reason: file.reason, status: file.status, previousLines: file.previousLines, nextLines: file.nextLines,
    removedLines: beforeEnd - prefix, addedLines: afterEnd - prefix,
    scope: file.status === 'create' ? '새 파일 전체' : file.path.endsWith('.json') ? 'Markdown DB에서 재생성된 사이트 캐시' : '해당 표·분류·사이트 관리 구간과 앞뒤 문맥', lines,
  };
}

export function normalizeSyncStore(value: unknown): SyncStore {
  if (!value || typeof value !== 'object') throw new Error('계정 데이터 형식이 올바르지 않습니다.');
  const raw = value as { account?: Record<string, unknown>; nikkes?: unknown[]; updatedAt?: unknown };
  const accountSource = raw.account ?? {};
  const account: SyncAccount = {};
  for (const key of Object.keys(ACCOUNT_LABELS) as Array<keyof SyncAccount>) account[key] = clean(accountSource[key], 500);
  if (!Array.isArray(raw.nikkes) || raw.nikkes.length > 500) throw new Error('니케 목록 형식이 올바르지 않습니다.');
  const seen = new Set<string>();
  const nikkes = raw.nikkes.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`니케 ${index + 1}번 데이터가 올바르지 않습니다.`);
    const source = item as Record<string, unknown>;
    const name = clean(source.name, 200);
    if (!name) throw new Error(`니케 ${index + 1}번의 이름이 없습니다.`);
    if (seen.has(name)) throw new Error(`니케 이름이 중복되어 있습니다: ${name}`);
    seen.add(name);
    return {
      id: clean(source.id, 200), name,
      limit: clean(source.limit, 100), skills: clean(source.skills, 100), skillNotes: clean(source.skillNotes),
      level: clean(source.level, 100), power: clean(source.power, 100), element: clean(source.element, 100),
      weapon: clean(source.weapon, 100), burst: clean(source.burst, 100), class: clean(source.class, 100),
      corporation: clean(source.corporation, 100), rarity: clean(source.rarity, 100), collection: clean(source.collection), overload: clean(source.overload),
    };
  });
  return { account, nikkes, updatedAt: clean(raw.updatedAt, 100) };
}

function splitTableRow(line: string) {
  const body = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells: string[] = [];
  let current = '';
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (char === '|' && body[index - 1] !== '\\') { cells.push(current.trim()); current = ''; }
    else current += char;
  }
  cells.push(current.trim());
  return cells;
}

function mdCell(value: unknown) {
  const text = clean(value);
  return text ? text.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>') : '미확인';
}
function joinTableRow(cells: string[]) { return `| ${cells.map(cell => cell.replace(/\r?\n/g, '<br>')).join(' | ')} |`; }
function headingIndex(lines: string[], title: string, level: number) { return lines.findIndex(line => line.trim() === `${'#'.repeat(level)} ${title}`); }
function sectionEnd(lines: string[], start: number, level: number) {
  for (let index = start + 1; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#{1,6})\s+/);
    if (match && match[1].length <= level) return index;
  }
  return lines.length;
}

function tableRange(lines: string[], sectionStart: number, end: number) {
  for (let index = sectionStart + 1; index < end - 1; index += 1) {
    if (!lines[index].trim().startsWith('|') || !lines[index + 1]?.trim().startsWith('|')) continue;
    if (!/^\|?\s*:?-{3,}/.test(lines[index + 1].trim())) continue;
    let tableEnd = index + 2;
    while (tableEnd < end && lines[tableEnd].trim().startsWith('|')) tableEnd += 1;
    return { header: index, rowsStart: index + 2, end: tableEnd };
  }
  return null;
}

function parseSectionTable(content: string, title: string, level = 2) {
  const lines = lf(content).split('\n');
  const start = headingIndex(lines, title, level);
  if (start < 0) return { headers: [] as string[], rows: [] as string[][] };
  const range = tableRange(lines, start, sectionEnd(lines, start, level));
  if (!range) return { headers: [] as string[], rows: [] as string[][] };
  return { headers: splitTableRow(lines[range.header]), rows: lines.slice(range.rowsStart, range.end).map(splitTableRow) };
}

function updateSectionTable(content: string, title: string, rowUpdates: Map<string, Record<string, string>>, newRow: (name: string, headers: string[]) => string[], level = 2) {
  if (rowUpdates.size === 0) return lf(content);
  const lines = lf(content).split('\n');
  const start = headingIndex(lines, title, level);
  if (start < 0) throw new Error(`${title} 구간을 찾을 수 없어 안전하게 갱신하지 못했습니다.`);
  const range = tableRange(lines, start, sectionEnd(lines, start, level));
  if (!range) throw new Error(`${title} 표를 찾을 수 없어 안전하게 갱신하지 못했습니다.`);
  const headers = splitTableRow(lines[range.header]);
  const seen = new Set<string>();
  for (let index = range.rowsStart; index < range.end; index += 1) {
    const cells = splitTableRow(lines[index]);
    const name = cells[0];
    const update = rowUpdates.get(name);
    if (!update) continue;
    seen.add(name);
    for (const [header, value] of Object.entries(update)) {
      const column = headers.findIndex(item => item.includes(header));
      if (column >= 0 && value) cells[column] = mdCell(value);
    }
    lines[index] = joinTableRow(cells);
  }
  const additions = [...rowUpdates.entries()].filter(([name]) => !seen.has(name)).map(([name, update]) => {
    const cells = newRow(name, headers);
    for (const [header, value] of Object.entries(update)) {
      const column = headers.findIndex(item => item.includes(header));
      if (column >= 0 && value) cells[column] = mdCell(value);
    }
    return joinTableRow(cells);
  });
  lines.splice(range.end, 0, ...additions);
  return lines.join('\n');
}

function managedBlock(id: string, body: string) { return `<!-- OH-MY-COMMANDER:${id}:START -->\n${body.trim()}\n<!-- OH-MY-COMMANDER:${id}:END -->`; }
export function upsertManagedBlock(source: string, id: string, body: string) {
  const content = lf(source);
  const start = `<!-- OH-MY-COMMANDER:${id}:START -->`;
  const end = `<!-- OH-MY-COMMANDER:${id}:END -->`;
  const startIndex = content.indexOf(start);
  const endIndex = content.indexOf(end);
  const block = managedBlock(id, body);
  if ((startIndex >= 0) !== (endIndex >= 0) || (startIndex >= 0 && endIndex < startIndex)) throw new Error(`${id} 자동 관리 구간이 손상되어 안전하게 동기화할 수 없습니다.`);
  if (startIndex >= 0) return `${content.slice(0, startIndex)}${block}${content.slice(endIndex + end.length)}`;
  return `${content.trimEnd()}\n\n${block}\n`;
}

function removeManagedBlock(source: string, id: string) {
  const content = lf(source);
  const start = `<!-- OH-MY-COMMANDER:${id}:START -->`;
  const end = `<!-- OH-MY-COMMANDER:${id}:END -->`;
  const startIndex = content.indexOf(start);
  const endIndex = content.indexOf(end);
  if (startIndex < 0 && endIndex < 0) return content;
  if (startIndex < 0 || endIndex < startIndex) throw new Error(`${id} 자동 관리 구간이 손상되어 안전하게 제거할 수 없습니다.`);
  const before = content.slice(0, startIndex).trimEnd();
  const after = content.slice(endIndex + end.length).trimStart();
  return after ? `${before}\n\n${after}` : `${before}\n`;
}

function markerId(kind: string, name: string) { return `${kind}:${encodeURIComponent(name)}`; }
function exactCharacterSections(content: string, name: string) {
  const lines = lf(content).split('\n');
  const sections: Array<{ start: number; end: number; level: number }> = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#{1,2})\s+(.+?)\s*$/);
    if (match?.[2] === name) sections.push({ start: index, end: sectionEnd(lines, index, match[1].length), level: match[1].length });
  }
  return { lines, sections };
}

function upsertCharacterBlock(content: string, name: string, kind: string, title: string, value: string) {
  const id = markerId(kind, name);
  const startMarker = `<!-- OH-MY-COMMANDER:${id}:START -->`;
  if (content.includes(startMarker)) return upsertManagedBlock(content, id, `### ${title}\n\n- ${mdCell(value)}`);
  const { lines, sections } = exactCharacterSections(content, name);
  const chosen = sections.find(section => section.level === 1) ?? sections[0];
  const blockLines = managedBlock(id, `### ${title}\n\n- ${mdCell(value)}`).split('\n');
  if (!chosen) return `${lf(content).trimEnd()}\n\n## ${name}\n\n${blockLines.join('\n')}\n`;
  lines.splice(chosen.end, 0, '', ...blockLines, '');
  return lines.join('\n');
}

function extractManagedCharacterValues(content: string, kind: string) {
  const values = new Map<string, string>();
  const pattern = new RegExp(`<!-- OH-MY-COMMANDER:${kind}:([^:]+):START -->([\\s\\S]*?)<!-- OH-MY-COMMANDER:${kind}:\\1:END -->`, 'g');
  for (const match of lf(content).matchAll(pattern)) {
    const name = decodeURIComponent(match[1]);
    const bullet = match[2].match(/^-\s+(.+)$/m)?.[1] ?? '';
    values.set(name, bullet.replace(/<br>/g, '\n').replace(/\\\|/g, '|').trim());
  }
  return values;
}

function restoreSkillPolicy(content: string) {
  let next = removeManagedBlock(content, 'sync-policy');
  const guidance = '`references/`의 Markdown 문서가 계정 DB의 유일한 기준 자료다. `site-account-data.json`과 `agents/skills/nikke-account-status/`는 자동 생성 결과이므로 분석하거나 수정할 때 독립 원본으로 사용하지 않는다.';
  next = next.replace(/^`?references\/?`?의 Markdown 문서가 계정 DB의 (?:유일한 )?기준 자료다\..*$/gm, '');
  const anchor = 'NIKKE 관련 분석을 시작하기 전에 [account-status.md](references/account-status.md)를 읽는다.';
  if (!next.includes(anchor)) throw new Error('SKILL.md의 기준 자료 읽기 구간을 찾을 수 없습니다.');
  next = next.replace(anchor, `${anchor}\n\n${guidance}`).replace(/\n{3,}/g, '\n\n');
  return next;
}

function accountFromMarkdown(content: string) {
  const account: Record<string, string> = {};
  const table = parseSectionTable(content, '계정 전체');
  for (const row of table.rows) {
    const label = row[0];
    for (const [key, labels] of Object.entries(ACCOUNT_LABELS)) if (labels.includes(label)) account[key] = row[1] === '미확인' ? '' : row[1];
  }
  return account;
}

function rosterLimits(content: string) {
  const values = new Map<string, string>();
  const lines = lf(content).split('\n');
  const start = headingIndex(lines, '전체 보유 목록', 2);
  if (start < 0) return values;
  const end = sectionEnd(lines, start, 2);
  for (const line of lines.slice(start + 1, end)) {
    if (line.trim().startsWith('-')) continue;
    for (const rawPart of line.split(',')) {
      const part = rawPart.trim().replace(/[.]$/, '');
      const open = part.lastIndexOf('(');
      if (open <= 0 || !part.endsWith(')')) continue;
      const name = part.slice(0, open).trim();
      const limit = part.slice(open + 1, -1).trim();
      if (/(?:돌|코강|MAX)/.test(limit)) values.set(name, limit);
    }
  }
  return values;
}

function mergeTableCharacters(target: Map<string, Record<string, string>>, content: string, title: string, mapping: Record<string, NikkeField>) {
  const table = parseSectionTable(content, title);
  for (const row of table.rows) {
    const name = row[0];
    if (!name || name === '미확인') continue;
    const item = target.get(name) ?? { name };
    table.headers.forEach((header, index) => {
      const field = Object.entries(mapping).find(([needle]) => header.includes(needle))?.[1];
      const value = row[index];
      if (field && value && value !== '미확인' && !item[field]) item[field] = value.replace(/`/g, '');
    });
    target.set(name, item);
  }
}

function parseManagedTable(content: string, id: string) {
  const start = `<!-- OH-MY-COMMANDER:${id}:START -->`;
  const end = `<!-- OH-MY-COMMANDER:${id}:END -->`;
  const source = lf(content);
  const from = source.indexOf(start);
  const to = source.indexOf(end);
  if (from < 0 || to < from) return { headers: [] as string[], rows: [] as string[][] };
  const lines = source.slice(from + start.length, to).split('\n');
  const header = lines.findIndex((line, index) => line.trim().startsWith('|') && /^\|?\s*:?-{3,}/.test(lines[index + 1]?.trim() ?? ''));
  if (header < 0) return { headers: [] as string[], rows: [] as string[][] };
  let endRow = header + 2;
  while (endRow < lines.length && lines[endRow].trim().startsWith('|')) endRow += 1;
  return { headers: splitTableRow(lines[header]), rows: lines.slice(header + 2, endRow).map(splitTableRow) };
}

function mergeManagedMetadata(target: Map<string, Record<string, string>>, accountStatus: string, combatStatus: string) {
  const metadata = parseManagedTable(accountStatus, 'character-metadata');
  for (const row of metadata.rows) {
    const item = target.get(row[0]) ?? { name: row[0] };
    item.rarity = row[1] === '미확인' ? '' : row[1];
    item.corporation = row[2] === '미확인' ? '' : row[2];
    target.set(row[0], item);
  }
  const levels = parseManagedTable(combatStatus, 'character-levels');
  for (const row of levels.rows) {
    const item = target.get(row[0]) ?? { name: row[0] };
    item.level = row[1] === '미확인' ? '' : row[1];
    target.set(row[0], item);
  }
}

const CLASSIFICATION_CONFIG = {
  element: { file: 'references/element-classification.md', headings: ['전격', '작열', '풍압', '수냉', '철갑'] },
  weapon: { file: 'references/weapon-classification.md', headings: ['SMG', 'RL(로켓 런처)', 'AR(어설트 라이플)', 'SG(샷건)', 'SR(스나이퍼 라이플)', 'MG(머신건)'] },
  burst: { file: 'references/burst-classification.md', headings: ['버스트 1', '버스트 2', '버스트 3'] },
  class: { file: 'references/class-classification.md', headings: ['화력형', '방어형', '지원형'] },
} as const;

function classificationValue(kind: keyof typeof CLASSIFICATION_CONFIG, heading: string) {
  if (kind === 'weapon') return heading.replace(/\(.+\)/, '');
  if (kind === 'burst') return ({ '버스트 1': 'Ⅰ', '버스트 2': 'Ⅱ', '버스트 3': 'Ⅲ' } as Record<string, string>)[heading];
  if (kind === 'class') return ({ 화력형: 'Attacker', 방어형: 'Defender', 지원형: 'Supporter' } as Record<string, string>)[heading];
  return heading;
}

function sectionNames(content: string, title: string) {
  const lines = lf(content).split('\n');
  const start = headingIndex(lines, title, 2);
  if (start < 0) return [];
  const bodyLines: string[] = [];
  for (const line of lines.slice(start + 1, sectionEnd(lines, start, 2))) {
    if (/^\s*(?:<!--|\|)/.test(line)) break;
    bodyLines.push(line);
  }
  const body = bodyLines.join('\n').trim();
  if (!body) return [];
  return body.split(',').map(value => value.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().replace(/\.$/, '')).filter(Boolean);
}

function mergeClassifications(target: Map<string, Record<string, string>>, files: Record<string, string>) {
  for (const [kind, config] of Object.entries(CLASSIFICATION_CONFIG) as Array<[keyof typeof CLASSIFICATION_CONFIG, typeof CLASSIFICATION_CONFIG[keyof typeof CLASSIFICATION_CONFIG]]>) {
    const content = files[config.file] ?? '';
    for (const heading of config.headings) {
      for (const name of sectionNames(content, heading)) {
        const item = target.get(name) ?? { name };
        if (!item[kind]) item[kind] = classificationValue(kind, heading);
        target.set(name, item);
      }
    }
  }
}

export function parseMarkdownDatabase(remote: RemoteFiles, generatedAt = ''): SourceData {
  const get = (reference: string) => lf(remote[`${CANONICAL_ROOT}/${reference}`]);
  const accountStatus = get('references/account-status.md');
  const combatStatus = get('references/combat-status.md');
  const items = new Map<string, Record<string, string>>();
  mergeTableCharacters(items, accountStatus, '캐릭터별 확인 현황', { '돌파/코어': 'limit', '스킬 1/2/버스트': 'skills', '애장품/소장품': 'collection', '오버로드 장비': 'overload' });
  for (const [name, limit] of rosterLimits(accountStatus)) {
    const item = items.get(name) ?? { name };
    if (!item.limit) item.limit = limit;
    items.set(name, item);
  }
  const lines = combatStatus.split('\n');
  const range = tableRange(lines, 0, lines.length);
  if (range) {
    const headers = splitTableRow(lines[range.header]);
    for (const row of lines.slice(range.rowsStart, range.end).map(splitTableRow)) {
      const name = row[0];
      if (!name) continue;
      const item = items.get(name) ?? { name };
      headers.forEach((header, index) => {
        const field = header.includes('전투력') ? 'power' : header.includes('스킬') ? 'skills' : header.includes('오버로드') ? 'overload' : '';
        if (field && row[index] && row[index] !== '미확인') item[field] = row[index].replace(/`/g, '');
      });
      items.set(name, item);
    }
  }
  mergeManagedMetadata(items, accountStatus, combatStatus);
  mergeClassifications(items, Object.fromEntries(REFERENCES.map(reference => [reference, get(reference)])));
  for (const [name, value] of extractManagedCharacterValues(get('references/skill-details.md'), 'skills-note')) {
    const item = items.get(name) ?? { name }; item.skillNotes = value; items.set(name, item);
  }
  for (const [kind, reference] of [['overload', 'references/overload-details.md'], ['collection', 'references/collection-details.md']] as const) {
    for (const [name, value] of extractManagedCharacterValues(get(reference), kind)) {
      const item = items.get(name) ?? { name }; item[kind] = value; items.set(name, item);
    }
  }
  return {
    schemaVersion: 2, source: 'nikke-account-status/references Markdown DB', cache: true, generatedAt,
    account: accountFromMarkdown(accountStatus),
    nikkes: [...items.values()].map(item => Object.fromEntries(Object.entries(item).map(([key, value]) => [key, clean(value)]))),
  };
}

function valuesEqual(a: string | undefined, b: string | undefined) {
  const normalized = (value?: string) => clean(value).replace(/\s+/g, ' ').replace(/`/g, '');
  return normalized(a) === normalized(b);
}
function categoryForField(field: NikkeField): SyncCategory {
  if (field === 'limit' || field === 'level' || field === 'power') return 'growth';
  if (field === 'skills' || field === 'skillNotes') return 'skills';
  if (field === 'overload') return 'overload';
  if (field === 'collection') return 'collection';
  if (field === 'element' || field === 'weapon' || field === 'burst' || field === 'class') return field;
  return 'account';
}

function detectChanges(previous: SourceData, store: SyncStore): ChangeSet {
  const accountFields = new Set<keyof SyncAccount>();
  for (const key of Object.keys(ACCOUNT_LABELS) as Array<keyof SyncAccount>) {
    const next = clean(store.account[key]);
    if (next && !valuesEqual(previous.account[key], next)) accountFields.add(key);
  }
  const before = new Map(previous.nikkes.map(item => [item.name, item]));
  const nikkeFields = new Map<string, Set<NikkeField>>();
  for (const nikke of store.nikkes) {
    const old = before.get(nikke.name) ?? {};
    const fields = new Set<NikkeField>();
    for (const key of ['limit','skills','skillNotes','level','power','element','weapon','burst','class','corporation','rarity','collection','overload'] as NikkeField[]) {
      const next = clean(nikke[key]);
      if (next && !valuesEqual(old[key], next)) fields.add(key);
    }
    if (fields.size) nikkeFields.set(nikke.name, fields);
  }
  const categories = new Set<SyncCategory>();
  if (accountFields.size) categories.add('account');
  for (const fields of nikkeFields.values()) for (const field of fields) categories.add(categoryForField(field));
  return { accountFields, nikkeFields, categories: CATEGORY_ORDER.filter(category => categories.has(category)) };
}

function updateAccountDocument(content: string, store: SyncStore, changes: ChangeSet) {
  let next = lf(content);
  if (changes.accountFields.size) {
    const updates = new Map<string, Record<string, string>>();
    for (const key of changes.accountFields) updates.set(ACCOUNT_LABELS[key][0], { '현재 상태': clean(store.account[key]) });
    next = updateSectionTable(next, '계정 전체', updates, (label, headers) => headers.map((_, index) => index === 0 ? label : '미확인'));
  }
  const characterUpdates = new Map<string, Record<string, string>>();
  for (const nikke of store.nikkes) {
    const fields = changes.nikkeFields.get(nikke.name);
    if (!fields) continue;
    const update: Record<string, string> = {};
    if (fields.has('limit')) update['돌파/코어'] = clean(nikke.limit);
    if (fields.has('skills')) update['스킬 1/2/버스트'] = clean(nikke.skills);
    if (fields.has('collection')) update['애장품/소장품'] = clean(nikke.collection);
    if (fields.has('overload')) update['오버로드 장비'] = clean(nikke.overload);
    if (Object.keys(update).length) characterUpdates.set(nikke.name, update);
  }
  if (characterUpdates.size) next = updateSectionTable(next, '캐릭터별 확인 현황', characterUpdates, (name, headers) => headers.map((header, index) => index === 0 ? name : header === '보유' ? '보유' : '미확인'));
  for (const nikke of store.nikkes) {
    if (!changes.nikkeFields.get(nikke.name)?.has('limit') || !nikke.limit) continue;
    const escaped = nikke.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    next = next.replace(new RegExp(`(${escaped}\\()([^)]*)(\\))`), `$1${mdCell(nikke.limit)}$3`);
  }
  if ([...changes.nikkeFields.values()].some(fields => fields.has('rarity') || fields.has('corporation'))) {
    const baseline = parseManagedTable(next, 'character-metadata');
    const metadata = new Map(baseline.rows.map(row => [row[0], { rarity: row[1] ?? '', corporation: row[2] ?? '' }]));
    for (const nikke of store.nikkes) {
      const fields = changes.nikkeFields.get(nikke.name);
      if (!fields?.has('rarity') && !fields?.has('corporation')) continue;
      const row = metadata.get(nikke.name) ?? { rarity: '', corporation: '' };
      if (fields.has('rarity')) row.rarity = clean(nikke.rarity);
      if (fields.has('corporation')) row.corporation = clean(nikke.corporation);
      metadata.set(nikke.name, row);
    }
    const rows = [...metadata.entries()].map(([name, value]) => `| ${mdCell(name)} | ${mdCell(value.rarity)} | ${mdCell(value.corporation)} |`).join('\n');
    next = upsertManagedBlock(next, 'character-metadata', `## 사이트 편집 캐릭터 메타데이터\n\n| 캐릭터 | 레어도 | 기업 |\n| --- | --- | --- |\n${rows}`);
  }
  return next;
}

function updateCombatDocument(content: string, store: SyncStore, changes: ChangeSet) {
  let next = lf(content);
  const updates = new Map<string, Record<string, string>>();
  for (const nikke of store.nikkes) {
    const fields = changes.nikkeFields.get(nikke.name);
    if (!fields) continue;
    const update: Record<string, string> = {};
    if (fields.has('power')) update['전투력'] = clean(nikke.power);
    if (fields.has('skills')) update['스킬'] = clean(nikke.skills);
    if (fields.has('overload')) update['오버로드'] = clean(nikke.overload);
    if (Object.keys(update).length) updates.set(nikke.name, update);
  }
  if (updates.size) {
    const lines = next.split('\n');
    const range = tableRange(lines, 0, lines.length);
    if (!range) throw new Error('combat-status.md의 전투 현황 표를 찾을 수 없습니다.');
    const headers = splitTableRow(lines[range.header]);
    const seen = new Set<string>();
    for (let index = range.rowsStart; index < range.end; index += 1) {
      const cells = splitTableRow(lines[index]);
      const update = updates.get(cells[0]);
      if (!update) continue;
      seen.add(cells[0]);
      for (const [header, value] of Object.entries(update)) {
        const column = headers.findIndex(item => item.includes(header));
        if (column >= 0 && value) cells[column] = mdCell(value);
      }
      lines[index] = joinTableRow(cells);
    }
    const additions = [...updates.entries()].filter(([name]) => !seen.has(name)).map(([name, update]) => joinTableRow(headers.map((header, index) => {
      if (index === 0) return name;
      return Object.entries(update).find(([needle]) => header.includes(needle))?.[1] || '미확인';
    })));
    lines.splice(range.end, 0, ...additions);
    next = lines.join('\n');
  }
  if ([...changes.nikkeFields.values()].some(fields => fields.has('level'))) {
    const baseline = parseManagedTable(next, 'character-levels');
    const levels = new Map(baseline.rows.map(row => [row[0], row[1] ?? '']));
    for (const nikke of store.nikkes) if (changes.nikkeFields.get(nikke.name)?.has('level')) levels.set(nikke.name, clean(nikke.level));
    const rows = [...levels.entries()].map(([name, value]) => `| ${mdCell(name)} | ${mdCell(value)} |`).join('\n');
    next = upsertManagedBlock(next, 'character-levels', `## 사이트 편집 캐릭터 레벨\n\n| 캐릭터 | 레벨 |\n| --- | ---: |\n${rows}`);
  }
  return next;
}

function updateSkillLevelsInSection(section: string, levels: string) {
  const values = levels.split('/').map(value => value.trim());
  if (values.length !== 3 || values.some(value => !/^\d+$/.test(value))) return section;
  let next = section.replace(/(- (?:현재 )?스킬 레벨(?: 요약)?:\s*`)\d+\s*\/\s*\d+\s*\/\s*\d+(`)/g, `$1${values.join('/')}$2`);
  const slotIndex: Record<string, number> = { '스킬 1': 0, '스킬 2': 1, 버스트: 2 };
  next = next.split('\n').map(line => {
    if (line.trim().startsWith('|')) {
      const cells = splitTableRow(line);
      const index = slotIndex[cells[0]];
      if (index !== undefined && cells.length >= 3 && /^\d+$/.test(cells[cells.length - 1])) { cells[cells.length - 1] = values[index]; return joinTableRow(cells); }
    }
    const heading = line.match(/^(##\s+(스킬 1|스킬 2|버스트).*?\(레벨\s*)\d+/);
    if (heading) return line.replace(/(\(레벨\s*)\d+/, `$1${values[slotIndex[heading[2]]]}`);
    return line;
  }).join('\n');
  return next;
}

function updateAllCharacterSections(content: string, name: string, transform: (section: string) => string) {
  const { lines, sections } = exactCharacterSections(content, name);
  for (const section of [...sections].reverse()) lines.splice(section.start, section.end - section.start, ...transform(lines.slice(section.start, section.end).join('\n')).split('\n'));
  return { content: lines.join('\n'), found: sections.length > 0 };
}

function updateSkillDocument(content: string, store: SyncStore, changes: ChangeSet) {
  let next = lf(content);
  for (const nikke of store.nikkes) {
    const fields = changes.nikkeFields.get(nikke.name);
    if (!fields) continue;
    const skills = clean(nikke.skills);
    if (fields.has('skills') && skills) {
      const updated = updateAllCharacterSections(next, nikke.name, section => updateSkillLevelsInSection(section, skills));
      next = updated.content;
      if (!updated.found || !next.includes(skills)) next = upsertCharacterBlock(next, nikke.name, 'skills-level', '사이트 편집 스킬 레벨', skills);
    }
    if (fields.has('skillNotes') && nikke.skillNotes) next = upsertCharacterBlock(next, nikke.name, 'skills-note', '사이트 편집 스킬 상세', nikke.skillNotes);
  }
  return next;
}

function normalizeClassificationTarget(kind: keyof typeof CLASSIFICATION_CONFIG, value: string) {
  const normalized = clean(value).normalize('NFKC');
  if (kind === 'class') return ({ ATTACKER: '화력형', DEFENDER: '방어형', SUPPORTER: '지원형', 화력형: '화력형', 방어형: '방어형', 지원형: '지원형' } as Record<string, string>)[normalized.toUpperCase()] ?? '';
  if (kind === 'burst') {
    const compact = normalized.replace(/버스트|단계|\s/g, '').toUpperCase();
    return ({ '1': '버스트 1', I: '버스트 1', 'Ⅰ': '버스트 1', '2': '버스트 2', II: '버스트 2', 'Ⅱ': '버스트 2', '3': '버스트 3', III: '버스트 3', 'Ⅲ': '버스트 3' } as Record<string, string>)[compact] ?? '';
  }
  if (kind === 'weapon') {
    const token = normalized.toUpperCase().match(/SMG|RL|AR|SG|SR|MG/)?.[0];
    return CLASSIFICATION_CONFIG.weapon.headings.find(heading => heading.startsWith(token ?? '__')) ?? '';
  }
  return CLASSIFICATION_CONFIG.element.headings.find(heading => heading === normalized) ?? '';
}

function replaceClassificationSection(content: string, title: string, names: string[]) {
  const lines = lf(content).split('\n');
  const start = headingIndex(lines, title, 2);
  if (start < 0) throw new Error(`${title} 분류 구간을 찾을 수 없습니다.`);
  const end = sectionEnd(lines, start, 2);
  lines.splice(start + 1, end - start - 1, '', `${names.join(', ')}${names.length ? '.' : ''}`, '');
  return lines.join('\n');
}

function updateClassificationDocument(content: string, kind: keyof typeof CLASSIFICATION_CONFIG, store: SyncStore, changes: ChangeSet) {
  const config = CLASSIFICATION_CONFIG[kind];
  const groups = new Map<string, string[]>(config.headings.map(heading => [heading, sectionNames(content, heading)]));
  for (const nikke of store.nikkes) {
    if (!changes.nikkeFields.get(nikke.name)?.has(kind)) continue;
    const target = normalizeClassificationTarget(kind, clean(nikke[kind]));
    if (!target) throw new Error(`${nikke.name}의 ${CATEGORY_LABELS[kind]} 값이 올바르지 않습니다: ${nikke[kind]}`);
    for (const [heading, names] of groups) groups.set(heading, names.filter(name => name !== nikke.name));
    groups.set(target, [...new Set([...(groups.get(target) ?? []), nikke.name])]);
  }
  let next = lf(content);
  for (const heading of [...config.headings].reverse()) next = replaceClassificationSection(next, heading, groups.get(heading) ?? []);
  return next;
}

function applyReference(reference: string, content: string, store: SyncStore, changes: ChangeSet) {
  if (reference === 'references/account-status.md') return updateAccountDocument(content, store, changes);
  if (reference === 'references/combat-status.md') return updateCombatDocument(content, store, changes);
  if (reference === 'references/skill-details.md') return updateSkillDocument(content, store, changes);
  if (reference === 'references/overload-details.md') {
    let next = lf(content);
    for (const nikke of store.nikkes) if (changes.nikkeFields.get(nikke.name)?.has('overload')) next = upsertCharacterBlock(next, nikke.name, 'overload', '사이트 편집 오버로드 상세', clean(nikke.overload));
    return next;
  }
  if (reference === 'references/collection-details.md') {
    let next = lf(content);
    for (const nikke of store.nikkes) if (changes.nikkeFields.get(nikke.name)?.has('collection')) next = upsertCharacterBlock(next, nikke.name, 'collection', '사이트 편집 소장품·애장품 상세', clean(nikke.collection));
    return next;
  }
  for (const kind of Object.keys(CLASSIFICATION_CONFIG) as Array<keyof typeof CLASSIFICATION_CONFIG>) if (reference === CLASSIFICATION_CONFIG[kind].file) return updateClassificationDocument(content, kind, store, changes);
  throw new Error(`지원하지 않는 reference 경로입니다: ${reference}`);
}

function addPlanFile(files: PlannedFile[], path: string, previous: string | null, content: string, reason: string) {
  const normalizedPrevious = previous === null ? null : lf(previous);
  const normalizedContent = lf(content);
  if (normalizedPrevious === normalizedContent) return;
  files.push({ path, content: normalizedContent, previousContent: normalizedPrevious, reason,
    previousLines: normalizedPrevious ? normalizedPrevious.split('\n').length : 0, nextLines: normalizedContent.split('\n').length,
    status: previous === null ? 'create' : 'update' });
}

export function requiredRemotePaths() {
  return [`${CANONICAL_ROOT}/SKILL.md`, `${MIRROR_ROOT}/SKILL.md`, `${CANONICAL_ROOT}/${CACHE_FILE}`, `${MIRROR_ROOT}/${CACHE_FILE}`,
    ...REFERENCES.flatMap(reference => [`${CANONICAL_ROOT}/${reference}`, `${MIRROR_ROOT}/${reference}`])];
}

export function buildSyncPlan(value: SyncStore, remote: RemoteFiles): SyncPlan {
  const store = normalizeSyncStore(value);
  for (const reference of REFERENCES) {
    const path = `${CANONICAL_ROOT}/${reference}`;
    if (remote[path] === null || remote[path] === undefined) throw new Error(`${path}를 찾을 수 없습니다.`);
  }
  const baseline = parseMarkdownDatabase(remote, store.updatedAt || '');
  const changes = detectChanges(baseline, store);
  const files: PlannedFile[] = [];
  const nextRemote: RemoteFiles = { ...remote };
  const canonicalSkillPath = `${CANONICAL_ROOT}/SKILL.md`;
  const canonicalSkill = remote[canonicalSkillPath];
  if (canonicalSkill === null || canonicalSkill === undefined) throw new Error('nikke-account-status/SKILL.md를 찾을 수 없습니다.');
  const nextSkill = restoreSkillPolicy(canonicalSkill);
  addPlanFile(files, canonicalSkillPath, canonicalSkill, nextSkill, 'Markdown references를 기준 자료로 복원');
  addPlanFile(files, `${MIRROR_ROOT}/SKILL.md`, remote[`${MIRROR_ROOT}/SKILL.md`] ?? null, nextSkill, '스킬 복사본을 canonical SKILL.md와 일치시킴');
  nextRemote[canonicalSkillPath] = nextSkill;
  nextRemote[`${MIRROR_ROOT}/SKILL.md`] = nextSkill;
  const references = new Set(changes.categories.flatMap(category => REFERENCE_BY_CATEGORY[category]));
  for (const reference of REFERENCES) {
    const canonicalPath = `${CANONICAL_ROOT}/${reference}`;
    const previous = remote[canonicalPath] as string;
    const legacyId = reference.replace(/[^a-z-]/gi, '-');
    const withoutLegacyJsonSummary = removeManagedBlock(previous, legacyId);
    const next = references.has(reference) ? applyReference(reference, withoutLegacyJsonSummary, store, changes) : withoutLegacyJsonSummary;
    const reason = references.has(reference) ? REFERENCE_REASON[reference] : '이전 JSON 단일 원본에서 생성된 중복 요약 제거';
    addPlanFile(files, canonicalPath, previous, next, reason);
    addPlanFile(files, `${MIRROR_ROOT}/${reference}`, remote[`${MIRROR_ROOT}/${reference}`] ?? null, next, `${reason} · 복사본 동기화`);
    nextRemote[canonicalPath] = next;
    nextRemote[`${MIRROR_ROOT}/${reference}`] = next;
  }
  const sourceData = parseMarkdownDatabase(nextRemote, store.updatedAt || baseline.generatedAt);
  const cacheContent = `${JSON.stringify(sourceData, null, 2)}\n`;
  const cachePath = `${CANONICAL_ROOT}/${CACHE_FILE}`;
  addPlanFile(files, cachePath, remote[cachePath] ?? null, cacheContent, '갱신된 Markdown DB를 다시 읽어 사이트 캐시 자동 재생성');
  addPlanFile(files, `${MIRROR_ROOT}/${CACHE_FILE}`, remote[`${MIRROR_ROOT}/${CACHE_FILE}`] ?? null, cacheContent, '자동 생성 캐시 복사본 동기화');
  return { categories: changes.categories, sourceData, files };
}
