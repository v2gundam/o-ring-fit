"use client";

import { useMemo, useState } from "react";
import { buildDxf, downloadDxf } from "./lib/dxf";
import {
  searchCandidates,
  validateInput,
  type Candidate,
  type GlandSection,
  type GrooveShape,
  type Medium,
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

export default function Home() {
  const [shape, setShape] = useState<"round" | "rect">("round");
  const [round, setRound] = useState(initialRound);
  const [rect, setRect] = useState(initialRect);
  const [pressureMode, setPressureMode] = useState<PressureMode>(initialMode);
  const [medium, setMedium] = useState<Medium>(initialMedium);
  const [grooveMode, setGrooveMode] = useState<"auto" | GrooveShape>("auto");
  const [grooveRadius, setGrooveRadius] = useState(20);
  const [csFilter, setCsFilter] = useState<number | null>(null);
  const [glandSection, setGlandSection] = useState<GlandSection>("rect");
  const [result, setResult] = useState(initialSearch);
  const [selectedDash, setSelectedDash] = useState(initialSearch.accepted[0]?.dash ?? "");
  const [errors, setErrors] = useState<string[]>([]);
  const [searchedInput, setSearchedInput] = useState<ShapeInput>(initialRound);
  const [searchedMode, setSearchedMode] = useState<PressureMode>(initialMode);
  const [searchedMedium, setSearchedMedium] = useState<Medium>(initialMedium);
  const [dxfOpen, setDxfOpen] = useState(false);

  const selected = result.accepted.find((item) => item.dash === selectedDash) ?? result.accepted[0] ?? null;
  const currentInput: ShapeInput = shape === "round" ? round : rect;
  const resolvedGrooveShape: GrooveShape = grooveMode === "auto" ? shape : grooveMode;
  const dxf = useMemo(
    () => selected ? buildDxf(selected, searchedInput, searchedMode, searchedMedium) : "",
    [selected, searchedInput, searchedMode, searchedMedium],
  );

  function runSearch() {
    const nextErrors = validateInput(currentInput);
    if (resolvedGrooveShape === "rect" && (!Number.isFinite(grooveRadius) || grooveRadius <= 0)) {
      nextErrors.push("둥근 사각형 홈의 중심선 R은 0보다 커야 합니다.");
    }
    setErrors(nextErrors);
    setDxfOpen(false);
    if (nextErrors.length) return;
    const next = searchCandidates(currentInput, medium, pressureMode, {
      grooveShape: resolvedGrooveShape,
      grooveRadius: resolvedGrooveShape === "rect" ? grooveRadius : undefined,
      csMm: csFilter,
      glandSection,
    });
    setResult(next);
    setSelectedDash(next.accepted[0]?.dash ?? "");
    setSearchedInput(currentInput);
    setSearchedMode(pressureMode);
    setSearchedMedium(medium);
  }

  function setRoundValue(key: keyof RoundInput, value: number) {
    setRound((previous) => ({ ...previous, [key]: value }));
  }

  function setRectValue(key: keyof RectInput, value: number) {
    setRect((previous) => ({ ...previous, [key]: value }));
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
          <span className="kicker">SEAL SPACE → STANDARD RING → GLAND</span>
          <h1>허용 공간을 입력하면<br />맞는 오링과 홈을 찾습니다.</h1>
        </div>
        <p className="hero-copy">챔버와 플랜지 사이에서 홈이 존재할 수 있는 영역을 정의하세요. AS568 표준 형번을 비교하고, 선택한 오링의 가공 형상을 DXF로 받을 수 있습니다.</p>
      </section>

      <section className="workbench" aria-label="오링 설계 워크벤치">
        <section className="inputs">
          <SectionHead number="01" title="허용 영역" subtitle="글랜드 전체가 존재할 수 있는 범위" />

          <div className="field-label">허용 영역 형상</div>
          <div className="segmented boundary-shape" aria-label="허용 영역 형상 선택">
            <button type="button" className={shape === "round" ? "active" : ""} onClick={() => setShape("round")}>○ 원형</button>
            <button type="button" className={shape === "rect" ? "active" : ""} onClick={() => setShape("rect")}>▢ 둥근 사각형</button>
          </div>

          {shape === "round" ? (
            <div className="input-groups single">
              <fieldset>
                <legend><i className="inner-dot" /> 안쪽 금지 / 바깥쪽 허용</legend>
                <Dimension label="챔버 내경" value={round.innerDiameter} onChange={(value) => setRoundValue("innerDiameter", value)} />
                <Dimension label="플랜지 외경" value={round.outerDiameter} onChange={(value) => setRoundValue("outerDiameter", value)} />
                <Dimension label="안쪽 벽 여유" value={round.innerMargin} onChange={(value) => setRoundValue("innerMargin", value)} />
                <Dimension label="바깥쪽 벽 여유" value={round.outerMargin} onChange={(value) => setRoundValue("outerMargin", value)} />
              </fieldset>
            </div>
          ) : (
            <div className="input-groups">
              <fieldset>
                <legend><i className="inner-dot" /> 안쪽 금지 경계</legend>
                <Dimension label="가로" value={rect.innerWidth} onChange={(value) => setRectValue("innerWidth", value)} />
                <Dimension label="세로" value={rect.innerHeight} onChange={(value) => setRectValue("innerHeight", value)} />
                <Dimension label="모서리 R" value={rect.innerRadius} onChange={(value) => setRectValue("innerRadius", value)} />
                <Dimension label="벽 여유" value={rect.innerMargin} onChange={(value) => setRectValue("innerMargin", value)} />
              </fieldset>
              <fieldset>
                <legend><i className="outer-dot" /> 바깥쪽 허용 경계</legend>
                <Dimension label="가로" value={rect.outerWidth} onChange={(value) => setRectValue("outerWidth", value)} />
                <Dimension label="세로" value={rect.outerHeight} onChange={(value) => setRectValue("outerHeight", value)} />
                <Dimension label="모서리 R" value={rect.outerRadius} onChange={(value) => setRectValue("outerRadius", value)} />
                <Dimension label="벽 여유" value={rect.outerMargin} onChange={(value) => setRectValue("outerMargin", value)} />
              </fieldset>
            </div>
          )}

          <div className="design-options">
            <label>오링 단면 두께 (CS)
              <select value={csFilter ?? "auto"} onChange={(event) => setCsFilter(event.target.value === "auto" ? null : Number(event.target.value))}>
                <option value="auto">자동 · 전체 단면</option>
                {crossSections.map((value) => <option key={value} value={value}>{value.toFixed(2)} mm</option>)}
              </select>
            </label>
            <label>오링 홈 형상
              <select value={grooveMode} onChange={(event) => setGrooveMode(event.target.value as "auto" | GrooveShape)}>
                <option value="auto">자동 · 허용 영역과 동일</option>
                <option value="round">원형</option>
                <option value="rect">둥근 사각형</option>
              </select>
            </label>
            <label>홈 단면
              <select value={glandSection} onChange={(event) => setGlandSection(event.target.value as GlandSection)}>
                <option value="rect">직사각형 · 표준</option>
                <option value="dovetail">도브테일 · 양쪽 유지</option>
                <option value="half_dovetail">하프 도브테일 · 한쪽 유지</option>
              </select>
            </label>
            {resolvedGrooveShape === "rect" && (
              <label className="radius-option">홈 중심선 모서리 R
                <span className="number-control"><input type="number" min="0.1" step="0.5" value={grooveRadius} onChange={(event) => setGrooveRadius(event.target.valueAsNumber)} /><em>mm</em></span>
              </label>
            )}
          </div>

          <div className="auto-shape-note">
            <b>{shape === "round" ? "원형" : "둥근 사각형"} 허용 영역</b>
            <span>→</span>
            <b>{resolvedGrooveShape === "round" ? "원형 홈" : "둥근 사각형 홈"}</b>
            {grooveMode === "auto" && <em>자동 적용</em>}
          </div>
          {glandSection !== "rect" && (
            <div className="retention-note"><b>{glandSection === "dovetail" ? "도브테일" : "하프 도브테일"} 유지 홈</b><span>Parker 66° 단면 · 금속 간 접촉 기준</span><em>온도 범위·FKM 팽윤·가공 공차 추가 검토</em></div>
          )}

          <div className="condition-row">
            <label>압력 방향
              <select value={pressureMode} onChange={(event) => setPressureMode(event.target.value as PressureMode)}>
                <option value="internal_vacuum">챔버 내부 진공</option>
                <option value="internal_pressure">챔버 내부 가압</option>
                <option value="external_pressure">외부 가압</option>
              </select>
            </label>
            <label>밀봉 매체
              <select value={medium} onChange={(event) => setMedium(event.target.value as Medium)}>
                <option value="vacuum">진공 / 기체</option>
                <option value="gas">기체</option>
                <option value="liquid">액체</option>
              </select>
            </label>
          </div>

          <div className="fixed-material">
            <span>재질</span><b>FKM (Viton™)</b><em>경도·컴파운드 미지정</em>
          </div>
          {errors.length > 0 && <div className="error-box" role="alert">{errors.map((error) => <p key={error}>{error}</p>)}</div>}
          <button type="button" className="search-button" onClick={runSearch}>표준 오링 후보 찾기 <span>→</span></button>
        </section>

        <section className="results">
          <SectionHead
            number="02"
            title="추천 후보"
            subtitle={result.accepted.length ? `${result.accepted.length}개 형번 · 적합도 순` : "조건을 충족하는 표준 형번 없음"}
          />

          {result.accepted.length ? (
            <>
              <div className="candidate-list" aria-label="추천 오링 목록">
                {result.accepted.map((candidate) => (
                  <button
                    type="button"
                    key={candidate.dash}
                    className={`candidate ${selected?.dash === candidate.dash ? "selected" : ""}`}
                    onClick={() => { setSelectedDash(candidate.dash); setDxfOpen(false); }}
                  >
                    <span className="radio" />
                    <span className="candidate-name">
                      <b>AS568-{candidate.dash}</b>
                      <small>ID {candidate.idMm.toFixed(2)} · CS {candidate.csMm.toFixed(2)} mm</small>
                    </span>
                    <span className={`fit-badge ${candidate.state}`}>{candidate.label}</span>
                    <span className="chevron">›</span>
                  </button>
                ))}
              </div>
              <div className="result-note"><span>i</span> 형번을 선택하면 글랜드 중심 경로와 가공 치수가 즉시 바뀝니다.</div>
            </>
          ) : (
            <NoMatch near={result.near} />
          )}
        </section>

        <section className="preview">
          <div className="preview-top">
            <SectionHead number="03" title="글랜드 미리보기" subtitle={selected ? `AS568-${selected.dash} 적용 형상` : "후보가 선택되지 않았습니다"} light />
            <span className="drawing-status">● 실치수 계산</span>
          </div>

          {selected ? (
            <>
              <PlanPreview candidate={selected} input={searchedInput} pressureMode={searchedMode} />
              <GlandDimensions candidate={selected} compact />
              <div className="drawing-data">
                <div><small>선택 오링</small><b>AS568-{selected.dash}</b></div>
                <div><small>글랜드 단면</small><b>{glandSectionLabel(selected.profile.section)} · {selected.profile.section === "rect" ? "W" : "G"} {selected.profile.section === "rect" ? selected.profile.widthMm.toFixed(2) : selected.profile.mouthWidthMm.toFixed(2)} × {selected.profile.section === "rect" ? "D" : "L"} {selected.profile.depthMm.toFixed(2)} mm</b></div>
                <div><small>설치 상태</small><b className="accent-text">{selected.label}</b></div>
              </div>
              <div className="selection-details">
                <span>지지벽 <b>{supportWallKo(selected.supportWall)}</b></span>
                <span>압착률 <b>{selected.profile.squeezePercent.toFixed(1)}%</b></span>
                <span>중심 경로 <b>{selected.pathLengthMm.toFixed(2)} mm</b></span>
              </div>
              {selected.warnings.length > 0 && (
                <div className="preview-warning">{selected.warnings.map((warning) => <p key={warning}>△ {warning}</p>)}</div>
              )}
              <button type="button" className="dxf-button" onClick={() => setDxfOpen(true)}>DXF 미리보기 <span>↗</span></button>
            </>
          ) : (
            <div className="empty-preview"><span>Ø</span><b>생성할 글랜드가 없습니다</b><p>허용 영역을 넓히거나 벽 여유와 형상 치수를 조정해 보세요.</p></div>
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
          input={searchedInput}
          pressureMode={searchedMode}
          medium={searchedMedium}
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

function Dimension({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="dimension">
      <span>{label}</span>
      <span><input type="number" min="0" step="0.1" value={value} onChange={(event) => onChange(event.target.valueAsNumber)} aria-label={`${label} mm`} /><em>mm</em></span>
    </label>
  );
}

function NoMatch({ near }: { near: ReturnType<typeof searchCandidates>["near"] }) {
  return (
    <div className="no-match">
      <span className="no-match-icon">!</span>
      <h3>맞는 표준 오링이 없습니다</h3>
      <p>필요한 홈 폭, 벽 여유, 설치 변형률을 함께 만족하지 못했습니다.</p>
      {near.length > 0 && <div className="near-list"><b>가까운 형번과 제외 이유</b>{near.map((item) => <div key={item.dash}><span>AS568-{item.dash}</span><small>{item.reason}</small></div>)}</div>}
    </div>
  );
}

function PlanPreview({ candidate, input, pressureMode, modal = false }: { candidate: Candidate; input: ShapeInput; pressureMode: PressureMode; modal?: boolean }) {
  const extent = input.shape === "round" ? input.outerDiameter : Math.max(input.outerWidth, input.outerHeight);
  const pad = Math.max(24, extent * 0.28);
  const size = extent + 2 * pad;
  const arrowOutward = pressureMode === "internal_pressure";
  const pressureY = extent * 0.43;
  const pressureStart = arrowOutward ? extent * 0.12 : extent * 0.48;
  const pressureEnd = arrowOutward ? extent * 0.45 : extent * 0.15;
  const markerId = modal ? "pressure-arrow-modal" : "pressure-arrow-main";
  return (
    <div className={`drawing functional ${modal ? "modal-drawing" : ""}`}>
      <svg viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} role="img" aria-label="오링 홈 평면 미리보기">
        <defs>
          <pattern id={modal ? "grid-modal" : "grid-main"} width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#8aa099" strokeWidth="0.35" /></pattern>
          <marker id={markerId} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L6,3 L0,6 Z" /></marker>
        </defs>
        <rect x={-size / 2} y={-size / 2} width={size} height={size} fill={`url(#${modal ? "grid-modal" : "grid-main"})`} opacity="0.35" />
        {input.shape === "round" ? (
          <>
            <circle className="boundary-svg outer-svg" r={input.outerDiameter / 2} />
            <circle className="boundary-svg inner-svg" r={input.innerDiameter / 2} />
            {candidate.path.shape === "round" && <circle className="groove-svg" r={candidate.path.diameter / 2} strokeWidth={candidate.profile.widthMm} />}
          </>
        ) : (
          <>
            <rect className="boundary-svg outer-svg" x={-input.outerWidth / 2} y={-input.outerHeight / 2} width={input.outerWidth} height={input.outerHeight} rx={input.outerRadius} />
            <rect className="boundary-svg inner-svg" x={-input.innerWidth / 2} y={-input.innerHeight / 2} width={input.innerWidth} height={input.innerHeight} rx={input.innerRadius} />
            {candidate.path.shape === "rect" && <rect className="groove-svg" x={-candidate.path.width / 2} y={-candidate.path.height / 2} width={candidate.path.width} height={candidate.path.height} rx={candidate.path.radius} strokeWidth={candidate.profile.widthMm} />}
          </>
        )}
        <line className="center-axis" x1={-extent * 0.55} x2={extent * 0.55} y1="0" y2="0" />
        <PreviewDimensions candidate={candidate} extent={extent} pad={pad} />
        <line className="pressure-line" x1={pressureStart} x2={pressureEnd} y1={pressureY} y2={pressureY} markerEnd={`url(#${markerId})`} />
        <text className="pressure-svg-label" x={(pressureStart + pressureEnd) / 2} y={pressureY - 3} textAnchor="middle">오링 이동</text>
      </svg>
      <div className="pressure-caption"><b>{pressureModeLabel(pressureMode)}</b><span>화살표: 압력에 의한 오링 이동</span><em>도착점: {supportWallKo(candidate.supportWall)}</em></div>
      <div className="drawing-legend"><span className="legend-inner">금지 경계</span><span className="legend-groove">가공 홈</span><span className="legend-outer">허용 경계</span></div>
    </div>
  );
}

function PreviewDimensions({ candidate, extent, pad }: { candidate: Candidate; extent: number; pad: number }) {
  const grooveWidth = candidate.profile.widthMm;
  const spacing = Math.max(6, pad * 0.23);
  const top = -extent / 2 - pad + 5;
  if (candidate.path.shape === "round") {
    const dimensions = [
      { label: "홈 내경", diameter: candidate.path.diameter - grooveWidth, className: "inner-gland-dim" },
      { label: "홈 중심경", diameter: candidate.path.diameter, className: "center-gland-dim" },
      { label: "홈 외경", diameter: candidate.path.diameter + grooveWidth, className: "outer-gland-dim" },
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
              <text x="0" y={y - 2.2} textAnchor="middle">{dimension.label} Ø {dimension.diameter.toFixed(2)} mm</text>
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
  const right = extent / 2 + 5;
  return (
    <g className="preview-dimensions">
      {dimensions.map((dimension, index) => {
        const y = top + index * spacing;
        const x = right + index * spacing;
        return (
          <g key={dimension.label} className={dimension.className}>
            <line x1={-dimension.width / 2} x2={dimension.width / 2} y1={y} y2={y} />
            <line x1={-dimension.width / 2} x2={-dimension.width / 2} y1={-dimension.height / 2} y2={y + 2} />
            <line x1={dimension.width / 2} x2={dimension.width / 2} y1={-dimension.height / 2} y2={y + 2} />
            <path d={`M ${-dimension.width / 2} ${y} l 3.5 -1.8 v 3.6 Z M ${dimension.width / 2} ${y} l -3.5 -1.8 v 3.6 Z`} />
            <text x="0" y={y - 2.2} textAnchor="middle">홈 {dimension.label} W {dimension.width.toFixed(2)}</text>
            <line x1={x} x2={x} y1={-dimension.height / 2} y2={dimension.height / 2} />
            <line x1={dimension.width / 2} x2={x - 2} y1={-dimension.height / 2} y2={-dimension.height / 2} />
            <line x1={dimension.width / 2} x2={x - 2} y1={dimension.height / 2} y2={dimension.height / 2} />
            <path d={`M ${x} ${-dimension.height / 2} l -1.8 3.5 h 3.6 Z M ${x} ${dimension.height / 2} l -1.8 -3.5 h 3.6 Z`} />
            <text x={x + 3} y="0" textAnchor="middle" transform={`rotate(90 ${x + 3} 0)`}>{dimension.label} H {dimension.height.toFixed(2)}</text>
          </g>
        );
      })}
      <text className="radius-summary" x="0" y={extent / 2 + pad * 0.62} textAnchor="middle">
        홈 R · 안쪽 {dimensions[0].radius.toFixed(2)} / 중심 {dimensions[1].radius.toFixed(2)} / 바깥 {dimensions[2].radius.toFixed(2)} mm
      </text>
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

function DxfDialog({ candidate, input, pressureMode, medium, onClose, onDownload }: { candidate: Candidate; input: ShapeInput; pressureMode: PressureMode; medium: Medium; onClose: () => void; onDownload: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="dxf-dialog" role="dialog" aria-modal="true" aria-labelledby="dxf-title">
        <header><div><span>R14 · mm · 2D</span><h2 id="dxf-title">DXF 가공 도면 미리보기</h2></div><button type="button" onClick={onClose} aria-label="닫기">×</button></header>
        <div className="dxf-sheet">
          <div className="plan-sheet"><PlanPreview candidate={candidate} input={input} pressureMode={pressureMode} modal /></div>
          <div className="drawing-notes">
            <b>O-RING FIT / FACE SEAL GLAND</b>
            <dl>
              <div><dt>O-RING</dt><dd>AS568-{candidate.dash}{candidate.aliases.length ? ` · ${candidate.aliases.join(", ")}` : ""}</dd></div>
              <div><dt>SIZE</dt><dd>ID {candidate.idMm.toFixed(2)} × CS {candidate.csMm.toFixed(2)} mm</dd></div>
              <div><dt>GLAND</dt><dd>{glandSectionLabel(candidate.profile.section)} · {candidate.profile.section === "rect" ? `W ${candidate.profile.widthMm.toFixed(2)}` : `G ${candidate.profile.mouthWidthMm.toFixed(2)} / MAX ${candidate.profile.bottomWidthMm.toFixed(2)}`} × {candidate.profile.section === "rect" ? "D" : "L"} {candidate.profile.depthMm.toFixed(2)} mm</dd></div>
              <div><dt>RANGE</dt><dd>최대폭 {candidate.profile.widthMinMm.toFixed(2)}–{candidate.profile.widthMaxMm.toFixed(2)} / 깊이 {candidate.profile.depthMinMm.toFixed(2)}–{candidate.profile.depthMaxMm.toFixed(2)} mm</dd></div>
              <div><dt>INSTALL</dt><dd>{candidate.label} · {supportWallKo(candidate.supportWall)} 지지</dd></div>
              <div><dt>MEDIA</dt><dd>{mediumLabel(medium)} · {pressureModeLabel(pressureMode)}</dd></div>
              <div><dt>MATERIAL</dt><dd>FKM (Viton™), hardness/compound TBD</dd></div>
            </dl>
            <GlandDimensions candidate={candidate} />
            <CrossSection candidate={candidate} />
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
    : section === "half_dovetail"
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
        {section !== "rect" && <><text x="130" y="15" textAnchor="middle">G {candidate.profile.mouthWidthMm.toFixed(2)} mm</text><text x="70" y="54">66°</text></>}
      </svg>
    </div>
  );
}

function supportWallKo(value: Candidate["supportWall"]) { return value === "GROOVE OD" ? "홈 외경벽" : "홈 내경벽"; }
function pressureModeLabel(value: PressureMode) {
  if (value === "internal_pressure") return "내부 가압";
  if (value === "external_pressure") return "외부 가압";
  return "내부 진공";
}
function mediumLabel(value: Medium) { return value === "liquid" ? "액체" : value === "gas" ? "기체" : "진공/기체"; }
function glandSectionLabel(value: GlandSection) { return value === "dovetail" ? "도브테일" : value === "half_dovetail" ? "하프 도브테일" : "직사각형"; }
