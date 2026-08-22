---
name: nikke-solo-raid-analysis
description: Record, maintain, compare, and analyze the user's GODDESS OF VICTORY NIKKE Solo Raid history, including five non-overlapping teams, actual damage, rankings, boss mechanics, retries, successful and failed strategies, personal records, and investment efficiency. Use for entering or updating Solo Raid results; reviewing a past season; comparing a new boss with prior bosses; building personalized five-team lineups; prioritizing retries or upgrades; estimating rank improvement; or analyzing long-term account strengths and weaknesses from the user's real raid data. When current roster or build data is available from a NIKKE account-development skill, combine it with this skill while keeping current account state and historical snapshots distinct.
---

# NIKKE Solo Raid Analysis

Treat the user's verified results as the primary personal evidence base. Optimize for the highest likely result on this account, not for copying a generic tier list.

## Load the data

1. Read [references/records.md](references/records.md) for stored seasons and personal records.
2. Read [references/schema.md](references/schema.md) before adding or substantially restructuring records.
3. If a current NIKKE account-development skill or user-supplied roster snapshot is available, use it for current ownership and investment state. Treat build data stored in old raid records only as historical snapshots.
4. For a current boss, patch, bug, character performance, or meta claim, verify recent official or reliable sources. Label external information separately from personal records.

## Apply evidence rules

- Never invent missing historical facts. Write `기록 없음` or state that the detail was not recorded.
- Prefer actual user results over theoretical expectations when conditions are comparable.
- Explicitly identify differences in boss, patch, investment, controls, or strategy before transferring an old result.
- Treat external teams as hypotheses. Identify their carry, buffers, buff interaction, boss fit, required investment, replaceable roles, and reproducibility on this account.
- Separate claims as `[사용자 과거 실전 기록]`, `[현재 외부 정보]`, and `[현재 계정 분석]` when multiple evidence types appear together.
- Do not use the same NIKKE in more than one of the five proposed teams.
- Preserve failed tests and low results when they contain reusable lessons.

## Record or update a season

1. Normalize user-provided numbers without silently changing their meaning.
2. Record the season metadata, boss profile and tags, teams 1–5, actual damage, burst structure, operation notes, retry changes, successes, failures, and season review using the schema.
3. Mark every unavailable field as `기록 없음`; do not fill it from general meta knowledge.
4. Recalculate the total only when all five team scores are known. If the supplied final total differs from the sum, preserve both and flag the discrepancy.
5. Append meaningful retry changes with before/after damage and the observed increase.
6. Update milestones and long-term summaries only when supported by recorded facts.
7. Edit [references/records.md](references/records.md) in place, preserving prior details and source distinctions.
8. Summarize what was added, what remains missing, and the most useful lesson.

## Analyze a new raid

1. Profile the boss: advantageous code, core and parts, pierce/AoE fit, survival checks, movement, important patterns, damage windows, burst timing, and character interactions.
2. Search stored seasons for mechanical similarity. Compare part/core structure, damage windows, survival pressure, movement, control needs, and team architecture; do not match on element alone.
3. Extract transferable wins, failures, and score-increasing changes.
4. Check current account ownership, skills, favorite items, gear, overload lines, combat power, and current investment where available.
5. Build five unique teams. For each, give the main/sub DPS, core buffers, burst structure, boss fit, link to personal evidence, strengths, risks, and missing data.
6. Rank upgrades by marginal cost versus expected score gain, reuse across teams, future raid value, other-mode value, and resource cost.
7. State uncertainty and propose the smallest useful test when evidence is incomplete.

## Optimize during a raid

- Compare theoretical ceiling, actual score, retry difficulty, investment, change cost, and improvement headroom across all teams.
- Do not automatically optimize the lowest-scoring team first.
- Classify actions as `예상 효율 매우 높음`, `높음`, `보통`, or `낮음`.
- For each action, state the exact change, target team, rationale, expected direction or range, cost, and validation run.
- Near raid end, compare current score/rank, target rank, likely required damage, improvable teams, remaining time, and affordable resources. Clearly flag disproportionate spending.

## Answer format

Lead with an actionable recommendation. Connect current account state, relevant personal records, and current boss mechanics. Use compact tables for five-team comparisons or retry priorities. Distinguish facts, inferences, and unknowns. End with the next test or data needed when appropriate.

