"use client";

import { useMemo, useState } from "react";
import { buildDxf, downloadDxf } from "./lib/dxf";
import {
  searchCandidates,
  validateInput,
  type Candidate,
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
const initialSearch = searchCandidates(initialRound, initialMedium, initialMode);

export default function Home() {
  const [shape, setShape] = useState<"round" | "rect">("round");
  const [round, setRound] = useState(initialRound);
  const [rect, setRect] = useState(initialRect);
  const [pressureMode, setPressureMode] = useState<PressureMode>(initialMode);
  const [medium, setMedium] = useState<Medium>(initialMedium);
  const [result, setResult] = useState(initialSearch);
  const [selectedDash, setSelectedDash] = useState(initialSearch.accepted[0]?.dash ?? "");
  const [errors, setErrors] = useState<string[]>([]);
  const [searchedInput, setSearchedInput] = useState<ShapeInput>(initialRound);
  const [searchedMode, setSearchedMode] = useState<PressureMode>(initialMode);
  const [searchedMedium, setSearchedMedium] = useState<Medium>(initialMedium);
  const [dxfOpen, setDxfOpen] = useState(false);

  const selected = result.accepted.find((item) => item.dash === selectedDash) ?? result.accepted[0] ?? null;
  const currentInput: ShapeInput = shape === "round" ? round : rect;
  const dxf = useMemo(
    () => selected ? buildDxf(selected, searchedInput, searchedMode, searchedMedium) : "",
    [selected, searchedInput, searchedMode, searchedMedium],
  );

  function runSearch() {
    const nextErrors = validateInput(currentInput);
    setErrors(nextErrors);
    setDxfOpen(false);
    if (nextErrors.length) return;
    const next = searchCandidates(currentInput, medium, pressureMode);
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

          <div className="segmented" aria-label="형상 선택">
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
              <div className="drawing-data">
                <div><small>선택 오링</small><b>AS568-{selected.dash}</b></div>
                <div><small>글랜드 W × D</small><b>{selected.profile.widthMm.toFixed(2)} × {selected.profile.depthMm.toFixed(2)} mm</b></div>
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
  const pad = Math.max(10, extent * 0.13);
  const size = extent + 2 * pad;
  const arrowRight = pressureMode === "internal_pressure";
  return (
    <div className={`drawing functional ${modal ? "modal-drawing" : ""}`}>
      <svg viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} role="img" aria-label="오링 홈 평면 미리보기">
        <defs><pattern id={modal ? "grid-modal" : "grid-main"} width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#8aa099" strokeWidth="0.35" /></pattern></defs>
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
        <line className="pressure-line" x1={arrowRight ? -extent * 0.22 : extent * 0.22} x2={arrowRight ? extent * 0.22 : -extent * 0.22} y1={extent * 0.43} y2={extent * 0.43} />
        <path className="pressure-tip" d={arrowRight ? `M ${extent * 0.22} ${extent * 0.43} l -5 -3 m 5 3 l -5 3` : `M ${-extent * 0.22} ${extent * 0.43} l 5 -3 m -5 3 l 5 3`} />
      </svg>
      <div className="pressure-caption">{pressureModeLabel(pressureMode)} · {supportWallKo(candidate.supportWall)} 지지</div>
      <div className="drawing-legend"><span className="legend-inner">금지 경계</span><span className="legend-groove">가공 홈</span><span className="legend-outer">허용 경계</span></div>
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
              <div><dt>GLAND</dt><dd>W {candidate.profile.widthMm.toFixed(2)} × D {candidate.profile.depthMm.toFixed(2)} mm</dd></div>
              <div><dt>RANGE</dt><dd>W {candidate.profile.widthMinMm.toFixed(2)}–{candidate.profile.widthMaxMm.toFixed(2)} / D {candidate.profile.depthMinMm.toFixed(2)}–{candidate.profile.depthMaxMm.toFixed(2)} mm</dd></div>
              <div><dt>INSTALL</dt><dd>{candidate.label} · {supportWallKo(candidate.supportWall)} 지지</dd></div>
              <div><dt>MEDIA</dt><dd>{mediumLabel(medium)} · {pressureModeLabel(pressureMode)}</dd></div>
              <div><dt>MATERIAL</dt><dd>FKM (Viton™), hardness/compound TBD</dd></div>
            </dl>
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
  return (
    <div className="section-sketch">
      <svg viewBox="0 0 260 92" role="img" aria-label="글랜드 단면">
        <path d="M12 18 H70 V70 H190 V18 H248" />
        <ellipse cx="130" cy="42" rx="46" ry="26" />
        <line x1="70" y1="82" x2="190" y2="82" /><line x1="70" y1="77" x2="70" y2="87" /><line x1="190" y1="77" x2="190" y2="87" />
        <text x="130" y="90" textAnchor="middle">W {width.toFixed(2)} mm</text>
        <text x="196" y="51">D {depth.toFixed(2)} mm</text>
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
