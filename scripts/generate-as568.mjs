import { readFileSync, writeFileSync } from "node:fs";

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath || !outputPath) {
  throw new Error("Usage: node scripts/generate-as568.mjs <pdftotext.txt> <output.ts>");
}

const source = readFileSync(inputPath, "utf8");
const rowPattern = /-([0-9]{3})\s+([0-9]*\.[0-9]+)\s+±\s*([0-9]*\.[0-9]+)\s+([0-9]*\.[0-9]+)\s+±\s*([0-9]*\.[0-9]+)/g;
const rows = new Map();

for (const match of source.matchAll(rowPattern)) {
  const [, dash, idIn, idToleranceIn, csIn, csToleranceIn] = match;
  rows.set(dash, {
    dash,
    idIn: Number(idIn),
    idToleranceIn: Number(idToleranceIn),
    csIn: Number(csIn),
    csToleranceIn: Number(csToleranceIn),
  });
}

const sizes = [...rows.values()].sort((a, b) => Number(a.dash) - Number(b.dash));

if (sizes.length !== 369) {
  throw new Error(`Expected 369 AS568 rows, parsed ${sizes.length}`);
}

const body = `// Generated from Apple Rubber AS568 Standard O-Rings Quick Reference Chart.\n// Source: https://www.applerubber.com/src/pdf/as568-standard-size-o-rings.pdf\n// Dimensional values remain in the source inch units; UI converts them to mm.\n\nexport type As568Size = {\n  dash: string;\n  idIn: number;\n  idToleranceIn: number;\n  csIn: number;\n  csToleranceIn: number;\n};\n\nexport const AS568_SIZES: As568Size[] = ${JSON.stringify(sizes, null, 2)};\n`;

writeFileSync(outputPath, body);
console.log(`Generated ${sizes.length} AS568 rows at ${outputPath}`);
