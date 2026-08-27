#!/usr/bin/env python3
"""End-to-end fixture test for Work -> canonical Markdown -> site cache."""

from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def replace_commander_level(path: Path, value: str) -> None:
    content = path.read_text(encoding="utf-8")
    updated, count = re.subn(r"(?m)^\| 지휘관 레벨 \| [^|]+ \|$", f"| 지휘관 레벨 | {value} |", content)
    if count != 1:
        raise AssertionError(f"expected one commander level row, found {count}")
    path.write_text(updated, encoding="utf-8", newline="\n")


def without_commander_level(content: str) -> str:
    return re.sub(r"(?m)^\| 지휘관 레벨 \| [^|]+ \|$", "| 지휘관 레벨 | <tested> |", content)


def run_sync(repo: Path, stamp: str) -> None:
    subprocess.run(
        [
            sys.executable,
            str(repo / "nikke-account-status" / "scripts" / "sync_account_db.py"),
            "--repo-root",
            str(repo),
            "--write",
            "--generated-at",
            stamp,
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    subprocess.run(
        [
            sys.executable,
            str(repo / "nikke-account-status" / "scripts" / "sync_account_db.py"),
            "--repo-root",
            str(repo),
            "--check",
        ],
        check=True,
        capture_output=True,
        text=True,
    )


def main() -> int:
    source_root = Path(__file__).resolve().parents[1]
    canonical_account = source_root / "nikke-account-status" / "references" / "account-status.md"
    actual_match = re.search(r"(?m)^\| 지휘관 레벨 \| ([^|]+) \|$", canonical_account.read_text(encoding="utf-8"))
    if not actual_match:
        raise AssertionError("commander level row not found")
    actual_value = actual_match.group(1).strip()
    fixture_before = str(max(0, int(actual_value) - 1))

    with tempfile.TemporaryDirectory(prefix="nikke-account-flow-") as directory:
        repo = Path(directory) / "repo"
        shutil.copytree(source_root / "nikke-account-status", repo / "nikke-account-status")
        if (source_root / "references").exists():
            shutil.copytree(source_root / "references", repo / "references")

        account_path = repo / "nikke-account-status" / "references" / "account-status.md"
        skill_details = repo / "nikke-account-status" / "references" / "skill-details.md"
        raid_records = repo / "references" / "records.md"
        account_before = account_path.read_text(encoding="utf-8")
        skill_hash = digest(skill_details)
        raid_hash = digest(raid_records) if raid_records.exists() else ""

        replace_commander_level(account_path, fixture_before)
        run_sync(repo, "2026-08-28T00:00:00.000Z")

        # Simulate a Work task writing the verified current value to canonical Markdown first.
        replace_commander_level(account_path, actual_value)
        run_sync(repo, "2026-08-28T00:01:00.000Z")

        canonical = repo / "nikke-account-status"
        mirror = canonical / "agents" / "skills" / "nikke-account-status"
        cache = json.loads((canonical / "references" / "site-account-data.json").read_text(encoding="utf-8"))
        assert cache["source"] == "nikke-account-status/references Markdown DB"
        assert cache["cache"] is True
        assert cache["generatedAt"] == "2026-08-28T00:01:00.000Z"
        assert cache["account"]["commanderLevel"] == actual_value
        assert (mirror / "references" / "site-account-data.json").read_bytes() == (canonical / "references" / "site-account-data.json").read_bytes()
        assert (mirror / "references" / "account-status.md").read_bytes() == account_path.read_bytes()
        assert (mirror / "SKILL.md").read_bytes() == (canonical / "SKILL.md").read_bytes()
        assert without_commander_level(account_path.read_text(encoding="utf-8")) == without_commander_level(account_before)
        assert digest(skill_details) == skill_hash
        if raid_records.exists():
            assert digest(raid_records) == raid_hash

    print(f"work-to-site: canonical commanderLevel {actual_value} regenerated the site cache; mirrors, manual details, and raid records were preserved")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
