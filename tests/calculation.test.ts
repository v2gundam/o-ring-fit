import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildDxf } from "../app/lib/dxf";
import { getCornerRadiusGuidance, searchCandidates, searchCandidatesForRoundGroovePosition, validateInput, validateRoundGroovePosition, type RectInput, type RoundInput } from "../app/lib/oring";
import Home, { PlanPreview } from "../app/page";

const round: RoundInput = {
  shape: "round",
  innerDiameter: 100,
  outerDiameter: 120,
  innerMargin: 1,
  outerMargin: 1,
};

const rect: RectInput = {
  shape: "rect",
  innerWidth: 100,
  innerHeight: 100,
  innerRadius: 5,
  outerWidth: 140,
  outerHeight: 140,
  outerRadius: 25,
  innerMargin: 2,
  outerMargin: 2,
};

test("원형 기본 예제는 허용 영역 안의 표준 후보를 찾는다", () => {
  const result = searchCandidates(round, "vacuum", "internal_vacuum");
  assert.ok(result.accepted.length > 1);
  for (const candidate of result.accepted) {
    assert.equal(candidate.path.shape, "round");
    if (candidate.path.shape !== "round") continue;
    const innerEdge = candidate.path.diameter - candidate.profile.widthMm;
    const outerEdge = candidate.path.diameter + candidate.profile.widthMm;
    assert.ok(innerEdge >= round.innerDiameter + 2 * round.innerMargin - 1e-8);
    assert.ok(outerEdge <= round.outerDiameter - 2 * round.outerMargin + 1e-8);
    assert.ok(candidate.worstStretch <= 0.05 + 1e-9);
    assert.ok(candidate.worstCompression >= -0.03 - 1e-9);
    assert.equal(candidate.supportWall, "GROOVE ID");
  }
});

test("내부 가압과 내부 진공은 각각 외경·내경 지지벽을 기준으로 홈 위치를 바꾼다", () => {
  const pressure = searchCandidates(round, "gas", "internal_pressure", { grooveShape: "round", csMm: 3.53 }).accepted[0];
  const vacuum = searchCandidates(round, "vacuum", "internal_vacuum", { grooveShape: "round", csMm: 3.53 }).accepted[0];
  assert.ok(pressure);
  assert.ok(vacuum);
  assert.equal(pressure.path.shape, "round");
  assert.equal(vacuum.path.shape, "round");
  if (pressure.path.shape !== "round" || vacuum.path.shape !== "round") return;
  assert.equal(pressure.supportWall, "GROOVE OD");
  assert.equal(vacuum.supportWall, "GROOVE ID");
  assert.ok(Math.abs((pressure.path.diameter + pressure.profile.widthMm) - pressure.odMm) < 1e-8);
  assert.ok(Math.abs((vacuum.path.diameter - vacuum.profile.widthMm) - vacuum.idMm) < 1e-8);
  assert.notEqual(pressure.path.diameter, vacuum.path.diameter);
});

test("선정 오링의 ID와 CS로 자유 길이를 다시 계산해 최종 적용 형상과 독립적으로 대조한다", () => {
  const cases = [
    ...searchCandidates(round, "gas", "internal_pressure", { grooveShape: "round", csMm: 3.53 }).accepted,
    ...searchCandidates(round, "vacuum", "internal_vacuum", { grooveShape: "round", csMm: 3.53 }).accepted,
    ...searchCandidates(rect, "gas", "internal_pressure", { grooveShape: "rect", grooveRadius: 20, csMm: 3.53 }).accepted,
    ...searchCandidates(rect, "vacuum", "internal_vacuum", { grooveShape: "rect", grooveRadius: 20, csMm: 3.53 }).accepted,
  ];
  assert.ok(cases.length > 0);

  for (const candidate of cases) {
    const freeLength = Math.PI * (candidate.idMm + candidate.csMm);
    const grooveLength = candidate.path.shape === "round"
      ? Math.PI * candidate.path.diameter
      : 2 * (candidate.path.width + candidate.path.height - 4 * candidate.path.radius) + 2 * Math.PI * candidate.path.radius;
    const supportOffset = candidate.profile.section === "rect"
      ? Math.PI * (candidate.profile.widthMm - candidate.csMm)
      : 0;
    const installedLength = candidate.supportWall === "GROOVE OD"
      ? grooveLength + supportOffset
      : grooveLength - supportOffset;
    const strain = installedLength / freeLength - 1;

    assert.ok(Math.abs(candidate.freeLengthMm - freeLength) < 1e-9);
    assert.ok(Math.abs(candidate.groovePathLengthMm - grooveLength) < 1e-9);
    assert.ok(Math.abs(candidate.pathLengthMm - installedLength) < 1e-9);
    assert.ok(Math.abs(candidate.lengthCheck.differenceMm - (installedLength - freeLength)) < 1e-9);
    assert.ok(Math.abs(candidate.strain - strain) < 1e-12);
    assert.equal(candidate.lengthCheck.withinLimits, true);
  }
});

test("사용자 지정 원형 홈 내경 또는 외경을 고정하고 반대쪽 치수를 자동 계산한다", () => {
  for (const [medium, pressureMode] of [["vacuum", "internal_vacuum"], ["gas", "internal_pressure"]] as const) {
    const designed = searchCandidates(round, medium, pressureMode, { grooveShape: "round", csMm: 3.53 }).accepted[0];
    assert.ok(designed);
    assert.equal(designed.path.shape, "round");
    if (designed.path.shape !== "round") continue;
    const positions = [
      { edge: "inner" as const, diameter: designed.path.diameter - designed.profile.widthMm },
      { edge: "outer" as const, diameter: designed.path.diameter + designed.profile.widthMm },
    ];
    for (const position of positions) {
      const result = searchCandidatesForRoundGroovePosition(round, position, medium, pressureMode, { csMm: 3.53, glandSection: "rect" });
      const matched = result.accepted.find((candidate) => candidate.dash === designed.dash);
      assert.ok(matched);
      assert.equal(matched.path.shape, "round");
      if (matched.path.shape !== "round") continue;
      const actualDiameter = position.edge === "inner"
        ? matched.path.diameter - matched.profile.widthMm
        : matched.path.diameter + matched.profile.widthMm;
      assert.ok(Math.abs(actualDiameter - position.diameter) < 1e-9);
      assert.equal(matched.lengthCheck.withinLimits, true);
    }
  }
});

test("사용자 지정 홈 위치의 잘못된 지름과 외경 공간 부족을 검출한다", () => {
  assert.ok(validateRoundGroovePosition({ edge: "inner", diameter: 0 }).length > 0);
  const tooSmall = searchCandidatesForRoundGroovePosition(round, { edge: "outer", diameter: 1 }, "vacuum", "internal_vacuum", { csMm: 3.53 });
  assert.equal(tooSmall.accepted.length, 0);
  assert.ok(tooSmall.near.length > 0);
  assert.match(tooSmall.near[0].reason, /권장 홈 폭|공간/);
});

test("사용자 지정 홈 위치를 바꾸면 허용 영역 간섭과 오링 길이를 다시 검사한다", () => {
  const automatic = searchCandidates(round, "vacuum", "internal_vacuum", { grooveShape: "round", csMm: 3.53 }).accepted[0];
  assert.ok(automatic);
  assert.equal(automatic.path.shape, "round");
  if (automatic.path.shape !== "round") return;

  const automaticInner = automatic.path.diameter - automatic.profile.widthMm;
  const adjusted = searchCandidatesForRoundGroovePosition(round, { edge: "inner", diameter: automaticInner + 0.5 }, "vacuum", "internal_vacuum", { csMm: 3.53 });
  const sameRing = adjusted.accepted.find((candidate) => candidate.dash === automatic.dash);
  assert.ok(sameRing);
  assert.ok(Math.abs(sameRing.strain) > 1e-5);
  assert.equal(sameRing.lengthCheck.withinLimits, true);

  const innerCollision = searchCandidatesForRoundGroovePosition(round, { edge: "inner", diameter: 101 }, "vacuum", "internal_vacuum", { csMm: 3.53 });
  assert.equal(innerCollision.accepted.length, 0);
  assert.match(innerCollision.near[0].reason, /안쪽 금지 경계|간섭/);

  const outsideOuter = searchCandidatesForRoundGroovePosition(round, { edge: "outer", diameter: 119 }, "vacuum", "internal_vacuum", { csMm: 3.53 });
  assert.equal(outsideOuter.accepted.length, 0);
  assert.match(outsideOuter.near[0].reason, /바깥쪽 허용 경계|벗어/);
});

test("둥근 사각형 후보는 홈 안쪽 R 3×CS와 두 경계를 만족한다", () => {
  const result = searchCandidates(rect, "gas", "internal_pressure", { grooveShape: "rect", grooveRadius: 20 });
  assert.ok(result.accepted.length > 1);
  for (const candidate of result.accepted) {
    assert.equal(candidate.path.shape, "rect");
    if (candidate.path.shape !== "rect") continue;
    const halfWidth = candidate.profile.widthMm / 2;
    assert.ok(candidate.path.width - candidate.profile.widthMm >= rect.innerWidth + 2 * rect.innerMargin - 1e-8);
    assert.ok(candidate.path.height - candidate.profile.widthMm >= rect.innerHeight + 2 * rect.innerMargin - 1e-8);
    assert.ok(candidate.path.width + candidate.profile.widthMm <= rect.outerWidth - 2 * rect.outerMargin + 1e-8);
    assert.ok(candidate.path.height + candidate.profile.widthMm <= rect.outerHeight - 2 * rect.outerMargin + 1e-8);
    assert.ok(candidate.path.radius - halfWidth >= 3 * candidate.csMm - 1e-8);
    assert.equal(candidate.supportWall, "GROOVE OD");
  }
});

test("공간이 부족하면 후보 없음과 근접 후보 이유를 반환한다", () => {
  const input: RoundInput = { ...round, outerDiameter: 102 };
  const result = searchCandidates(input, "vacuum", "internal_vacuum");
  assert.equal(result.accepted.length, 0);
  assert.ok(result.near.length > 0);
  assert.match(result.near[0].reason, /공간|신장|압축/);
});

test("형상 입력 오류를 사전에 검출한다", () => {
  assert.ok(validateInput({ ...round, outerDiameter: 90 }).length > 0);
  assert.ok(validateInput({ ...rect, innerRadius: 60 }).length > 0);
});

test("DXF는 R14·mm 헤더와 닫힌 둥근 사각형 가공 루프를 포함한다", () => {
  const candidate = searchCandidates(rect, "vacuum", "internal_vacuum", { grooveShape: "rect", grooveRadius: 20 }).accepted[0];
  assert.ok(candidate);
  const dxf = buildDxf(candidate, rect, "internal_vacuum", "vacuum");
  assert.match(dxf, /\$ACADVER\n1\nAC1014/);
  assert.match(dxf, /\$INSUNITS\n70\n4/);
  assert.match(dxf, /0\nLWPOLYLINE[\s\S]*?70\n1/);
  assert.match(dxf, /8\nGROOVE_CUT/);
  assert.match(dxf, /LENGTH CHECK: FREE [\d.]+ \/ APPLIED [\d.]+ \/ DELTA [+-][\d.]+ mm/);
  assert.match(dxf, /GLAND PLAN IN W[\d.]+ H[\d.]+ R[\d.]+ \/ CENTER W[\d.]+ H[\d.]+ R[\d.]+ \/ OUT W[\d.]+ H[\d.]+ R[\d.]+ mm/);
  assert.match(dxf, /0\nEOF/);
});

test("바깥 경계 R을 줄여도 둥근 사각형 후보가 부당하게 사라지지 않는다", () => {
  const largeRadius = searchCandidates({ ...rect, outerRadius: 25 }, "vacuum", "internal_vacuum", { grooveShape: "rect", grooveRadius: 20 });
  const smallRadius = searchCandidates({ ...rect, outerRadius: 5 }, "vacuum", "internal_vacuum", { grooveShape: "rect", grooveRadius: 20 });
  assert.ok(largeRadius.accepted.length > 0);
  assert.ok(smallRadius.accepted.length >= largeRadius.accepted.length);
});

test("허용 영역과 다른 홈 형상도 실제 포함 관계로 찾는다", () => {
  const roundInRect = searchCandidates({ ...rect, outerWidth: 180, outerHeight: 180 }, "vacuum", "internal_vacuum", { grooveShape: "round" });
  const rectInRound = searchCandidates({ ...round, outerDiameter: 140 }, "vacuum", "internal_vacuum", { grooveShape: "rect", grooveRadius: 20 });
  assert.ok(roundInRect.accepted.length > 0);
  assert.ok(rectInRound.accepted.length > 0);
  assert.ok(roundInRect.accepted.every((candidate) => candidate.path.shape === "round"));
  assert.ok(rectInRound.accepted.every((candidate) => candidate.path.shape === "rect"));
});

test("서로 다른 허용 영역과 홈 형상을 미리보기에 함께 그린다", () => {
  const roundInRect = searchCandidates({ ...rect, outerWidth: 180, outerHeight: 180 }, "vacuum", "internal_vacuum", { grooveShape: "round", csMm: 3.53 }).accepted[0];
  const rectInRound = searchCandidates({ ...round, outerDiameter: 140 }, "vacuum", "internal_vacuum", { grooveShape: "rect", grooveRadius: 20, csMm: 3.53 }).accepted[0];
  assert.ok(roundInRect);
  assert.ok(rectInRound);

  const roundInRectMarkup = renderToStaticMarkup(createElement(PlanPreview, { candidate: roundInRect, input: rect, pressureMode: "internal_vacuum" }));
  assert.match(roundInRectMarkup, /data-preview-shape="boundary-rect"/);
  assert.match(roundInRectMarkup, /data-preview-shape="groove-round"/);

  const rectInRoundMarkup = renderToStaticMarkup(createElement(PlanPreview, { candidate: rectInRound, input: { ...round, outerDiameter: 140 }, pressureMode: "internal_vacuum" }));
  assert.match(rectInRoundMarkup, /data-preview-shape="boundary-round"/);
  assert.match(rectInRoundMarkup, /data-preview-shape="groove-rect"/);
});

test("모바일 작업 화면은 후보를 콤보박스로 선택하고 기본 도면에는 상세 주석을 숨긴다", () => {
  const homeMarkup = renderToStaticMarkup(createElement(Home));
  assert.match(homeMarkup, /aria-label="추천 오링 형번 선택"/);
  assert.match(homeMarkup, /적합 오링 형번/);
  assert.match(homeMarkup, /입력과 동시에 자동 계산됩니다/);
  assert.match(homeMarkup, /aria-label="오링 홈 위치 선택"/);
  assert.match(homeMarkup, /사용자 지정\(내경\)/);
  assert.match(homeMarkup, /사용자 지정\(외경\)/);
  assert.doesNotMatch(homeMarkup, /표준 오링 후보 찾기/);
  assert.doesNotMatch(homeMarkup, /class="candidate-list"/);
  const selectStart = homeMarkup.indexOf('aria-label="추천 오링 형번 선택"');
  const selectEnd = homeMarkup.indexOf("</select>", selectStart);
  const displayedDashNumbers = [...homeMarkup.slice(selectStart, selectEnd).matchAll(/AS568-(\d+) ·/g)].map((match) => Number(match[1]));
  assert.deepEqual(displayedDashNumbers, [...displayedDashNumbers].sort((left, right) => left - right));

  const candidate = searchCandidates(round, "vacuum", "internal_vacuum").accepted[0];
  assert.ok(candidate);
  const compactMarkup = renderToStaticMarkup(createElement(PlanPreview, { candidate, input: round, pressureMode: "internal_vacuum" }));
  const detailMarkup = renderToStaticMarkup(createElement(PlanPreview, { candidate, input: round, pressureMode: "internal_vacuum", modal: true }));
  assert.doesNotMatch(compactMarkup, /오링 이동/);
  assert.match(detailMarkup, /오링 이동/);
});

test("단면 두께 필터는 선택한 AS568 단면 계열만 남긴다", () => {
  const result = searchCandidates({ ...rect, outerRadius: 5 }, "vacuum", "internal_vacuum", { grooveShape: "rect", grooveRadius: 20, csMm: 3.53 });
  assert.ok(result.accepted.length > 0);
  assert.ok(result.accepted.every((candidate) => Math.abs(candidate.csMm - 3.53) < 0.03));
});

test("Parker 도브테일과 하프 도브테일 표의 단면 치수를 적용한다", () => {
  const wideRound: RoundInput = { ...round, outerDiameter: 140 };
  const full = searchCandidates(wideRound, "vacuum", "internal_vacuum", { grooveShape: "round", csMm: 3.53, glandSection: "dovetail" });
  const halfInner = searchCandidates(wideRound, "vacuum", "internal_vacuum", { grooveShape: "round", csMm: 3.53, glandSection: "half_dovetail_inner" });
  const halfOuter = searchCandidates(wideRound, "vacuum", "internal_vacuum", { grooveShape: "round", csMm: 3.53, glandSection: "half_dovetail_outer" });
  assert.ok(full.accepted.length > 0);
  assert.ok(halfInner.accepted.length > 0);
  assert.ok(halfOuter.accepted.length > 0);
  const fullProfile = full.accepted[0].profile;
  const halfInnerProfile = halfInner.accepted[0].profile;
  const halfOuterProfile = halfOuter.accepted[0].profile;
  assert.equal(fullProfile.section, "dovetail");
  assert.equal(halfInnerProfile.section, "half_dovetail_inner");
  assert.equal(halfOuterProfile.section, "half_dovetail_outer");
  assert.ok(Math.abs(fullProfile.mouthWidthMm - 0.115 * 25.4) < 1e-8);
  assert.ok(Math.abs(fullProfile.depthMm - 0.112 * 25.4) < 1e-8);
  assert.ok(Math.abs(halfInnerProfile.mouthWidthMm - 0.126 * 25.4) < 1e-8);
  assert.ok(Math.abs(halfInnerProfile.depthMm - 0.114 * 25.4) < 1e-8);
  assert.equal(halfInnerProfile.mouthWidthMm, halfOuterProfile.mouthWidthMm);
  assert.equal(halfInnerProfile.bottomWidthMm, halfOuterProfile.bottomWidthMm);
  assert.ok(fullProfile.bottomWidthMm > fullProfile.mouthWidthMm);
  assert.ok(halfInnerProfile.bottomWidthMm > halfInnerProfile.mouthWidthMm);
  assert.equal(fullProfile.angleDeg, 66);
  assert.match(buildDxf(full.accepted[0], wideRound, "internal_vacuum", "vacuum"), /GLAND SECTION: DOVETAIL \/ G/);
  assert.match(buildDxf(halfInner.accepted[0], wideRound, "internal_vacuum", "vacuum"), /GLAND SECTION: HALF DOVETAIL INNER/);
  assert.match(buildDxf(halfOuter.accepted[0], wideRound, "internal_vacuum", "vacuum"), /GLAND SECTION: HALF DOVETAIL OUTER/);
});

test("선택 단면의 실제 안쪽 R과 입력용 중심선 R을 구분해 안내한다", () => {
  const rectGuide = getCornerRadiusGuidance(3.53, "vacuum", "rect");
  const dovetailGuide = getCornerRadiusGuidance(3.53, "vacuum", "dovetail");
  assert.ok(rectGuide);
  assert.ok(dovetailGuide);
  assert.ok(Math.abs(rectGuide.csMm - 0.139 * 25.4) < 1e-8);
  assert.ok(Math.abs(rectGuide.minimumInnerRadiusMm - 3 * rectGuide.csMm) < 1e-8);
  assert.ok(Math.abs(rectGuide.idealInnerRadiusMm - 6 * rectGuide.csMm) < 1e-8);
  assert.ok(Math.abs(rectGuide.minimumCenterlineRadiusMm - (3 * rectGuide.csMm + rectGuide.footprintWidthMm / 2)) < 1e-8);
  assert.ok(rectGuide.idealCenterlineRadiusMm > rectGuide.minimumCenterlineRadiusMm);
  assert.ok(dovetailGuide.minimumCenterlineRadiusMm > rectGuide.minimumCenterlineRadiusMm);
});
