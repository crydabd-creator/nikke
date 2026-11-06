import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const canonicalRoot = resolve(siteRoot, '..', 'nikke-account-status', 'references');
const rawRoot = 'https://raw.githubusercontent.com/crydabd-creator/nikke/main/nikke-account-status/references';
const accountOutput = resolve(siteRoot, 'app', 'site-account-data.json');
const detailOutput = resolve(siteRoot, 'app', 'nikke-latest-details.json');

async function canonicalText(name) {
  try {
    return await readFile(resolve(canonicalRoot, name), 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    const response = await fetch(`${rawRoot}/${name}`, { headers: { 'User-Agent': 'oh-my-commander-site-build' } });
    if (!response.ok) throw new Error(`Could not fetch canonical reference ${name} (${response.status}).`);
    return response.text();
  }
}

function validateCache(value) {
  if (!value || typeof value !== 'object' || value.cache !== true) throw new Error('Canonical site cache is invalid.');
  if (!value.account || typeof value.account !== 'object' || !Array.isArray(value.nikkes)) {
    throw new Error('Canonical site cache is missing account or NIKKE data.');
  }
}

function cleanInline(value) {
  return value
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\\\|/g, '|')
    .replace(/\s+/g, ' ')
    .trim();
}

function tableCells(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cleanInline(cell));
}

function headingSection(markdown, level, name) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const marker = `${'#'.repeat(level)} ${name}`;
  const start = lines.findIndex(line => line.trim() === marker);
  if (start < 0) return [];
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#{1,6})\s+/);
    if (match && match[1].length <= level) {
      end = index;
      break;
    }
  }
  return lines.slice(start + 1, end);
}

function detailSection(markdown, name) {
  const lines = headingSection(markdown, 2, name);
  if (!lines.length) return null;
  const summary = [];
  let table = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim().startsWith('|') && lines[index + 1]?.trim().match(/^\|?\s*:?-{3,}/)) {
      const header = tableCells(line);
      const rows = [];
      index += 2;
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        rows.push(tableCells(lines[index]));
        index += 1;
      }
      table = { header, rows };
      index -= 1;
      continue;
    }
    const bullet = line.match(/^\s*-\s+(.+)$/);
    if (bullet) summary.push({ level: 0, text: cleanInline(bullet[1]) });
  }
  return { summary, tables: table ? [table] : [] };
}

function currentSkillCharacters(markdown) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const characters = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^#\s+(.+)$/);
    if (!match) continue;
    let end = lines.length;
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (/^#\s+/.test(lines[cursor])) {
        end = cursor;
        break;
      }
    }
    const body = lines.slice(index + 1, end);
    if (body.some(line => /^##\s+(?:스킬 1|스킬 2|버스트)\s+—/.test(line))) {
      characters.push({ name: cleanInline(match[1]), lines: body });
    }
    index = end - 1;
  }
  return characters;
}

function parseSkills(lines) {
  const skills = [];
  for (let index = 0; index < lines.length; index += 1) {
    const heading = lines[index].match(/^##\s+(스킬 1|스킬 2|버스트)\s+—\s+(.+?)(?:\s+\((.+)\))?$/);
    if (!heading) continue;
    const effects = [];
    let cursor = index + 1;
    while (cursor < lines.length && !/^##\s+/.test(lines[cursor])) {
      const bullet = lines[cursor].match(/^(\s*)-\s+(.+)$/);
      if (bullet) effects.push({ level: bullet[1].length > 0 ? 1 : 0, text: cleanInline(bullet[2]) });
      cursor += 1;
    }
    skills.push({ slot: heading[1], name: cleanInline(heading[2]), meta: cleanInline(heading[3] || ''), effects });
    index = cursor - 1;
  }
  return skills;
}

function classLabel(value) {
  return { Attacker: '화력형', Defender: '방어형', Supporter: '지원형' }[value] || value || '';
}

function burstLabel(value) {
  return { 'Ⅰ': '1', 'Ⅱ': '2', 'Ⅲ': '3', I: '1', II: '2', III: '3' }[value] || value || '';
}

function accountNotes(base, roster, classification) {
  const notes = Array.isArray(base?.accountNotes) ? [...base.accountNotes] : [];
  const append = (prefix, value) => {
    if (!value || notes.some(note => note?.text?.startsWith(`${prefix}:`))) return;
    notes.push({ level: 0, text: `${prefix}: ${value}` });
  };
  append('희귀도', roster?.rarity);
  const classificationText = [classification.element, classification.weapon, classification.class, classification.burst && `버스트 ${classification.burst}`].filter(Boolean).join(' / ');
  append('분류', classificationText);
  append('돌파·코어 강화', roster?.limit);
  append('스킬', roster?.skills);
  return notes;
}

function buildLatestDetails(cache, baseDetails, skillDetails, overloadDetails, collectionDetails) {
  const roster = new Map(cache.nikkes.map(item => [item.name, item]));
  const characters = {};
  for (const current of currentSkillCharacters(skillDetails)) {
    const item = roster.get(current.name) || {};
    const base = baseDetails.characters?.[current.name] || {};
    const classification = {
      ...(base.classification || {}),
      element: item.element || base.classification?.element || '',
      weapon: item.weapon || base.classification?.weapon || '',
      class: classLabel(item.class || base.classification?.class),
      burst: burstLabel(item.burst || base.classification?.burst),
    };
    characters[current.name] = {
      ...base,
      classification,
      combat: {
        ...(base.combat || {}),
        power: Number(String(item.power || '').replace(/,/g, '')) || base.combat?.power,
        skills: item.skills || base.combat?.skills || '',
        overload: item.overload || base.combat?.overload || '',
      },
      accountNotes: accountNotes(base, item, classification),
      collection: detailSection(collectionDetails, current.name) || base.collection || null,
      overload: detailSection(overloadDetails, current.name) || base.overload || null,
      skills: parseSkills(current.lines),
    };
  }
  return { characters };
}

await mkdir(dirname(accountOutput), { recursive: true });

const [accountText, skillDetails, overloadDetails, collectionDetails, baseDetailsText] = await Promise.all([
  canonicalText('site-account-data.json'),
  canonicalText('skill-details.md'),
  canonicalText('overload-details.md'),
  canonicalText('collection-details.md'),
  readFile(resolve(siteRoot, 'app', 'nikke-details.json'), 'utf8'),
]);
const cache = JSON.parse(accountText);
validateCache(cache);
const latestDetails = buildLatestDetails(cache, JSON.parse(baseDetailsText), skillDetails, overloadDetails, collectionDetails);

await writeFile(accountOutput, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
await writeFile(detailOutput, `${JSON.stringify(latestDetails, null, 2)}\n`, 'utf8');
console.log(`Prepared site caches from canonical DB (${Object.keys(latestDetails.characters).length} current detail record).`);
