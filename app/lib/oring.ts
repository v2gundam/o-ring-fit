import { AS568_SIZES, type As568Size } from "../data/as568.generated";

const INCH_TO_MM = 25.4;
const MAX_STRETCH = 0.05;
const MAX_CIRCUMFERENTIAL_COMPRESSION = 0.03;

export type PressureMode = "internal_pressure" | "internal_vacuum" | "external_pressure";
export type Medium = "liquid" | "gas" | "vacuum";
export type GrooveShape = "round" | "rect";
export type GlandSection = "rect" | "dovetail" | "half_dovetail_inner" | "half_dovetail_outer";

export type SearchOptions = {
  grooveShape?: GrooveShape;
  grooveRadius?: number;
  csMm?: number | null;
  glandSection?: GlandSection;
  fixedRoundDiameter?: number;
  fixedRectSize?: { width: number; height: number };
  fixedPath?: PathGeometry;
};

export type GroovePositionInput =
  | { shape: "round"; edge: "inner" | "outer"; diameter: number }
  | { shape: "rect"; edge: "inner" | "outer"; width: number; height: number; radius: number };

export type GrooveCenterlineInput = PathGeometry;

export type RoundInput = {
  shape: "round";
  innerDiameter: number;
  outerDiameter: number;
  innerMargin: number;
  outerMargin: number;
};

export type RectInput = {
  shape: "rect";
  innerWidth: number;
  innerHeight: number;
  innerRadius: number;
  outerWidth: number;
  outerHeight: number;
  outerRadius: number;
  innerMargin: number;
  outerMargin: number;
};

export type BoundaryInput =
  | { shape: "round"; diameter: number }
  | { shape: "rect"; width: number; height: number; radius: number };

export type MixedInput = {
  shape: "mixed";
  innerBoundary: BoundaryInput;
  outerBoundary: BoundaryInput;
  innerMargin: number;
  outerMargin: number;
};

export type ShapeInput = RoundInput | RectInput | MixedInput;

export type GlandProfile = {
  section: GlandSection;
  csMm: number;
  widthMm: number;
  widthMinMm: number;
  widthMaxMm: number;
  depthMm: number;
  depthMinMm: number;
  depthMaxMm: number;
  radiusMinMm: number;
  radiusMaxMm: number;
  squeezePercent: number;
  mouthWidthMm: number;
  bottomWidthMm: number;
  angleDeg: number | null;
  cornerRadiusMm: number;
  bottomRadiusMm: number;
};

export type CornerRadiusGuidance = {
  csMm: number;
  footprintWidthMm: number;
  minimumInnerRadiusMm: number;
  idealInnerRadiusMm: number;
  minimumCenterlineRadiusMm: number;
  idealCenterlineRadiusMm: number;
};

export type PathGeometry =
  | { shape: "round"; diameter: number }
  | { shape: "rect"; width: number; height: number; radius: number };

export type LengthFitCheck = {
  freeCenterlineDiameterMm: number;
  freeLengthMm: number;
  groovePathLengthMm: number;
  installedPathLengthMm: number;
  differenceMm: number;
  strain: number;
  worstCompression: number;
  worstStretch: number;
  withinLimits: boolean;
};

export type Candidate = {
  dash: string;
  aliases: string[];
  idMm: number;
  idToleranceMm: number;
  csMm: number;
  csToleranceMm: number;
  odMm: number;
  freeLengthMm: number;
  pathLengthMm: number;
  groovePathLengthMm: number;
  lengthCheck: LengthFitCheck;
  strain: number;
  worstCompression: number;
  worstStretch: number;
  state: "no_strain" | "stretch" | "compression" | "conditional";
  label: string;
  profile: GlandProfile;
  path: PathGeometry;
  innerCornerRatio: number | null;
  supportWall: "GROOVE OD" | "GROOVE ID";
  warnings: string[];
  score: number;
};

export type NearCandidate = {
  dash: string;
  idMm: number;
  csMm: number;
  requiredStrain: number;
  reason: string;
};

type InchProfile = {
  depth: [number, number];
  liquidWidth: [number, number];
  gasWidth: [number, number];
  radius: [number, number];
};

type DovetailInchProfile = {
  depth: [number, number];
  mouthWidth: [number, number];
  squeeze: number;
  radius: number;
  bottomRadius: number;
};

const FACE_SEAL_PROFILES: Record<string, InchProfile> = {
  "0.070": { depth: [0.050, 0.054], liquidWidth: [0.101, 0.107], gasWidth: [0.084, 0.089], radius: [0.005, 0.015] },
  "0.103": { depth: [0.074, 0.080], liquidWidth: [0.136, 0.142], gasWidth: [0.120, 0.125], radius: [0.005, 0.015] },
  "0.139": { depth: [0.101, 0.107], liquidWidth: [0.177, 0.187], gasWidth: [0.158, 0.164], radius: [0.010, 0.025] },
  "0.210": { depth: [0.152, 0.162], liquidWidth: [0.270, 0.290], gasWidth: [0.239, 0.244], radius: [0.020, 0.035] },
  "0.275": { depth: [0.201, 0.211], liquidWidth: [0.342, 0.362], gasWidth: [0.309, 0.314], radius: [0.020, 0.035] },
};

const DOVETAIL_PROFILES: Record<string, DovetailInchProfile> = {
  "0.070": { depth: [0.053, 0.055], mouthWidth: [0.057, 0.061], squeeze: 23, radius: 0.005, bottomRadius: 1 / 64 },
  "0.103": { depth: [0.081, 0.083], mouthWidth: [0.083, 0.087], squeeze: 21, radius: 0.010, bottomRadius: 1 / 64 },
  "0.139": { depth: [0.111, 0.113], mouthWidth: [0.113, 0.117], squeeze: 20, radius: 0.010, bottomRadius: 1 / 32 },
  "0.210": { depth: [0.171, 0.173], mouthWidth: [0.171, 0.175], squeeze: 18, radius: 0.015, bottomRadius: 1 / 32 },
  "0.275": { depth: [0.231, 0.234], mouthWidth: [0.231, 0.235], squeeze: 16, radius: 0.015, bottomRadius: 1 / 16 },
};

const HALF_DOVETAIL_PROFILES: Record<string, DovetailInchProfile> = {
  "0.070": { depth: [0.053, 0.055], mouthWidth: [0.064, 0.066], squeeze: 23, radius: 0.005, bottomRadius: 1 / 64 },
  "0.103": { depth: [0.083, 0.085], mouthWidth: [0.095, 0.097], squeeze: 19, radius: 0.010, bottomRadius: 1 / 64 },
  "0.139": { depth: [0.113, 0.115], mouthWidth: [0.124, 0.128], squeeze: 18, radius: 0.010, bottomRadius: 1 / 32 },
  "0.210": { depth: [0.173, 0.176], mouthWidth: [0.190, 0.193], squeeze: 17, radius: 0.015, bottomRadius: 1 / 32 },
  "0.275": { depth: [0.234, 0.238], mouthWidth: [0.255, 0.257], squeeze: 15, radius: 0.015, bottomRadius: 1 / 16 },
};

export function searchCandidates(input: ShapeInput, medium: Medium, pressureMode: PressureMode, options: SearchOptions = {}) {
  const accepted: Candidate[] = [];
  const near: NearCandidate[] = [];

  for (const size of AS568_SIZES) {
    if (Number(size.dash) >= 900) continue;
    if (options.csMm && Math.abs(size.csIn * INCH_TO_MM - options.csMm) > 0.03) continue;
    const profile = getGlandProfile(size, medium, options.glandSection ?? "rect");
    if (!profile) continue;
    const evaluated = evaluateSize(size, profile, input, pressureMode, options);
    if ("candidate" in evaluated) accepted.push(evaluated.candidate);
    else near.push(evaluated.near);
  }

  accepted.sort((a, b) => a.score - b.score || Number(a.dash) - Number(b.dash));
  near.sort((a, b) => Math.abs(a.requiredStrain) - Math.abs(b.requiredStrain));
  return { accepted, near: near.slice(0, 5) };
}

export function searchCandidatesForGroovePosition(envelope: ShapeInput, input: GroovePositionInput, medium: Medium, pressureMode: PressureMode, options: Omit<SearchOptions, "grooveShape" | "grooveRadius" | "fixedRoundDiameter" | "fixedRectSize"> = {}) {
  const accepted: Candidate[] = [];
  const near: NearCandidate[] = [];
  if (validateGroovePosition(input).length) return { accepted, near };

  for (const size of AS568_SIZES) {
    if (Number(size.dash) >= 900) continue;
    if (options.csMm && Math.abs(size.csIn * INCH_TO_MM - options.csMm) > 0.03) continue;
    const profile = getGlandProfile(size, medium, options.glandSection ?? "rect");
    if (!profile) continue;
    const centerDiameter = input.shape === "round"
      ? input.edge === "inner" ? input.diameter + profile.widthMm : input.diameter - profile.widthMm
      : null;
    const centerRect = input.shape === "rect" ? {
      width: input.edge === "inner" ? input.width + profile.widthMm : input.width - profile.widthMm,
      height: input.edge === "inner" ? input.height + profile.widthMm : input.height - profile.widthMm,
    } : null;
    if ((centerDiameter !== null && centerDiameter - profile.widthMm <= 0)
      || (centerRect && (centerRect.width - profile.widthMm <= 0 || centerRect.height - profile.widthMm <= 0))) {
      near.push({
        dash: size.dash,
        idMm: size.idIn * INCH_TO_MM,
        csMm: size.csIn * INCH_TO_MM,
        requiredStrain: -1,
        reason: `입력한 홈 바깥 형상에 권장 홈 폭 ${profile.widthMm.toFixed(2)} mm를 적용할 공간이 없습니다.`,
      });
      continue;
    }
    const evaluated = evaluateSize(size, profile, envelope, pressureMode, {
      ...options,
      grooveShape: input.shape,
      grooveRadius: input.shape === "rect" ? input.radius : undefined,
      fixedRoundDiameter: centerDiameter ?? undefined,
      fixedRectSize: centerRect ?? undefined,
    });
    if ("candidate" in evaluated) accepted.push(evaluated.candidate);
    else near.push(evaluated.near);
  }

  accepted.sort((a, b) => a.score - b.score || Number(a.dash) - Number(b.dash));
  near.sort((a, b) => Math.abs(a.requiredStrain) - Math.abs(b.requiredStrain) || Number(a.dash) - Number(b.dash));
  return { accepted, near: near.slice(0, 5) };
}

/**
 * 허용 영역과의 간섭 검사를 의도적으로 생략하고, 사용자가 지정한 홈 중심
 * 경로의 길이와 선택 단면의 압력 지지벽 보정만으로 표준 오링을 역선정한다.
 */
export function searchCandidatesForGrooveCenterline(input: GrooveCenterlineInput, medium: Medium, pressureMode: PressureMode, options: Omit<SearchOptions, "grooveShape" | "grooveRadius" | "fixedRoundDiameter" | "fixedRectSize" | "fixedPath"> = {}) {
  const accepted: Candidate[] = [];
  const near: NearCandidate[] = [];
  if (validateGrooveCenterline(input).length) return { accepted, near };

  for (const size of AS568_SIZES) {
    if (Number(size.dash) >= 900) continue;
    if (options.csMm && Math.abs(size.csIn * INCH_TO_MM - options.csMm) > 0.03) continue;
    const profile = getGlandProfile(size, medium, options.glandSection ?? "rect");
    if (!profile) continue;
    const evaluated = evaluateSize(size, profile, null, pressureMode, { ...options, fixedPath: input });
    if ("candidate" in evaluated) accepted.push(evaluated.candidate);
    else near.push(evaluated.near);
  }

  accepted.sort((a, b) => a.score - b.score || Number(a.dash) - Number(b.dash));
  near.sort((a, b) => Math.abs(a.requiredStrain) - Math.abs(b.requiredStrain) || Number(a.dash) - Number(b.dash));
  return { accepted, near: near.slice(0, 5) };
}

export function validateInput(input: ShapeInput): string[] {
  const errors: string[] = [];
  const positive = (value: number) => Number.isFinite(value) && value > 0;
  const nonNegative = (value: number) => Number.isFinite(value) && value >= 0;

  if (input.shape === "round") {
    if (!positive(input.innerDiameter) || !positive(input.outerDiameter)) errors.push("내경과 외경은 0보다 커야 합니다.");
    if (input.outerDiameter <= input.innerDiameter) errors.push("플랜지 외경은 챔버 내경보다 커야 합니다.");
  } else if (input.shape === "rect") {
    if (![input.innerWidth, input.innerHeight, input.outerWidth, input.outerHeight].every(positive)) errors.push("가로와 세로는 0보다 커야 합니다.");
    if (![input.innerRadius, input.outerRadius].every(nonNegative)) errors.push("모서리 반경은 0 이상이어야 합니다.");
    if (input.innerRadius * 2 > Math.min(input.innerWidth, input.innerHeight)) errors.push("안쪽 모서리 반경이 형상보다 큽니다.");
    if (input.outerRadius * 2 > Math.min(input.outerWidth, input.outerHeight)) errors.push("바깥쪽 모서리 반경이 형상보다 큽니다.");
    if (input.outerWidth <= input.innerWidth || input.outerHeight <= input.innerHeight) errors.push("바깥쪽 허용 경계가 안쪽 금지 경계를 포함해야 합니다.");
  } else {
    errors.push(...validateBoundary(input.innerBoundary, "안쪽 금지 경계"));
    errors.push(...validateBoundary(input.outerBoundary, "바깥쪽 허용 경계"));
    if (errors.length === 0 && !shapeContains(toBoundaryGeometry(input.outerBoundary), toBoundaryGeometry(input.innerBoundary))) {
      errors.push("바깥쪽 허용 경계가 안쪽 금지 경계를 완전히 포함해야 합니다.");
    }
  }
  if (!nonNegative(input.innerMargin) || !nonNegative(input.outerMargin)) errors.push("벽 여유는 0 이상이어야 합니다.");
  return errors;
}

export function getEnvelopeBoundaries(input: ShapeInput): { inner: BoundaryInput; outer: BoundaryInput } {
  if (input.shape === "round") {
    return {
      inner: { shape: "round", diameter: input.innerDiameter },
      outer: { shape: "round", diameter: input.outerDiameter },
    };
  }
  if (input.shape === "rect") {
    return {
      inner: { shape: "rect", width: input.innerWidth, height: input.innerHeight, radius: input.innerRadius },
      outer: { shape: "rect", width: input.outerWidth, height: input.outerHeight, radius: input.outerRadius },
    };
  }
  return { inner: input.innerBoundary, outer: input.outerBoundary };
}

export function validateGroovePosition(input: GroovePositionInput): string[] {
  if (input.shape === "round") {
    return Number.isFinite(input.diameter) && input.diameter > 0
      ? []
      : [`사용자 지정 홈 ${input.edge === "inner" ? "내경" : "외경"}은 0보다 커야 합니다.`];
  }
  const errors: string[] = [];
  if (![input.width, input.height].every((value) => Number.isFinite(value) && value > 0)) errors.push("사용자 지정 홈 가로와 세로는 0보다 커야 합니다.");
  if (!Number.isFinite(input.radius) || input.radius <= 0) errors.push("사용자 지정 홈 중심선 R은 0보다 커야 합니다.");
  return errors;
}

export function validateGrooveCenterline(input: GrooveCenterlineInput): string[] {
  if (input.shape === "round") {
    return Number.isFinite(input.diameter) && input.diameter > 0
      ? []
      : ["사용자 지정 홈 중심경은 0보다 커야 합니다."];
  }
  const errors: string[] = [];
  if (![input.width, input.height].every((value) => Number.isFinite(value) && value > 0)) errors.push("사용자 지정 홈 중심선 가로와 세로는 0보다 커야 합니다.");
  if (!Number.isFinite(input.radius) || input.radius <= 0) errors.push("사용자 지정 홈 중심선 R은 0보다 커야 합니다.");
  if (Number.isFinite(input.radius) && Number.isFinite(input.width) && Number.isFinite(input.height) && input.radius * 2 > Math.min(input.width, input.height)) {
    errors.push("사용자 지정 홈 중심선 R이 가로·세로 치수보다 큽니다.");
  }
  return errors;
}

export function getCornerRadiusGuidance(csMm: number | null, medium: Medium, section: GlandSection): CornerRadiusGuidance | null {
  if (csMm === null || !Number.isFinite(csMm) || csMm <= 0) return null;
  const size = AS568_SIZES.find((item) => Math.abs(item.csIn * INCH_TO_MM - csMm) < 0.03);
  if (!size) return null;
  const profile = getGlandProfile(size, medium, section);
  if (!profile) return null;
  const minimumInnerRadiusMm = 3 * profile.csMm;
  const idealInnerRadiusMm = 6 * profile.csMm;
  return {
    csMm: profile.csMm,
    footprintWidthMm: profile.widthMm,
    minimumInnerRadiusMm,
    idealInnerRadiusMm,
    minimumCenterlineRadiusMm: minimumInnerRadiusMm + profile.widthMm / 2,
    idealCenterlineRadiusMm: idealInnerRadiusMm + profile.widthMm / 2,
  };
}

function evaluateSize(size: As568Size, profile: GlandProfile, input: ShapeInput | null, pressureMode: PressureMode, options: SearchOptions): { candidate: Candidate } | { near: NearCandidate } {
  const idMm = size.idIn * INCH_TO_MM;
  const idToleranceMm = size.idToleranceIn * INCH_TO_MM;
  const csMm = size.csIn * INCH_TO_MM;
  const csToleranceMm = size.csToleranceIn * INCH_TO_MM;
  const freeLengthMm = Math.PI * (idMm + csMm);
  const supportWall: Candidate["supportWall"] = pressureMode === "internal_pressure" ? "GROOVE OD" : "GROOVE ID";
  const pressureAnchored = profile.section === "rect";
  const geometry = solvePath(input, profile.widthMm, csMm, freeLengthMm, supportWall, pressureAnchored, options);

  if (!geometry.valid || !geometry.path) {
    return { near: { dash: size.dash, idMm, csMm, requiredStrain: geometry.requiredStrain, reason: geometry.reason } };
  }

  const lengthCheck = verifyLengthFit({
    idMm,
    idToleranceMm,
    csMm,
    csToleranceMm,
    profile,
    path: geometry.path,
    supportWall,
  });
  const { strain, worstStretch, worstCompression } = lengthCheck;
  if (!lengthCheck.withinLimits) {
    const reason = worstStretch > MAX_STRETCH
      ? `공차 최악조건 신장률 ${(worstStretch * 100).toFixed(1)}%가 5%를 초과합니다.`
      : `공차 최악조건 둘레 압축률 ${Math.abs(worstCompression * 100).toFixed(1)}%가 3%를 초과합니다.`;
    return { near: { dash: size.dash, idMm, csMm, requiredStrain: strain, reason } };
  }

  const warnings: string[] = [];
  if (profile.section === "dovetail") warnings.push("도브테일은 유지가 꼭 필요한 경우에만 사용하고 온도·팽윤·공차를 별도 검토해야 합니다.");
  if (profile.section === "half_dovetail_inner") warnings.push("하프 도브 내측형: 경사 유지벽이 챔버 중심 쪽입니다. 압력 지지벽 방향을 가공 전 확인해야 합니다.");
  if (profile.section === "half_dovetail_outer") warnings.push("하프 도브 외측형: 경사 유지벽이 플랜지 바깥쪽입니다. 압력 지지벽 방향을 가공 전 확인해야 합니다.");
  const ratio = geometry.innerCornerRatio;
  if (ratio !== null && ratio < 3) warnings.push(`비표준 조건: 홈 안쪽 R이 CS의 ${ratio.toFixed(1)}배로 표준 최소 기준 3배보다 작습니다. 길이 후보로만 사용하고 코너 응력·주름·누설을 별도 검토해야 합니다.`);
  else if (ratio !== null && ratio < 6) warnings.push(`홈 안쪽 R이 CS의 ${ratio.toFixed(1)}배로 이상적 기준 6배보다 작습니다.`);
  if (Math.abs(strain) > 0.03) warnings.push("설치 변형률이 권장 범위 상단에 가깝습니다.");
  if (worstStretch > 0.04 || worstCompression < -0.02) warnings.push("치수 공차에 따른 변형률 편차가 큽니다.");

  let state: Candidate["state"] = "no_strain";
  let label = "무변형";
  if (strain > 0.0015) { state = "stretch"; label = `신장 ${(strain * 100).toFixed(2)}%`; }
  if (strain < -0.0015) { state = "compression"; label = `둘레 압축 ${Math.abs(strain * 100).toFixed(2)}%`; }
  if (warnings.length) state = "conditional";

  const candidate: Candidate = {
    dash: size.dash,
    aliases: getLegacyAliases(Number(size.dash)),
    idMm,
    idToleranceMm,
    csMm,
    csToleranceMm,
    odMm: idMm + 2 * csMm,
    freeLengthMm: lengthCheck.freeLengthMm,
    pathLengthMm: lengthCheck.installedPathLengthMm,
    groovePathLengthMm: lengthCheck.groovePathLengthMm,
    lengthCheck,
    strain,
    worstCompression,
    worstStretch,
    state,
    label,
    profile,
    path: geometry.path,
    innerCornerRatio: ratio,
    supportWall,
    warnings,
    score: Math.abs(strain) * 100 + (ratio !== null && ratio < 6 ? 0.35 : 0) + warnings.length * 0.08,
  };
  return { candidate };
}

/**
 * 선택한 오링의 ID와 CS에서 자유 상태 중심선 길이를 다시 계산하고,
 * 최종 생성된 홈 형상의 실제 둘레와 독립적으로 비교한다.
 */
export function verifyLengthFit(input: {
  idMm: number;
  idToleranceMm: number;
  csMm: number;
  csToleranceMm: number;
  profile: GlandProfile;
  path: PathGeometry;
  supportWall: Candidate["supportWall"];
}): LengthFitCheck {
  const freeCenterlineDiameterMm = input.idMm + input.csMm;
  const freeLengthMm = Math.PI * freeCenterlineDiameterMm;
  const freeMin = Math.PI * (input.idMm - input.idToleranceMm + input.csMm - input.csToleranceMm);
  const freeMax = Math.PI * (input.idMm + input.idToleranceMm + input.csMm + input.csToleranceMm);
  const groovePathLengthMm = pathPerimeter(input.path);

  // 직사각 면 씰 홈에서는 압력으로 오링이 지지벽에 붙은 위치의 중심선으로 검사한다.
  // 도브테일 계열은 홈 평균경/중심 경로 기준을 유지한다.
  const supportOffset = input.profile.section === "rect"
    ? Math.PI * (input.profile.widthMm - input.csMm)
    : 0;
  const installedPathLengthMm = input.supportWall === "GROOVE OD"
    ? groovePathLengthMm + supportOffset
    : groovePathLengthMm - supportOffset;
  const strain = installedPathLengthMm / freeLengthMm - 1;
  const worstStretch = installedPathLengthMm / freeMin - 1;
  const worstCompression = installedPathLengthMm / freeMax - 1;

  return {
    freeCenterlineDiameterMm,
    freeLengthMm,
    groovePathLengthMm,
    installedPathLengthMm,
    differenceMm: installedPathLengthMm - freeLengthMm,
    strain,
    worstCompression,
    worstStretch,
    withinLimits: worstStretch <= MAX_STRETCH && worstCompression >= -MAX_CIRCUMFERENTIAL_COMPRESSION,
  };
}

function solvePath(input: ShapeInput | null, grooveWidth: number, csMm: number, freeLength: number, supportWall: Candidate["supportWall"], pressureAnchored: boolean, options: SearchOptions) {
  const supportOffset = pressureAnchored ? Math.PI * (grooveWidth - csMm) : 0;
  const targetGrooveLength = supportWall === "GROOVE OD" ? freeLength - supportOffset : freeLength + supportOffset;
  const geometry = options.fixedPath
    ? solveFixedPath(options.fixedPath, grooveWidth, csMm)
    : input
      ? (options.grooveShape ?? (input.shape === "mixed" ? input.innerBoundary.shape : input.shape)) === "round"
        ? options.fixedRoundDiameter === undefined
          ? solveRoundGroove(input, grooveWidth, targetGrooveLength)
          : solveFixedRoundGroove(input, grooveWidth, options.fixedRoundDiameter)
        : options.fixedRectSize === undefined
          ? solveRectGroove(input, grooveWidth, csMm, targetGrooveLength, options.grooveRadius)
          : solveFixedRectGroove(input, grooveWidth, csMm, options.fixedRectSize, options.grooveRadius)
      : invalid(0, "허용 영역 계산에 필요한 형상 입력이 없습니다.");
  if (!geometry.valid) return geometry;
  const pathLength = supportWall === "GROOVE OD"
    ? geometry.groovePathLength + supportOffset
    : geometry.groovePathLength - supportOffset;
  return { ...geometry, pathLength, requiredStrain: pathLength / freeLength - 1 };
}

function solveFixedPath(path: PathGeometry, grooveWidth: number, csMm: number) {
  if (path.shape === "round") {
    if (path.diameter <= grooveWidth) return invalid(-1, `홈 중심경은 선택 단면의 홈 폭 ${grooveWidth.toFixed(2)} mm보다 커야 합니다.`);
    const groovePathLength = Math.PI * path.diameter;
    return { valid: true as const, path, pathLength: groovePathLength, groovePathLength, requiredStrain: 0, innerCornerRatio: null };
  }

  if (path.width <= grooveWidth || path.height <= grooveWidth) return invalid(-1, `홈 중심선 가로·세로는 선택 단면의 홈 폭 ${grooveWidth.toFixed(2)} mm보다 커야 합니다.`);
  if (path.radius <= 0 || path.radius * 2 > Math.min(path.width, path.height)) return invalid(-1, "홈 중심선 R이 가로·세로 형상 범위를 벗어납니다.");
  const innerCornerRadius = path.radius - grooveWidth / 2;
  if (innerCornerRadius < 0) return invalid(-1, `홈 중심선 R은 선택 단면 홈 폭의 절반인 ${(grooveWidth / 2).toFixed(2)} mm 이상이어야 실제 안쪽 모서리를 만들 수 있습니다.`);
  const groovePathLength = roundedRectPerimeter(path.width, path.height, path.radius);
  return { valid: true as const, path, pathLength: groovePathLength, groovePathLength, requiredStrain: 0, innerCornerRatio: innerCornerRadius / csMm };
}

function solveRoundGroove(input: ShapeInput, grooveWidth: number, targetGrooveLength: number) {
  const innerSafe = expandedInnerBoundary(input);
  const outerSafe = insetOuterBoundary(input);
  if (!innerSafe || !outerSafe) return invalid(0, "벽 여유를 적용한 뒤 유효한 허용 영역이 남지 않습니다.");

  const minDiameter = 2 * (farthestRadius(innerSafe) + grooveWidth / 2);
  const maxDiameter = 2 * (inscribedCircleRadius(outerSafe) - grooveWidth / 2);
  if (minDiameter > maxDiameter || maxDiameter <= 0) return invalid(0, "원형 글랜드가 안쪽 경계를 감싸면서 바깥 경계 안에 들어갈 공간이 없습니다.");

  const diameter = clamp(targetGrooveLength / Math.PI, minDiameter, maxDiameter);
  const groovePathLength = Math.PI * diameter;
  return { valid: true as const, path: { shape: "round" as const, diameter }, pathLength: groovePathLength, groovePathLength, requiredStrain: 0, innerCornerRatio: null };
}

function solveFixedRoundGroove(input: ShapeInput, grooveWidth: number, diameter: number) {
  const innerSafe = expandedInnerBoundary(input);
  const outerSafe = insetOuterBoundary(input);
  if (!innerSafe || !outerSafe) return invalid(0, "벽 여유를 적용한 뒤 유효한 허용 영역이 남지 않습니다.");

  const minDiameter = 2 * (farthestRadius(innerSafe) + grooveWidth / 2);
  const maxDiameter = 2 * (inscribedCircleRadius(outerSafe) - grooveWidth / 2);
  if (minDiameter > maxDiameter || maxDiameter <= 0) return invalid(0, "원형 글랜드가 안쪽 경계를 감싸면서 바깥 경계 안에 들어갈 공간이 없습니다.");
  if (diameter < minDiameter - 1e-9) {
    return invalid(0, `지정한 홈 위치가 안쪽 금지 경계와 간섭합니다. 이 단면의 홈 중심경은 최소 ${minDiameter.toFixed(2)} mm여야 합니다.`);
  }
  if (diameter > maxDiameter + 1e-9) {
    return invalid(0, `지정한 홈 위치가 바깥쪽 허용 경계를 벗어납니다. 이 단면의 홈 중심경은 최대 ${maxDiameter.toFixed(2)} mm여야 합니다.`);
  }

  const groovePathLength = Math.PI * diameter;
  return { valid: true as const, path: { shape: "round" as const, diameter }, pathLength: groovePathLength, groovePathLength, requiredStrain: 0, innerCornerRatio: null };
}

function solveFixedRectGroove(input: ShapeInput, grooveWidth: number, csMm: number, size: { width: number; height: number }, requestedRadius?: number) {
  const innerSafe = expandedInnerBoundary(input);
  const outerSafe = insetOuterBoundary(input);
  if (!innerSafe || !outerSafe) return invalid(0, "벽 여유를 적용한 뒤 유효한 허용 영역이 남지 않습니다.");

  const radius = requestedRadius ?? automaticGrooveRadius(input, grooveWidth, csMm);
  const innerCornerRadius = radius - grooveWidth / 2;
  if (!Number.isFinite(radius) || radius <= 0) return invalid(0, "둥근 사각형 글랜드의 중심선 R은 0보다 커야 합니다.");
  if (innerCornerRadius < 0) return invalid(0, `홈 중심선 R은 선택 단면 홈 폭의 절반인 ${(grooveWidth / 2).toFixed(2)} mm 이상이어야 합니다.`);
  if (size.width <= 0 || size.height <= 0 || radius * 2 > Math.min(size.width, size.height)) {
    return invalid(0, "지정한 홈 가로·세로에 비해 중심선 R이 너무 큽니다.");
  }

  const path: Extract<PathGeometry, { shape: "rect" }> = { shape: "rect", width: size.width, height: size.height, radius };
  if (!grooveInnerContains(path, grooveWidth, innerSafe)) {
    return invalid(0, "지정한 둥근 사각형 홈의 안쪽 형상이 금지 경계 또는 안쪽 벽 여유와 간섭합니다.");
  }
  if (!grooveOuterInside(path, grooveWidth, outerSafe)) {
    return invalid(0, "지정한 둥근 사각형 홈의 바깥 형상이 허용 경계 또는 바깥쪽 벽 여유를 벗어납니다.");
  }

  const groovePathLength = roundedRectPerimeter(path.width, path.height, path.radius);
  return { valid: true as const, path, pathLength: groovePathLength, groovePathLength, requiredStrain: 0, innerCornerRatio: innerCornerRadius / csMm };
}

function solveRectGroove(input: ShapeInput, grooveWidth: number, csMm: number, targetGrooveLength: number, requestedRadius?: number) {
  const innerSafe = expandedInnerBoundary(input);
  const outerSafe = insetOuterBoundary(input);
  if (!innerSafe || !outerSafe) return invalid(0, "벽 여유를 적용한 뒤 유효한 허용 영역이 남지 않습니다.");

  const radius = requestedRadius ?? automaticGrooveRadius(input, grooveWidth, csMm);
  const innerCornerRadius = radius - grooveWidth / 2;
  if (!Number.isFinite(radius) || radius <= 0) return invalid(0, "둥근 사각형 글랜드의 중심선 R은 0보다 커야 합니다.");
  if (innerCornerRadius < 0) return invalid(0, `홈 중심선 R은 선택 단면 홈 폭의 절반인 ${(grooveWidth / 2).toFixed(2)} mm 이상이어야 합니다.`);

  const rawStart = innerSafe.shape === "round"
    ? { width: innerSafe.radius * 2 + grooveWidth, height: innerSafe.radius * 2 + grooveWidth }
    : { width: innerSafe.width + grooveWidth, height: innerSafe.height + grooveWidth };
  const start = { width: Math.max(rawStart.width, 2 * radius), height: Math.max(rawStart.height, 2 * radius) };
  const end = outerSafe.shape === "round"
    ? { width: outerSafe.radius * 2 - grooveWidth, height: outerSafe.radius * 2 - grooveWidth }
    : { width: outerSafe.width - grooveWidth, height: outerSafe.height - grooveWidth };

  if (start.width > end.width || start.height > end.height || end.width <= 0 || end.height <= 0) {
    return invalid(0, "둥근 사각형 글랜드의 폭과 벽 여유를 확보할 공간이 없습니다.");
  }
  if (radius * 2 > Math.min(end.width, end.height)) return invalid(0, "입력한 홈 중심선 R이 사용 가능한 가로·세로보다 큽니다.");

  const makePath = (t: number) => ({
    shape: "rect" as const,
    width: lerp(start.width, end.width, t),
    height: lerp(start.height, end.height, t),
    radius,
  });
  const innerFits = (t: number) => grooveInnerContains(makePath(t), grooveWidth, innerSafe);
  const outerFits = (t: number) => grooveOuterInside(makePath(t), grooveWidth, outerSafe);

  if (!innerFits(1)) return invalid(0, "입력한 홈 R로는 안쪽 금지 경계를 피할 수 없습니다.");
  if (!outerFits(0)) return invalid(0, "입력한 홈 R의 바깥 모서리가 허용 경계를 벗어납니다.");

  const tMin = findFirstTrue(innerFits);
  const tMax = findLastTrue(outerFits);
  if (tMin > tMax + 1e-7) return invalid(0, "안쪽·바깥쪽 경계와 벽 여유를 동시에 만족하는 둥근 사각형 글랜드가 없습니다.");

  const p0 = roundedRectPerimeter(makePath(tMin).width, makePath(tMin).height, radius);
  const p1 = roundedRectPerimeter(makePath(tMax).width, makePath(tMax).height, radius);
  const target = clamp(targetGrooveLength, Math.min(p0, p1), Math.max(p0, p1));
  const t = Math.abs(p1 - p0) < 1e-9 ? (tMin + tMax) / 2 : clamp(tMin + (target - p0) * (tMax - tMin) / (p1 - p0), tMin, tMax);
  const path = makePath(t);
  const groovePathLength = roundedRectPerimeter(path.width, path.height, path.radius);
  return { valid: true as const, path, pathLength: groovePathLength, groovePathLength, requiredStrain: 0, innerCornerRatio: innerCornerRadius / csMm };
}

type BoundaryGeometry =
  | { shape: "round"; radius: number }
  | { shape: "rect"; width: number; height: number; radius: number };

function validateBoundary(input: BoundaryInput, label: string): string[] {
  if (input.shape === "round") {
    return Number.isFinite(input.diameter) && input.diameter > 0 ? [] : [`${label}의 직경은 0보다 커야 합니다.`];
  }
  const errors: string[] = [];
  if (![input.width, input.height].every((value) => Number.isFinite(value) && value > 0)) errors.push(`${label}의 가로와 세로는 0보다 커야 합니다.`);
  if (!Number.isFinite(input.radius) || input.radius < 0) errors.push(`${label}의 모서리 R은 0 이상이어야 합니다.`);
  if (Number.isFinite(input.radius) && Number.isFinite(input.width) && Number.isFinite(input.height) && input.radius * 2 > Math.min(input.width, input.height)) {
    errors.push(`${label}의 모서리 R이 형상보다 큽니다.`);
  }
  return errors;
}

function toBoundaryGeometry(input: BoundaryInput): BoundaryGeometry {
  return input.shape === "round"
    ? { shape: "round", radius: input.diameter / 2 }
    : { shape: "rect", width: input.width, height: input.height, radius: input.radius };
}

function rawInnerBoundary(input: ShapeInput): BoundaryGeometry {
  return toBoundaryGeometry(getEnvelopeBoundaries(input).inner);
}

function rawOuterBoundary(input: ShapeInput): BoundaryGeometry {
  return toBoundaryGeometry(getEnvelopeBoundaries(input).outer);
}

function expandedInnerBoundary(input: ShapeInput): BoundaryGeometry {
  const boundary = rawInnerBoundary(input);
  if (boundary.shape === "round") return { shape: "round", radius: boundary.radius + input.innerMargin };
  return { shape: "rect", width: boundary.width + 2 * input.innerMargin, height: boundary.height + 2 * input.innerMargin, radius: boundary.radius + input.innerMargin };
}

function insetOuterBoundary(input: ShapeInput): BoundaryGeometry | null {
  const boundary = rawOuterBoundary(input);
  if (boundary.shape === "round") {
    const radius = boundary.radius - input.outerMargin;
    return radius > 0 ? { shape: "round", radius } : null;
  }
  const width = boundary.width - 2 * input.outerMargin;
  const height = boundary.height - 2 * input.outerMargin;
  if (width <= 0 || height <= 0) return null;
  return {
    shape: "rect",
    width,
    height,
    radius: clamp(boundary.radius - input.outerMargin, 0, Math.min(width, height) / 2),
  };
}

function farthestRadius(shape: BoundaryGeometry) {
  if (shape.shape === "round") return shape.radius;
  const cornerX = shape.width / 2 - shape.radius;
  const cornerY = shape.height / 2 - shape.radius;
  return Math.hypot(cornerX, cornerY) + shape.radius;
}

function inscribedCircleRadius(shape: BoundaryGeometry) {
  return shape.shape === "round" ? shape.radius : Math.min(shape.width, shape.height) / 2;
}

function grooveInnerContains(path: Extract<PathGeometry, { shape: "rect" }>, grooveWidth: number, innerSafe: BoundaryGeometry) {
  const width = path.width - grooveWidth;
  const height = path.height - grooveWidth;
  const radius = path.radius - grooveWidth / 2;
  if (width <= 0 || height <= 0 || radius < 0 || radius * 2 > Math.min(width, height)) return false;
  return shapeContains({ shape: "rect", width, height, radius }, innerSafe);
}

function grooveOuterInside(path: Extract<PathGeometry, { shape: "rect" }>, grooveWidth: number, outerSafe: BoundaryGeometry) {
  const outerEdge: BoundaryGeometry = {
    shape: "rect",
    width: path.width + grooveWidth,
    height: path.height + grooveWidth,
    radius: path.radius + grooveWidth / 2,
  };
  return shapeContains(outerSafe, outerEdge);
}

function shapeContains(container: BoundaryGeometry, contained: BoundaryGeometry) {
  return boundaryPoints(contained).every(([x, y]) => pointInside(container, x, y));
}

function pointInside(shape: BoundaryGeometry, x: number, y: number) {
  if (shape.shape === "round") return Math.hypot(x, y) <= shape.radius + 1e-7;
  const radius = clamp(shape.radius, 0, Math.min(shape.width, shape.height) / 2);
  const qx = Math.abs(x) - (shape.width / 2 - radius);
  const qy = Math.abs(y) - (shape.height / 2 - radius);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
  return outside <= 1e-7;
}

function boundaryPoints(shape: BoundaryGeometry): Array<[number, number]> {
  if (shape.shape === "round") {
    return Array.from({ length: 128 }, (_, index) => {
      const angle = index * Math.PI * 2 / 128;
      return [Math.cos(angle) * shape.radius, Math.sin(angle) * shape.radius] as [number, number];
    });
  }
  const points: Array<[number, number]> = [];
  const halfWidth = shape.width / 2;
  const halfHeight = shape.height / 2;
  const radius = clamp(shape.radius, 0, Math.min(shape.width, shape.height) / 2);
  if (radius < 1e-9) return [[-halfWidth, -halfHeight], [halfWidth, -halfHeight], [halfWidth, halfHeight], [-halfWidth, halfHeight]];
  const centers: Array<[number, number, number]> = [
    [halfWidth - radius, halfHeight - radius, 0],
    [-halfWidth + radius, halfHeight - radius, Math.PI / 2],
    [-halfWidth + radius, -halfHeight + radius, Math.PI],
    [halfWidth - radius, -halfHeight + radius, Math.PI * 1.5],
  ];
  for (const [cx, cy, start] of centers) {
    for (let index = 0; index <= 32; index++) {
      const angle = start + index * Math.PI / 2 / 32;
      points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
    }
  }
  return points;
}

function findFirstTrue(predicate: (value: number) => boolean) {
  if (predicate(0)) return 0;
  let low = 0;
  let high = 1;
  for (let index = 0; index < 45; index++) {
    const middle = (low + high) / 2;
    if (predicate(middle)) high = middle;
    else low = middle;
  }
  return high;
}

function findLastTrue(predicate: (value: number) => boolean) {
  if (predicate(1)) return 1;
  let low = 0;
  let high = 1;
  for (let index = 0; index < 45; index++) {
    const middle = (low + high) / 2;
    if (predicate(middle)) low = middle;
    else high = middle;
  }
  return low;
}

function automaticGrooveRadius(input: ShapeInput, grooveWidth: number, csMm: number) {
  const minimum = 3 * csMm + grooveWidth / 2;
  const inner = rawInnerBoundary(input);
  const outer = rawOuterBoundary(input);
  if (inner.shape === "round") return Math.max(minimum, inner.radius * 0.36);
  return Math.max(minimum, outer.shape === "rect" ? (inner.radius + outer.radius) / 2 : inner.radius);
}

function getGlandProfile(size: As568Size, medium: Medium, section: GlandSection): GlandProfile | null {
  const key = size.csIn.toFixed(3);
  const csMm = size.csIn * INCH_TO_MM;
  if (section !== "rect") {
    const source = section === "dovetail" ? DOVETAIL_PROFILES[key] : HALF_DOVETAIL_PROFILES[key];
    if (!source) return null;
    const angleDeg = 66;
    const sideCount = section === "dovetail" ? 2 : 1;
    const tangent = Math.tan(angleDeg * Math.PI / 180);
    const bottomWidthIn: [number, number] = [
      source.mouthWidth[0] + sideCount * source.depth[0] / tangent,
      source.mouthWidth[1] + sideCount * source.depth[1] / tangent,
    ];
    const depthMm = average(source.depth) * INCH_TO_MM;
    return {
      section,
      csMm,
      widthMm: average(bottomWidthIn) * INCH_TO_MM,
      widthMinMm: bottomWidthIn[0] * INCH_TO_MM,
      widthMaxMm: bottomWidthIn[1] * INCH_TO_MM,
      depthMm,
      depthMinMm: source.depth[0] * INCH_TO_MM,
      depthMaxMm: source.depth[1] * INCH_TO_MM,
      radiusMinMm: source.radius * INCH_TO_MM,
      radiusMaxMm: source.radius * INCH_TO_MM,
      squeezePercent: source.squeeze,
      mouthWidthMm: average(source.mouthWidth) * INCH_TO_MM,
      bottomWidthMm: average(bottomWidthIn) * INCH_TO_MM,
      angleDeg,
      cornerRadiusMm: source.radius * INCH_TO_MM,
      bottomRadiusMm: source.bottomRadius * INCH_TO_MM,
    };
  }
  const source = FACE_SEAL_PROFILES[key];
  if (!source) return null;
  const widthIn = medium === "liquid" ? source.liquidWidth : source.gasWidth;
  const depthIn = source.depth;
  const depthMm = average(depthIn) * INCH_TO_MM;
  const widthMm = average(widthIn) * INCH_TO_MM;
  return {
    section,
    csMm,
    widthMm,
    widthMinMm: widthIn[0] * INCH_TO_MM,
    widthMaxMm: widthIn[1] * INCH_TO_MM,
    depthMm,
    depthMinMm: depthIn[0] * INCH_TO_MM,
    depthMaxMm: depthIn[1] * INCH_TO_MM,
    radiusMinMm: source.radius[0] * INCH_TO_MM,
    radiusMaxMm: source.radius[1] * INCH_TO_MM,
    squeezePercent: (1 - depthMm / csMm) * 100,
    mouthWidthMm: widthMm,
    bottomWidthMm: widthMm,
    angleDeg: null,
    cornerRadiusMm: average(source.radius) * INCH_TO_MM,
    bottomRadiusMm: average(source.radius) * INCH_TO_MM,
  };
}

function getLegacyAliases(dash: number) {
  const aliases: string[] = [];
  if (dash >= 6 && dash <= 12) aliases.push(`AN6227B-${dash - 5}`);
  if (dash >= 110 && dash <= 116) aliases.push(`AN6227B-${dash - 102}`);
  if (dash >= 210 && dash <= 222) aliases.push(`AN6227B-${dash - 195}`);
  if (dash >= 325 && dash <= 349) aliases.push(`AN6227B-${dash - 297}`);
  if (dash >= 426 && dash <= 461) aliases.push(`AN6227B-${dash - 373}`);
  if (dash >= 223 && dash <= 274) aliases.push(`AN6230B-${dash - 222}`);
  return aliases;
}

function roundedRectPerimeter(width: number, height: number, radius: number) {
  return 2 * (width + height - 4 * radius) + 2 * Math.PI * radius;
}

function pathPerimeter(path: PathGeometry) {
  return path.shape === "round"
    ? Math.PI * path.diameter
    : roundedRectPerimeter(path.width, path.height, path.radius);
}

function invalid(requiredStrain: number, reason: string) {
  return { valid: false as const, path: null, pathLength: 0, groovePathLength: 0, requiredStrain, innerCornerRatio: null, reason };
}

function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function average(values: [number, number]) { return (values[0] + values[1]) / 2; }
