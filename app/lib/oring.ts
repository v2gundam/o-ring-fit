import { AS568_SIZES, type As568Size } from "../data/as568.generated";

const INCH_TO_MM = 25.4;
const MAX_STRETCH = 0.05;
const MAX_CIRCUMFERENTIAL_COMPRESSION = 0.03;

export type PressureMode = "internal_pressure" | "internal_vacuum" | "external_pressure";
export type Medium = "liquid" | "gas" | "vacuum";
export type GrooveShape = "round" | "rect";
export type GlandSection = "rect" | "dovetail" | "half_dovetail";

export type SearchOptions = {
  grooveShape?: GrooveShape;
  grooveRadius?: number;
  csMm?: number | null;
  glandSection?: GlandSection;
};

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

function evaluateSize(size: As568Size, profile: GlandProfile, input: ShapeInput, pressureMode: PressureMode, options: SearchOptions): { candidate: Candidate } | { near: NearCandidate } {
  const idMm = size.idIn * INCH_TO_MM;
  const idToleranceMm = size.idToleranceIn * INCH_TO_MM;
  const csMm = size.csIn * INCH_TO_MM;
  const csToleranceMm = size.csToleranceIn * INCH_TO_MM;
  const freeLengthMm = Math.PI * (idMm + csMm);
  const freeMin = Math.PI * (idMm - idToleranceMm + csMm - csToleranceMm);
  const freeMax = Math.PI * (idMm + idToleranceMm + csMm + csToleranceMm);
  const geometry = solvePath(input, profile.widthMm, csMm, freeLengthMm, options);

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
  if (profile.section === "dovetail") warnings.push("도브테일은 유지가 꼭 필요한 경우에만 사용하고 온도·팽윤·공차를 별도 검토해야 합니다.");
  if (profile.section === "half_dovetail") warnings.push("하프 도브테일은 유지 방향과 압력 지지벽 방향을 가공 전 확인해야 합니다.");
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

function solvePath(input: ShapeInput, grooveWidth: number, csMm: number, freeLength: number, options: SearchOptions) {
  const grooveShape = options.grooveShape ?? input.shape;
  if (grooveShape === "round") return solveRoundGroove(input, grooveWidth, freeLength);
  return solveRectGroove(input, grooveWidth, csMm, freeLength, options.grooveRadius);
}

function solveRoundGroove(input: ShapeInput, grooveWidth: number, freeLength: number) {
  const innerSafe = expandedInnerBoundary(input);
  const outerSafe = insetOuterBoundary(input);
  if (!innerSafe || !outerSafe) return invalid(0, "벽 여유를 적용한 뒤 유효한 허용 영역이 남지 않습니다.");

  const minDiameter = 2 * (farthestRadius(innerSafe) + grooveWidth / 2);
  const maxDiameter = 2 * (inscribedCircleRadius(outerSafe) - grooveWidth / 2);
  if (minDiameter > maxDiameter || maxDiameter <= 0) return invalid(0, "원형 글랜드가 안쪽 경계를 감싸면서 바깥 경계 안에 들어갈 공간이 없습니다.");

  const diameter = clamp(freeLength / Math.PI, minDiameter, maxDiameter);
  const pathLength = Math.PI * diameter;
  const requiredStrain = pathLength / freeLength - 1;
  if (!strainAllowed(requiredStrain)) return invalid(requiredStrain, strainReason(requiredStrain, "원형"));
  return { valid: true as const, path: { shape: "round" as const, diameter }, pathLength, requiredStrain, innerCornerRatio: null };
}

function solveRectGroove(input: ShapeInput, grooveWidth: number, csMm: number, freeLength: number, requestedRadius?: number) {
  const innerSafe = expandedInnerBoundary(input);
  const outerSafe = insetOuterBoundary(input);
  if (!innerSafe || !outerSafe) return invalid(0, "벽 여유를 적용한 뒤 유효한 허용 영역이 남지 않습니다.");

  const radius = requestedRadius ?? automaticGrooveRadius(input, grooveWidth, csMm);
  const innerCornerRadius = radius - grooveWidth / 2;
  if (!Number.isFinite(radius) || radius <= 0) return invalid(0, "둥근 사각형 글랜드의 중심선 R은 0보다 커야 합니다.");
  if (innerCornerRadius < 3 * csMm) return invalid(0, `홈 안쪽 R ${(innerCornerRadius).toFixed(2)} mm가 최소 3×CS인 ${(3 * csMm).toFixed(2)} mm보다 작습니다.`);

  const rawStart = input.shape === "round"
    ? { width: innerSafe.radius * 2 + grooveWidth, height: innerSafe.radius * 2 + grooveWidth }
    : { width: innerSafe.width + grooveWidth, height: innerSafe.height + grooveWidth };
  const start = { width: Math.max(rawStart.width, 2 * radius), height: Math.max(rawStart.height, 2 * radius) };
  const end = input.shape === "round"
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
  const target = clamp(freeLength, Math.min(p0, p1), Math.max(p0, p1));
  const t = Math.abs(p1 - p0) < 1e-9 ? (tMin + tMax) / 2 : clamp(tMin + (target - p0) * (tMax - tMin) / (p1 - p0), tMin, tMax);
  const path = makePath(t);
  const pathLength = roundedRectPerimeter(path.width, path.height, path.radius);
  const requiredStrain = pathLength / freeLength - 1;
  if (!strainAllowed(requiredStrain)) return invalid(requiredStrain, strainReason(requiredStrain, "둥근 사각형"));
  return { valid: true as const, path, pathLength, requiredStrain, innerCornerRatio: innerCornerRadius / csMm };
}

type BoundaryGeometry =
  | { shape: "round"; radius: number }
  | { shape: "rect"; width: number; height: number; radius: number };

function expandedInnerBoundary(input: ShapeInput): BoundaryGeometry {
  if (input.shape === "round") return { shape: "round", radius: input.innerDiameter / 2 + input.innerMargin };
  return {
    shape: "rect",
    width: input.innerWidth + 2 * input.innerMargin,
    height: input.innerHeight + 2 * input.innerMargin,
    radius: input.innerRadius + input.innerMargin,
  };
}

function insetOuterBoundary(input: ShapeInput): BoundaryGeometry | null {
  if (input.shape === "round") {
    const radius = input.outerDiameter / 2 - input.outerMargin;
    return radius > 0 ? { shape: "round", radius } : null;
  }
  const width = input.outerWidth - 2 * input.outerMargin;
  const height = input.outerHeight - 2 * input.outerMargin;
  if (width <= 0 || height <= 0) return null;
  return {
    shape: "rect",
    width,
    height,
    radius: clamp(input.outerRadius - input.outerMargin, 0, Math.min(width, height) / 2),
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
  if (input.shape === "round") return Math.max(minimum, input.innerDiameter * 0.18);
  return Math.max(minimum, (input.innerRadius + input.outerRadius) / 2);
}

function strainAllowed(value: number) {
  return value <= MAX_STRETCH && value >= -MAX_CIRCUMFERENTIAL_COMPRESSION;
}

function strainReason(value: number, shape: string) {
  return value > 0
    ? `${shape} 허용 영역에 넣으려면 과도한 신장이 필요합니다.`
    : `${shape} 허용 영역에 넣으려면 과도한 둘레 압축이 필요합니다.`;
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

function invalid(requiredStrain: number, reason: string) {
  return { valid: false as const, path: null, pathLength: 0, requiredStrain, innerCornerRatio: null, reason };
}

function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function average(values: [number, number]) { return (values[0] + values[1]) / 2; }
