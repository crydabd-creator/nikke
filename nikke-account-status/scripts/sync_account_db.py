#!/usr/bin/env python3
"""Regenerate NIKKE site cache and repository mirrors from canonical Markdown."""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import OrderedDict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import unquote


SOURCE_LABEL = "nikke-account-status/references Markdown DB"
CANONICAL_DIR = Path("nikke-account-status")
MIRROR_DIR = CANONICAL_DIR / "agents" / "skills" / "nikke-account-status"
CACHE_NAME = "site-account-data.json"
REFERENCE_NAMES = (
    "account-status.md",
    "combat-status.md",
    "skill-details.md",
    "overload-details.md",
    "collection-details.md",
    "element-classification.md",
    "weapon-classification.md",
    "burst-classification.md",
    "class-classification.md",
)
ACCOUNT_LABELS = OrderedDict(
    (
        ("commander", ("지휘관명",)),
        ("server", ("서버",)),
        ("uid", ("UID",)),
        ("commanderLevel", ("지휘관 레벨",)),
        ("synchro", ("싱크로 디바이스 레벨", "싱크로 레벨")),
        ("outpost", ("전초기지 레벨",)),
        ("power", ("전투력", "메인덱 전투력")),
        ("jewels", ("쥬얼",)),
        ("goldMileage", ("골드 마일리지 티켓", "골드 마일리지")),
        ("silverMileage", ("실버 마일리지 티켓", "실버 마일리지")),
        ("coreDust", ("시간당 코어 더스트",)),
        ("goal", ("주요 목표", "현재 목표")),
    )
)
CLASSIFICATIONS = OrderedDict(
    (
        ("element", ("element-classification.md", ("전격", "작열", "풍압", "수냉", "철갑"))),
        ("weapon", ("weapon-classification.md", ("SMG", "RL(로켓 런처)", "AR(어설트 라이플)", "SG(샷건)", "SR(스나이퍼 라이플)", "MG(머신건)"))),
        ("burst", ("burst-classification.md", ("버스트 1", "버스트 2", "버스트 3"))),
        ("class", ("class-classification.md", ("화력형", "방어형", "지원형"))),
    )
)


def normalized(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n")


def clean(value: Any) -> str:
    return str(value).replace("\x00", "").strip() if value is not None else ""


def split_table_row(line: str) -> list[str]:
    body = line.strip()
    if body.startswith("|"):
        body = body[1:]
    if body.endswith("|"):
        body = body[:-1]
    cells: list[str] = []
    current: list[str] = []
    for index, char in enumerate(body):
        if char == "|" and (index == 0 or body[index - 1] != "\\"):
            cells.append("".join(current).strip())
            current = []
        else:
            current.append(char)
    cells.append("".join(current).strip())
    return cells


def heading_index(lines: list[str], title: str, level: int = 2) -> int:
    marker = f"{'#' * level} {title}"
    return next((index for index, line in enumerate(lines) if line.strip() == marker), -1)


def section_end(lines: list[str], start: int, level: int = 2) -> int:
    for index in range(start + 1, len(lines)):
        match = re.match(r"^(#{1,6})\s+", lines[index])
        if match and len(match.group(1)) <= level:
            return index
    return len(lines)


def table_range(lines: list[str], start: int, end: int) -> tuple[int, int, int] | None:
    for index in range(start + 1, max(start + 1, end - 1)):
        if not lines[index].strip().startswith("|") or not lines[index + 1].strip().startswith("|"):
            continue
        if not re.match(r"^\|?\s*:?-{3,}", lines[index + 1].strip()):
            continue
        table_end = index + 2
        while table_end < end and lines[table_end].strip().startswith("|"):
            table_end += 1
        return index, index + 2, table_end
    return None


def parse_section_table(content: str, title: str, level: int = 2) -> tuple[list[str], list[list[str]]]:
    lines = normalized(content).split("\n")
    start = heading_index(lines, title, level)
    if start < 0:
        return [], []
    found = table_range(lines, start, section_end(lines, start, level))
    if not found:
        return [], []
    header, rows_start, end = found
    return split_table_row(lines[header]), [split_table_row(line) for line in lines[rows_start:end]]


def parse_managed_table(content: str, block_id: str) -> tuple[list[str], list[list[str]]]:
    start_marker = f"<!-- OH-MY-COMMANDER:{block_id}:START -->"
    end_marker = f"<!-- OH-MY-COMMANDER:{block_id}:END -->"
    source = normalized(content)
    start = source.find(start_marker)
    end = source.find(end_marker)
    if start < 0 or end < start:
        return [], []
    lines = source[start + len(start_marker):end].split("\n")
    for index in range(len(lines) - 1):
        if lines[index].strip().startswith("|") and re.match(r"^\|?\s*:?-{3,}", lines[index + 1].strip()):
            row_end = index + 2
            while row_end < len(lines) and lines[row_end].strip().startswith("|"):
                row_end += 1
            return split_table_row(lines[index]), [split_table_row(line) for line in lines[index + 2:row_end]]
    return [], []


def section_names(content: str, title: str) -> list[str]:
    lines = normalized(content).split("\n")
    start = heading_index(lines, title)
    if start < 0:
        return []
    body_lines: list[str] = []
    for line in lines[start + 1:section_end(lines, start)]:
        if re.match(r"^\s*(?:<!--|\|)", line):
            break
        body_lines.append(line)
    body = "\n".join(body_lines).strip()
    if not body:
        return []
    return [
        re.sub(r"\s+", " ", value.replace("\n", " ")).strip().removesuffix(".")
        for value in body.split(",")
        if value.strip()
    ]


def managed_character_values(content: str, kind: str) -> dict[str, str]:
    pattern = re.compile(
        rf"<!-- OH-MY-COMMANDER:{re.escape(kind)}:([^:]+):START -->(.*?)"
        rf"<!-- OH-MY-COMMANDER:{re.escape(kind)}:\1:END -->",
        re.DOTALL,
    )
    result: dict[str, str] = {}
    for match in pattern.finditer(normalized(content)):
        bullet = re.search(r"^-\s+(.+)$", match.group(2), re.MULTILINE)
        result[unquote(match.group(1))] = (
            bullet.group(1).replace("<br>", "\n").replace("\\|", "|").strip() if bullet else ""
        )
    return result


def set_if_missing(items: OrderedDict[str, dict[str, str]], name: str, field: str, value: str) -> None:
    if not name or name == "미확인":
        return
    item = items.setdefault(name, {"name": name})
    if value and value != "미확인" and not item.get(field):
        item[field] = clean(value).replace("`", "")


def roster_limits(content: str) -> list[tuple[str, str]]:
    values: list[tuple[str, str]] = []
    lines = normalized(content).split("\n")
    start = heading_index(lines, "전체 보유 목록")
    if start < 0:
        return values
    for line in lines[start + 1:section_end(lines, start)]:
        if line.strip().startswith("-"):
            continue
        for raw_part in line.split(","):
            part = raw_part.strip().removesuffix(".")
            open_index = part.rfind("(")
            if open_index <= 0 or not part.endswith(")"):
                continue
            name = part[:open_index].strip()
            limit = part[open_index + 1:-1].strip()
            if re.search(r"(?:돌|코강|MAX)", limit):
                values.append((name, limit))
    return values


def classification_value(kind: str, heading: str) -> str:
    if kind == "weapon":
        return re.sub(r"\(.+\)", "", heading)
    if kind == "burst":
        return {"버스트 1": "Ⅰ", "버스트 2": "Ⅱ", "버스트 3": "Ⅲ"}[heading]
    if kind == "class":
        return {"화력형": "Attacker", "방어형": "Defender", "지원형": "Supporter"}[heading]
    return heading


def build_cache(canonical: Path, generated_at: str) -> dict[str, Any]:
    references = {name: normalized((canonical / "references" / name).read_text(encoding="utf-8")) for name in REFERENCE_NAMES}
    account_status = references["account-status.md"]
    combat_status = references["combat-status.md"]
    account: OrderedDict[str, str] = OrderedDict()
    _, account_rows = parse_section_table(account_status, "계정 전체")
    for row in account_rows:
        if len(row) < 2:
            continue
        for key, labels in ACCOUNT_LABELS.items():
            if row[0] in labels:
                account[key] = "" if row[1] == "미확인" else row[1]

    items: OrderedDict[str, dict[str, str]] = OrderedDict()
    headers, rows = parse_section_table(account_status, "캐릭터별 확인 현황")
    mapping = {
        "돌파/코어": "limit",
        "스킬 1/2/버스트": "skills",
        "애장품/소장품": "collection",
        "오버로드 장비": "overload",
    }
    for row in rows:
        if not row:
            continue
        for index, header in enumerate(headers):
            field = next((target for needle, target in mapping.items() if needle in header), "")
            if field and index < len(row):
                set_if_missing(items, row[0], field, row[index])
        items.setdefault(row[0], {"name": row[0]})

    for name, limit in roster_limits(account_status):
        set_if_missing(items, name, "limit", limit)

    combat_lines = combat_status.split("\n")
    combat_range = table_range(combat_lines, 0, len(combat_lines))
    if combat_range:
        header_index, rows_start, end = combat_range
        combat_headers = split_table_row(combat_lines[header_index])
        for row in [split_table_row(line) for line in combat_lines[rows_start:end]]:
            if not row:
                continue
            for index, header in enumerate(combat_headers):
                field = "power" if "전투력" in header else "skills" if "스킬" in header else "overload" if "오버로드" in header else ""
                if field and index < len(row):
                    set_if_missing(items, row[0], field, row[index])
            items.setdefault(row[0], {"name": row[0]})

    _, metadata_rows = parse_managed_table(account_status, "character-metadata")
    for row in metadata_rows:
        if not row:
            continue
        item = items.setdefault(row[0], {"name": row[0]})
        item["rarity"] = "" if len(row) < 2 or row[1] == "미확인" else row[1]
        item["corporation"] = "" if len(row) < 3 or row[2] == "미확인" else row[2]
    _, level_rows = parse_managed_table(combat_status, "character-levels")
    for row in level_rows:
        if not row:
            continue
        items.setdefault(row[0], {"name": row[0]})["level"] = "" if len(row) < 2 or row[1] == "미확인" else row[1]

    for kind, (filename, headings) in CLASSIFICATIONS.items():
        for heading in headings:
            for name in section_names(references[filename], heading):
                set_if_missing(items, name, kind, classification_value(kind, heading))

    for name, value in managed_character_values(references["skill-details.md"], "skills-note").items():
        items.setdefault(name, {"name": name})["skillNotes"] = value
    for kind, filename in (("overload", "overload-details.md"), ("collection", "collection-details.md")):
        for name, value in managed_character_values(references[filename], kind).items():
            items.setdefault(name, {"name": name})[kind] = value

    return {
        "schemaVersion": 2,
        "source": SOURCE_LABEL,
        "cache": True,
        "generatedAt": generated_at,
        "account": dict(account),
        "nikkes": [{key: clean(value) for key, value in item.items()} for item in items.values()],
    }


def json_text(value: dict[str, Any]) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def load_existing_cache(path: Path) -> dict[str, Any] | None:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else None
    except (OSError, json.JSONDecodeError):
        return None


def same_payload(left: dict[str, Any] | None, right: dict[str, Any]) -> bool:
    return bool(left) and left.get("account") == right.get("account") and left.get("nikkes") == right.get("nikkes")


def resolve_generated_at(existing: dict[str, Any] | None, candidate: dict[str, Any], requested: str | None) -> str:
    if same_payload(existing, candidate):
        return clean(existing.get("generatedAt")) or clean(requested)
    if requested:
        return clean(requested)
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def expected_files(repo_root: Path, generated_at: str | None) -> dict[Path, str]:
    canonical = repo_root / CANONICAL_DIR
    mirror = repo_root / MIRROR_DIR
    cache_path = canonical / "references" / CACHE_NAME
    existing = load_existing_cache(cache_path)
    candidate = build_cache(canonical, generated_at or "")
    candidate["generatedAt"] = resolve_generated_at(existing, candidate, generated_at)
    files: dict[Path, str] = {
        cache_path: json_text(candidate),
        mirror / "references" / CACHE_NAME: json_text(candidate),
        mirror / "SKILL.md": normalized((canonical / "SKILL.md").read_text(encoding="utf-8")),
    }
    for name in REFERENCE_NAMES:
        files[mirror / "references" / name] = normalized((canonical / "references" / name).read_text(encoding="utf-8"))
    return files


def changed_paths(files: dict[Path, str]) -> list[Path]:
    result: list[Path] = []
    for path, expected in files.items():
        try:
            actual = normalized(path.read_text(encoding="utf-8"))
        except OSError:
            actual = ""
        if actual != expected:
            result.append(path)
    return result


def write_files(files: dict[Path, str]) -> list[Path]:
    changed = changed_paths(files)
    for path in changed:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(files[path], encoding="utf-8", newline="\n")
    return changed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, default=Path.cwd())
    parser.add_argument("--generated-at", help="Version stamp used only when canonical data changed")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true", help="Regenerate cache and repository mirrors")
    mode.add_argument("--check", action="store_true", help="Fail when cache or mirrors are stale")
    args = parser.parse_args()
    repo_root = args.repo_root.resolve()
    try:
        files = expected_files(repo_root, args.generated_at)
        stale = changed_paths(files)
        if args.check:
            if stale:
                for path in stale:
                    print(f"stale: {path.relative_to(repo_root).as_posix()}", file=sys.stderr)
                return 1
            print("canonical Markdown, site cache, and skill mirror are synchronized")
            return 0
        changed = write_files(files)
        for path in changed:
            print(path.relative_to(repo_root).as_posix())
        if not changed:
            print("already synchronized")
        return 0
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
