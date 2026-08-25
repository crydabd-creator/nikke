#!/usr/bin/env python3
"""Build a deterministic upload bundle for the NIKKE account skill."""

from __future__ import annotations

import argparse
import sys
import zipfile
from pathlib import Path


SKILL_NAME = "nikke-account-status"
REQUIRED_FILES = {
    "SKILL.md",
    "agents/openai.yaml",
    "assets/icon.svg",
    "references/account-status.md",
    "references/combat-status.md",
    "references/skill-details.md",
    "references/overload-details.md",
    "references/collection-details.md",
    "references/element-classification.md",
    "references/weapon-classification.md",
    "references/burst-classification.md",
    "references/class-classification.md",
}


def should_include(relative: Path) -> bool:
    parts = relative.parts
    if not parts:
        return False
    if parts[:2] == ("agents", "skills"):
        return False
    if relative.as_posix() == "references/site-account-data.json":
        return False
    return not any(part in {"__pycache__", ".DS_Store"} for part in parts)


def collect_files(skill_dir: Path) -> list[Path]:
    files: list[Path] = []
    for path in sorted(skill_dir.rglob("*")):
        if path.is_symlink():
            raise ValueError(f"Symlinks are not allowed in the skill bundle: {path}")
        if path.is_file() and should_include(path.relative_to(skill_dir)):
            files.append(path)
    present = {path.relative_to(skill_dir).as_posix() for path in files}
    missing = sorted(REQUIRED_FILES - present)
    if missing:
        raise ValueError("Missing required skill files: " + ", ".join(missing))
    return files


def build_zip(skill_dir: Path, output: Path) -> None:
    files = collect_files(skill_dir)
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for source in files:
            relative = source.relative_to(skill_dir).as_posix()
            info = zipfile.ZipInfo(f"{SKILL_NAME}/{relative}", date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, source.read_bytes())


def validate_zip(output: Path) -> None:
    with zipfile.ZipFile(output) as archive:
        names = archive.namelist()
        prefix = f"{SKILL_NAME}/"
        if not names or any(not name.startswith(prefix) for name in names):
            raise ValueError("Every bundle entry must be inside the nikke-account-status top-level directory")
        if f"{SKILL_NAME}/SKILL.md" not in names:
            raise ValueError("The bundle does not contain nikke-account-status/SKILL.md")
        if any("/agents/skills/" in name for name in names):
            raise ValueError("Repository mirror copies must not be included in the published skill")
        if f"{SKILL_NAME}/references/site-account-data.json" in names:
            raise ValueError("The generated site cache must not be included in the published skill")
        archive.testzip()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--skill-dir", type=Path, default=Path("nikke-account-status"))
    parser.add_argument("--output", type=Path, default=Path("dist/nikke-account-status.zip"))
    args = parser.parse_args()
    try:
        build_zip(args.skill_dir.resolve(), args.output.resolve())
        validate_zip(args.output.resolve())
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    print(args.output.as_posix())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
