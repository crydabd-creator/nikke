---
name: nikke-damage-analysis
description: Analyze GODDESS OF VICTORY: NIKKE damage mechanics, character builds, overload options, teams, and Solo Raid performance using current mechanics, boss conditions, account investment, and real battle records. Use for damage calculations or comparisons; do not use for lore-only questions.
---

# NIKKE Damage Analysis

Explain why a character, buff, build, or team performs as it does. Optimize the user's actual account and five-team Solo Raid total rather than repeating tier lists.

## Evidence

Use evidence in this order:

1. Current in-game skill text
2. Official notices and patch notes
3. Reproducible calculations or tests
4. Specialist guides such as Nikke.gg
5. Community testing
6. Explicitly labeled inference

For facts that may have changed, verify current sources when tools allow. Resolve conflicts in favor of newer in-game data and reproducible tests. Label uncertainty as `확인 필요`, `추정`, `실전 검증 필요`, or `현재 자료만으로 판정 불가`.

## Workflow

1. Identify the question: common formula, character mechanic, overload investment, team comparison, or raid optimization.
2. Read [references/mechanics.md](references/mechanics.md) for the relevant damage types and evaluation rules.
3. If account data or a `nikke-account-status` source is available, use ownership, skill levels, limit/core breaks, overload lines, collection items, combat power, past raid scores, and observed damage. Do not invent missing account data.
4. Separate shared damage factors from character-specific behavior. Verify which attacks each buff affects and whether modifiers add or multiply.
5. For teams, first check burst sequence, cooldown, gauge generation, survival, boss mechanics, and whether key damage dealers must cast Burst.
6. Compare changes by total damage across all five Solo Raid teams when relevant, including opportunity cost from moving a unit.
7. Give a conclusion, reasoning, risks, and a short controlled test for every material uncertainty.

## Non-negotiable distinctions

- Attack increase is not attack-damage increase or damage-taken increase.
- Burst cooldown reduction is not burst-gauge generation.
- Cover healing does not revive destroyed cover.
- Charge damage is normally irrelevant to non-charge weapons unless a character-specific mechanic proves otherwise.
- Core, part, pierce, and superior-element value depend on the boss and actual hit uptime.
- Do not assume DoT, distributed, follow-up, or extra damage inherit ordinary-attack modifiers; verify each interaction.
- A larger displayed buff is not automatically the larger final multiplier because existing buffs and stacking groups matter.

## Output

Match detail to the request. For a character, include core damage structure, effective buffs, low-value options, Burst requirement, conditions, and raid utility. For a team recommendation, include:

- `추천`: proposed lineup or investment
- `이유`: which effects reach which damage dealers and why they matter
- `위험`: survival, cycle, gauge, hit-count, element, cover, or investment constraints
- `검증`: one-variable-at-a-time battle tests and the metric to compare
- `총합 영향`: expected five-team gain/loss when applicable

Use formulas or numerical scenarios when inputs are known. When stacking or skill applicability is unverified, provide a bounded comparison or test plan instead of false precision.

