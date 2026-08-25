#!/usr/bin/env python3
"""Create or update the default OpenAI version of a packaged skill."""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
import zipfile
from pathlib import Path
from typing import Any


API_ROOT = "https://api.openai.com/v1"
SKILL_NAME = "nikke-account-status"


def headers(api_key: str) -> dict[str, str]:
    result = {"Authorization": f"Bearer {api_key}", "Accept": "application/json"}
    if organization := os.environ.get("OPENAI_ORGANIZATION", "").strip():
        result["OpenAI-Organization"] = organization
    if project := os.environ.get("OPENAI_PROJECT", "").strip():
        result["OpenAI-Project"] = project
    return result


def request_json(
    method: str,
    path: str,
    api_key: str,
    *,
    body: bytes | None = None,
    content_type: str | None = None,
) -> dict[str, Any]:
    request_headers = headers(api_key)
    if content_type:
        request_headers["Content-Type"] = content_type
    request = urllib.request.Request(API_ROOT + path, data=body, headers=request_headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        response_text = error.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(response_text)
            message = payload.get("error", {}).get("message") or response_text
        except json.JSONDecodeError:
            message = response_text
        raise RuntimeError(f"OpenAI API returned HTTP {error.code}: {message}") from error


def multipart(zip_path: Path, extra_fields: dict[str, str] | None = None) -> tuple[bytes, str]:
    boundary = "----nikke-skill-" + uuid.uuid4().hex
    chunks: list[bytes] = []
    for key, value in (extra_fields or {}).items():
        chunks.extend(
            [
                f"--{boundary}\r\n".encode(),
                f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode(),
                value.encode(),
                b"\r\n",
            ]
        )
    mime = mimetypes.guess_type(zip_path.name)[0] or "application/zip"
    chunks.extend(
        [
            f"--{boundary}\r\n".encode(),
            f'Content-Disposition: form-data; name="files"; filename="{zip_path.name}"\r\n'.encode(),
            f"Content-Type: {mime}\r\n\r\n".encode(),
            zip_path.read_bytes(),
            b"\r\n",
            f"--{boundary}--\r\n".encode(),
        ]
    )
    return b"".join(chunks), f"multipart/form-data; boundary={boundary}"


def validate_bundle(zip_path: Path) -> None:
    if not zip_path.is_file():
        raise ValueError(f"Skill bundle not found: {zip_path}")
    with zipfile.ZipFile(zip_path) as archive:
        names = archive.namelist()
        if f"{SKILL_NAME}/SKILL.md" not in names:
            raise ValueError("Skill bundle must contain nikke-account-status/SKILL.md")
        if any(not name.startswith(f"{SKILL_NAME}/") for name in names):
            raise ValueError("Skill bundle contains files outside its top-level directory")
        archive.testzip()


def find_skill_id(api_key: str) -> str | None:
    matches: list[str] = []
    after = ""
    while True:
        query = urllib.parse.urlencode({"limit": 100, **({"after": after} if after else {})})
        page = request_json("GET", f"/skills?{query}", api_key)
        for skill in page.get("data", []):
            if skill.get("name") == SKILL_NAME and skill.get("id"):
                matches.append(skill["id"])
        if not page.get("has_more"):
            break
        after = str(page.get("last_id") or "")
        if not after:
            raise RuntimeError("Skills pagination did not return last_id")
    unique = sorted(set(matches))
    if len(unique) > 1:
        raise RuntimeError("Multiple skills named nikke-account-status exist; set OPENAI_SKILL_ID explicitly")
    return unique[0] if unique else None


def publish(zip_path: Path, api_key: str, explicit_skill_id: str | None) -> dict[str, Any]:
    skill_id = explicit_skill_id or find_skill_id(api_key)
    if skill_id:
        body, content_type = multipart(zip_path, {"default": "true"})
        result = request_json(
            "POST", f"/skills/{urllib.parse.quote(skill_id, safe='')}/versions", api_key,
            body=body, content_type=content_type,
        )
        return {"action": "version_created", "skill_id": skill_id, "version": result.get("version"), "version_id": result.get("id")}
    body, content_type = multipart(zip_path)
    result = request_json("POST", "/skills", api_key, body=body, content_type=content_type)
    return {"action": "skill_created", "skill_id": result.get("id"), "version": result.get("default_version")}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("bundle", type=Path)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    try:
        validate_bundle(args.bundle)
        if args.dry_run:
            print(json.dumps({"valid": True, "skill": SKILL_NAME, "bundle": args.bundle.as_posix()}))
            return 0
        api_key = os.environ.get("OPENAI_API_KEY", "").strip()
        if not api_key:
            raise ValueError("OPENAI_API_KEY is required")
        result = publish(args.bundle, api_key, os.environ.get("OPENAI_SKILL_ID", "").strip() or None)
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except (OSError, ValueError, RuntimeError, zipfile.BadZipFile) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
