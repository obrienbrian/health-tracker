import pdf from "pdf-parse";

interface ParsedBiomarker {
  name: string;
  value: number;
  unit: string;
  referenceMin?: number;
  referenceMax?: number;
  flag: "high" | "low" | "normal";
}

interface ParsedPanel {
  name: string;
  biomarkers: ParsedBiomarker[];
}

export interface ParsedLabResult {
  dateCollected: string;
  dateReported: string;
  fasting: boolean;
  panels: ParsedPanel[];
}

// Order matters: longer/more-specific units first to avoid partial matches
const KNOWN_UNITS = [
  "mL/min/1.73",
  "x10E3/uL",
  "x10E6/uL",
  "uIU/mL",
  "ng/dL",
  "mg/dL",
  "mmol/L",
  "nmol/L",
  "pg/mL",
  "ng/mL",
  "IU/L",
  "mg/L",
  "g/dL",
  "ratio",
  "fL",
  "pg",
  "%",
];

// Lines that signal the end of useful lab data in the PDF
const TERMINAL_PATTERNS = [
  /^Previous Result$/,
  /^The Previous Result is listed/,
  /^Icon Legend/,
  /^Footnotes\/Disclaimers/,
  /^Performing Labs/,
  /^For inquiries/,
  /^Patient Details/,
  /^Historical Results/,
  /^Cardiovascular Tests/,
];

function parseHeader(text: string): {
  dateCollected: string;
  dateReported: string;
  fasting: boolean;
} {
  const dateCollectedMatch = text.match(
    /Date Collected:\s*(\d{2}\/\d{2}\/\d{4})/
  );
  const dateReportedMatch = text.match(
    /Date Reported:\s*(\d{2}\/\d{2}\/\d{4})/
  );
  const fastingMatch = text.match(/Fasting:\s*(Yes|No)/i);

  const formatDate = (mmddyyyy: string): string => {
    const [mm, dd, yyyy] = mmddyyyy.split("/");
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    dateCollected: dateCollectedMatch
      ? formatDate(dateCollectedMatch[1])
      : "",
    dateReported: dateReportedMatch
      ? formatDate(dateReportedMatch[1])
      : "",
    fasting: fastingMatch
      ? fastingMatch[1].toLowerCase() === "yes"
      : false,
  };
}

/**
 * Strip repeating page headers/footers and trailing non-lab-result pages.
 */
function stripPageNoise(text: string): string {
  const lines = text.split("\n");
  const cleaned: string[] = [];
  let skipCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Footer lines
    if (trimmed.startsWith("Date Created and Stored")) continue;
    if (trimmed.includes("Laboratory Corporation of America")) continue;
    if (trimmed.includes("All Rights Reserved")) continue;
    if (trimmed.includes("This document contains private")) continue;
    if (trimmed.includes("If you have received this document")) continue;

    // Terminal section — stop
    if (TERMINAL_PATTERNS.some((p) => p.test(trimmed))) break;

    // Page header: "O'Brien, BrianDOB: ...Patient Report"
    // After this line come: Patient ID, Specimen ID, Date Collected (3 lines to skip)
    if (/^O'Brien.*Patient Report$/.test(trimmed)) {
      skipCount = 3;
      continue;
    }
    if (skipCount > 0) {
      skipCount--;
      continue;
    }

    cleaned.push(line);
  }

  return cleaned.join("\n");
}

function parseReferenceRange(ref: string): { min?: number; max?: number } {
  ref = ref.trim();
  if (ref === "" || ref === "Not Estab.") return {};

  const rangeMatch = ref.match(/^(\d+\.?\d*)\s*-\s*(\d+\.?\d*)$/);
  if (rangeMatch)
    return {
      min: parseFloat(rangeMatch[1]),
      max: parseFloat(rangeMatch[2]),
    };

  const gtMatch = ref.match(/^>\s*(\d+\.?\d*)$/);
  if (gtMatch) return { min: parseFloat(gtMatch[1]) };

  const ltMatch = ref.match(/^<\s*(\d+\.?\d*)$/);
  if (ltMatch) return { max: parseFloat(ltMatch[1]) };

  return {};
}

function computeFlag(
  value: number,
  refMin?: number,
  refMax?: number
): "high" | "low" | "normal" {
  if (refMax !== undefined && value > refMax) return "high";
  if (refMin !== undefined && value < refMin) return "low";
  return "normal";
}

/**
 * Given a string that may be two concatenated numbers (current + previous),
 * extract only the current value.
 *
 * LabCorp concatenates values with identical decimal precision:
 *   "1.3303.030" → 1.330 (current) + 3.030 (prev)
 *   "8885"       → 88    (current) + 85    (prev)
 *   "317218"     → 317   (current) + 218   (prev)
 *
 * When there's no previous value (no date on the line), the string is just
 * a single number — do NOT call this function in that case.
 */
function splitCurrentFromPrevious(
  raw: string,
  refMin?: number,
  refMax?: number
): number {
  const s = raw.replace(/\*$/, ""); // strip trailing asterisk

  // Pure integer path
  if (/^\d+$/.test(s)) {
    const len = s.length;
    // Even-length: split in half
    if (len % 2 === 0) {
      const half = len / 2;
      const current = parseInt(s.substring(0, half), 10);
      // Validate against reference range when available
      if (refMin !== undefined || refMax !== undefined) {
        const hi = (refMax !== undefined ? refMax : refMin!) * 10;
        const lo = (refMin !== undefined ? refMin : 0) * 0.1;
        if (current >= lo && current <= hi) return current;
      } else {
        return current; // no range to validate against, trust equal split
      }
    }
    // Odd-length or equal split failed: try ceil then floor (prefer longer current value)
    for (const split of [Math.ceil(len / 2), Math.floor(len / 2)]) {
      const c = parseInt(s.substring(0, split), 10);
      if (refMin !== undefined || refMax !== undefined) {
        const hi = (refMax !== undefined ? refMax : refMin!) * 10;
        const lo = (refMin !== undefined ? refMin : 0) * 0.1;
        if (c >= lo && c <= hi) return c;
      }
    }
    // Fallback: full value (single number, not concatenated)
    return parseInt(s, 10);
  }

  // Decimal path
  const validSplits: Array<{
    pos: number;
    a: number;
    aDecimals: number;
    bDecimals: number;
  }> = [];

  for (let i = 2; i < s.length - 1; i++) {
    const aPart = s.substring(0, i);
    const bPart = s.substring(i);
    const aNum = parseFloat(aPart);
    const bNum = parseFloat(bPart);
    if (isNaN(aNum) || isNaN(bNum) || !/^\d/.test(bPart)) continue;
    const aDecimals = aPart.includes(".")
      ? aPart.length - aPart.indexOf(".") - 1
      : 0;
    const bDotIdx = bPart.indexOf(".");
    const bDecimals = bDotIdx === -1 ? 0 : bPart.length - bDotIdx - 1;
    validSplits.push({ pos: i, a: aNum, aDecimals, bDecimals });
  }

  // Prefer splits where both parts have the same decimal precision
  const sameDecimals = validSplits.filter(
    (x) => x.aDecimals === x.bDecimals && x.aDecimals > 0
  );

  const hi =
    refMax !== undefined
      ? refMax * 10
      : refMin !== undefined
      ? refMin * 20
      : Infinity;
  const lo = refMin !== undefined ? refMin * 0.1 : 0;

  const candidates = sameDecimals.length > 0 ? sameDecimals : validSplits;
  const inRange = candidates.filter((x) => x.a >= lo && x.a <= hi);

  if (inRange.length > 0) {
    // Among in-range candidates, prefer highest decimal precision
    inRange.sort((a, b) => b.aDecimals - a.aDecimals);
    return inRange[0].a;
  }

  // No valid split found — the string is a single number
  return parseFloat(s);
}

function parseBiomarkerDataLine(
  dataLine: string,
  hasPreviousDate: boolean
): Omit<ParsedBiomarker, "name"> | null {
  if (!dataLine || dataLine.trim() === "") return null;

  const line = dataLine.trim();

  // Find unit (longest match first)
  let unitIndex = -1;
  let unit = "";
  for (const u of KNOWN_UNITS) {
    const idx = line.indexOf(u);
    if (idx !== -1) {
      unitIndex = idx;
      unit = u;
      break;
    }
  }

  // No unit — try to extract the current value before a date (e.g., BUN/Creatinine Ratio line)
  if (unitIndex === -1) {
    // Pattern: digits + (digits|flag) + date + refRange
    const noUnitDateMatch = line.match(
      /^(\d[\d.]*(?:High|Low)?[\d.]*)\d{2}\/\d{2}\/\d{4}(.*)$/
    );
    if (noUnitDateMatch) {
      const rawBefore = noUnitDateMatch[1];
      const flagM = rawBefore.match(/(High|Low)/);
      const numStr = flagM ? rawBefore.substring(0, flagM.index) : rawBefore;
      const refStr = noUnitDateMatch[2].trim();
      const { min: refMin, max: refMax } = parseReferenceRange(refStr);
      const value = flagM
        ? parseFloat(numStr.trim())
        : splitCurrentFromPrevious(numStr.trim(), refMin, refMax);
      if (!isNaN(value)) {
        const flag = computeFlag(value, refMin, refMax);
        return { value, unit: "", referenceMin: refMin, referenceMax: refMax, flag };
      }
    }
    // Fallback: bare leading number with no date
    const numMatch = line.match(/^(\d+\.?\d*)/);
    if (numMatch) {
      return { value: parseFloat(numMatch[1]), unit: "", flag: "normal" };
    }
    return null;
  }

  const beforeUnit = line.substring(0, unitIndex);
  const afterUnit = line.substring(unitIndex + unit.length);

  const { min: refMin, max: refMax } = parseReferenceRange(afterUnit.trim());

  // Strip the previous value + date from beforeUnit, leaving only the current value portion
  const DATE_RE = /\d{2}\/\d{2}\/\d{4}/;
  const dateMatch = beforeUnit.match(DATE_RE);

  let numericStr: string;

  if (dateMatch && dateMatch.index !== undefined) {
    // Has previous date: beforeUnit = "<current>[High|Low]<previous><date>"
    const beforeDate = beforeUnit.substring(0, dateMatch.index);
    const flagMatch = beforeDate.match(/(High|Low)/);
    if (flagMatch && flagMatch.index !== undefined) {
      // Flag separates current from previous — everything before flag IS the current value
      numericStr = beforeDate.substring(0, flagMatch.index).trim();
    } else {
      // No flag: beforeDate = currentValue + previousValue concatenated
      numericStr = String(splitCurrentFromPrevious(beforeDate.trim(), refMin, refMax));
    }
  } else {
    // No previous date: strip flag word if present, remainder is just current value
    const flagMatch = beforeUnit.match(/(High|Low)/);
    numericStr =
      flagMatch && flagMatch.index !== undefined
        ? beforeUnit.substring(0, flagMatch.index).trim()
        : beforeUnit.trim();
    // Do NOT split — this is a single number (no previous date means no concatenation)
    void hasPreviousDate;
  }

  const value = parseFloat(numericStr);
  if (isNaN(value)) return null;

  const flag = computeFlag(value, refMin, refMax);
  return { value, unit, referenceMin: refMin, referenceMax: refMax, flag };
}

// Inline name+data: test name concatenated directly with data (no footnote line separator)
// e.g. "eGFR1069301/06/2025mL/min/1.73>59"
// e.g. "Globulin, Total2.32.001/06/2025g/dL1.5-4.5"
// e.g. "LDL Chol Calc (NIH)118High6001/06/2025mg/dL0-99"
function detectInlineNameData(trimmed: string): string | null {
  // Pattern: alpha prefix → digits → (optional High/Low) → digits → date → unit
  const m = trimmed.match(
    /^([A-Za-z][A-Za-z0-9 ,.()\/-]*?)(\d[\d.]*(?:High|Low)?[\d.]*\d{2}\/\d{2}\/\d{4}.+)$/
  );
  if (m) return m[1].trim();
  return null;
}

const NOISE_PREFIXES = [
  "Please Note:",
  "* Previous Reference",
  "This LabCorp",
  "This test was developed",
  "Methodology:",
  "Roche ",
  "According ",
  "R and D ",
  "Values obtained",
  "interchangeably",
  "of the presence",
  "decrease and remain",
  "prostatectomy",
  "PSA value",
  "Prediabetes:",
  "Diabetes:",
  "Glycemic control",
  "by the Food",
  "Reference Range:",
  "Adults:",
  "determined by Labcorp",
  "Hormone Standardization",
  "interval is based",
  "(BMI",
  "2017,",
  "Desirable",
  "Borderline",
  "Very High Risk",
  "High Risk",
  "Moderate Risk",
  "by the CDC",
  "Ordered Items:",
  "Patient Details",
  "Physician Details",
  "Specimen Details",
];

function isNoiseLine(trimmed: string, line: string): boolean {
  for (const prefix of NOISE_PREFIXES) {
    if (trimmed.startsWith(prefix)) return true;
  }
  if (/^(1\/2|2X|3X)\s+Avg/.test(trimmed)) return true;
  if (/^Avg\.Risk/.test(trimmed)) return true;
  if (/^-{3,}/.test(trimmed)) return true;
  if (
    /^(ASCVD|CATEGORY|APO|Low\s+<|Average\s+1|High\s+>)/.test(trimmed)
  )
    return true;
  if (/^\s{10,}/.test(line)) return true; // heavily-indented side table notes
  if (/^[A-Z]: /.test(trimmed)) return true; // footnote labels
  return false;
}

function isValidNextPanelName(candidate: string): boolean {
  if (!candidate) return false;
  if (!/^[A-Z]/.test(candidate)) return false;
  if (/^\d/.test(candidate)) return false;
  if (candidate.length < 3) return false;
  // Exclude the column header specifically (not panel names starting with "Test")
  if (candidate.startsWith("TestCurrent")) return false;
  if (candidate.startsWith("Please")) return false;
  if (candidate.startsWith("This ")) return false;
  if (candidate.startsWith("*")) return false;
  if (candidate.startsWith("According")) return false;
  if (candidate.startsWith("Values")) return false;
  if (candidate.startsWith("Roche")) return false;
  if (candidate.startsWith("R and")) return false;
  if (candidate.includes("(Cont.)")) return false;
  if (TERMINAL_PATTERNS.some((p) => p.test(candidate))) return false;
  // Reject lines that look like noise table rows (start with Low/High/Average/etc.)
  if (/^(Low|High|Average|Desirable|Borderline|Very|Moderate)/.test(candidate)) return false;
  // Reject lines that look like a data value row
  if (/^\d/.test(candidate)) return false;
  return true;
}

export async function parseLabCorpPdf(
  buffer: Buffer
): Promise<ParsedLabResult> {
  const data = await pdf(buffer);
  const rawText = data.text;

  const header = parseHeader(rawText);
  const cleanText = stripPageNoise(rawText);

  const COLUMN_HEADER =
    "TestCurrent Result and FlagPrevious Result and DateUnitsReference Interval";
  const sections = cleanText.split(COLUMN_HEADER);

  const panels: ParsedPanel[] = [];
  let currentPanelName = "";

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    if (i === 0) {
      // Before any table — find the first panel name
      const lines = section.trim().split("\n");
      for (let j = lines.length - 1; j >= 0; j--) {
        const line = lines[j].trim();
        if (
          line &&
          !line.startsWith("Ordered Items") &&
          !line.startsWith("Date ")
        ) {
          currentPanelName = line;
          break;
        }
      }
      continue;
    }

    const lines = section.split("\n");
    const biomarkers: ParsedBiomarker[] = [];
    let testName = "";
    let skipNoise = false;

    for (let j = 0; j < lines.length; j++) {
      const line = lines[j];
      const trimmed = line.trim();

      if (trimmed === "") continue;
      if (trimmed.includes("(Cont.)")) continue;
      if (TERMINAL_PATTERNS.some((p) => p.test(trimmed))) break;

      // Enter noise-skip mode
      if (!skipNoise && isNoiseLine(trimmed, line)) {
        skipNoise = true;
      }
      if (skipNoise) {
        // Resume when we see a data line (if we have a test name already)
        if (/^\d/.test(trimmed) && testName) {
          skipNoise = false;
        // Or when we see a new test name line (alpha-starting, not a noise line itself)
        } else if (/^[A-Za-z]/.test(trimmed) && !isNoiseLine(trimmed, line) && !trimmed.startsWith("TestCurrent")) {
          skipNoise = false;
          // Fall through to test-name processing below
        } else {
          continue;
        }
      }

      // Footnote/lab-ID lines: indented line with only uppercase alphanum
      // (e.g., " 01", " A, 02" — may contain non-breaking spaces \u00A0)
      // Normalize NBSP to regular space before testing
      const normalizedLine = line.replace(/\u00A0/g, " ");
      const normalizedTrimmed = normalizedLine.trim();
      if (normalizedTrimmed.length < 15 && /^\s+[A-Z0-9, ]+$/.test(normalizedLine)) {
        continue;
      }

      // Inline name+data line (test name and value on same line, no intervening footnote row)
      const inlineName = detectInlineNameData(trimmed);
      if (inlineName && !testName) {
        const dataStr = trimmed.substring(inlineName.length).trim();
        const parsed = parseBiomarkerDataLine(dataStr, true);
        if (parsed) {
          biomarkers.push({ name: inlineName, ...parsed });
        }
        testName = "";
        continue;
      }

      // Data line (starts with digit) for the pending test name
      if (/^\d/.test(trimmed) && testName) {
        const hasPrev = /\d{2}\/\d{2}\/\d{4}/.test(trimmed);
        const parsed = parseBiomarkerDataLine(trimmed, hasPrev);
        if (parsed) {
          biomarkers.push({ name: testName, ...parsed });
        }
        testName = "";
        continue;
      }

      // Test name line — alphabetic, not the column header line
      // Note: test name CAN equal panel name (single-test panels like Pregnenolone, VEGF, etc.)
      if (
        /^[A-Za-z(]/.test(trimmed) &&
        !trimmed.startsWith("TestCurrent")
      ) {
        // Multi-line test name continuation: short or starts with lowercase/(
        if (
          testName &&
          (trimmed.length < 20 || /^[a-z(]/.test(trimmed))
        ) {
          testName = testName + " " + trimmed;
        } else {
          testName = trimmed;
        }
      }
    }

    // Deduplicate panel continuation
    const cleanPanelName = currentPanelName
      .replace(/\s*\(Cont\.\)\s*$/, "")
      .trim();

    const existingPanel = panels.find((p) => p.name === cleanPanelName);
    if (existingPanel) {
      existingPanel.biomarkers.push(...biomarkers);
    } else if (biomarkers.length > 0) {
      panels.push({ name: cleanPanelName, biomarkers });
    }

    // Find next panel name: last qualifying line in this section
    for (let k = lines.length - 1; k >= 0; k--) {
      const candidate = lines[k].trim();
      if (isValidNextPanelName(candidate)) {
        currentPanelName = candidate;
        break;
      }
    }
  }

  return { ...header, panels };
}
