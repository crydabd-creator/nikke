---
name: nikke-account-status
description: "사용자의 GODDESS OF VICTORY: NIKKE 계정 육성 현황을 기준 자료로 제공한다. NIKKE 덱 구성, 솔로 레이드, 유니온 레이드, 캐릭터 육성, 재화 사용 및 투자 우선순위를 분석하거나 사용자의 보유 캐릭터·돌파·코어 강화·스킬·애장품·소장품·오버로드 장비 상태를 확인·갱신할 때 사용한다."
---

# NIKKE 계정 육성 현황

## 기준 자료 읽기

NIKKE 관련 분석을 시작하기 전에 [account-status.md](references/account-status.md)를 읽는다.

`references/`의 Markdown 문서가 계정 DB의 유일한 기준 자료다. `site-account-data.json`과 `agents/skills/nikke-account-status/`는 자동 생성 결과이므로 분석하거나 수정할 때 독립 원본으로 사용하지 않는다.

웹 접근이 가능하면 분석 전에 GitHub `main`의 최신 [account-status.md](https://raw.githubusercontent.com/crydabd-creator/nikke/main/nikke-account-status/references/account-status.md)를 다시 읽고, 이 스킬에 포함된 로컬 사본보다 우선한다. 원격 문서를 읽지 못할 때만 로컬 `references/` 사본을 대체 자료로 사용하고, 이 경우 최신 사이트 수정이 아직 반영되지 않았을 수 있다고 알린다.

질문 종류에 따라 아래 원격 문서를 추가로 읽는다.

- 캐릭터 전투력·레벨·육성 상태: [combat-status.md](https://raw.githubusercontent.com/crydabd-creator/nikke/main/nikke-account-status/references/combat-status.md)
- 스킬 레벨·상세: [skill-details.md](https://raw.githubusercontent.com/crydabd-creator/nikke/main/nikke-account-status/references/skill-details.md)
- 오버로드 부위별 옵션: [overload-details.md](https://raw.githubusercontent.com/crydabd-creator/nikke/main/nikke-account-status/references/overload-details.md)
- 소장품·애장품: [collection-details.md](https://raw.githubusercontent.com/crydabd-creator/nikke/main/nikke-account-status/references/collection-details.md)
- 속성·무기·버스트·클래스: 해당 `element-classification.md`, `weapon-classification.md`, `burst-classification.md`, `class-classification.md`

원격 문서와 로컬 사본이 다르면 원격 GitHub `main` 문서를 우선한다. 사이트에서 생성한 PR이 아직 병합되지 않았다면 GitHub에 반영되지 않은 정보이므로 병합 전 자료가 최신 기준이다.

## 적용 원칙

1. 기준 자료와 현재 대화에서 사용자가 직접 제공한 정보를 우선한다.
2. 캐릭터별 상태를 보유 여부, 한계돌파 또는 코어 강화, 스킬 1/2/버스트, 애장품 또는 소장품, 오버로드 장비와 옵션으로 분리한다.
3. 자료에 없는 값은 `미확인`으로 취급한다. 보유 여부나 육성 상태를 추측하지 않는다.
4. 사용자가 현재 대화에서 새 획득이나 육성 변경을 알리면 그 최신 정보를 기존 기준 자료보다 우선한다.
5. 충돌하는 정보는 날짜가 더 최신인 사용자의 직접 진술을 우선한다. 최신 여부를 판단할 수 없으면 확인한다.
6. 분석에 필요한 핵심 정보가 없으면 결론을 단정하지 말고 사용자에게 짧게 확인한다.
7. 최신 스킬 수치, 패치, 보스 기믹 또는 메타가 필요하면 현재 자료로 별도 검증한다. 계정 정보와 게임 일반 정보를 혼동하지 않는다.

## 분석 방법

- 덱을 제안할 때 실제 보유가 확인된 캐릭터를 우선 사용한다.
- 솔로 레이드와 유니온 레이드는 캐릭터 중복을 피하고 각 파티의 버스트 단계, 쿨타임, 속성, 기믹 대응을 점검한다.
- 투자 우선순위는 목표 콘텐츠, 예상 기여도, 현재 육성도, 추가 비용을 함께 비교한다.
- 미육성 캐릭터는 필요한 투자를 명시하고 즉시 투입 가능한 캐릭터와 구분한다.
- 확인된 사실과 조건부 판단을 구분한다.

## 갱신 방법

사용자가 상태 변경을 알리면 이번 분석에 즉시 반영한다. 기준 자료 자체의 업데이트를 요청하면 GitHub 저장소 `crydabd-creator/nikke`의 `nikke-account-status/references/`에 있는 canonical Markdown을 먼저 갱신한다. 설치되거나 배포된 스킬 패키지 내부 복사본만 수정한 채 완료했다고 보고하지 않는다.

- 계정 전체 상태: [account-status.md](references/account-status.md)
- 캐릭터 전투력·레벨·육성 상태: [combat-status.md](references/combat-status.md)와 이를 사용하는 요약
- 스킬 레벨·상세: [skill-details.md](references/skill-details.md)와 이를 사용하는 요약
- 부위별 오버로드: [overload-details.md](references/overload-details.md)와 이를 사용하는 요약
- 소장품·애장품: [collection-details.md](references/collection-details.md)와 이를 사용하는 요약
- 속성·무기·버스트·클래스: 해당 `*-classification.md`

같은 요약값이 여러 문서에 있으면 함께 맞춘다. Markdown 수정 뒤 저장소 루트에서 `python nikke-account-status/scripts/sync_account_db.py --repo-root . --write`를 실행하고, 이어서 `--check`로 검증한다. 이 단계가 canonical Markdown을 다시 읽어 `site-account-data.json`을 재생성하고 `agents/skills/nikke-account-status/` 복사본을 동일하게 맞춘다.

변경은 GitHub 커밋 또는 PR로 반영한다. 저장소 쓰기 권한이나 GitHub 연결이 없다면 canonical DB에 반영되지 않았음을 분명히 알리고 중단한다. `site-account-data.json`이나 스킬 패키지 내부 mirror를 직접 편집하여 우회하지 않는다. 확인되지 않은 다른 항목과 기존 상세 기록·수동 메모·레이드용 데이터는 삭제하거나 덮어쓰지 않는다.
