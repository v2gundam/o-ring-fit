import { getEnvelopeBoundaries, type Candidate, type Medium, type PressureMode, type ShapeInput } from "./oring";

export function buildDxf(candidate: Candidate, input: ShapeInput, pressureMode: PressureMode, medium: Medium) {
  const layers = [
    ["GROOVE_CUT", 1], ["GROOVE_CENTER", 3], ["DIMENSIONS", 7],
    ["NOTES", 7], ["PRESSURE", 6], ["SECTION", 4],
  ] as const;
  const entities: string[] = [];
  const width = candidate.profile.widthMm;

  if (candidate.path.shape === "round") {
    addCircle(entities, "GROOVE_CUT", 0, 0, (candidate.path.diameter - width) / 2);
    addCircle(entities, "GROOVE_CUT", 0, 0, (candidate.path.diameter + width) / 2);
    addCircle(entities, "GROOVE_CENTER", 0, 0, candidate.path.diameter / 2, "CENTER");
  } else {
    addRoundedPolyline(entities, "GROOVE_CUT", candidate.path.width - width, candidate.path.height - width, candidate.path.radius - width / 2);
    addRoundedPolyline(entities, "GROOVE_CUT", candidate.path.width + width, candidate.path.height + width, candidate.path.radius + width / 2);
    addRoundedPolyline(entities, "GROOVE_CENTER", candidate.path.width, candidate.path.height, candidate.path.radius, "CENTER");
  }

  const outerBoundary = getEnvelopeBoundaries(input).outer;
  const envelopeBounds = outerBoundary.shape === "round" ? outerBoundary.diameter : Math.max(outerBoundary.width, outerBoundary.height);
  const pathBounds = candidate.path.shape === "round" ? candidate.path.diameter + width : Math.max(candidate.path.width, candidate.path.height) + width;
  const bounds = Math.max(envelopeBounds, pathBounds);
  const noteX = bounds / 2 + 18;
  const topY = bounds / 2;
  addText(entities, "NOTES", noteX, topY, 3.5, `O-RING: AS568-${candidate.dash} / ID ${fmt(candidate.idMm)} x CS ${fmt(candidate.csMm)} mm`);
  addText(entities, "NOTES", noteX, topY - 6, 3.0, "MATERIAL: FKM (VITON) / HARDNESS: TBD");
  addText(entities, "DIMENSIONS", noteX, topY - 12, 3.0, planDimensionNote(candidate));
  addText(entities, "DIMENSIONS", noteX, topY - 18, 3.0, sectionDimensionNote(candidate));
  addText(entities, "NOTES", noteX, topY - 24, 3.0, `LENGTH CHECK: FREE ${fmt(candidate.freeLengthMm)} / APPLIED ${fmt(candidate.pathLengthMm)} / DELTA ${fmtSigned(candidate.lengthCheck.differenceMm)} mm`);
  addText(entities, "NOTES", noteX, topY - 30, 3.0, `INSTALL: ${candidate.label.toUpperCase()} / SQUEEZE ${candidate.profile.squeezePercent.toFixed(1)}% / MEDIUM ${medium.toUpperCase()}`);
  addText(entities, "PRESSURE", noteX, topY - 36, 3.0, `O-RING MOVEMENT: ${pressureMode.toUpperCase()} / SUPPORT: ${candidate.supportWall}`);
  addText(entities, "NOTES", noteX, topY - 42, 2.5, `REFERENCE: PARKER ORD 5700 ${candidate.profile.section === "rect" ? "FACE SEAL" : "DOVETAIL"} PROFILE / VERIFY BEFORE MACHINING`);
  if (candidate.innerCornerRatio !== null && candidate.innerCornerRatio < 3) {
    addText(entities, "NOTES", noteX, topY - 48, 2.5, `WARNING: NONSTANDARD INNER CORNER R ${fmt(candidate.path.shape === "rect" ? candidate.path.radius - width / 2 : 0)} mm < 3 x CS / LENGTH FIT ONLY`);
  }

  const sectionX = noteX;
  const sectionY = -bounds / 2 + 18;
  const sectionScale = 5;
  const w = width * sectionScale;
  const d = candidate.profile.depthMm * sectionScale;
  const centerX = sectionX + 12 + w / 2;
  const bottomLeft = centerX - w / 2;
  const bottomRight = centerX + w / 2;
  const mouthWidth = candidate.profile.mouthWidthMm * sectionScale;
  const mouthLeft = candidate.profile.section === "half_dovetail_outer"
    ? bottomLeft
    : candidate.profile.section === "half_dovetail_inner"
      ? bottomRight - mouthWidth
      : centerX - mouthWidth / 2;
  const mouthRight = candidate.profile.section === "half_dovetail_inner"
    ? bottomRight
    : candidate.profile.section === "half_dovetail_outer"
      ? bottomLeft + mouthWidth
      : centerX + mouthWidth / 2;
  addLine(entities, "SECTION", sectionX, sectionY, mouthLeft, sectionY);
  if (candidate.profile.section === "rect") {
    addLine(entities, "SECTION", mouthLeft, sectionY, bottomLeft, sectionY - d);
    addLine(entities, "SECTION", bottomRight, sectionY - d, mouthRight, sectionY);
  } else if (candidate.profile.section === "dovetail") {
    addLine(entities, "SECTION", mouthLeft, sectionY, bottomLeft, sectionY - d);
    addLine(entities, "SECTION", bottomRight, sectionY - d, mouthRight, sectionY);
  } else if (candidate.profile.section === "half_dovetail_outer") {
    addLine(entities, "SECTION", mouthLeft, sectionY, mouthLeft, sectionY - d);
    addLine(entities, "SECTION", bottomRight, sectionY - d, mouthRight, sectionY);
  } else {
    addLine(entities, "SECTION", mouthLeft, sectionY, bottomLeft, sectionY - d);
    addLine(entities, "SECTION", bottomRight, sectionY - d, mouthRight, sectionY);
  }
  addLine(entities, "SECTION", bottomLeft, sectionY - d, bottomRight, sectionY - d);
  addLine(entities, "SECTION", mouthRight, sectionY, sectionX + w + 26, sectionY);
  addText(entities, "SECTION", sectionX, sectionY + 5, 3, "SECTION A-A");
  addText(entities, "DIMENSIONS", sectionX + 12, sectionY - d - 5, 2.7, candidate.profile.section === "rect" ? `W ${fmt(width)} / D ${fmt(candidate.profile.depthMm)} mm` : `G ${fmt(candidate.profile.mouthWidthMm)} / MAX ${fmt(width)} / L ${fmt(candidate.profile.depthMm)} / 66 DEG`);

  return [
    "0", "SECTION", "2", "HEADER",
    "9", "$ACADVER", "1", "AC1014",
    "9", "$INSUNITS", "70", "4",
    "9", "$MEASUREMENT", "70", "1",
    "0", "ENDSEC",
    "0", "SECTION", "2", "TABLES",
    "0", "TABLE", "2", "LAYER", "70", String(layers.length),
    ...layers.flatMap(([name, color]) => ["0", "LAYER", "2", name, "70", "0", "62", String(color), "6", "CONTINUOUS"]),
    "0", "ENDTAB", "0", "ENDSEC",
    "0", "SECTION", "2", "ENTITIES",
    ...entities,
    "0", "ENDSEC", "0", "EOF", "",
  ].join("\n");
}

export function downloadDxf(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "application/dxf;charset=ascii" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function addRoundedPolyline(out: string[], layer: string, width: number, height: number, radius: number, lineType = "CONTINUOUS") {
  const x = width / 2;
  const y = height / 2;
  const r = Math.max(0.001, Math.min(radius, x, y));
  const bulge = Math.tan(Math.PI / 8);
  const vertices: Array<[number, number, number?]> = [
    [-x + r, -y], [x - r, -y, bulge], [x, -y + r], [x, y - r, bulge],
    [x - r, y], [-x + r, y, bulge], [-x, y - r], [-x, -y + r, bulge],
  ];
  out.push("0", "LWPOLYLINE", "8", layer, "6", lineType, "90", "8", "70", "1", "43", "0");
  for (const [vx, vy, b] of vertices) {
    out.push("10", fmtRaw(vx), "20", fmtRaw(vy));
    if (b) out.push("42", fmtRaw(b));
  }
}

function addCircle(out: string[], layer: string, x: number, y: number, radius: number, lineType = "CONTINUOUS") {
  out.push("0", "CIRCLE", "8", layer, "6", lineType, "10", fmtRaw(x), "20", fmtRaw(y), "30", "0", "40", fmtRaw(radius));
}

function addLine(out: string[], layer: string, x1: number, y1: number, x2: number, y2: number) {
  out.push("0", "LINE", "8", layer, "10", fmtRaw(x1), "20", fmtRaw(y1), "30", "0", "11", fmtRaw(x2), "21", fmtRaw(y2), "31", "0");
}

function addText(out: string[], layer: string, x: number, y: number, height: number, value: string) {
  out.push("0", "TEXT", "8", layer, "10", fmtRaw(x), "20", fmtRaw(y), "30", "0", "40", fmtRaw(height), "1", value.replace(/[^\x20-\x7E]/g, "?"), "7", "STANDARD");
}

function fmt(value: number) { return value.toFixed(2); }
function fmtSigned(value: number) { return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`; }
function fmtRaw(value: number) { return Number(value.toFixed(6)).toString(); }

function planDimensionNote(candidate: Candidate) {
  const width = candidate.profile.widthMm;
  if (candidate.path.shape === "round") {
    return `GLAND PLAN: ID ${fmt(candidate.path.diameter - width)} / CENTER DIA ${fmt(candidate.path.diameter)} / OD ${fmt(candidate.path.diameter + width)} mm`;
  }
  return `GLAND PLAN IN W${fmt(candidate.path.width - width)} H${fmt(candidate.path.height - width)} R${fmt(candidate.path.radius - width / 2)} / CENTER W${fmt(candidate.path.width)} H${fmt(candidate.path.height)} R${fmt(candidate.path.radius)} / OUT W${fmt(candidate.path.width + width)} H${fmt(candidate.path.height + width)} R${fmt(candidate.path.radius + width / 2)} mm`;
}

function sectionDimensionNote(candidate: Candidate) {
  const profile = candidate.profile;
  if (profile.section === "rect") return `GLAND SECTION: RECT / WIDTH ${fmt(profile.widthMm)} / DEPTH ${fmt(profile.depthMm)} mm`;
  const label = profile.section === "dovetail"
    ? "DOVETAIL"
    : profile.section === "half_dovetail_inner"
      ? "HALF DOVETAIL INNER"
      : "HALF DOVETAIL OUTER";
  return `GLAND SECTION: ${label} / G ${fmt(profile.mouthWidthMm)} / MAX ${fmt(profile.bottomWidthMm)} / L ${fmt(profile.depthMm)} / ANGLE ${profile.angleDeg} DEG / R ${fmt(profile.cornerRadiusMm)} / R1 ${fmt(profile.bottomRadiusMm)} mm`;
}
