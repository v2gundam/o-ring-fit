"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { buildDxf, downloadDxf } from "./lib/dxf";
import {
  getEnvelopeBoundaries,
  getCornerRadiusGuidance,
  searchCandidates,
  searchCandidatesForGrooveMeasurement,
  searchCandidatesForGroovePosition,
  validateGrooveMeasurement,
  validateGroovePosition,
  validateInput,
  type Candidate,
  type GlandSection,
  type GrooveMeasurementInput,
  type GrooveShape,
  type Medium,
  type MixedInput,
  type PressureMode,
  type RectInput,
  type RoundInput,
  type ShapeInput,
} from "./lib/oring";

const initialRound: RoundInput = {
  shape: "round",
  innerDiameter: 100,
  outerDiameter: 120,
  innerMargin: 1,
  outerMargin: 1,
};

const initialRect: RectInput = {
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

const initialMode: PressureMode = "internal_vacuum";
const initialMedium: Medium = "vacuum";
const initialSearch = searchCandidates(initialRound, initialMedium, initialMode, { grooveShape: "round" });
const crossSections = [1.78, 2.62, 3.53, 5.33, 6.99];

function sortByDash<T extends { dash: string }>(items: readonly T[]) {
  return [...items].sort((left, right) => left.dash.localeCompare(right.dash, undefined, { numeric: true }));
}

function measurementPathLength(input: GrooveMeasurementInput) {
  return input.shape === "round"
    ? Math.PI * input.diameter
    : 2 * (input.width + input.height - 4 * input.radius) + 2 * Math.PI * input.radius;
}

export default function Home() {
  const [groovePositionMode, setGroovePositionMode] = useState<"auto" | "custom_inner" | "custom_outer" | "length_only">("auto");
  const [innerBoundaryShape, setInnerBoundaryShape] = useState<"round" | "rect">("round");
  const [outerBoundaryShape, setOuterBoundaryShape] = useState<"round" | "rect">("round");
  const [round, setRound] = useState(initialRound);
  const [rect, setRect] = useState(initialRect);
  const [customInnerDiameter, setCustomInnerDiameter] = useState(107.67);
  const [customOuterDiameter, setCustomOuterDiameter] = useState(115.82);
  const [customInnerWidth, setCustomInnerWidth] = useState(110);
  const [customInnerHeight, setCustomInnerHeight] = useState(110);
  const [customOuterWidth, setCustomOuterWidth] = useState(130);
  const [customOuterHeight, setCustomOuterHeight] = useState(130);
  const [lengthMeasurementEdge, setLengthMeasurementEdge] = useState<"inner" | "outer">("inner");
  const [lengthMeasurementRadius, setLengthMeasurementRadius] = useState(15);
  const [pressureMode, setPressureMode] = useState<PressureMode>(initialMode);
  const [medium, setMedium] = useState<Medium>(initialMedium);
  const [grooveMode, setGrooveMode] = useState<GrooveShape>("round");
  const [grooveRadius, setGrooveRadius] = useState(20);
  const [csFilter, setCsFilter] = useState<number | null>(null);
  const [glandSection, setGlandSection] = useState<GlandSection>("rect");
  const [selectedDash, setSelectedDash] = useState(sortByDash(initialSearch.accepted)[0]?.dash ?? "");
  const [dxfOpen, setDxfOpen] = useState(false);

  const customGrooveMode = groovePositionMode !== "auto";
  const lengthOnlyMode = groovePositionMode === "length_only";
  const envelopeGrooveMode = groovePositionMode === "custom_inner" || groovePositionMode === "custom_outer";
  const currentInput = useMemo<MixedInput>(() => ({
    shape: "mixed",
    innerBoundary: innerBoundaryShape === "round"
      ? { shape: "round", diameter: round.innerDiameter }
      : { shape: "rect", width: rect.innerWidth, height: rect.innerHeight, radius: rect.innerRadius },
    outerBoundary: outerBoundaryShape === "round"
      ? { shape: "round", diameter: round.outerDiameter }
      : { shape: "rect", width: rect.outerWidth, height: rect.outerHeight, radius: rect.outerRadius },
    innerMargin: innerBoundaryShape === "round" ? round.innerMargin : rect.innerMargin,
    outerMargin: outerBoundaryShape === "round" ? round.outerMargin : rect.outerMargin,
  }), [innerBoundaryShape, outerBoundaryShape, round, rect]);
  const resolvedGrooveShape: GrooveShape = grooveMode;
  const customGroovePosition = useMemo(() => {
    const edge = groovePositionMode === "custom_outer" ? "outer" as const : "inner" as const;
    return resolvedGrooveShape === "round"
      ? { shape: "round" as const, edge, diameter: edge === "outer" ? customOuterDiameter : customInnerDiameter }
      : {
          shape: "rect" as const,
          edge,
          width: edge === "outer" ? customOuterWidth : customInnerWidth,
          height: edge === "outer" ? customOuterHeight : customInnerHeight,
          radius: grooveRadius,
        };
  }, [groovePositionMode, resolvedGrooveShape, customInnerDiameter, customOuterDiameter, customInnerWidth, customInnerHeight, customOuterWidth, customOuterHeight, grooveRadius]);
  const grooveMeasurement = useMemo<GrooveMeasurementInput>(() => resolvedGrooveShape === "round"
    ? {
        shape: "round",
        edge: lengthMeasurementEdge,
        diameter: lengthMeasurementEdge === "inner" ? customInnerDiameter : customOuterDiameter,
      }
    : {
        shape: "rect",
        edge: lengthMeasurementEdge,
        width: lengthMeasurementEdge === "inner" ? customInnerWidth : customOuterWidth,
        height: lengthMeasurementEdge === "inner" ? customInnerHeight : customOuterHeight,
        radius: lengthMeasurementRadius,
      },
  [resolvedGrooveShape, lengthMeasurementEdge, customInnerDiameter, customOuterDiameter, customInnerWidth, customInnerHeight, customOuterWidth, customOuterHeight, lengthMeasurementRadius]);
  const errors = useMemo(() => {
    const nextErrors = lengthOnlyMode ? validateGrooveMeasurement(grooveMeasurement) : validateInput(currentInput);
    if (envelopeGrooveMode) nextErrors.push(...validateGroovePosition(customGroovePosition));
    if (!lengthOnlyMode && resolvedGrooveShape === "rect" && (!Number.isFinite(grooveRadius) || grooveRadius <= 0)) {
      nextErrors.push("둥근 사각형 홈의 중심선 R은 0보다 커야 합니다.");
    }
    return nextErrors;
  }, [currentInput, customGroovePosition, grooveMeasurement, envelopeGrooveMode, lengthOnlyMode, resolvedGrooveShape, grooveRadius]);
  const result = useMemo<ReturnType<typeof searchCandidates>>(
    () => {
      if (errors.length) return { accepted: [], near: [] };
      if (lengthOnlyMode) {
        return searchCandidatesForGrooveMeasurement(grooveMeasurement, medium, pressureMode, { csMm: csFilter, glandSection });
      }
      if (envelopeGrooveMode) {
        return searchCandidatesForGroovePosition(currentInput, customGroovePosition, medium, pressureMode, { csMm: csFilter, glandSection });
      }
      return searchCandidates(currentInput, medium, pressureMode, {
        grooveShape: resolvedGrooveShape,
        grooveRadius: resolvedGrooveShape === "rect" ? grooveRadius : undefined,
        csMm: csFilter,
        glandSection,
      });
    },
    [currentInput, customGroovePosition, grooveMeasurement, envelopeGrooveMode, lengthOnlyMode, medium, pressureMode, resolvedGrooveShape, grooveRadius, csFilter, glandSection, errors.length],
  );
  const alternativeGrooveShape: GrooveShape = resolvedGrooveShape === "round" ? "rect" : "round";
  const alternativeResult = useMemo<ReturnType<typeof searchCandidates>>(() => {
    if (customGrooveMode || validateInput(currentInput).length) return { accepted: [], near: [] };
    if (alternativeGrooveShape === "rect" && (!Number.isFinite(grooveRadius) || grooveRadius <= 0)) return { accepted: [], near: [] };
    return searchCandidates(currentInput, medium, pressureMode, {
      grooveShape: alternativeGrooveShape,
      grooveRadius: alternativeGrooveShape === "rect" ? grooveRadius : undefined,
      csMm: csFilter,
      glandSection,
    });
  }, [currentInput, customGrooveMode, medium, pressureMode, alternativeGrooveShape, grooveRadius, csFilter, glandSection]);
  const onlyAvailableShape = !customGrooveMode
    ? result.accepted.length > 0 && alternativeResult.accepted.length === 0
      ? resolvedGrooveShape
      : result.accepted.length === 0 && alternativeResult.accepted.length > 0
        ? alternativeGrooveShape
        : null
    : null;
  const orderedCandidates = useMemo(() => sortByDash(result.accepted), [result.accepted]);
  const selected = orderedCandidates.find((item) => item.dash === selectedDash) ?? orderedCandidates[0] ?? null;
  const cornerRadiusGuidance = useMemo(
    () => resolvedGrooveShape === "rect" ? getCornerRadiusGuidance(csFilter, medium, glandSection) : null,
    [resolvedGrooveShape, csFilter, medium, glandSection],
  );
  const evaluatedGrooveRadius = lengthOnlyMode && selected?.path.shape === "rect" ? selected.path.radius : grooveRadius;
  const cornerRadiusState = cornerRadiusGuidance
    ? evaluatedGrooveRadius < cornerRadiusGuidance.minimumCenterlineRadiusMm
      ? "invalid"
      : evaluatedGrooveRadius < cornerRadiusGuidance.idealCenterlineRadiusMm
        ? "conditional"
        : "ideal"
    : "auto";
  const dxf = useMemo(
    () => selected ? buildDxf(selected, currentInput, pressureMode, medium) : "",
    [selected, currentInput, pressureMode, medium],
  );

  function setRoundValue(key: keyof RoundInput, value: number) {
    setRound((previous) => ({ ...previous, [key]: value }));
  }

  function setRectValue(key: keyof RectInput, value: number) {
    setRect((previous) => ({ ...previous, [key]: value }));
  }

  function copySelectedGrooveEdge(edge: "inner" | "outer") {
    if (!selected) return;
    const direction = edge === "inner" ? -1 : 1;
    if (selected.path.shape === "round") {
      const diameter = Number((selected.path.diameter + direction * selected.profile.widthMm).toFixed(2));
      if (edge === "inner") setCustomInnerDiameter(diameter);
      else setCustomOuterDiameter(diameter);
      return;
    }
    const width = Number((selected.path.width + direction * selected.profile.widthMm).toFixed(2));
    const height = Number((selected.path.height + direction * selected.profile.widthMm).toFixed(2));
    if (edge === "inner") {
      setCustomInnerWidth(width);
      setCustomInnerHeight(height);
    } else {
      setCustomOuterWidth(width);
      setCustomOuterHeight(height);
    }
    setLengthMeasurementRadius(Number((selected.path.radius + direction * selected.profile.widthMm / 2).toFixed(2)));
  }

  function changeLengthMeasurementEdge(edge: "inner" | "outer") {
    copySelectedGrooveEdge(edge);
    setLengthMeasurementEdge(edge);
  }

  function setPositionMode(nextMode: typeof groovePositionMode) {
    if (nextMode !== "auto" && selected) {
      if (selected.path.shape === "round") {
        if (nextMode === "custom_inner") setCustomInnerDiameter(Number((selected.path.diameter - selected.profile.widthMm).toFixed(2)));
        if (nextMode === "custom_outer") setCustomOuterDiameter(Number((selected.path.diameter + selected.profile.widthMm).toFixed(2)));
        if (nextMode === "length_only") copySelectedGrooveEdge(lengthMeasurementEdge);
      } else {
        if (nextMode === "custom_inner") {
          setCustomInnerWidth(Number((selected.path.width - selected.profile.widthMm).toFixed(2)));
          setCustomInnerHeight(Number((selected.path.height - selected.profile.widthMm).toFixed(2)));
        }
        if (nextMode === "custom_outer") {
          setCustomOuterWidth(Number((selected.path.width + selected.profile.widthMm).toFixed(2)));
          setCustomOuterHeight(Number((selected.path.height + selected.profile.widthMm).toFixed(2)));
        }
        if (nextMode === "length_only") copySelectedGrooveEdge(lengthMeasurementEdge);
      }
    }
    setGroovePositionMode(nextMode);
  }

  function setOperatingMode(nextMode: PressureMode) {
    const nextMedium: Medium = nextMode === "internal_vacuum" ? "vacuum" : medium === "vacuum" ? "gas" : medium;
    setPressureMode(nextMode);
    setMedium(nextMedium);
  }

  function exportDxf() {
    if (!selected || !dxf) return;
    const suffix = selected.path.shape === "round"
      ? `D${selected.path.diameter.toFixed(2)}`
      : `${selected.path.width.toFixed(2)}x${selected.path.height.toFixed(2)}_R${selected.path.radius.toFixed(2)}`;
    downloadDxf(dxf, `O-Ring-Fit_AS568-${selected.dash}_${suffix}.dxf`);
  }

  return (
    <main className="shell">
      <header className="header">
        <a className="brand" href="#top" aria-label="O-Ring Fit 홈">
          <span className="brand-ring" />
          <span><b>O-Ring</b> Fit</span>
        </a>
        <p>정적 면 씰 설계 도우미</p>
        <span className="material-chip">FKM · VITON™</span>
      </header>

      <section className="hero" id="top">
        <div>
          <span className="kicker">SPACE → O-RING → GLAND</span>
          <h1>오링·글랜드 선택</h1>
        </div>
        <div className="hero-action">
          <span>허용 공간을 입력하고 AS568 형번과 가공 홈을 확인하세요.</span>
          <InfoPopover label="앱 사용 안내">
            <b>사용 순서</b>
            <p>허용 영역과 홈 조건을 입력한 뒤 후보를 찾으세요. 적합 형번을 선택하면 평면 홈이 바뀌며, 가공 상세와 단면은 DXF 미리보기에서 확인할 수 있습니다.</p>
          </InfoPopover>
        </div>
      </section>

      <section className="workbench" aria-label="오링 설계 워크벤치">
        <section className="inputs">
          <SectionHead number="01" title={lengthOnlyMode ? "가공 홈 측정값" : "허용 영역"} subtitle={lengthOnlyMode ? "홈 내측·외측 치수로 오링 길이와 형번 역선정" : "글랜드 전체가 존재할 수 있는 범위와 위치"} />

          {!lengthOnlyMode ? <div className="input-groups boundary-groups">
            <fieldset>
              <legend><i className="inner-dot" /> 안쪽 금지 경계</legend>
              <div className="segmented boundary-shape" aria-label="안쪽 금지 경계 형상 선택">
                <button type="button" aria-pressed={innerBoundaryShape === "round"} className={innerBoundaryShape === "round" ? "active" : ""} onClick={() => setInnerBoundaryShape("round")}>○ 원형</button>
                <button type="button" aria-pressed={innerBoundaryShape === "rect"} className={innerBoundaryShape === "rect" ? "active" : ""} onClick={() => setInnerBoundaryShape("rect")}>▢ 사각형</button>
              </div>
              <div className="dimension-grid">
                {innerBoundaryShape === "round" ? (
                  <Dimension label="챔버 내경" value={round.innerDiameter} onChange={(value) => setRoundValue("innerDiameter", value)} />
                ) : <>
                  <Dimension label="가로" value={rect.innerWidth} onChange={(value) => setRectValue("innerWidth", value)} />
                  <Dimension label="세로" value={rect.innerHeight} onChange={(value) => setRectValue("innerHeight", value)} />
                  <Dimension label="모서리 R" value={rect.innerRadius} onChange={(value) => setRectValue("innerRadius", value)} />
                </>}
                <Dimension label="벽 여유" value={innerBoundaryShape === "round" ? round.innerMargin : rect.innerMargin} onChange={(value) => innerBoundaryShape === "round" ? setRoundValue("innerMargin", value) : setRectValue("innerMargin", value)} />
              </div>
            </fieldset>
            <fieldset>
              <legend><i className="outer-dot" /> 바깥쪽 허용 경계</legend>
              <div className="segmented boundary-shape" aria-label="바깥쪽 허용 경계 형상 선택">
                <button type="button" aria-pressed={outerBoundaryShape === "round"} className={outerBoundaryShape === "round" ? "active" : ""} onClick={() => setOuterBoundaryShape("round")}>○ 원형</button>
                <button type="button" aria-pressed={outerBoundaryShape === "rect"} className={outerBoundaryShape === "rect" ? "active" : ""} onClick={() => setOuterBoundaryShape("rect")}>▢ 사각형</button>
              </div>
              <div className="dimension-grid">
                {outerBoundaryShape === "round" ? (
                  <Dimension label="플랜지 외경" value={round.outerDiameter} onChange={(value) => setRoundValue("outerDiameter", value)} />
                ) : <>
                  <Dimension label="가로" value={rect.outerWidth} onChange={(value) => setRectValue("outerWidth", value)} />
                  <Dimension label="세로" value={rect.outerHeight} onChange={(value) => setRectValue("outerHeight", value)} />
                  <Dimension label="모서리 R" value={rect.outerRadius} onChange={(value) => setRectValue("outerRadius", value)} />
                </>}
                <Dimension label="벽 여유" value={outerBoundaryShape === "round" ? round.outerMargin : rect.outerMargin} onChange={(value) => outerBoundaryShape === "round" ? setRoundValue("outerMargin", value) : setRectValue("outerMargin", value)} />
              </div>
            </fieldset>
          </div> : <div className="length-only-banner" role="note">
            <b>허용 영역 검사 제외</b>
            <span>이미 가공된 홈의 내측 또는 외측 치수를 입력하세요. 후보별 권장 홈 폭으로 중심 경로를 환산해 AS568 길이 후보를 제안하며, 주변 경계 간섭은 검사하지 않습니다.</span>
          </div>}

          <div className="design-options">
            <label>오링 단면 두께 (CS)
              <select value={csFilter ?? "auto"} onChange={(event) => setCsFilter(event.target.value === "auto" ? null : Number(event.target.value))}>
                <option value="auto">자동 · 전체 단면</option>
                {crossSections.map((value) => <option key={value} value={value}>{value.toFixed(2)} mm</option>)}
              </select>
            </label>
            <label>오링 홈 형상
              <select value={grooveMode} onChange={(event) => setGrooveMode(event.target.value as GrooveShape)}>
                <option value="round">원형</option>
                <option value="rect">둥근 사각형</option>
              </select>
            </label>
            <label>홈 단면
              <select value={glandSection} onChange={(event) => setGlandSection(event.target.value as GlandSection)}>
                <option value="rect">직사각</option>
                <option value="dovetail">도브</option>
                <option value="half_dovetail_inner">하프 도브 내측</option>
                <option value="half_dovetail_outer">하프 도브 외측</option>
              </select>
            </label>
            <label>오링 홈 위치
              <select value={groovePositionMode} onChange={(event) => setPositionMode(event.target.value as typeof groovePositionMode)} aria-label="오링 홈 위치 선택">
                <option value="auto">자동 · 허용 영역에서 계산</option>
                <option value="custom_inner">사용자 지정({resolvedGrooveShape === "round" ? "내경" : "안쪽"})</option>
                <option value="custom_outer">사용자 지정({resolvedGrooveShape === "round" ? "외경" : "바깥쪽"})</option>
                <option value="length_only">가공 홈 측정 · 길이만 계산</option>
              </select>
            </label>
            {lengthOnlyMode && (
              <label>측정 치수 기준
                <select value={lengthMeasurementEdge} onChange={(event) => changeLengthMeasurementEdge(event.target.value as "inner" | "outer")} aria-label="길이 계산 홈 측정 기준 선택">
                  <option value="inner">홈 내측 치수</option>
                  <option value="outer">홈 외측 치수</option>
                </select>
              </label>
            )}
            {customGrooveMode && resolvedGrooveShape === "round" && (
              <label>홈 {lengthOnlyMode ? (lengthMeasurementEdge === "inner" ? "내경(내측)" : "외경(외측)") : groovePositionMode === "custom_inner" ? "내경" : "외경"}
                <span className="number-control"><input type="number" min="0.1" step="0.1" value={lengthOnlyMode ? (lengthMeasurementEdge === "inner" ? customInnerDiameter : customOuterDiameter) : groovePositionMode === "custom_inner" ? customInnerDiameter : customOuterDiameter} onChange={(event) => lengthOnlyMode ? (lengthMeasurementEdge === "inner" ? setCustomInnerDiameter(event.target.valueAsNumber) : setCustomOuterDiameter(event.target.valueAsNumber)) : groovePositionMode === "custom_inner" ? setCustomInnerDiameter(event.target.valueAsNumber) : setCustomOuterDiameter(event.target.valueAsNumber)} /><em>mm</em></span>
              </label>
            )}
            {customGrooveMode && resolvedGrooveShape === "rect" && <>
              <label>홈 {lengthOnlyMode ? (lengthMeasurementEdge === "inner" ? "내측" : "외측") : groovePositionMode === "custom_inner" ? "안쪽" : "바깥쪽"} 가로
                <span className="number-control"><input type="number" min="0.1" step="0.1" value={lengthOnlyMode ? (lengthMeasurementEdge === "inner" ? customInnerWidth : customOuterWidth) : groovePositionMode === "custom_inner" ? customInnerWidth : customOuterWidth} onChange={(event) => lengthOnlyMode ? (lengthMeasurementEdge === "inner" ? setCustomInnerWidth(event.target.valueAsNumber) : setCustomOuterWidth(event.target.valueAsNumber)) : groovePositionMode === "custom_inner" ? setCustomInnerWidth(event.target.valueAsNumber) : setCustomOuterWidth(event.target.valueAsNumber)} /><em>mm</em></span>
              </label>
              <label>홈 {lengthOnlyMode ? (lengthMeasurementEdge === "inner" ? "내측" : "외측") : groovePositionMode === "custom_inner" ? "안쪽" : "바깥쪽"} 세로
                <span className="number-control"><input type="number" min="0.1" step="0.1" value={lengthOnlyMode ? (lengthMeasurementEdge === "inner" ? customInnerHeight : customOuterHeight) : groovePositionMode === "custom_inner" ? customInnerHeight : customOuterHeight} onChange={(event) => lengthOnlyMode ? (lengthMeasurementEdge === "inner" ? setCustomInnerHeight(event.target.valueAsNumber) : setCustomOuterHeight(event.target.valueAsNumber)) : groovePositionMode === "custom_inner" ? setCustomInnerHeight(event.target.valueAsNumber) : setCustomOuterHeight(event.target.valueAsNumber)} /><em>mm</em></span>
              </label>
            </>}
            {resolvedGrooveShape === "rect" && (
              <label className="radius-option">홈 {lengthOnlyMode ? (lengthMeasurementEdge === "inner" ? "내측" : "외측") : "중심선"} 모서리 R
                <span className="number-control"><input type="number" min={lengthOnlyMode ? 0 : 0.1} step="0.5" value={lengthOnlyMode ? lengthMeasurementRadius : grooveRadius} onChange={(event) => lengthOnlyMode ? setLengthMeasurementRadius(event.target.valueAsNumber) : setGrooveRadius(event.target.valueAsNumber)} /><em>mm</em></span>
              </label>
            )}
          </div>

          {customGrooveMode && selected && <div className="custom-groove-summary" aria-live="polite">
            {lengthOnlyMode ? <>
              <span>측정 홈 {lengthMeasurementEdge === "inner" ? "내측" : "외측"} 경로<b>{measurementPathLength(grooveMeasurement).toFixed(2)} mm</b></span>
              <span>환산 홈 중심 경로<b>{selected.groovePathLengthMm.toFixed(2)} mm</b></span>
              <span>압력 지지 적용 경로<b>{selected.pathLengthMm.toFixed(2)} mm</b></span>
              <span>권장 홈 폭 <b>{selected.profile.widthMm.toFixed(2)} mm</b></span>
            </> : selected.path.shape === "round" ? <>
              <span>자동 계산 반대쪽 {groovePositionMode === "custom_inner" ? "외경" : "내경"}<b>Ø {(groovePositionMode === "custom_inner" ? selected.path.diameter + selected.profile.widthMm : selected.path.diameter - selected.profile.widthMm).toFixed(2)} mm</b></span>
              <span>권장 홈 폭 <b>{selected.profile.widthMm.toFixed(2)} mm</b></span>
            </> : <>
              <span>자동 계산 반대쪽 {groovePositionMode === "custom_inner" ? "바깥쪽" : "안쪽"}<b>{(groovePositionMode === "custom_inner" ? selected.path.width + selected.profile.widthMm : selected.path.width - selected.profile.widthMm).toFixed(2)} × {(groovePositionMode === "custom_inner" ? selected.path.height + selected.profile.widthMm : selected.path.height - selected.profile.widthMm).toFixed(2)} mm</b></span>
              <span>권장 홈 폭 <b>{selected.profile.widthMm.toFixed(2)} mm</b></span>
            </>}
          </div>}

          {resolvedGrooveShape === "rect" && cornerRadiusGuidance && cornerRadiusState === "invalid" && (
            <div className="inline-warning" role="alert">
              {lengthOnlyMode ? "측정값에서 환산한 중심선 R" : "입력한 R"}은 표준 최소 중심선 R <b>{cornerRadiusGuidance.minimumCenterlineRadiusMm.toFixed(2)} mm</b>보다 작습니다. 길이 계산과 형번 제안은 계속하지만, 후보는 비표준 조건으로 표시됩니다.
            </div>
          )}

          <div className="condition-row">
            <label>운전 상태 / 압력 방향
              <select value={pressureMode} onChange={(event) => setOperatingMode(event.target.value as PressureMode)}>
                <option value="internal_vacuum">챔버 내부 진공</option>
                <option value="internal_pressure">챔버 내부 가압</option>
                <option value="external_pressure">외부 가압</option>
              </select>
            </label>
            <label>매체 / 홈 폭 기준
              <select value={medium} disabled={pressureMode === "internal_vacuum"} onChange={(event) => setMedium(event.target.value as Medium)}>
                {pressureMode === "internal_vacuum" ? <option value="vacuum">진공 · 좁은 홈</option> : <>
                  <option value="gas">기체 · 좁은 홈</option>
                  <option value="liquid">액체 · 팽윤 여유 홈</option>
                </>}
              </select>
            </label>
          </div>
          <div className="input-meta">
            <span>{lengthOnlyMode ? <><b>가공된 {resolvedGrooveShape === "round" ? "원형" : "둥근 사각형"} 홈 {lengthMeasurementEdge === "inner" ? "내측" : "외측"} 측정</b> → 허용 영역 검사 제외</> : customGrooveMode ? <><b>사용자 지정 {resolvedGrooveShape === "round" ? "원형" : "둥근 사각형"} 홈</b> → {groovePositionMode === "custom_inner" ? (resolvedGrooveShape === "round" ? "내경 고정" : "안쪽 형상 고정") : (resolvedGrooveShape === "round" ? "외경 고정" : "바깥쪽 형상 고정")}</> : <><b>안쪽 {innerBoundaryShape === "round" ? "원형" : "사각형"} · 바깥쪽 {outerBoundaryShape === "round" ? "원형" : "사각형"}</b> → {resolvedGrooveShape === "round" ? "원형 홈" : "둥근 사각형 홈"}</>}</span>
            <span><b>FKM</b> · Viton™</span>
            <InfoPopover label="설계 조건 설명">
              <b>현재 설계 기준</b>
              <p>{glandSection === "rect"
                ? `${pressureMode === "internal_pressure" ? "내부 가압은 홈 외경벽" : "내부 진공/외부 가압은 홈 내경벽"}을 지지벽으로 계산합니다.`
                : `${glandSectionLabel(glandSection)}은 Parker 66° 유지 홈의 평균경 기준을 적용합니다.`}</p>
              {lengthOnlyMode ? <p>측정한 홈 {lengthMeasurementEdge === "inner" ? "내측" : "외측"} 경계를 고정하고, 각 형번의 권장 홈 폭으로 중심 경로와 반대쪽 경계를 환산해 길이와 설치 변형률을 계산합니다. 주변 허용 경계 및 벽 여유와의 간섭은 검사하지 않습니다.</p> : customGrooveMode && <p>지정한 홈 {resolvedGrooveShape === "round" ? (groovePositionMode === "custom_inner" ? "내경" : "외경") : (groovePositionMode === "custom_inner" ? "안쪽 가로·세로" : "바깥쪽 가로·세로")}을 고정하고, 각 형번의 권장 홈 폭으로 반대쪽 형상을 계산한 뒤 간섭과 오링 길이를 검사합니다.</p>}
              {cornerRadiusGuidance && <p>CS {cornerRadiusGuidance.csMm.toFixed(2)} mm의 중심선 R 최소값은 {cornerRadiusGuidance.minimumCenterlineRadiusMm.toFixed(2)} mm, 권장값은 {cornerRadiusGuidance.idealCenterlineRadiusMm.toFixed(2)} mm입니다.</p>}
              <p>재질은 FKM으로 고정하며, 경도·컴파운드·온도·압력·표면조도·가공 공차는 제조 전에 별도로 검토해야 합니다.</p>
            </InfoPopover>
          </div>
          {errors.length > 0 && <div className="error-box" role="alert">{errors.map((error) => <p key={error}>{error}</p>)}</div>}
          <div className="live-calculation" aria-live="polite"><span>●</span> 입력과 동시에 자동 계산됩니다.</div>
        </section>

        <section className="results">
          <SectionHead number="02" title="오링 선택" subtitle="검색 결과에서 적용 형번 선택" />

          {result.accepted.length ? (
            <>
              <div className="candidate-count" role="status">
                <b>{orderedCandidates.length}개</b>
                <span>적합 오링 형번 · 형번 순</span>
              </div>
              <label className="candidate-select">적용할 오링
                <select
                  value={selected?.dash ?? ""}
                  onChange={(event) => { setSelectedDash(event.target.value); setDxfOpen(false); }}
                  aria-label="추천 오링 형번 선택"
                >
                  {orderedCandidates.map((candidate) => (
                    <option key={candidate.dash} value={candidate.dash}>
                      AS568-{candidate.dash} · ID {candidate.idMm.toFixed(2)} · CS {candidate.csMm.toFixed(2)} mm · {candidate.label}
                    </option>
                  ))}
                </select>
              </label>
              {selected && (
                <>
                  <div className="selected-candidate">
                    <div>
                      <b>AS568-{selected.dash}</b>
                      <span>ID {selected.idMm.toFixed(2)} × CS {selected.csMm.toFixed(2)} mm</span>
                      <span>길이 재검증 · 자유 {selected.freeLengthMm.toFixed(2)} → 적용 {selected.pathLengthMm.toFixed(2)} mm · Δ {formatSigned(selected.lengthCheck.differenceMm)} mm</span>
                    </div>
                    <span className={`fit-badge ${selected.state}`}>{selected.label}</span>
                  </div>
                  {selected.warnings.length > 0 && <div className="candidate-warning" role="note">{selected.warnings.map((warning) => <p key={warning}>△ {warning}</p>)}</div>}
                </>
              )}
              {onlyAvailableShape === resolvedGrooveShape && (
                <div className="shape-availability" role="note">
                  <b>현재 허용 영역에서는 {grooveShapeLabel(resolvedGrooveShape)} 홈 경로만 가능합니다.</b>
                  <span>반대 형상은 현재 CS·벽 여유·설치 변형률 조건을 만족하는 표준 오링 후보가 없습니다.</span>
                </div>
              )}
            </>
          ) : (
            <NoMatch
              near={result.near}
              customGrooveMode={customGrooveMode}
              lengthOnlyMode={lengthOnlyMode}
              selectedShape={resolvedGrooveShape}
              alternative={onlyAvailableShape === alternativeGrooveShape
                ? { shape: alternativeGrooveShape, count: alternativeResult.accepted.length }
                : null}
            />
          )}
        </section>

        <section className="preview">
          <div className="preview-top">
            <SectionHead number="03" title="글랜드 미리보기" subtitle={selected ? `AS568-${selected.dash} 적용 형상` : lengthOnlyMode ? `측정한 홈 ${lengthMeasurementEdge === "inner" ? "내측" : "외측"} 경계` : "입력한 안쪽·바깥쪽 허용 경계"} light />
            <span className="drawing-status">● 실치수 계산</span>
          </div>

          {selected ? (
            <>
              <PlanPreview candidate={selected} input={currentInput} pressureMode={pressureMode} showBoundaries={!lengthOnlyMode} />
              <button type="button" className="dxf-button" onClick={() => setDxfOpen(true)}>상세 정보 · DXF <span>↗</span></button>
            </>
          ) : (
            lengthOnlyMode ? <LengthOnlyPreview measurement={grooveMeasurement} /> : <EnvelopePreview input={currentInput} />
          )}
        </section>
      </section>

      <section className="basis-bar" aria-label="설계 기준 안내">
        <div><b>AS568F</b><span>369개 표준 치수 데이터</span></div>
        <div><b>Parker ORD 5700</b><span>정적 축방향 면 씰 홈 기준</span></div>
        <div><b>검토 필요</b><span>온도·압력·표면조도·공차·FKM 경도/컴파운드</span></div>
      </section>

      <footer><span>MVP · AS568F · FKM</span><p>본 결과는 설계 보조 정보입니다. 제조 전 제조사 자료와 실제 운전 조건으로 검증하세요.</p></footer>

      {dxfOpen && selected && (
        <DxfDialog
          candidate={selected}
          input={currentInput}
          pressureMode={pressureMode}
          medium={medium}
          showBoundaries={!lengthOnlyMode}
          onClose={() => setDxfOpen(false)}
          onDownload={exportDxf}
        />
      )}
    </main>
  );
}

function SectionHead({ number, title, subtitle, light = false }: { number: string; title: string; subtitle: string; light?: boolean }) {
  return <div className={`section-head ${light ? "light" : ""}`}><span>{number}</span><div><b>{title}</b><small>{subtitle}</small></div></div>;
}

function InfoPopover({ label, children }: { label: string; children: ReactNode }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeFromOutside(event: PointerEvent) {
      const details = detailsRef.current;
      if (details?.open && event.target instanceof Node && !details.contains(event.target)) details.open = false;
    }
    function closeFromEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && detailsRef.current?.open) {
        detailsRef.current.open = false;
        detailsRef.current.querySelector("summary")?.focus();
      }
    }
    document.addEventListener("pointerdown", closeFromOutside);
    document.addEventListener("keydown", closeFromEscape);
    return () => {
      document.removeEventListener("pointerdown", closeFromOutside);
      document.removeEventListener("keydown", closeFromEscape);
    };
  }, []);

  function close() {
    if (!detailsRef.current) return;
    detailsRef.current.open = false;
    detailsRef.current.querySelector("summary")?.focus();
  }

  return (
    <details className="info-popover" ref={detailsRef}>
      <summary aria-label={label} title={label}>?</summary>
      <div>
        <button type="button" className="info-popover-close" onClick={close} aria-label={`${label} 닫기`}>×</button>
        {children}
      </div>
    </details>
  );
}

function Dimension({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="dimension">
      <span>{label}</span>
      <span><input type="number" min="0" step="0.1" value={value} onChange={(event) => onChange(event.target.valueAsNumber)} aria-label={`${label} mm`} /><em>mm</em></span>
    </label>
  );
}

export function NoMatch({ near, customGrooveMode = false, lengthOnlyMode = false, selectedShape = "round", alternative = null }: {
  near: ReturnType<typeof searchCandidates>["near"];
  customGrooveMode?: boolean;
  lengthOnlyMode?: boolean;
  selectedShape?: GrooveShape;
  alternative?: { shape: GrooveShape; count: number } | null;
}) {
  const alternativeAvailable = alternative && alternative.count > 0;
  return (
    <div className={`no-match ${alternativeAvailable ? "shape-mismatch" : ""}`}>
      <span className="no-match-icon">!</span>
      <h3>{alternativeAvailable ? `${grooveShapeLabel(selectedShape)} 홈 경로로는 배치할 수 없습니다` : "맞는 표준 오링이 없습니다"}</h3>
      <p>{alternativeAvailable
        ? `표준 오링 자체가 없는 것은 아닙니다. ${grooveShapeLabel(alternative.shape)} 홈 경로로 바꾸면 현재 조건에서 ${alternative.count}개 형번을 적용할 수 있습니다.`
        : lengthOnlyMode
          ? "측정한 홈 경계를 후보별 권장 홈 폭으로 환산했을 때 허용 설치 변형률을 만족하는 표준 형번이 없습니다. 주변 허용 영역 간섭은 이 모드에서 검사하지 않습니다."
        : customGrooveMode
          ? "지정한 홈 위치와 허용 설치 변형률을 함께 만족하는 형번이 없습니다."
          : "필요한 홈 폭, 벽 여유, 설치 변형률을 함께 만족하지 못했습니다."}</p>
      {near.length > 0 && <div className="near-list"><b>가까운 형번과 제외 이유</b>{sortByDash(near).map((item) => <div key={item.dash}><span>AS568-{item.dash}</span><small>{item.reason}</small></div>)}</div>}
    </div>
  );
}

export function EnvelopePreview({ input }: { input: ShapeInput }) {
  const boundaries = getEnvelopeBoundaries(input);
  const outerExtent = boundaryExtent(boundaries.outer);
  const innerExtent = boundaryExtent(boundaries.inner);
  const extent = Math.max(outerExtent, innerExtent, 40);
  const pad = Math.max(24, extent * 0.18);
  const size = extent + 2 * pad;
  return (
    <div className="drawing functional envelope-preview">
      <svg viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} role="img" aria-label="사용자 입력 허용 영역 미리보기">
        <defs><pattern id="grid-envelope" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#8aa099" strokeWidth="0.35" /></pattern></defs>
        <rect x={-size / 2} y={-size / 2} width={size} height={size} fill="url(#grid-envelope)" opacity="0.35" />
        {boundaryValidForPreview(boundaries.outer) && <BoundaryPreview boundary={boundaries.outer} className="outer-svg" />}
        {boundaryValidForPreview(boundaries.inner) && <BoundaryPreview boundary={boundaries.inner} className="inner-svg" />}
        <line className="center-axis" x1={-extent * 0.55} x2={extent * 0.55} y1="0" y2="0" />
      </svg>
      <div className="envelope-preview-note"><b>입력한 허용 영역</b><span>점선: 바깥쪽 허용 경계 · 주황색: 안쪽 금지 경계</span></div>
    </div>
  );
}

function LengthOnlyPreview({ measurement }: { measurement: GrooveMeasurementInput }) {
  const extent = measurement.shape === "round" ? measurement.diameter : Math.max(measurement.width, measurement.height);
  const safeExtent = Number.isFinite(extent) && extent > 0 ? extent : 40;
  const pad = Math.max(24, safeExtent * 0.2);
  const size = safeExtent + 2 * pad;
  const valid = measurement.shape === "round"
    ? Number.isFinite(measurement.diameter) && measurement.diameter > 0
    : [measurement.width, measurement.height, measurement.radius].every(Number.isFinite) && measurement.width > 0 && measurement.height > 0 && measurement.radius >= 0 && measurement.radius * 2 <= Math.min(measurement.width, measurement.height);
  const edgeLabel = measurement.edge === "inner" ? "내측" : "외측";
  return (
    <div className="drawing functional envelope-preview">
      <svg viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} role="img" aria-label={`측정한 홈 ${edgeLabel} 경계 미리보기`}>
        <defs><pattern id="grid-length-only" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#8aa099" strokeWidth="0.35" /></pattern></defs>
        <rect x={-size / 2} y={-size / 2} width={size} height={size} fill="url(#grid-length-only)" opacity="0.35" />
        {valid && (measurement.shape === "round"
          ? <circle className="groove-svg centerline-only" r={measurement.diameter / 2} />
          : <rect className="groove-svg centerline-only" x={-measurement.width / 2} y={-measurement.height / 2} width={measurement.width} height={measurement.height} rx={measurement.radius} />)}
        <line className="center-axis" x1={-safeExtent * 0.55} x2={safeExtent * 0.55} y1="0" y2="0" />
      </svg>
      <div className="envelope-preview-note"><b>측정한 홈 {edgeLabel} 경계</b><span>후보별 권장 홈 폭으로 중심 경로를 환산하며, 주변 허용 영역은 검사하지 않습니다.</span></div>
    </div>
  );
}

export function PlanPreview({ candidate, input, pressureMode, modal = false, showBoundaries = true }: { candidate: Candidate; input: ShapeInput; pressureMode: PressureMode; modal?: boolean; showBoundaries?: boolean }) {
  const boundaries = getEnvelopeBoundaries(input);
  const boundarySize = boundaries.outer.shape === "round" ? boundaries.outer.diameter : Math.max(boundaries.outer.width, boundaries.outer.height);
  const pathSize = candidate.path.shape === "round" ? candidate.path.diameter + candidate.profile.widthMm : Math.max(candidate.path.width, candidate.path.height) + candidate.profile.widthMm;
  const extent = showBoundaries ? Math.max(boundarySize, pathSize) : pathSize;
  const pad = candidate.path.shape === "rect" ? Math.max(72, extent * 0.5) : Math.max(42, extent * 0.32);
  const size = extent + 2 * pad;
  const arrowOutward = pressureMode === "internal_pressure";
  const pressureY = extent * 0.43;
  const pressureStart = arrowOutward ? extent * 0.12 : extent * 0.48;
  const pressureEnd = arrowOutward ? extent * 0.45 : extent * 0.15;
  const markerId = modal ? "pressure-arrow-modal" : "pressure-arrow-main";
  const radiusMarkerId = modal ? "radius-arrow-modal" : "radius-arrow-main";
  return (
    <div className={`drawing functional ${modal ? "modal-drawing" : ""}`}>
      <svg viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} role="img" aria-label="오링 홈 평면 미리보기">
        <defs>
          <pattern id={modal ? "grid-modal" : "grid-main"} width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#8aa099" strokeWidth="0.35" /></pattern>
          <marker id={markerId} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L6,3 L0,6 Z" /></marker>
          <marker id={radiusMarkerId} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L6,3 L0,6 Z" fill="#d6e9e1" /></marker>
        </defs>
        <rect x={-size / 2} y={-size / 2} width={size} height={size} fill={`url(#${modal ? "grid-modal" : "grid-main"})`} opacity="0.35" />
        {showBoundaries && <>
          <BoundaryPreview boundary={boundaries.outer} className="outer-svg" />
          <BoundaryPreview boundary={boundaries.inner} className="inner-svg" />
        </>}
        {candidate.path.shape === "round" ? (
          <circle className="groove-svg" data-preview-shape="groove-round" r={candidate.path.diameter / 2} strokeWidth={candidate.profile.widthMm} />
        ) : (
          <rect className="groove-svg" data-preview-shape="groove-rect" x={-candidate.path.width / 2} y={-candidate.path.height / 2} width={candidate.path.width} height={candidate.path.height} rx={candidate.path.radius} strokeWidth={candidate.profile.widthMm} />
        )}
        <line className="center-axis" x1={-extent * 0.55} x2={extent * 0.55} y1="0" y2="0" />
        <PreviewDimensions candidate={candidate} extent={extent} pad={pad} compact={!modal} radiusMarkerId={radiusMarkerId} />
        {modal && <>
          <line className="pressure-line" x1={pressureStart} x2={pressureEnd} y1={pressureY} y2={pressureY} markerEnd={`url(#${markerId})`} />
          <text className="pressure-svg-label" x={(pressureStart + pressureEnd) / 2} y={pressureY - 3} textAnchor="middle">오링 이동</text>
        </>}
      </svg>
      {modal && <>
        <div className="pressure-caption"><b>{pressureModeLabel(pressureMode)}</b><span>화살표: 압력에 의한 오링 이동</span><em>도착점: {supportWallKo(candidate.supportWall)}</em></div>
        <div className="drawing-legend">{showBoundaries && <span className="legend-inner">금지 경계</span>}<span className="legend-groove">가공 홈</span>{showBoundaries && <span className="legend-outer">허용 경계</span>}</div>
      </>}
    </div>
  );
}

function BoundaryPreview({ boundary, className }: { boundary: ReturnType<typeof getEnvelopeBoundaries>["inner"]; className: string }) {
  return boundary.shape === "round"
    ? <circle className={`boundary-svg ${className}`} data-preview-shape="boundary-round" r={boundary.diameter / 2} />
    : <rect className={`boundary-svg ${className}`} data-preview-shape="boundary-rect" x={-boundary.width / 2} y={-boundary.height / 2} width={boundary.width} height={boundary.height} rx={boundary.radius} />;
}

function boundaryExtent(boundary: ReturnType<typeof getEnvelopeBoundaries>["inner"]) {
  if (!boundaryValidForPreview(boundary)) return 0;
  return boundary.shape === "round" ? boundary.diameter : Math.max(boundary.width, boundary.height);
}

function boundaryValidForPreview(boundary: ReturnType<typeof getEnvelopeBoundaries>["inner"]) {
  if (boundary.shape === "round") return Number.isFinite(boundary.diameter) && boundary.diameter > 0;
  return [boundary.width, boundary.height, boundary.radius].every(Number.isFinite)
    && boundary.width > 0
    && boundary.height > 0
    && boundary.radius >= 0;
}

function PreviewDimensions({ candidate, extent, pad, compact = false, radiusMarkerId }: { candidate: Candidate; extent: number; pad: number; compact?: boolean; radiusMarkerId: string }) {
  const grooveWidth = candidate.profile.widthMm;
  const spacing = Math.max(14, pad * 0.22);
  const top = -extent / 2 - pad + 16;
  if (candidate.path.shape === "round") {
    const dimensions = [
      { label: "홈 내경", shortLabel: "내경", diameter: candidate.path.diameter - grooveWidth, className: "inner-gland-dim" },
      { label: "홈 중심경", shortLabel: "중심", diameter: candidate.path.diameter, className: "center-gland-dim" },
      { label: "홈 외경", shortLabel: "외경", diameter: candidate.path.diameter + grooveWidth, className: "outer-gland-dim" },
    ];
    return (
      <g className="preview-dimensions">
        {dimensions.map((dimension, index) => {
          const radius = dimension.diameter / 2;
          const y = top + index * spacing;
          return (
            <g key={dimension.label} className={dimension.className}>
              <line x1={-radius} x2={radius} y1={y} y2={y} />
              <line x1={-radius} x2={-radius} y1={-extent * 0.12} y2={y + 2} />
              <line x1={radius} x2={radius} y1={-extent * 0.12} y2={y + 2} />
              <path d={`M ${-radius} ${y} l 3.5 -1.8 v 3.6 Z M ${radius} ${y} l -3.5 -1.8 v 3.6 Z`} />
              <text x="0" y={y - 1} textAnchor="middle">{compact ? `${dimension.shortLabel} Ø${dimension.diameter.toFixed(2)}` : `${dimension.label} Ø ${dimension.diameter.toFixed(2)} mm`}</text>
            </g>
          );
        })}
      </g>
    );
  }

  const { width, height, radius } = candidate.path;
  const dimensions = [
    { label: "안쪽", width: width - grooveWidth, height: height - grooveWidth, radius: radius - grooveWidth / 2, className: "inner-gland-dim" },
    { label: "중심", width, height, radius, className: "center-gland-dim" },
    { label: "바깥", width: width + grooveWidth, height: height + grooveWidth, radius: radius + grooveWidth / 2, className: "outer-gland-dim" },
  ];
  const widthDimensions = [dimensions[2], dimensions[1], dimensions[0]];
  const right = extent / 2 + 5;
  return (
    <g className="preview-dimensions">
      {widthDimensions.map((dimension, index) => {
        const y = top + index * spacing;
        return (
          <g key={`width-${dimension.label}`} className={dimension.className}>
            <line x1={-dimension.width / 2} x2={dimension.width / 2} y1={y} y2={y} />
            <line x1={-dimension.width / 2} x2={-dimension.width / 2} y1={-dimension.height / 2} y2={y + 2} />
            <line x1={dimension.width / 2} x2={dimension.width / 2} y1={-dimension.height / 2} y2={y + 2} />
            <path d={`M ${-dimension.width / 2} ${y} l 3.5 -1.8 v 3.6 Z M ${dimension.width / 2} ${y} l -3.5 -1.8 v 3.6 Z`} />
            <text x="0" y={y - 1} textAnchor="middle">{compact ? `${dimension.label} W${dimension.width.toFixed(2)}` : `홈 ${dimension.label} W ${dimension.width.toFixed(2)}`}</text>
          </g>
        );
      })}
      {dimensions.map((dimension, index) => {
        const x = right + index * spacing;
        return (
          <g key={`height-${dimension.label}`} className={dimension.className}>
            <line x1={x} x2={x} y1={-dimension.height / 2} y2={dimension.height / 2} />
            <line x1={dimension.width / 2} x2={x - 2} y1={-dimension.height / 2} y2={-dimension.height / 2} />
            <line x1={dimension.width / 2} x2={x - 2} y1={dimension.height / 2} y2={dimension.height / 2} />
            <path d={`M ${x} ${-dimension.height / 2} l -1.8 3.5 h 3.6 Z M ${x} ${dimension.height / 2} l -1.8 -3.5 h 3.6 Z`} />
            <text x={x + 3} y="0" textAnchor="middle" transform={`rotate(90 ${x + 3} 0)`}>{compact ? `${dimension.label} H${dimension.height.toFixed(2)}` : `${dimension.label} H ${dimension.height.toFixed(2)}`}</text>
          </g>
        );
      })}
      <RadiusCallouts dimensions={widthDimensions} extent={extent} pad={pad} compact={compact} markerId={radiusMarkerId} />
    </g>
  );
}

function RadiusCallouts({ dimensions, extent, pad, compact, markerId }: {
  dimensions: Array<{ label: string; width: number; height: number; radius: number; className: string }>;
  extent: number;
  pad: number;
  compact: boolean;
  markerId: string;
}) {
  const elbowX = -extent / 2 - 5;
  const labelSpacing = Math.max(13, pad * 0.2);
  const labelTop = -labelSpacing;
  const centerDimension = dimensions.find((dimension) => dimension.label === "중심") ?? dimensions[0];
  const centerIndex = dimensions.indexOf(centerDimension);
  const centerLabelY = labelTop + centerIndex * labelSpacing;
  const cornerCenterX = -centerDimension.width / 2 + centerDimension.radius;
  const cornerCenterY = -centerDimension.height / 2 + centerDimension.radius;
  const targetX = cornerCenterX - centerDimension.radius / Math.SQRT2;
  const targetY = cornerCenterY - centerDimension.radius / Math.SQRT2;
  return (
    <g className="radius-callouts" aria-label="홈 중심선 R 지시선과 모서리 R 치수">
      <g className="center-gland-dim">
        <path className="radius-leader" d={`M ${elbowX} ${centerLabelY - 2} L ${targetX} ${targetY}`} markerEnd={`url(#${markerId})`} />
      </g>
      {dimensions.map((dimension, index) => {
        const labelY = labelTop + index * labelSpacing;
        return (
          <g key={`radius-${dimension.label}`} className={dimension.className}>
            <text className="radius-label" x={elbowX - 3} y={labelY} textAnchor="end">{compact ? `${dimension.label} R${dimension.radius.toFixed(2)}` : `홈 ${dimension.label} R ${dimension.radius.toFixed(2)} mm`}</text>
          </g>
        );
      })}
    </g>
  );
}

function GlandDimensions({ candidate, compact = false }: { candidate: Candidate; compact?: boolean }) {
  const grooveWidth = candidate.profile.widthMm;
  const sectionLabel = glandSectionLabel(candidate.profile.section);
  const profile = candidate.path.shape === "round"
    ? [
        ["홈 내경", `Ø ${(candidate.path.diameter - grooveWidth).toFixed(2)} mm`],
        ["홈 중심", `Ø ${candidate.path.diameter.toFixed(2)} mm`],
        ["홈 외경", `Ø ${(candidate.path.diameter + grooveWidth).toFixed(2)} mm`],
      ]
    : [
        ["홈 안쪽 형상", `${(candidate.path.width - grooveWidth).toFixed(2)} × ${(candidate.path.height - grooveWidth).toFixed(2)} · R ${(candidate.path.radius - grooveWidth / 2).toFixed(2)} mm`],
        ["홈 중심 경로", `${candidate.path.width.toFixed(2)} × ${candidate.path.height.toFixed(2)} · R ${candidate.path.radius.toFixed(2)} mm`],
        ["홈 바깥 형상", `${(candidate.path.width + grooveWidth).toFixed(2)} × ${(candidate.path.height + grooveWidth).toFixed(2)} · R ${(candidate.path.radius + grooveWidth / 2).toFixed(2)} mm`],
      ];
  return (
    <div className={`gland-dimension-card ${compact ? "compact" : ""}`}>
      <div className="dimension-card-title"><b>글랜드 가공 치수 · {sectionLabel}</b><span>단위 mm</span></div>
      <div className="plan-dimension-grid">{profile.map(([label, value]) => <span key={label}><small>{label}</small><b>{value}</b></span>)}</div>
      {candidate.profile.section === "rect" ? (
        <div className="section-dimension-line"><span>홈 폭 <b>{grooveWidth.toFixed(2)}</b></span><span>홈 깊이 <b>{candidate.profile.depthMm.toFixed(2)}</b></span><span>바닥 R <b>{candidate.profile.radiusMinMm.toFixed(2)}–{candidate.profile.radiusMaxMm.toFixed(2)}</b></span></div>
      ) : (
        <div className="section-dimension-line"><span>입구폭 G <b>{candidate.profile.mouthWidthMm.toFixed(2)}</b></span><span>최대 바닥폭 <b>{candidate.profile.bottomWidthMm.toFixed(2)}</b></span><span>깊이 L <b>{candidate.profile.depthMm.toFixed(2)}</b></span><span>벽 각도 <b>{candidate.profile.angleDeg}°</b></span><span>R / R1 <b>{candidate.profile.cornerRadiusMm.toFixed(2)} / {candidate.profile.bottomRadiusMm.toFixed(2)}</b></span></div>
      )}
    </div>
  );
}

function DxfDialog({ candidate, input, pressureMode, medium, showBoundaries, onClose, onDownload }: { candidate: Candidate; input: ShapeInput; pressureMode: PressureMode; medium: Medium; showBoundaries: boolean; onClose: () => void; onDownload: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="dxf-dialog" role="dialog" aria-modal="true" aria-labelledby="dxf-title">
        <header><div><span>R14 · mm · 2D</span><h2 id="dxf-title">DXF 가공 도면 미리보기</h2></div><button type="button" onClick={onClose} aria-label="닫기">×</button></header>
        <div className="dxf-sheet">
          <div className="plan-sheet"><PlanPreview candidate={candidate} input={input} pressureMode={pressureMode} modal showBoundaries={showBoundaries} /></div>
          <div className="drawing-notes">
            <b>O-RING FIT / FACE SEAL GLAND</b>
            <dl>
              <div><dt>O-RING</dt><dd>AS568-{candidate.dash}{candidate.aliases.length ? ` · ${candidate.aliases.join(", ")}` : ""}</dd></div>
              <div><dt>SIZE</dt><dd>ID {candidate.idMm.toFixed(2)} × CS {candidate.csMm.toFixed(2)} mm</dd></div>
              <div><dt>GLAND</dt><dd>{glandSectionLabel(candidate.profile.section)} · {candidate.profile.section === "rect" ? `W ${candidate.profile.widthMm.toFixed(2)}` : `G ${candidate.profile.mouthWidthMm.toFixed(2)} / MAX ${candidate.profile.bottomWidthMm.toFixed(2)}`} × {candidate.profile.section === "rect" ? "D" : "L"} {candidate.profile.depthMm.toFixed(2)} mm</dd></div>
              <div><dt>RANGE</dt><dd>최대폭 {candidate.profile.widthMinMm.toFixed(2)}–{candidate.profile.widthMaxMm.toFixed(2)} / 깊이 {candidate.profile.depthMinMm.toFixed(2)}–{candidate.profile.depthMaxMm.toFixed(2)} mm</dd></div>
              <div><dt>INSTALL</dt><dd>{candidate.label} · {supportWallKo(candidate.supportWall)} 지지</dd></div>
              <div><dt>SQUEEZE</dt><dd>{candidate.profile.squeezePercent.toFixed(1)}%</dd></div>
              <div><dt>LENGTH</dt><dd>π × (ID + CS) = {candidate.freeLengthMm.toFixed(2)} / 적용 형상 = {candidate.pathLengthMm.toFixed(2)} mm · Δ {formatSigned(candidate.lengthCheck.differenceMm)} mm</dd></div>
              <div><dt>PATH</dt><dd>홈 중심 경로 {candidate.groovePathLengthMm.toFixed(2)} mm · 공차 변형률 {formatSigned(candidate.worstCompression * 100)}%–{formatSigned(candidate.worstStretch * 100)}%</dd></div>
              <div><dt>MEDIA</dt><dd>{mediumLabel(medium)} · {pressureModeLabel(pressureMode)}</dd></div>
              <div><dt>MATERIAL</dt><dd>FKM (Viton™), hardness/compound TBD</dd></div>
            </dl>
            <GlandDimensions candidate={candidate} />
            <CrossSection candidate={candidate} />
            {candidate.warnings.length > 0 && <div className="dialog-warning">{candidate.warnings.map((warning) => <p key={warning}>△ {warning}</p>)}</div>}
            <p>가공 전 온도·압력·공차·표면조도와 재질 등급을 제조사 자료로 최종 검토하십시오.</p>
          </div>
        </div>
        <footer><span>레이어: GROOVE_CUT · CENTER · DIMENSIONS · NOTES · PRESSURE · SECTION</span><button type="button" onClick={onDownload}>DXF 다운로드 ↓</button></footer>
      </section>
    </div>
  );
}

function CrossSection({ candidate }: { candidate: Candidate }) {
  const width = candidate.profile.widthMm;
  const depth = candidate.profile.depthMm;
  const section = candidate.profile.section;
  const groovePath = section === "dovetail"
    ? "M12 18 H91 Q88 18 86 23 L62 70 H198 L174 23 Q172 18 169 18 H248"
    : section === "half_dovetail_inner"
      ? "M12 18 H91 Q88 18 86 23 L62 70 H174 V18 H248"
      : section === "half_dovetail_outer"
      ? "M12 18 H86 V70 H198 L174 23 Q172 18 169 18 H248"
      : "M12 18 H70 V70 H190 V18 H248";
  return (
    <div className="section-sketch">
      <svg viewBox="0 0 260 92" role="img" aria-label="글랜드 단면">
        <path d={groovePath} />
        <ellipse cx="130" cy="42" rx="46" ry="26" />
        <line x1="70" y1="82" x2="190" y2="82" /><line x1="70" y1="77" x2="70" y2="87" /><line x1="190" y1="77" x2="190" y2="87" />
        <text x="130" y="90" textAnchor="middle">{section === "rect" ? "W" : "MAX"} {width.toFixed(2)} mm</text>
        <text x="200" y="51">{section === "rect" ? "D" : "L"} {depth.toFixed(2)} mm</text>
        {section !== "rect" && <><text x="130" y="15" textAnchor="middle">G {candidate.profile.mouthWidthMm.toFixed(2)} mm</text><text x={section === "half_dovetail_outer" ? "190" : "70"} y="54">66°</text></>}
        {section.startsWith("half_dovetail") && <><text x="18" y="86">내측</text><text x="220" y="86">외측</text></>}
      </svg>
    </div>
  );
}

function supportWallKo(value: Candidate["supportWall"]) { return value === "GROOVE OD" ? "홈 외경벽" : "홈 내경벽"; }
function formatSigned(value: number) { return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`; }
function pressureModeLabel(value: PressureMode) {
  if (value === "internal_pressure") return "내부 가압";
  if (value === "external_pressure") return "외부 가압";
  return "내부 진공";
}
function mediumLabel(value: Medium) { return value === "liquid" ? "액체" : value === "gas" ? "기체" : "진공/기체"; }
function grooveShapeLabel(value: GrooveShape) { return value === "round" ? "원형" : "둥근 사각형"; }
function glandSectionLabel(value: GlandSection) {
  if (value === "dovetail") return "도브";
  if (value === "half_dovetail_inner") return "하프 도브 내측";
  if (value === "half_dovetail_outer") return "하프 도브 외측";
  return "직사각";
}
