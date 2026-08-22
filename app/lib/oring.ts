import { AS568_SIZES, type As568Size } from "../data/as568.generated";

const INCH_TO_MM = 25.4;
const MAX_STRETCH = 0.05;
const MAX_CIRCUMFERENTIAL_COMPRESSION = 0.03;

export type PressureMode = "internal_pressure" | "internal_vacuum" | "external_pressure";
export type Medium = "liquid" | "gas" | "vacuum";

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

export type ShapeInput = RoundInput | RectInput;

export type GlandProfile = {
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
};

export type PathGeometry =
  | { shape: "round"; diameter: number }
  | { shape: "rect"; width: number; height: number; radius: number };

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

const FACE_SEAL_PROFILES: Record<string, InchProfile> = {
  "0.070": { depth: [0.050, 0.054], liquidWidth: [0.101, 0.107], gasWidth: [0.084, 0.089], radius: [0.005, 0.015] },
  "0.103": { depth: [0.074, 0.080], liquidWidth: [0.136, 0.142], gasWidth: [0.120, 0.125], radius: [0.005, 0.015] },
  "0.139": { depth: [0.101, 0.107], liquidWidth: [0.177, 0.187], gasWidth: [0.158, 0.164], radius: [0.010, 0.025] },
  "0.210": { depth: [0.152, 0.162], liquidWidth: [0.270, 0.290], gasWidth: [0.239, 0.244], radius: [0.020, 0.035] },
  "0.275": { depth: [0.201, 0.211], liquidWidth: [0.342, 0.362], gasWidth: [0.309, 0.314], radius: [0.020, 0.035] },
};

export function searchCandidates(input: ShapeInput, medium: Medium, pressureMode: PressureMode) {
  const accepted: Candidate[] = [];
  const near: NearCandidate[] = [];

  for (const size of AS568_SIZES) {
    if (Number(size.dash) >= 900) continue;
    const profile = getGlandProfile(size, medium);
    if (!profile) continue;
    const evaluated = evaluateSize(size, profile, input, pressureMode);
    if ("candidate" in evaluated) accepted.push(evaluated.candidate);
    else near.push(evaluated.near);
  }

  accepted.sort((a, b) => a.score - b.score || Number(a.dash) - Number(b.dash));
  near.sort((a, b) => Math.abs(a.requiredStrain) - Math.abs(b.requiredStrain));
  return { accepted, near: near.slice(0, 5) };
}

export function validateInput(input: ShapeInput): string[] {
  const errors: string[] = [];
  const positive = (value: number) => Number.isFinite(value) && value > 0;
  const nonNegative = (value: number) => Number.isFinite(value) && value >= 0;

  if (input.shape === "round") {
    if (!positive(input.innerDiameter) || !positive(input.outerDiameter)) errors.push("내경과 외경은 0보다 커야 합니다.");
    if (input.outerDiameter <= input.innerDiameter) errors.push("플랜지 외경은 챔버 내경보다 커야 합니다.");
  } else {
    if (![input.innerWidth, input.innerHeight, input.outerWidth, input.outerHeight].every(positive)) errors.push("가로와 세로는 0보다 커야 합니다.");
    if (![input.innerRadius, input.outerRadius].every(nonNegative)) errors.push("모서리 반경은 0 이상이어야 합니다.");
    if (input.innerRadius * 2 > Math.min(input.innerWidth, input.innerHeight)) errors.push("안쪽 모서리 반경이 형상보다 큽니다.");
    if (input.outerRadius * 2 > Math.min(input.outerWidth, input.outerHeight)) errors.push("바깥쪽 모서리 반경이 형상보다 큽니다.");
    if (input.outerWidth <= input.innerWidth || input.outerHeight <= input.innerHeight) errors.push("바깥쪽 허용 경계가 안쪽 금지 경계를 포함해야 합니다.");
  }
  if (!nonNegative(input.innerMargin) || !nonNegative(input.outerMargin)) errors.push("벽 여유는 0 이상이어야 합니다.");
  return errors;
}

function evaluateSize(size: As568Size, profile: GlandProfile, input: ShapeInput, pressureMode: PressureMode): { candidate: Candidate } | { near: NearCandidate } {
  const idMm = size.idIn * INCH_TO_MM;
  const idToleranceMm = size.idToleranceIn * INCH_TO_MM;
  const csMm = size.csIn * INCH_TO_MM;
  const csToleranceMm = size.csToleranceIn * INCH_TO_MM;
  const freeLengthMm = Math.PI * (idMm + csMm);
  const freeMin = Math.PI * (idMm - idToleranceMm + csMm - csToleranceMm);
  const freeMax = Math.PI * (idMm + idToleranceMm + csMm + csToleranceMm);
  const geometry = solvePath(input, profile.widthMm, csMm, freeLengthMm);

  if (!geometry.valid || !geometry.path) {
    return { near: { dash: size.dash, idMm, csMm, requiredStrain: geometry.requiredStrain, reason: geometry.reason } };
  }

  const strain = geometry.pathLength / freeLengthMm - 1;
  const worstStretch = geometry.pathLength / freeMin - 1;
  const worstCompression = geometry.pathLength / freeMax - 1;
  if (worstStretch > MAX_STRETCH || worstCompression < -MAX_CIRCUMFERENTIAL_COMPRESSION) {
    const reason = worstStretch > MAX_STRETCH
      ? `공차 최악조건 신장률 ${(worstStretch * 100).toFixed(1)}%가 5%를 초과합니다.`
      : `공차 최악조건 둘레 압축률 ${Math.abs(worstCompression * 100).toFixed(1)}%가 3%를 초과합니다.`;
    return { near: { dash: size.dash, idMm, csMm, requiredStrain: strain, reason } };
  }

  const warnings: string[] = [];
  const ratio = geometry.innerCornerRatio;
  if (ratio !== null && ratio < 6) warnings.push(`안쪽 R이 CS의 ${ratio.toFixed(1)}배로 이상적 기준 6배보다 작습니다.`);
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
    freeLengthMm,
    pathLengthMm: geometry.pathLength,
    strain,
    worstCompression,
    worstStretch,
    state,
    label,
    profile,
    path: geometry.path,
    innerCornerRatio: ratio,
    supportWall: pressureMode === "internal_pressure" ? "GROOVE OD" : "GROOVE ID",
    warnings,
    score: Math.abs(strain) * 100 + (ratio !== null && ratio < 6 ? 0.35 : 0) + warnings.length * 0.08,
  };
  return { candidate };
}

function solvePath(input: ShapeInput, grooveWidth: number, csMm: number, freeLength: number) {
  if (input.shape === "round") {
    const minDiameter = input.innerDiameter + 2 * input.innerMargin + grooveWidth;
    const maxDiameter = input.outerDiameter - 2 * input.outerMargin - grooveWidth;
    const freeDiameter = freeLength / Math.PI;
    if (minDiameter > maxDiameter) return invalid(0, "글랜드 폭과 벽 여유를 확보할 공간이 없습니다.");
    const diameter = clamp(freeDiameter, minDiameter, maxDiameter);
    const pathLength = Math.PI * diameter;
    const requiredStrain = pathLength / freeLength - 1;
    if (requiredStrain > MAX_STRETCH || requiredStrain < -MAX_CIRCUMFERENTIAL_COMPRESSION) return invalid(requiredStrain, requiredStrain > 0 ? "허용 영역에 넣으려면 과도한 신장이 필요합니다." : "허용 영역에 넣으려면 과도한 둘레 압축이 필요합니다.");
    return { valid: true as const, path: { shape: "round" as const, diameter }, pathLength, requiredStrain, innerCornerRatio: null };
  }

  const minWidth = input.innerWidth + 2 * input.innerMargin + grooveWidth;
  const minHeight = input.innerHeight + 2 * input.innerMargin + grooveWidth;
  const maxWidth = input.outerWidth - 2 * input.outerMargin - grooveWidth;
  const maxHeight = input.outerHeight - 2 * input.outerMargin - grooveWidth;
  const minRadius = Math.max(input.innerRadius + input.innerMargin + grooveWidth / 2, 3 * csMm + grooveWidth / 2);
  const maxRadius = input.outerRadius - input.outerMargin - grooveWidth / 2;

  if (minWidth > maxWidth || minHeight > maxHeight) return invalid(0, "글랜드 폭과 벽 여유를 확보할 사각형 띠 공간이 없습니다.");
  if (minRadius > maxRadius) return invalid(0, `모서리 반경이 부족합니다. 실제 안쪽 R은 최소 ${(3 * csMm).toFixed(2)} mm가 필요합니다.`);

  const start = { width: minWidth, height: minHeight, radius: minRadius };
  const end = { width: maxWidth, height: maxHeight, radius: maxRadius };
  const p0 = roundedRectPerimeter(start.width, start.height, start.radius);
  const p1 = roundedRectPerimeter(end.width, end.height, end.radius);
  const low = Math.min(p0, p1);
  const high = Math.max(p0, p1);
  const target = clamp(freeLength, low, high);
  const t = Math.abs(p1 - p0) < 1e-9 ? 0.5 : clamp((target - p0) / (p1 - p0), 0, 1);
  const path = {
    shape: "rect" as const,
    width: lerp(start.width, end.width, t),
    height: lerp(start.height, end.height, t),
    radius: lerp(start.radius, end.radius, t),
  };
  const pathLength = roundedRectPerimeter(path.width, path.height, path.radius);
  const requiredStrain = pathLength / freeLength - 1;
  if (requiredStrain > MAX_STRETCH || requiredStrain < -MAX_CIRCUMFERENTIAL_COMPRESSION) return invalid(requiredStrain, requiredStrain > 0 ? "사각형 허용 영역에 넣으려면 과도한 신장이 필요합니다." : "사각형 허용 영역에 넣으려면 과도한 둘레 압축이 필요합니다.");
  const innerCornerRadius = path.radius - grooveWidth / 2;
  return { valid: true as const, path, pathLength, requiredStrain, innerCornerRatio: innerCornerRadius / csMm };
}

function getGlandProfile(size: As568Size, medium: Medium): GlandProfile | null {
  const key = size.csIn.toFixed(3);
  const source = FACE_SEAL_PROFILES[key];
  if (!source) return null;
  const widthIn = medium === "liquid" ? source.liquidWidth : source.gasWidth;
  const depthIn = source.depth;
  const csMm = size.csIn * INCH_TO_MM;
  const depthMm = average(depthIn) * INCH_TO_MM;
  return {
    csMm,
    widthMm: average(widthIn) * INCH_TO_MM,
    widthMinMm: widthIn[0] * INCH_TO_MM,
    widthMaxMm: widthIn[1] * INCH_TO_MM,
    depthMm,
    depthMinMm: depthIn[0] * INCH_TO_MM,
    depthMaxMm: depthIn[1] * INCH_TO_MM,
    radiusMinMm: source.radius[0] * INCH_TO_MM,
    radiusMaxMm: source.radius[1] * INCH_TO_MM,
    squeezePercent: (1 - depthMm / csMm) * 100,
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

function invalid(requiredStrain: number, reason: string) {
  return { valid: false as const, path: null, pathLength: 0, requiredStrain, innerCornerRatio: null, reason };
}

function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function average(values: [number, number]) { return (values[0] + values[1]) / 2; }

