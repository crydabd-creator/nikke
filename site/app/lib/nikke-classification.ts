export type BurstStage = 'Ⅰ' | 'Ⅱ' | 'Ⅲ';
export type NikkeClass = 'Attacker' | 'Defender' | 'Supporter';

const ALL_STAGES: BurstStage[] = ['Ⅰ', 'Ⅱ', 'Ⅲ'];
const STAGE_BY_TOKEN: Record<string, BurstStage> = { '1': 'Ⅰ', I: 'Ⅰ', '2': 'Ⅱ', II: 'Ⅱ', '3': 'Ⅲ', III: 'Ⅲ' };
const CLASS_BY_TOKEN: Record<string, NikkeClass> = {
  ATTACKER: 'Attacker',
  '화력형': 'Attacker',
  '공격형': 'Attacker',
  DEFENDER: 'Defender',
  '방어형': 'Defender',
  SUPPORTER: 'Supporter',
  '지원형': 'Supporter',
};
const CLASS_LABELS: Record<NikkeClass, string> = {
  Attacker: '화력형',
  Defender: '방어형',
  Supporter: '지원형',
};

function compatible(value: string) {
  return value.normalize('NFKC').toUpperCase().replace(/버스트|BURST|단계/g, ' ').trim();
}

export function burstStages(value?: string): BurstStage[] {
  if (!value?.trim()) return [];
  const source = compatible(value);
  if (source.replace(/\s+/g, '').includes('ALLSTEP')) return [...ALL_STAGES];

  const digitTokens = source.match(/[123]/g);
  const tokens = digitTokens?.length ? digitTokens : source.match(/III|II|I/g) ?? [];
  const stages: BurstStage[] = [];
  for (const token of tokens) {
    const stage = STAGE_BY_TOKEN[token];
    if (stage && !stages.includes(stage)) stages.push(stage);
  }
  return stages;
}

export function normalizeBurstLabel(value?: string) {
  if (!value?.trim()) return '';
  const original = value.trim();
  const compact = compatible(original).replace(/\s+/g, '');
  if (compact === 'ALLSTEP' || /^(1|I)[·/>,+]*(2|II)[·/>,+]*(3|III)$/.test(compact)) return ALL_STAGES.join('·');
  if (compact === '1' || compact === 'I') return 'Ⅰ';
  if (compact === '2' || compact === 'II') return 'Ⅱ';
  if (compact === '3' || compact === 'III') return 'Ⅲ';
  return original;
}

export function normalizeNikkeClass(value?: string): NikkeClass | string {
  if (!value?.trim()) return '';
  const original = value.trim();
  return CLASS_BY_TOKEN[original.normalize('NFKC').toUpperCase()] ?? original;
}

export function nikkeClassLabel(value?: string) {
  const normalized = normalizeNikkeClass(value);
  return CLASS_LABELS[normalized as NikkeClass] ?? normalized;
}
