'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import nikkeImages from './nikke-images.json';
import nikkeDetails from './nikke-details.json';
import nikkeLatestDetails from './nikke-latest-details.json';
import nikkeSkillImages from './nikke-skill-images.json';
import nikkeFilterData from './nikke-filter-data.json';
import soloRaidSeeds from './solo-raid-seeds.json';
import siteAccountData from './site-account-data.json';
import { burstStages, nikkeClassLabel, normalizeBurstLabel, normalizeNikkeClass } from './lib/nikke-classification';

type Nikke = { id: string; name: string; limit: string; skills: string; skillNotes: string; level: string; power: string; element: string; weapon: string; burst: string; class: string; corporation: string; rarity: string; collection: string; overload: string; favorite: boolean };
type RaidTeam = { nikkes: string; damage: number; memo: string };
type Raid = { id: string; boss: string; date: string; damage: number; rank: string; memo: string; bossPattern: string; strategy: string; teams: RaidTeam[] };
type Account = { commander: string; server: string; uid: string; commanderLevel: string; synchro: string; outpost: string; power: string; jewels: string; goldMileage: string; silverMileage: string; coreDust: string; goal: string };
type Store = { account: Account; nikkes: Nikke[]; raids: Raid[]; updatedAt: string };
type DetailLine = { level: number; text: string };
type DetailTable = { header: string[]; rows: string[][] };
type DetailSection = { summary: DetailLine[]; tables: DetailTable[] };
type NikkeDetail = {
  classification: { element?: string; weapon?: string; class?: string; burst?: string };
  combat: { power?: number; skills?: string; overload?: string };
  accountNotes: DetailLine[];
  collection: DetailSection | null;
  overload: DetailSection | null;
  skills: Array<{ slot: string; name: string; meta: string; effects: DetailLine[] }>;
};
type NikkeFilterMeta = { rarity: string; class: string; corporation: string; weapon: string; element: string; burst: string; order: number };
type SyncPreview = { repository: string; baseBranch: string; baseSha: string; canCreatePr: boolean; categories: string[]; files: Array<{ path: string; reason: string; status: 'create' | 'update'; previousLines: number; nextLines: number }> };
type SyncFileDiff = { baseSha: string; path: string; reason: string; status: 'create' | 'update'; previousLines: number; nextLines: number; removedLines: number; addedLines: number; scope: string; lines: Array<{ type: 'context' | 'add' | 'remove'; text: string; oldLine: number | null; newLine: number | null }> };
type FilterKey = 'class' | 'corporation' | 'weapon' | 'element';
type SortKey = '' | 'power' | 'limit' | 'rarity';
type CollectionFilters = { burst: string; class: string; corporation: string; weapon: string; element: string; sort: SortKey; direction: 'asc' | 'desc' };
type FilterOption = { value: string; label: string };
type EquipmentPart = 'helmet' | 'armor' | 'gloves' | 'boots';
type AccountSeed = { generatedAt?: string; account?: Partial<Account>; nikkes?: Array<Partial<Nikke> & { name: string }> };

const EMPTY: Store = { account: { commander: '', server: '', uid: '', commanderLevel: '', synchro: '', outpost: '', power: '', jewels: '', goldMileage: '', silverMileage: '', coreDust: '', goal: '' }, nikkes: [], raids: [], updatedAt: '' };
const KEY = 'oh-my-commander-v1';
const ACCOUNT_SEED_KEY = 'oh-my-commander-account-seed-version';
const RAID_SEED_KEY = 'oh-my-commander-solo-raid-seed-v1';
const RAID_SEED_VERSION = 'github-main-2026-08-27';
const NIKKE_IMAGES = nikkeImages as Record<string, string>;
const NIKKE_SKILL_IMAGES = nikkeSkillImages as Record<string, Array<string | null>>;
const NIKKE_FILTER_DATA = {
  ...(nikkeFilterData as Record<string, NikkeFilterMeta>),
  '유키코': { rarity: 'SSR', class: 'Attacker', corporation: '', weapon: 'MG', element: '작열', burst: 'Ⅲ', order: 10181 },
};
const NIKKE_DETAILS = {
  ...(nikkeDetails as { characters: Record<string, NikkeDetail> }).characters,
  ...(nikkeLatestDetails as { characters: Record<string, NikkeDetail> }).characters,
};
const SOLO_RAID_SEEDS = soloRaidSeeds as Raid[];
const SITE_ACCOUNT_DATA = siteAccountData as AccountSeed;
const RAID_CARD_IMAGES: Record<string, { src: string; alt: string; kind: string }> = {
  '애니힐리오': { src: '/solo-raid-annihilio.png', alt: '솔로 레이드 보스 애니힐리오', kind: 'annihilio' },
  '아일랜드이터': { src: '/solo-raid-island-eater.png', alt: '솔로 레이드 보스 아일랜드 이터', kind: 'island-eater' },
};
const nav = [['overview', '⌂', '대시보드'], ['collection', '◇', '니케 명단'], ['raid', '✦', '솔로 레이드'], ['account', '◎', '계정 정보'], ['settings', '⚙', '설정 · 백업']];
const EMPTY_FILTERS: CollectionFilters = { burst: '', class: '', corporation: '', weapon: '', element: '', sort: '', direction: 'desc' };
const filterOptions = (...values: string[]): FilterOption[] => values.map(value => ({ value, label: value }));
const FILTER_GROUPS: Array<{ key: FilterKey; label: string; options: FilterOption[] }> = [
  { key: 'class', label: '클래스', options: [{ value: 'Attacker', label: '화력형' }, { value: 'Defender', label: '방어형' }, { value: 'Supporter', label: '지원형' }] },
  { key: 'corporation', label: '기업', options: filterOptions('ELYSION', 'MISSILIS', 'TETRA', 'PILGRIM', 'ABNORMAL') },
  { key: 'weapon', label: '무기', options: filterOptions('SMG', 'RL', 'AR', 'SG', 'SR', 'MG') },
  { key: 'element', label: '속성', options: filterOptions('전격', '작열', '풍압', '수냉', '철갑') },
];
const SORT_OPTIONS: Array<{ key: Exclude<SortKey, ''>; label: string }> = [
  { key: 'power', label: '전투력' },
  { key: 'limit', label: '한계 돌파' },
  { key: 'rarity', label: '레어도' },
];
const EQUIPMENT_PARTS: Array<{ key: EquipmentPart; label: string; aliases: string[] }> = [
  { key: 'helmet', label: '헬멧', aliases: ['헬멧', 'helmet'] },
  { key: 'armor', label: '갑옷', aliases: ['갑옷', 'armor'] },
  { key: 'gloves', label: '팔', aliases: ['팔', '장갑', 'gloves', 'arm'] },
  { key: 'boots', label: '다리', aliases: ['다리', '부츠', 'boots', 'leg'] },
];
const COMPANY_FILE_KEYS: Record<string, string> = {
  TETRA: 'tetra', '테트라': 'tetra',
  MISSILIS: 'missilis', '미실리스': 'missilis',
  ELYSION: 'elysion', '엘리시온': 'elysion',
  PILGRIM: 'pilgrim', '필그림': 'pilgrim',
  ABNORMAL: 'abnormal', '어브노멀': 'abnormal',
};
const ROLE_FILE_KEYS: Record<string, string> = { Attacker: 'attacker', Defender: 'defender', Supporter: 'supporter' };
const ACCOUNT_SEED_ALIASES: Record<string, string> = {
  '소다 : 트윙클링 바니(바니 소다)': '소다 : 트윙클링 바니',
  '사쿠라 : 블룸 인 서머(수로시)': '사쿠라 : 블룸 인 서머',
  '아니스 : 스파클링 서머(수니스)': '아니스 : 스파클링 서머',
  '라피: 레드 후드': '라피 : 레드 후드',
  '브리드 : 사일런트 트랙(브리드 이격)': '브리드 : 사일런트 트랙',
  '미하라 : 본딩 체인(미하라 오버스펙)': '미하라 : 본딩 체인',
  '디젤 : 윈터 스위츠(디젤 이격)': '디젤 : 윈터 스위츠',
};

function limitScore(value: string) {
  const number = Number(value.match(/\d+/)?.[0] ?? 0);
  return value.includes('코어') ? 10 + number : number;
}

function raidCardImage(boss: string) {
  return RAID_CARD_IMAGES[boss.replace(/\s+/g, '')];
}

function equipmentPartFromLabel(label?: string) {
  const normalized = label?.trim().toLocaleLowerCase('ko-KR') || '';
  return EQUIPMENT_PARTS.find(part => part.aliases.some(alias => alias.toLocaleLowerCase('ko-KR') === normalized));
}

function isOverloadEquipmentState(state?: string) {
  const value = state?.trim() || '';
  return Boolean(value) && !/일반\s*장비|미착용|없음|^[-—]$/.test(value);
}

function overloadIconPath(nikke: Nikke, detail: NikkeDetail | undefined, part: EquipmentPart) {
  const companyValue = (nikke.corporation || NIKKE_FILTER_DATA[nikke.name]?.corporation || '').trim();
  const company = COMPANY_FILE_KEYS[companyValue.normalize('NFKC').toUpperCase()] || COMPANY_FILE_KEYS[companyValue];
  const role = ROLE_FILE_KEYS[normalizeNikkeClass(nikke.class || detail?.classification.class)];
  return company && role ? `/overload-equipment/ol_${company}_${role}_${part}.png` : '';
}

function normalizeNikkes(items: Nikke[]): Nikke[] {
  return items.map((item) => {
    let name = item.name;
    let limit = item.limit;
    if (name === '퀸' && limit === '마코토') { name = '퀸(마코토)'; limit = '0돌'; }
    if (name === 'E.H') name = 'E.H.';
    if (name === '솔져 E.G') name = '솔져 E.G.';
    if (name === '솔져 F.A') name = '솔져 F.A.';
    if (name === '솔져 O.W') name = '솔져 O.W.';
    const detail = NIKKE_DETAILS[name];
    const meta = NIKKE_FILTER_DATA[name];
    return {
      ...item,
      name,
      limit,
      skills: item.skills || detail?.combat.skills || '',
      skillNotes: item.skillNotes || '',
      level: item.level || '',
      power: item.power || String(detail?.combat.power || ''),
      element: item.element || detail?.classification.element || meta?.element || '',
      weapon: item.weapon || detail?.classification.weapon || meta?.weapon || '',
      burst: normalizeBurstLabel(item.burst || detail?.classification.burst || meta?.burst),
      class: normalizeNikkeClass(item.class || detail?.classification.class || meta?.class),
      corporation: item.corporation || meta?.corporation || '',
      rarity: item.rarity || meta?.rarity || '',
      collection: item.collection || '',
      overload: item.overload || detail?.combat.overload || '',
      favorite: Boolean(item.favorite),
    };
  });
}

function canonicalSeedNikkes(seed: AccountSeed) {
  const merged = new Map<string, Partial<Nikke> & { name: string }>();
  (seed.nikkes || []).forEach(item => {
    const name = ACCOUNT_SEED_ALIASES[item.name] || item.name;
    if (!name || name === '액솔루트 소속 3명') return;
    merged.set(name, { ...(merged.get(name) || {}), ...item, name });
  });
  return [...merged.values()];
}

function mergeAccountSeed(current: Store, seed: AccountSeed): Store {
  const existingByName = new Map(current.nikkes.map(nikke => [ACCOUNT_SEED_ALIASES[nikke.name] || nikke.name, nikke]));
  const seeded = canonicalSeedNikkes(seed).map((item, index) => {
    const existing = existingByName.get(item.name);
    return {
      id: existing?.id || `github-account-${index + 1}`,
      name: item.name,
      limit: item.limit || existing?.limit || '',
      skills: item.skills || existing?.skills || '',
      skillNotes: existing?.skillNotes || '',
      level: existing?.level || '',
      power: item.power || existing?.power || '',
      element: item.element || existing?.element || '',
      weapon: item.weapon || existing?.weapon || '',
      burst: item.burst || existing?.burst || '',
      class: item.class || existing?.class || '',
      corporation: item.corporation || existing?.corporation || '',
      rarity: item.rarity || existing?.rarity || '',
      collection: item.collection || existing?.collection || '',
      overload: item.overload || existing?.overload || '',
      favorite: existing?.favorite || false,
    } satisfies Nikke;
  });
  const seededNames = new Set(seeded.map(nikke => nikke.name));
  const localOnly = current.nikkes.filter(nikke => !seededNames.has(ACCOUNT_SEED_ALIASES[nikke.name] || nikke.name));
  return {
    ...current,
    account: { ...current.account, ...(seed.account || {}) },
    nikkes: normalizeNikkes([...seeded, ...localOnly]),
    updatedAt: seed.generatedAt || current.updatedAt,
  };
}

function isNewerAccountSeedVersion(currentVersion: string, nextVersion: string) {
  if (!nextVersion || currentVersion === nextVersion) return false;
  const currentTime = Date.parse(currentVersion);
  const nextTime = Date.parse(nextVersion);
  if (Number.isFinite(currentTime) && Number.isFinite(nextTime)) return nextTime > currentTime;
  return true;
}

function emptyRaidTeams(): RaidTeam[] {
  return Array.from({ length: 5 }, () => ({ nikkes: '', damage: 0, memo: '' }));
}

function normalizeRaids(items: Raid[]): Raid[] {
  return items.map(item => ({
    ...item,
    bossPattern: item.bossPattern || '',
    strategy: item.strategy || '',
    memo: item.memo || '',
    teams: emptyRaidTeams().map((empty, index) => ({ ...empty, ...(item.teams?.[index] || {}) })),
  }));
}

function mergeRaidSeeds(items: Raid[], seeds: Raid[]): Raid[] {
  const normalized = normalizeRaids(items);
  const keyFor = (value: string) => value.replace(/\s+/g, '').toLocaleLowerCase('ko-KR');
  const present = (value?: string) => Boolean(value?.trim());
  const result = [...normalized];

  seeds.forEach(seedValue => {
    const seed = normalizeRaids([seedValue])[0];
    const index = result.findIndex(item => keyFor(item.boss) === keyFor(seed.boss));
    if (index < 0) {
      result.push(seed);
      return;
    }

    const current = result[index];
    result[index] = {
      ...seed,
      ...current,
      id: current.id || seed.id,
      boss: present(current.boss) ? current.boss : seed.boss,
      date: present(current.date) ? current.date : seed.date,
      damage: current.damage > 0 ? current.damage : seed.damage,
      rank: present(current.rank) ? current.rank : seed.rank,
      memo: present(current.memo) ? current.memo : seed.memo,
      bossPattern: present(current.bossPattern) ? current.bossPattern : seed.bossPattern,
      strategy: present(current.strategy) ? current.strategy : seed.strategy,
      teams: seed.teams.map((seedTeam, teamIndex) => {
        const currentTeam = current.teams[teamIndex];
        return {
          nikkes: present(currentTeam?.nikkes) ? currentTeam.nikkes : seedTeam.nikkes,
          damage: currentTeam?.damage > 0 ? currentTeam.damage : seedTeam.damage,
          memo: present(currentTeam?.memo) ? currentTeam.memo : seedTeam.memo,
        };
      }),
    };
  });

  return result;
}

export default function Home() {
  const [store, setStore] = useState<Store>(EMPTY);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState('overview');
  const [modal, setModal] = useState<'nikke' | 'raid' | null>(null);
  const [selectedNikke, setSelectedNikke] = useState<Nikke | null>(null);
  const [selectedRaid, setSelectedRaid] = useState<Raid | null>(null);
  const [editingNikke, setEditingNikke] = useState<Nikke | null>(null);
  const [editingRaid, setEditingRaid] = useState<Raid | null>(null);
  const [query, setQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filters, setFilters] = useState<CollectionFilters>(EMPTY_FILTERS);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let cancelled = false;
    let nextStore: Store = EMPTY;
    try {
      const saved = localStorage.getItem(KEY);
      const accountSeedVersion = SITE_ACCOUNT_DATA.generatedAt || 'bundled-2026-08-27';
      const accountSeedApplied = localStorage.getItem(ACCOUNT_SEED_KEY) === accountSeedVersion;
      const seedApplied = localStorage.getItem(RAID_SEED_KEY) === RAID_SEED_VERSION;
      if (saved) {
        const parsed = JSON.parse(saved);
        nextStore = { ...parsed, nikkes: normalizeNikkes(parsed.nikkes || []), raids: normalizeRaids(parsed.raids || []) };
      }
      if (!accountSeedApplied || !saved) {
        nextStore = mergeAccountSeed(nextStore, SITE_ACCOUNT_DATA);
        localStorage.setItem(ACCOUNT_SEED_KEY, accountSeedVersion);
      }
      if (!seedApplied) {
        nextStore = { ...nextStore, raids: mergeRaidSeeds(nextStore.raids || [], SOLO_RAID_SEEDS) };
        localStorage.setItem(RAID_SEED_KEY, RAID_SEED_VERSION);
      }
    } catch {}
    queueMicrotask(() => {
      if (cancelled) return;
      setStore(nextStore);
      setReady(true);
    });
    const refreshCanonicalCache = () => {
      fetch('/api/github-account-data', { cache: 'no-store' })
        .then(response => response.ok ? response.json() as Promise<AccountSeed> : null)
        .then(remoteSeed => {
          if (cancelled || !remoteSeed) return;
          const version = remoteSeed.generatedAt || '';
          const appliedVersion = localStorage.getItem(ACCOUNT_SEED_KEY) || '';
          if (!isNewerAccountSeedVersion(appliedVersion, version)) return;
          setStore(current => mergeAccountSeed(current, remoteSeed));
          localStorage.setItem(ACCOUNT_SEED_KEY, version);
        })
        .catch(() => {});
    };
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') refreshCanonicalCache(); };
    refreshCanonicalCache();
    const refreshTimer = window.setInterval(refreshCanonicalCache, 60_000);
    window.addEventListener('focus', refreshCanonicalCache);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
      window.removeEventListener('focus', refreshCanonicalCache);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(KEY, JSON.stringify({ ...store, updatedAt: new Date().toISOString() })); }, [store, ready]);
  useEffect(() => { if (!sidebarOpen) return; const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setSidebarOpen(false); const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'; window.addEventListener('keydown', onKey); return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', onKey); }; }, [sidebarOpen]);
  const totalDamage = store.raids.reduce((sum, raid) => sum + raid.damage, 0);
  const bestRaid = useMemo(() => [...store.raids].sort((a,b) => b.damage-a.damage)[0], [store.raids]);
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const items = store.nikkes.filter((nikke) => {
      const meta = NIKKE_FILTER_DATA[nikke.name];
      if (!nikke.name.toLowerCase().includes(normalizedQuery)) return false;
      if (filters.burst && !burstStages(nikke.burst || meta?.burst).includes(filters.burst as 'Ⅰ' | 'Ⅱ' | 'Ⅲ')) return false;
      if (filters.class && normalizeNikkeClass(nikke.class || meta?.class) !== filters.class) return false;
      if (filters.corporation && (nikke.corporation || meta?.corporation) !== filters.corporation) return false;
      if (filters.weapon && (nikke.weapon || meta?.weapon) !== filters.weapon) return false;
      if (filters.element && (nikke.element || meta?.element) !== filters.element) return false;
      return true;
    });
    if (!filters.sort) return items;
    const rarityScore: Record<string, number> = { R: 1, SR: 2, SSR: 3 };
    return [...items].sort((a, b) => {
      const aMeta = NIKKE_FILTER_DATA[a.name];
      const bMeta = NIKKE_FILTER_DATA[b.name];
      const aValue = filters.sort === 'power' ? Number(a.power || NIKKE_DETAILS[a.name]?.combat.power || 0) : filters.sort === 'limit' ? limitScore(a.limit) : (rarityScore[a.rarity || aMeta?.rarity] ?? 0);
      const bValue = filters.sort === 'power' ? Number(b.power || NIKKE_DETAILS[b.name]?.combat.power || 0) : filters.sort === 'limit' ? limitScore(b.limit) : (rarityScore[b.rarity || bMeta?.rarity] ?? 0);
      return filters.direction === 'desc' ? bValue - aValue : aValue - bValue;
    });
  }, [store.nikkes, query, filters]);
  const activeFilterCount = [filters.burst, filters.class, filters.corporation, filters.weapon, filters.element].filter(Boolean).length;
  const toggleFilter = (key: FilterKey, value: string) => setFilters(current => ({ ...current, [key]: current[key] === value ? '' : value }));
  const toggleSort = (sort: Exclude<SortKey, ''>) => setFilters(current => current.sort === sort ? { ...current, direction: current.direction === 'desc' ? 'asc' : 'desc' } : { ...current, sort, direction: 'desc' });
  const resetFilters = () => { setFilters(EMPTY_FILTERS); setQuery(''); };
  const setAccount = (key: keyof Account, value: string) => setStore(s => ({ ...s, account: { ...s.account, [key]: value } }));
  const formatDamage = (n: number) => n ? new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumFractionDigits: 1 }).format(n) : '—';
  const exportData = () => { const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `oh-my-commander-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(a.href); };
  const importData = async (file?: File) => { if (!file) return; try { const data = JSON.parse(await file.text()); if (!data.account || !Array.isArray(data.nikkes) || !Array.isArray(data.raids)) throw new Error(); setStore({ ...data, nikkes: normalizeNikkes(data.nikkes), raids: mergeRaidSeeds(data.raids, SOLO_RAID_SEEDS) }); } catch { alert('“오!나의지휘관” 백업 파일을 확인해 주세요.'); } };

  return <main className="app-shell">
    {sidebarOpen&&<><button className="sidebar-backdrop" aria-label="사이드바 닫기" onClick={()=>setSidebarOpen(false)}/><aside className="sidebar" aria-label="사이트 메뉴">
      <div className="sidebar-head"><button className="brand" onClick={() => { setView('overview'); setSidebarOpen(false); }}><span className="brand-mark">O!</span><span><b>오!나의지휘관</b><small>PRIVATE COMMAND CENTER</small></span></button><button className="sidebar-close" onClick={()=>setSidebarOpen(false)} aria-label="사이트 메뉴 닫기">×</button></div>
      <nav>{nav.map(([id, icon, label]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => { setView(id); setSidebarOpen(false); }}><i>{icon}</i><span>{label}</span>{id === 'collection' && store.nikkes.length > 0 && <em>{store.nikkes.length}</em>}</button>)}</nav>
      <div className="local-note"><span>●</span><div><b>기기 내 안전 저장</b><small>입력한 정보는 이 브라우저에만 보관됩니다.</small></div></div>
    </aside></>}
    <section className={`workspace ${view==='overview'?'overview-workspace':''}`}>
      <header className="topbar"><button className="menu-toggle" aria-expanded={sidebarOpen} onClick={()=>setSidebarOpen(true)}><span aria-hidden="true">☰</span><b>메뉴</b></button><div className="topbar-title">오!나의지휘관</div><div className="sync-state"><span>●</span> 로컬 저장됨</div><button className="icon-button" onClick={() => setView('settings')} aria-label="설정 열기">⚙</button><button className="avatar" onClick={() => setView('account')} aria-label="계정 정보 열기">{store.account.commander?.slice(0,1) || 'C'}</button></header>
      <div className={`content ${view==='overview'?'overview-content':''}`}>
        {view === 'overview' && <>
          <section className="commander-cover"><img src="/commander-cover.png" alt="미래 도시의 지휘관실에 모인 세 명의 니케" fetchPriority="high"/><div className="cover-shade"/><div className="cover-content"><p className="cover-eyebrow">PRIVATE COMMAND CENTER</p><h1>{store.account.commander ? `${store.account.commander} 지휘관님,` : '지휘관님,'}<br/><span>오늘도 승리를 준비해볼까요?</span></h1><p>내 계정의 성장과 기록을 한눈에 확인하세요.</p><div className="cover-actions"><button onClick={()=>setView('collection')}>니케 명단 보기</button><button onClick={()=>setView('account')}>계정 정보 입력</button></div></div><span className="cover-scroll">SCROLL TO DASHBOARD <i>↓</i></span></section>
          <div className="overview-dashboard">
          <section className="hero-card"><div><p className="label">SYNCHRO DEVICE</p><strong>{store.account.synchro || '—'}<small> LV</small></strong><p>싱크로 디바이스 레벨</p></div><div className="radar"><span/><span/><span/><b>ARK<br/>SYSTEM</b></div><img className="synchro-chibis" src="/synchro-chibis.png" alt="세 명의 니케 캐릭터"/><div className="hero-meta"><div><small>전투력</small><b>{store.account.power || '—'}</b></div><div><small>전초기지</small><b>{store.account.outpost || '—'}{store.account.outpost && ' LV'}</b></div><div><small>서버</small><b>{store.account.server || '—'}</b></div></div></section>
          <div className="section-title"><div><p className="eyebrow">ACCOUNT STATUS</p><h2>계정 현황</h2></div><button className="text-button" onClick={() => setView('account')}>전체 보기 →</button></div>
          <div className="stats-grid"><Stat icon="◇" label="보유 니케" value={String(store.nikkes.length)} unit="명" hint={store.nikkes.length ? `즐겨찾기 ${store.nikkes.filter(n=>n.favorite).length}명` : '첫 니케를 등록해 보세요'} onClick={()=>setView('collection')}/><Stat icon="✦" label="솔로 레이드 누적" value={formatDamage(totalDamage)} hint={bestRaid ? `최고 기록 · ${bestRaid.boss}` : '아직 기록이 없습니다'} onClick={()=>setView('raid')}/><Stat icon="◆" label="쥬얼" value={store.account.jewels || '—'} unit={store.account.jewels ? '개' : ''} hint="직접 입력한 보유량" onClick={()=>setView('account')}/><Stat icon="⌁" label="골드 마일리지" value={store.account.goldMileage || '—'} unit={store.account.goldMileage ? '장' : ''} hint="직접 입력한 보유량" onClick={()=>setView('account')}/></div>
          <div className="dashboard-lower"><section className="panel"><div className="panel-head"><div><p className="eyebrow">LATEST RAID</p><h3>최근 솔로 레이드</h3></div><button onClick={()=>setView('raid')}>기록 보기</button></div>{store.raids.length ? <div className="raid-list">{store.raids.slice(-3).reverse().map(r=><div key={r.id} role="button" tabIndex={0} onClick={()=>setSelectedRaid(r)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelectedRaid(r)}}}><span className="boss-badge">BOSS</span><div><b>{r.boss}</b><small>{r.date || '날짜 미입력'}</small></div><strong>{formatDamage(r.damage)}</strong><em>{r.rank || '순위 —'}</em></div>)}</div> : <Empty icon="✦" title="아직 레이드 기록이 없어요" copy="첫 시즌의 보스와 피해량을 기록해 보세요." action="＋ 기록 추가" onClick={()=>{setView('raid');setEditingRaid(null);setModal('raid')}}/>}</section>
          <section className="panel quick"><div className="panel-head"><div><p className="eyebrow">QUICK ACTION</p><h3>빠른 기록</h3></div></div><Quick icon="◇" title="니케 추가" copy="보유·육성 상태 기록" onClick={()=>{setView('collection');setEditingNikke(null);setModal('nikke')}}/><Quick icon="✦" title="레이드 기록" copy="시즌 성과 입력" onClick={()=>{setView('raid');setEditingRaid(null);setModal('raid')}}/><Quick icon="◎" title="계정 갱신" copy="재화와 레벨 수정" onClick={()=>setView('account')}/></section></div>
          </div>
        </>}
        {view === 'collection' && <Page title="니케 명단" eyebrow="NIKKE COLLECTION" copy="카드나 이미지를 누르면 스킬·장비·운용 상세 정보가 열립니다." action="＋ 니케 추가" onAction={()=>{setEditingNikke(null);setModal('nikke')}}>
          <section className="collection-controls">
            <div className="toolbar collection-toolbar">
              <label className="collection-search"><span aria-hidden="true">⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="니케 이름 검색" aria-label="니케 이름 검색"/></label>
              <div className="burst-tabs" aria-label="버스트 단계 필터">{[['','ALL'],['Ⅰ','Ⅰ'],['Ⅱ','Ⅱ'],['Ⅲ','Ⅲ']].map(([value,label])=><button key={label} className={filters.burst===value?'active':''} aria-pressed={filters.burst===value} onClick={()=>setFilters(current=>({...current,burst:value}))}>{label}</button>)}</div>
              <button className={`filter-trigger ${filterOpen||activeFilterCount?'active':''}`} aria-expanded={filterOpen} aria-controls="collection-filter-panel" onClick={()=>setFilterOpen(open=>!open)}><span aria-hidden="true">≡</span> 필터{activeFilterCount>0&&<b>{activeFilterCount}</b>}</button>
            </div>
            {filterOpen&&<CollectionFilterPanel filters={filters} resultCount={filtered.length} onToggle={toggleFilter} onSort={toggleSort} onReset={resetFilters} onClose={()=>setFilterOpen(false)}/>}
            <div className="collection-result"><span>상세 자료 {filtered.filter(n=>NIKKE_DETAILS[n.name]).length}명 · 검색 결과 {filtered.length}명</span>{(activeFilterCount>0||filters.sort||query)&&<button onClick={resetFilters}>모두 초기화</button>}</div>
          </section>
          {filtered.length ? <NikkeGrid nikkes={filtered} onSelect={setSelectedNikke} onEdit={nikke=>{setEditingNikke(nikke);setModal('nikke')}} onToggleFavorite={id=>setStore(s=>({...s,nikkes:s.nikkes.map(n=>n.id===id?{...n,favorite:!n.favorite}:n)}))} onDelete={id=>setStore(s=>({...s,nikkes:s.nikkes.filter(n=>n.id!==id)}))}/> : store.nikkes.length ? <Empty icon="⌕" title="조건에 맞는 니케가 없어요" copy="검색어나 선택한 필터를 바꿔 보세요." action="필터 초기화" onClick={resetFilters}/> : <Empty icon="◇" title="등록된 니케가 없어요" copy="내 계정에 보유한 니케를 직접 등록해 보세요." action="＋ 첫 니케 추가" onClick={()=>{setEditingNikke(null);setModal('nikke')}}/>}{/* collection results */}
        </Page>}
        {view === 'raid' && <Page title="솔로 레이드" eyebrow="SOLO RAID ARCHIVE" copy="카드를 누르면 보스 패턴과 1덱부터 5덱까지의 상세 기록이 열립니다." action="＋ 기록 추가" onAction={()=>{setEditingRaid(null);setModal('raid')}}>{store.raids.length ? <div className="raid-cards">{[...store.raids].reverse().map(r=>{const bossImage=raidCardImage(r.boss);return <article key={r.id} role="button" tabIndex={0} onClick={()=>setSelectedRaid(r)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelectedRaid(r)}}}>{bossImage&&<div className={`raid-card-media ${bossImage.kind}`}><img src={bossImage.src} alt={bossImage.alt} loading="lazy"/></div>}<div className="raid-card-body"><div className="raid-card-top"><span className="boss-badge">SOLO RAID</span><div className="raid-card-actions"><button onClick={event=>{event.stopPropagation();setEditingRaid(r);setModal('raid')}}>수정</button><button className="delete" onClick={event=>{event.stopPropagation();setStore(s=>({...s,raids:s.raids.filter(x=>x.id!==r.id)}))}}>삭제</button></div></div><h3>{r.boss}</h3><p>{r.date || '날짜 미입력'}</p><strong className="raid-card-damage">{r.damage.toLocaleString('ko-KR')}<small> DAMAGE</small></strong><footer><span>최종 순위</span><b>{r.rank||'—'}</b></footer>{r.memo&&<blockquote>{r.memo}</blockquote>}<span className="raid-open">상세 기록 보기 →</span></div></article>})}</div> : <Empty icon="✦" title="아직 레이드 기록이 없어요" copy="보스 패턴과 1~5덱 조합을 포함한 첫 기록을 남겨보세요." action="＋ 첫 기록 추가" onClick={()=>{setEditingRaid(null);setModal('raid')}}/>}</Page>}
        {view === 'account' && <Page title="계정 정보" eyebrow="ACCOUNT PROFILE" copy="게임 화면을 보며 필요한 항목만 입력하세요."><div className="form-card"><h3>지휘관 프로필</h3><div className="form-grid"><Field label="지휘관명" value={store.account.commander} onChange={v=>setAccount('commander',v)} placeholder="예: 홍길동"/><Field label="서버" value={store.account.server} onChange={v=>setAccount('server',v)} placeholder="예: Korea"/><Field label="UID" value={store.account.uid} onChange={v=>setAccount('uid',v)} placeholder="숫자 UID"/><Field label="지휘관 레벨" value={store.account.commanderLevel} onChange={v=>setAccount('commanderLevel',v)} type="number"/><Field label="싱크로 레벨" value={store.account.synchro} onChange={v=>setAccount('synchro',v)} type="number"/><Field label="전초기지 레벨" value={store.account.outpost} onChange={v=>setAccount('outpost',v)} type="number"/><Field label="메인덱 전투력" value={store.account.power} onChange={v=>setAccount('power',v)} type="number"/><Field label="시간당 코어 더스트" value={store.account.coreDust} onChange={v=>setAccount('coreDust',v)} type="number"/></div><h3>재화</h3><div className="form-grid"><Field label="쥬얼" value={store.account.jewels} onChange={v=>setAccount('jewels',v)} type="number"/><Field label="골드 마일리지" value={store.account.goldMileage} onChange={v=>setAccount('goldMileage',v)} type="number"/><Field label="실버 마일리지" value={store.account.silverMileage} onChange={v=>setAccount('silverMileage',v)} type="number"/><Field label="현재 목표" value={store.account.goal} onChange={v=>setAccount('goal',v)} placeholder="예: 솔로 레이드 in 10%"/></div><div className="saved-line">● 입력 즉시 이 기기에 자동 저장됩니다.</div><div className="account-sync-hint"><div><b>ChatGPT 스킬에는 아직 반영되지 않습니다.</b><p>일반 채팅에서 최신값을 불러오려면 변경 파일을 확인하고 GitHub PR을 생성·병합해야 합니다.</p></div><button className="secondary" onClick={()=>setView('settings')}>GitHub 반영하러 가기 →</button></div></div></Page>}
        {view === 'settings' && <Page title="설정 · 백업" eyebrow="PRIVATE DATA" copy="서버 계정 없이도 데이터를 안전하게 옮기고 보관하세요."><GithubSyncPanel store={store}/><div className="settings-grid"><Setting icon="↓" title="백업 내보내기" copy="현재 계정과 기록을 하나의 JSON 파일로 내려받습니다." action="백업 파일 저장" onClick={exportData}/><section className="setting-card"><i>↑</i><h3>백업 불러오기</h3><p>이전에 저장한 백업 파일로 현재 데이터를 복원합니다.</p><input ref={fileRef} type="file" accept="application/json" hidden onChange={e=>importData(e.target.files?.[0])}/><button className="secondary" onClick={()=>fileRef.current?.click()}>백업 파일 선택</button></section><section className="setting-card danger"><i>×</i><h3>모든 데이터 삭제</h3><p>이 브라우저에 저장된 계정 정보를 완전히 지웁니다.</p><button onClick={()=>{if(confirm('모든 입력 데이터를 삭제할까요?')){localStorage.removeItem(KEY);setStore(EMPTY)}}}>전체 삭제</button></section></div><div className="privacy-box"><b>🔒 개인정보 보호 방식</b><p>계정 데이터는 이 브라우저에 저장됩니다. GitHub 동기화는 미리보기 확인 후에만 PR로 전송되며, 기존 상세 기록·수동 메모·레이드 데이터는 유지됩니다.</p></div></Page>}
      </div>
    </section>
    {selectedNikke && <NikkeDetailModal nikke={selectedNikke} onClose={()=>setSelectedNikke(null)}/>}
    {selectedRaid && <RaidDetailModal raid={selectedRaid} onClose={()=>setSelectedRaid(null)} onEdit={()=>{setEditingRaid(selectedRaid);setSelectedRaid(null);setModal('raid')}}/>}
    {modal === 'nikke' && <NikkeModal initial={editingNikke} onClose={()=>{setModal(null);setEditingNikke(null)}} onSave={n=>{const normalized=normalizeNikkes([n])[0];setStore(s=>({...s,nikkes:editingNikke?s.nikkes.map(item=>item.id===editingNikke.id?normalized:item):[...s.nikkes,normalized]}));setModal(null);setEditingNikke(null)}}/>}
    {modal === 'raid' && <RaidModal initial={editingRaid} onClose={()=>{setModal(null);setEditingRaid(null)}} onSave={r=>{const normalized=normalizeRaids([r])[0];setStore(s=>({...s,raids:editingRaid?s.raids.map(item=>item.id===editingRaid.id?normalized:item):[...s.raids,normalized]}));setModal(null);setEditingRaid(null)}}/>}
  </main>;
}

function Stat({icon,label,value,unit,hint,onClick}:{icon:string,label:string,value:string,unit?:string,hint:string,onClick:()=>void}) { return <button className="stat-card" onClick={onClick}><i>{icon}</i><span>{label}</span><strong>{value}<small>{unit}</small></strong><p>{hint}</p><em>→</em></button> }
function Quick({icon,title,copy,onClick}:{icon:string,title:string,copy:string,onClick:()=>void}) { return <button onClick={onClick}><i>{icon}</i><span><b>{title}</b><small>{copy}</small></span><em>＋</em></button> }
function Setting({icon,title,copy,action,onClick}:{icon:string,title:string,copy:string,action:string,onClick:()=>void}) { return <section className="setting-card"><i>{icon}</i><h3>{title}</h3><p>{copy}</p><button className="primary" onClick={onClick}>{action}</button></section> }
function Page({title,eyebrow,copy,action,onAction,children}:{title:string,eyebrow:string,copy:string,action?:string,onAction?:()=>void,children:React.ReactNode}) { return <><div className="page-head compact"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></div>{action&&<button className="primary" onClick={onAction}>{action}</button>}</div>{children}</> }
function GithubSyncPanel({store}:{store:Store}) {
  const [preview,setPreview]=useState<SyncPreview|null>(null);
  const [confirmed,setConfirmed]=useState(false);
  const [busy,setBusy]=useState<'preview'|'pr'|null>(null);
  const [error,setError]=useState('');
  const [pullRequest,setPullRequest]=useState<{number:number;url:string;title:string}|null>(null);
  const [diffPath,setDiffPath]=useState<string|null>(null);
  const [diff,setDiff]=useState<SyncFileDiff|null>(null);
  const [diffBusy,setDiffBusy]=useState(false);
  const [diffError,setDiffError]=useState('');
  const request=async(action:'preview'|'create-pr')=>{
    setBusy(action==='preview'?'preview':'pr');setError('');setPullRequest(null);setDiffPath(null);setDiff(null);setDiffError('');
    try {
      const response=await fetch('/api/github-sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,store,expectedBaseSha:preview?.baseSha})});
      const data=await response.json() as SyncPreview&{error?:string;pullRequest?:{number:number;url:string;title:string}};
      if(!response.ok)throw new Error(data.error||'GitHub 동기화 요청에 실패했습니다.');
      if(action==='preview'){setPreview(data);setConfirmed(false)}else{setPullRequest(data.pullRequest||null);setPreview(null);setConfirmed(false)}
    }catch(reason){setError(reason instanceof Error?reason.message:'GitHub 동기화 요청에 실패했습니다.')}finally{setBusy(null)}
  };
  const openDiff=async(path:string)=>{
    if(!preview)return;
    setDiffPath(path);setDiff(null);setDiffError('');setDiffBusy(true);
    try {
      const response=await fetch('/api/github-sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'preview-file',store,path,expectedBaseSha:preview.baseSha})});
      const data=await response.json() as SyncFileDiff&{error?:string};
      if(!response.ok)throw new Error(data.error||'파일 변경 내용을 불러오지 못했습니다.');
      setDiff(data);
    }catch(reason){setDiffError(reason instanceof Error?reason.message:'파일 변경 내용을 불러오지 못했습니다.')}finally{setDiffBusy(false)}
  };
  return <><section className="github-sync-card">
    <header><div><p className="eyebrow">GITHUB SKILL SYNC</p><h3>nikke-account-status 자동 PR</h3><p>기존 references Markdown DB의 관련 항목을 직접 갱신한 뒤 사이트용 JSON 캐시를 다시 만듭니다.</p></div><span className="repo-badge">crydabd-creator/nikke</span></header>
    <div className="sync-guard"><b>보호 규칙</b><span>PR 생성 전 파일·줄 단위 확인</span><span>상세 기록·수동 메모·레이드 데이터 보존</span><span>두 스킬 복사본 동시 갱신</span></div>
    <p className="sync-public-warning"><b>공개 저장소 주의</b> 이 저장소의 PR과 브랜치는 누구나 볼 수 있습니다. UID 등 공개하면 안 되는 값을 지우거나 저장소를 비공개로 전환한 뒤 진행하세요.</p>
    {!preview&&!pullRequest&&<button className="primary" disabled={Boolean(busy)} onClick={()=>request('preview')}>{busy==='preview'?'변경 파일 확인 중…':'변경 파일 미리보기'}</button>}
    {preview&&<div className="sync-preview">
      <div className="sync-preview-head"><div><b>{preview.files.length?`${preview.files.length}개 파일 변경 예정`:'동기화할 변경 없음'}</b><span>{preview.categories.length?`${preview.categories.join(' · ')} · 파일을 눌러 줄 단위 차이를 확인하세요.`:'GitHub 원본과 동일합니다.'}</span></div><button onClick={()=>request('preview')} disabled={Boolean(busy)}>새로고침</button></div>
      {preview.files.length>0&&<ul>{preview.files.map(file=><li key={file.path}><button className="sync-file-button" onClick={()=>openDiff(file.path)}><span className={file.status}>{file.status==='create'?'새 파일':'수정'}</span><div><b>{file.path}</b><small>{file.reason} · {file.previousLines}줄 → {file.nextLines}줄</small></div><em>변경 내용 보기 →</em></button></li>)}</ul>}
      {preview.files.length>0&&<><label className="sync-confirm"><input type="checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/><span>표시된 Markdown DB 항목과 자동 생성 캐시만 변경되고, 기존 상세 기록·수동 메모·레이드 데이터가 유지되며 PR 내용이 공개 저장소에 노출될 수 있음을 확인했습니다.</span></label><div className="sync-actions"><button className="secondary" onClick={()=>{setPreview(null);setConfirmed(false)}}>취소</button><button className="primary" disabled={!confirmed||!preview.canCreatePr||Boolean(busy)} onClick={()=>request('create-pr')}>{busy==='pr'?'PR 생성 중…':'GitHub PR 생성'}</button></div>{!preview.canCreatePr&&<p className="sync-warning">PR 생성용 GitHub 비밀값을 등록하면 이 버튼이 활성화됩니다. 토큰은 브라우저에 저장되지 않습니다.</p>}</>}
    </div>}
    {pullRequest&&<div className="sync-success"><b>PR #{pullRequest.number} 생성 완료</b><p>GitHub에서 변경 내용을 검토한 뒤 병합하세요.</p><a href={pullRequest.url} target="_blank" rel="noreferrer">GitHub PR 열기 →</a><button onClick={()=>setPullRequest(null)}>닫기</button></div>}
    {error&&<p className="sync-error">{error}</p>}
  </section>{diffPath&&<SyncDiffModal path={diffPath} diff={diff} busy={diffBusy} error={diffError} onClose={()=>{setDiffPath(null);setDiff(null);setDiffError('')}}/>}</>
}
function SyncDiffModal({path,diff,busy,error,onClose}:{path:string;diff:SyncFileDiff|null;busy:boolean;error:string;onClose:()=>void}) {
  useEffect(()=>{const onKey=(event:KeyboardEvent)=>event.key==='Escape'&&onClose();const previous=document.body.style.overflow;document.body.style.overflow='hidden';window.addEventListener('keydown',onKey);return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',onKey)}},[onClose]);
  return <div className="sync-diff-backdrop" onMouseDown={event=>event.target===event.currentTarget&&onClose()}>
    <section className="sync-diff-modal" role="dialog" aria-modal="true" aria-labelledby="sync-diff-title">
      <header><div><p className="eyebrow">EXACT FILE DIFF</p><h3 id="sync-diff-title">수정 내용 상세</h3><code>{path}</code></div><button onClick={onClose} aria-label="변경 내용 닫기">×</button></header>
      {busy&&<div className="sync-diff-loading">GitHub 원본과 비교하고 있습니다…</div>}
      {error&&<div className="sync-diff-error"><b>비교할 수 없습니다.</b><p>{error}</p></div>}
      {diff&&<><div className="sync-diff-summary"><span>{diff.scope}</span><b className="removed">− {diff.removedLines}줄</b><b className="added">＋ {diff.addedLines}줄</b><small>{diff.previousLines}줄 → {diff.nextLines}줄</small></div><div className="sync-diff-code" role="region" aria-label={`${path} 줄 단위 변경 내용`}>{diff.lines.map((line,index)=><div className={line.type} key={`${line.type}-${line.oldLine}-${line.newLine}-${index}`}><span>{line.oldLine??''}</span><span>{line.newLine??''}</span><i>{line.type==='add'?'+':line.type==='remove'?'−':' '}</i><code>{line.text||' '}</code></div>)}</div><footer><span>초록색은 추가, 빨간색은 삭제되는 줄입니다.</span><button className="primary" onClick={onClose}>확인</button></footer></>}
    </section>
  </div>
}
function NikkeGrid({nikkes,onSelect,onEdit,onToggleFavorite,onDelete}:{nikkes:Nikke[];onSelect:(nikke:Nikke)=>void;onEdit:(nikke:Nikke)=>void;onToggleFavorite:(id:string)=>void;onDelete:(id:string)=>void}) {
  return <div className="nikke-grid">{nikkes.map(nikke=>{const detail=NIKKE_DETAILS[nikke.name];return <article className="nikke-card" key={nikke.id} role="button" tabIndex={0} aria-label={`${nikke.name} 상세 정보 보기`} onClick={()=>onSelect(nikke)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect(nikke)}}}>
    {NIKKE_IMAGES[nikke.name] ? <img src={NIKKE_IMAGES[nikke.name]} alt={nikke.name}/> : <div className="nikke-fallback" aria-label={`${nikke.name} 이미지 없음`}>N</div>}
    <button className="star" aria-label={nikke.favorite?'즐겨찾기 해제':'즐겨찾기'} onClick={event=>{event.stopPropagation();onToggleFavorite(nikke.id)}}>{nikke.favorite?'★':'☆'}</button>
    <div className="nikke-card-body"><h3>{nikke.name}</h3><div><span>{nikke.limit||'미확인'}</span><span>스킬 {nikke.skills||detail?.combat.skills||'—'}</span>{(nikke.class||detail?.classification.class)&&<span>{nikkeClassLabel(nikke.class||detail?.classification.class)}</span>}</div><dl><dt>속성</dt><dd>{nikke.element||detail?.classification.element||'—'}</dd><dt>무기</dt><dd>{nikke.weapon||detail?.classification.weapon||'—'}</dd><dt>버스트</dt><dd>{nikke.burst||detail?.classification.burst||'—'}</dd></dl><div className="card-actions"><span>상세 보기 →</span><button className="card-edit" onClick={event=>{event.stopPropagation();onEdit(nikke)}}>기록 수정</button><button className="delete" onClick={event=>{event.stopPropagation();onDelete(nikke.id)}}>삭제</button></div></div>
  </article>})}</div>
}
function CollectionFilterPanel({filters,resultCount,onToggle,onSort,onReset,onClose}:{filters:CollectionFilters;resultCount:number;onToggle:(key:FilterKey,value:string)=>void;onSort:(key:Exclude<SortKey,''>)=>void;onReset:()=>void;onClose:()=>void}) {
  return <div className="filter-panel" id="collection-filter-panel">
    <header><div><p className="eyebrow">NIKKE FILTER</p><h3>필터 · 정렬</h3></div><button className="filter-reset" onClick={onReset}>리셋</button></header>
    <div className="filter-group"><p>정렬</p><div>{SORT_OPTIONS.map(option=><button key={option.key} className={filters.sort===option.key?'active':''} aria-pressed={filters.sort===option.key} onClick={()=>onSort(option.key)}>{option.label}{filters.sort===option.key&&<span>{filters.direction==='desc'?'↓':'↑'}</span>}</button>)}</div></div>
    {FILTER_GROUPS.map(group=><div className="filter-group" key={group.key}><p>{group.label}</p><div>{group.options.map(option=><button key={option.value} className={filters[group.key]===option.value?'active':''} aria-pressed={filters[group.key]===option.value} onClick={()=>onToggle(group.key,option.value)}>{option.label}</button>)}</div></div>)}
    <footer><span>분류별 조건이 함께 적용됩니다.</span><button onClick={onClose}>결과 {resultCount}명 보기</button></footer>
  </div>
}
function Empty({icon,title,copy,action,onClick}:{icon:string,title:string,copy:string,action:string,onClick:()=>void}) { return <div className="empty"><i>{icon}</i><h3>{title}</h3><p>{copy}</p><button onClick={onClick}>{action}</button></div> }
function Field({label,value,onChange,placeholder,type='text'}:{label:string,value:string,onChange:(v:string)=>void,placeholder?:string,type?:string}) { return <label><span>{label}</span><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label> }
function NikkeDetailModal({nikke,onClose}:{nikke:Nikke,onClose:()=>void}) {
  const [tab,setTab]=useState<'skills'|'gear'|'notes'>('skills');
  const detail=NIKKE_DETAILS[nikke.name];
  const currentSkillLevels=(nikke.skills||detail?.combat.skills||'').split('/');
  useEffect(()=>{const onKey=(e:KeyboardEvent)=>e.key==='Escape'&&onClose();const previous=document.body.style.overflow;document.body.style.overflow='hidden';window.addEventListener('keydown',onKey);return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',onKey)}},[onClose]);
  return <div className="detail-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="nikke-detail-title">
      <button className="detail-close" onClick={onClose} aria-label="상세 정보 닫기">×</button>
      <header className="detail-hero">
        <div className="detail-portrait">{NIKKE_IMAGES[nikke.name]?<img src={NIKKE_IMAGES[nikke.name]} alt={nikke.name}/>:<div className="nikke-fallback">N</div>}</div>
        <div className="detail-heading"><p className="eyebrow">NIKKE PROFILE</p><h2 id="nikke-detail-title">{nikke.name}</h2><div className="detail-tags"><span>{nikke.limit||'돌파 미확인'}</span><span>{nikke.element||detail?.classification.element||'속성 미확인'}</span><span>{nikke.weapon||detail?.classification.weapon||'무기 미확인'}</span><span>{nikkeClassLabel(nikke.class||detail?.classification.class)||'클래스 미확인'}</span><span>버스트 {nikke.burst||detail?.classification.burst||'—'}</span></div><div className="detail-stats"><div><small>전투력</small><strong>{nikke.power||detail?.combat.power?.toLocaleString('ko-KR')||'—'}</strong></div><div><small>스킬 레벨</small><strong>{nikke.skills||detail?.combat.skills||'—'}</strong></div><div><small>오버로드</small><strong>{nikke.overload||detail?.combat.overload||'—'}</strong></div></div></div>
      </header>
      <nav className="detail-tabs" aria-label="상세 정보 분류"><button className={tab==='skills'?'active':''} onClick={()=>setTab('skills')}>스킬 툴팁</button><button className={tab==='gear'?'active':''} onClick={()=>setTab('gear')}>소장품 · 장비</button><button className={tab==='notes'?'active':''} onClick={()=>setTab('notes')}>계정 메모</button></nav>
      <div className="detail-body">
        {tab==='skills'&&(detail?.skills.length?<div className="skill-list">{detail.skills.map((skill,index)=>{const skillIcon=NIKKE_SKILL_IMAGES[nikke.name]?.[index];return <article className="skill-card" key={`${skill.slot}-${skill.name}-${index}`}><header>{skillIcon?<img className="skill-icon" src={skillIcon} alt={`${skill.name} 스킬 아이콘`}/>:<span className="skill-icon-fallback">{skill.slot}</span>}<div><span className="skill-slot">{skill.slot}</span><h3>{skill.name}</h3><p>{formatCurrentSkillMeta(skill.meta,currentSkillLevels[index])}</p></div></header><ul>{skill.effects.map((effect,effectIndex)=><li className={effect.level>0?'nested':undefined} key={`${effect.level}-${effectIndex}`}><span>{effect.text}</span></li>)}</ul></article>})}</div>:<DetailEmpty title="상세 스킬 자료 없음" copy="참고 문서에 상세 스킬이 포함되지 않은 등급입니다. 확인되지 않은 효과는 표시하지 않습니다."/>)}
        {tab==='gear'&&<div className="detail-sections"><DetailSectionBlock title="소장품" section={detail?.collection}/><DetailSectionBlock title="장비 · 오버로드" section={detail?.overload} nikke={nikke} detail={detail}/></div>}
        {tab==='notes'&&(detail?.accountNotes?.length?<section className="account-notes"><h3>계정 참고 사항</h3><ul>{detail.accountNotes.map((note,index)=><li key={`${note.level}-${index}`}>{note.level>0&&<b>Lv.{note.level}</b>}<span>{note.text}</span></li>)}</ul></section>:<DetailEmpty title="추가 메모 없음" copy="참고 문서에 이 니케의 별도 운용 메모가 없습니다."/>)}
      </div>
    </section>
  </div>
}
function formatCurrentSkillMeta(meta:string,currentLevel?:string) { const sourceLevel=meta.match(/레벨\s*([^,]+)/)?.[1]?.trim();const cooldown=meta.match(/재사용\s*[^,]+/)?.[0];return `현재 스킬 레벨 ${currentLevel||sourceLevel||'—'}${cooldown?` · ${cooldown}`:''}` }
function EquipmentPartCell({label,state,nikke,detail}:{label:string;state?:string;nikke:Nikke;detail:NikkeDetail|undefined}) {
  const part = equipmentPartFromLabel(label);
  if (!part) return <>{label}</>;
  const isEquipped = isOverloadEquipmentState(state);
  const iconPath = isEquipped ? overloadIconPath(nikke,detail,part.key) : '';
  return <div className="equipment-part-cell"><span>{label}</span><span className={`equipment-row-icon ${iconPath?'filled':'empty'}`} title={iconPath?`${label} 오버로드 장비`:isEquipped?'기업·역할군 정보 필요':'오버로드 미장착'}>{iconPath&&<img src={iconPath} alt={`${nikke.name} ${label} 오버로드 장비`} loading="lazy"/>}</span></div>
}
function DetailSectionBlock({title,section,nikke,detail}:{title:string;section:DetailSection|null|undefined;nikke?:Nikke;detail?:NikkeDetail}) {
  if(!section||(section.summary.length===0&&section.tables.length===0))return <section className="detail-section"><h3>{title}</h3><DetailEmpty title="등록 정보 없음" copy="참고 문서에 해당 상세 정보가 없습니다."/></section>;
  return <section className="detail-section"><h3>{title}</h3>{section.summary.length>0&&<ul className="detail-summary">{section.summary.map((line,index)=><li key={`${line.level}-${index}`}>{line.level>0&&<b>Lv.{line.level}</b>}<span>{line.text}</span></li>)}</ul>}{section.tables.map((table,index)=><div className="detail-table-wrap" key={`${title}-${index}`}><table><thead><tr>{table.header.map((cell,i)=><th key={`${cell}-${i}`}>{cell}</th>)}</tr></thead><tbody>{table.rows.map((row,rowIndex)=><tr key={rowIndex}>{row.map((cell,cellIndex)=><td key={cellIndex}>{cellIndex===0&&nikke?<EquipmentPartCell label={cell} state={row[1]} nikke={nikke} detail={detail}/>:cell}</td>)}</tr>)}</tbody></table></div>)}</section>
}
function DetailEmpty({title,copy}:{title:string,copy:string}) { return <div className="detail-empty"><i>◇</i><h3>{title}</h3><p>{copy}</p></div> }
function NikkeModal({initial,onClose,onSave}:{initial:Nikke|null;onClose:()=>void;onSave:(n:Nikke)=>void}) {
  const [n,setN]=useState<Nikke>(()=>initial?{...initial}:{id:crypto.randomUUID(),name:'',limit:'',skills:'',skillNotes:'',level:'',power:'',element:'',weapon:'',burst:'',class:'',corporation:'',rarity:'',collection:'',overload:'',favorite:false});
  return <Modal title={initial?'니케 기록 수정':'니케 추가'} onClose={onClose} onSubmit={()=>n.name.trim()&&onSave({...n,name:n.name.trim()})}>
    <Field label="니케 이름 *" value={n.name} onChange={v=>setN({...n,name:v})} placeholder="예: 라피 : 레드 후드"/>
    <div className="modal-grid">
      <Field label="돌파·코어" value={n.limit} onChange={v=>setN({...n,limit:v})} placeholder="예: 3돌"/>
      <Field label="스킬 1/2/버스트" value={n.skills} onChange={v=>setN({...n,skills:v})} placeholder="예: 10/10/10"/>
      <Field label="레벨" value={n.level} onChange={v=>setN({...n,level:v})} placeholder="예: 400"/>
      <Field label="전투력" value={n.power} onChange={v=>setN({...n,power:v})} placeholder="예: 142000"/>
      <Field label="속성" value={n.element} onChange={v=>setN({...n,element:v})} placeholder="예: 작열"/>
      <Field label="무기" value={n.weapon} onChange={v=>setN({...n,weapon:v})} placeholder="예: AR"/>
      <Field label="버스트" value={n.burst} onChange={v=>setN({...n,burst:v})} placeholder="예: Ⅲ"/>
      <Field label="클래스" value={n.class} onChange={v=>setN({...n,class:v})} placeholder="예: 화력형"/>
      <Field label="기업" value={n.corporation} onChange={v=>setN({...n,corporation:v})} placeholder="예: ELYSION"/>
      <Field label="레어도" value={n.rarity} onChange={v=>setN({...n,rarity:v})} placeholder="예: SSR"/>
    </div>
    <TextAreaField label="현재 스킬 참고 정보" value={n.skillNotes} onChange={v=>setN({...n,skillNotes:v})} placeholder="현재 스킬 레벨에서 적용되는 수치와 운용 메모를 입력하세요."/>
    <TextAreaField label="소장품 · 애장품 상세" value={n.collection} onChange={v=>setN({...n,collection:v})} placeholder="단계, 레벨, 옵션 등을 입력하세요."/>
    <TextAreaField label="오버로드 상세" value={n.overload} onChange={v=>setN({...n,overload:v})} placeholder="부위별 옵션과 수치를 입력하세요."/>
  </Modal>
}
function TextAreaField({label,value,onChange,placeholder}:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string}) { return <label><span>{label}</span><textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label> }
function RaidDetailModal({raid,onClose,onEdit}:{raid:Raid;onClose:()=>void;onEdit:()=>void}) {
  useEffect(()=>{const onKey=(event:KeyboardEvent)=>event.key==='Escape'&&onClose();const previous=document.body.style.overflow;document.body.style.overflow='hidden';window.addEventListener('keydown',onKey);return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',onKey)}},[onClose]);
  return <div className="raid-detail-backdrop" onMouseDown={event=>event.target===event.currentTarget&&onClose()}><section className="raid-detail-modal" role="dialog" aria-modal="true" aria-labelledby="raid-detail-title">
    <button className="raid-detail-close" onClick={onClose} aria-label="레이드 상세 닫기">×</button>
    <header><div><p className="eyebrow">SOLO RAID REPORT</p><h2 id="raid-detail-title">{raid.boss}</h2><p>{raid.date||'진행 날짜 미입력'}</p></div><div><small>최종 피해량</small><strong>{raid.damage?raid.damage.toLocaleString('ko-KR'):'—'}</strong><span>{raid.rank||'순위 미입력'}</span></div></header>
    <div className="raid-detail-body">
      <div className="raid-detail-notes"><section><span>보스 패턴</span><p>{raid.bossPattern||'아직 입력된 보스 패턴이 없습니다.'}</p></section><section><span>전체 공략·운용</span><p>{raid.strategy||raid.memo||'아직 입력된 공략 메모가 없습니다.'}</p></section></div>
      <div className="raid-team-report">{raid.teams.map((team,index)=><article key={index}><header><span>{String(index+1).padStart(2,'0')}</span><div><b>{index+1}덱</b><small>{team.damage?`${team.damage.toLocaleString('ko-KR')} DAMAGE`:'피해량 미입력'}</small></div></header><div><span>사용 니케</span><p>{team.nikkes||'사용 니케 미입력'}</p></div><div><span>운용 기록</span><p>{team.memo||'운용 메모 미입력'}</p></div></article>)}</div>
      {raid.memo&&raid.strategy&&<section className="raid-season-note"><span>시즌 메모</span><p>{raid.memo}</p></section>}
    </div>
    <footer><span>이 기록은 현재 브라우저에 저장됩니다.</span><button className="primary" onClick={onEdit}>기록 수정</button></footer>
  </section></div>
}
function RaidModal({initial,onClose,onSave}:{initial:Raid|null;onClose:()=>void;onSave:(r:Raid)=>void}) {
  const [r,setR]=useState<Raid>(()=>initial?normalizeRaids([{...initial}])[0]:{id:crypto.randomUUID(),boss:'',date:'',damage:0,rank:'',memo:'',bossPattern:'',strategy:'',teams:emptyRaidTeams()});
  const setTeam=(index:number,key:keyof RaidTeam,value:string|number)=>setR(current=>({...current,teams:current.teams.map((team,teamIndex)=>teamIndex===index?{...team,[key]:value}:team)}));
  const teamTotal=r.teams.reduce((sum,team)=>sum+Number(team.damage||0),0);
  return <Modal wide title={initial?'솔로 레이드 기록 수정':'솔로 레이드 기록 추가'} onClose={onClose} onSubmit={()=>r.boss.trim()&&onSave({...r,boss:r.boss.trim(),damage:r.damage||teamTotal})}>
    <div className="modal-grid"><Field label="보스명 *" value={r.boss} onChange={v=>setR({...r,boss:v})} placeholder="예: 애니힐리오"/><Field label="진행 날짜" value={r.date} onChange={v=>setR({...r,date:v})} placeholder="2026. 08. 25"/><Field label="최종 피해량" value={String(r.damage||'')} onChange={v=>setR({...r,damage:Number(v)})} type="number"/><Field label="최종 순위" value={r.rank} onChange={v=>setR({...r,rank:v})} placeholder="예: 9.17%"/></div>
    <div className="raid-overview-fields"><TextAreaField label="보스 패턴" value={r.bossPattern} onChange={v=>setR({...r,bossPattern:v})} placeholder="페이즈별 공격, 저지 패턴, 부위 파괴, 속성·무기 기믹과 주의 타이밍을 입력하세요."/><TextAreaField label="전체 공략·운용" value={r.strategy} onChange={v=>setR({...r,strategy:v})} placeholder="덱 투입 순서, 버스트 타이밍, 생존·딜 운용과 재도전 포인트를 입력하세요."/></div>
    <div className="raid-team-editor-head"><div><p className="eyebrow">TEAM LOADOUT</p><h3>1덱 ~ 5덱 사용 기록</h3></div><span>덱 피해량 합계 {teamTotal.toLocaleString('ko-KR')}</span></div>
    <div className="raid-team-editor">{r.teams.map((team,index)=><section key={index}><header><b>{index+1}덱</b><span>{team.damage?team.damage.toLocaleString('ko-KR'):'피해량 미입력'}</span></header><Field label="사용 니케 5명" value={team.nikkes} onChange={v=>setTeam(index,'nikkes',v)} placeholder="예: 리타 / 크라운 / 홍련 / 앨리스 / 나가"/><Field label="피해량" value={String(team.damage||'')} onChange={v=>setTeam(index,'damage',Number(v))} type="number"/><TextAreaField label="운용 메모" value={team.memo} onChange={v=>setTeam(index,'memo',v)} placeholder="버스트 순서, 핵심 타이밍, 실패 원인과 개선점을 입력하세요."/></section>)}</div>
    <TextAreaField label="시즌 메모" value={r.memo} onChange={v=>setR({...r,memo:v})} placeholder="이번 시즌 총평과 다음 목표를 입력하세요."/>
  </Modal>
}
function Modal({title,onClose,onSubmit,children,wide=false}:{title:string;onClose:()=>void;onSubmit:()=>void;children:React.ReactNode;wide?:boolean}) { return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><form className={`modal ${wide?'wide':''}`} onSubmit={e=>{e.preventDefault();onSubmit()}}><header><div><p className="eyebrow">NEW RECORD</p><h2>{title}</h2></div><button type="button" onClick={onClose}>×</button></header>{children}<footer><button type="button" className="secondary" onClick={onClose}>취소</button><button className="primary" type="submit">저장하기</button></footer></form></div> }
