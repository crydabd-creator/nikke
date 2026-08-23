# Damage and Team Evaluation Reference

Read only the sections relevant to the request.

## Common modifiers

- **Attack increase:** determine recipient, condition, uptime, stacking group, and additive or multiplicative behavior. Its marginal value falls when the same bucket is already large.
- **Attack-damage increase:** treat separately from attack. Check ordinary attacks, skills, Burst, damage over time, and distributed damage individually.
- **Damage-taken increase:** treat as an enemy debuff. Check element, weapon, and attack-type restrictions; DoT/distributed applicability; uptime; and stacking.
- **Superior-element damage:** value only against an elementally weak target. Combine boss and attacker elements, overload lines, skill/support buffs, and actual uptime.
- **Critical chance/damage:** consider base stats, existing buffs, attack count, whether major instances can crit, and the existing critical bucket. Compare marginal gain with attack and independent amplification.
- **Charge damage:** primarily relevant to SR/RL charge attacks. Treat as ineffective for MG/AR/SMG/SG unless a verified kit uses charge scaling.
- **Ammunition, reload, attack speed:** evaluate together. Ammo helps sustained fire, long reloads, shot-count passives, and Full Burst uptime, but can harm reload-trigger or last-bullet kits. Attack speed can affect DPS, ammo use, hit-count mechanics, passive cadence, and gauge generation.

## Special damage types

For DoT, distributed, extra, and follow-up damage, separately verify attack scaling, attack-damage and damage-taken modifiers, superior element, critical hits, core hits, and type-specific buffs. Determine whether extra or follow-up damage is a separate instance.

For distributed damage, test enemy-count behavior, single-boss efficiency, interaction with parts, and whether it can crit or gain superior-element bonuses.

## Boss geometry

- **Pierce:** assess simultaneous body/part or multi-hitbox hits and record usable aim points.
- **Parts:** determine whether preserving, breaking, or repeatedly breaking a part maximizes damage or handles a mechanic.
- **Core:** value core damage only while an accessible core exists.
- Record actual uptime; theoretical eligibility is not full-fight value.

## Burst and survival

When Burst timing slips, distinguish an unavailable cooldown from an unfilled gauge. Solve the former with cooldown reduction and the latter with gauge generation or play-pattern changes.

Distinguish Nikke HP healing, healing surviving cover, and reviving destroyed cover. Cover healing cannot solve cover destruction before the heal resolves.

## Character analysis schema

- Basic: element, weapon, Burst stage, cooldown
- Damage structure: ordinary, Burst, DoT, extra/follow-up, distributed, pierce, parts
- Effective buffs and their applicability
- Low-value or ineffective options
- Whether Burst use is mandatory or the unit can be a non-Burst support
- Conditions: enemy element, ally weapon/character, required buff, ammunition, Full Burst count
- Solo Raid utility: hit count, elemental shield, adds, parts, core, pierce, survival

## Team evaluation order

1. Valid Burst I/II/III rotation
2. Sufficient cooldown reduction
3. Sufficient gauge generation
4. Survival
5. Elemental mechanics
6. Hit count, adds, parts, core, and pierce
7. Buffs that actually apply to each damage dealer
8. Diminishing returns or overlapping modifier buckets
9. Which damage dealers must cast Burst
10. Opportunity cost and five-team total

Do not compare support buffs by displayed percentages alone. Estimate final damage from known modifier buckets. If the formula or applicability is unknown, prescribe a controlled comparison and mark it for validation.

## Overload evaluation

Connect options to the kit. For a typical sustained-fire MG dealer, superior-element damage, attack, and maximum ammo are initial candidates; critical stats may be situational, while charge damage is normally low value. Character-specific mechanics override weapon heuristics.

## Practical validation

Change one variable at a time. Keep stage, boss phase, aim point, Burst order, manual/auto behavior, and duration consistent. Record damage by character, Burst count/timing, reload interruptions, survival/cover state, mechanic failures, and total score. Repeat attempts when crits, targeting, or boss patterns add variance.

