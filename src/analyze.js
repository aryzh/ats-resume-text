// Heuristic checks on the plain text an ATS extracts from a resume.
// Ported from the Hiretop ATS Resume Checker (https://hiretop.com/ats-resume-checker).

// Common resume section headings an ATS looks for in the plain text.
const SECTION_PATTERNS = [
  ["Experience", /\b(work experience|experience|employment)\b/i],
  ["Education", /\beducation\b/i],
  ["Skills", /\bskills\b/i],
  ["Summary", /\b(summary|profile|objective)\b/i],
  ["Projects", /\bprojects\b/i],
  ["Certifications", /\b(certifications?|licen[sc]es?)\b/i],
];

// Sections most ATS profiles map to fields; missing ones are worth a warning.
const REQUIRED_SECTIONS = ["Experience", "Education", "Skills"];

const US_STATES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID",
  "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS",
  "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK",
  "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
  "WI", "WY", "DC",
]);

const COUNTRIES = [
  "USA", "United States", "UK", "United Kingdom", "Canada", "Germany",
  "France", "Spain", "Italy", "Netherlands", "Poland", "Ukraine", "Russia",
  "India", "Australia", "Brazil", "Mexico", "Portugal", "Ireland", "Sweden",
  "Norway", "Denmark", "Finland", "Switzerland", "Austria", "Belgium",
  "Romania", "Turkey", "Israel", "UAE", "Singapore", "Japan", "China",
  "Argentina",
];

// How much of the start of the resume counts as the contact "header". Contact
// details live there; finding them later means the layout scrambled the order.
const HEADER_LENGTH = 350;

export function findEmail(text) {
  return text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)?.[0] ?? null;
}

export function findPhone(text) {
  const match = text.match(/(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{2,4}(?:[\s.-]\d{2,4}){1,4}/);
  if (!match) return null;
  const digits = match[0].replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15 ? match[0].trim() : null;
}

// Best-effort location detection. Heuristic by nature, so a miss is reported
// as unknown rather than as a problem.
export function findLocation(text) {
  for (const match of text.matchAll(
    /(?:location|based in|address|city)\s*[:\-]\s*([A-Za-z][A-Za-z .,'-]{2,40})/gi,
  )) {
    const index = match.index ?? 0;
    // Skip "Email address: ..." — that label introduces an email, not a place.
    if (/e-?mail\s*$/i.test(text.slice(0, index))) continue;
    // Skip when the value runs straight into "@" (it is an email local part).
    if ((text[index + match[0].length] ?? "") === "@") continue;
    return match[1].trim().replace(/\s+/g, " ");
  }

  for (const match of text.matchAll(
    /\b([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,2}),\s*([A-Z]{2})\b/g,
  )) {
    if (US_STATES.has(match[2])) return `${match[1]}, ${match[2]}`;
  }

  const countryAlt = COUNTRIES.map((country) =>
    country.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("|");
  const cityCountry = text.match(
    new RegExp(`\\b([A-Z][A-Za-z.'-]+(?:\\s+[A-Z][A-Za-z.'-]+){0,2}),\\s*(${countryAlt})\\b`, "i"),
  );
  if (cityCountry) return `${cityCountry[1]}, ${cityCountry[2]}`;

  if (/\bremote\b/i.test(text)) return "Remote";
  return null;
}

export function findLink(text) {
  const linkedIn = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s]+/i);
  if (linkedIn) return linkedIn[0];
  return text.match(/https?:\/\/[^\s]+/i)?.[0] ?? null;
}

// Replacement (U+FFFD) and control characters are a precise signal of a badly
// converted PDF that an ATS will choke on. Counted by code point to avoid
// embedding literal control characters in the source.
export function countGarbled(text) {
  let count = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    const isControl =
      code <= 0x08 || code === 0x0b || code === 0x0c || (code >= 0x0e && code <= 0x1f);
    if (code === 0xfffd || isControl) count += 1;
  }
  return count;
}

export function findSections(text) {
  return SECTION_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

/**
 * Run all checks on extracted resume text.
 * Returns the facts found plus a list of human-readable issues.
 */
export function analyze(text) {
  const header = text.slice(0, HEADER_LENGTH);
  const email = findEmail(text);
  const phone = findPhone(text);
  const sections = findSections(text);
  const garbled = countGarbled(text);
  const words = text.split(/\s+/).filter(Boolean).length;

  const issues = [];
  if (words < 50) {
    issues.push({
      level: "error",
      code: "no-text",
      message: "Almost no text was extracted. The PDF may be a scanned image; an ATS can't read it.",
    });
  }
  if (!email) {
    issues.push({ level: "error", code: "no-email", message: "No email address found in the text." });
  } else if (!header.includes(email)) {
    issues.push({
      level: "warn",
      code: "email-not-at-top",
      message: "The email isn't at the top of the extracted text. Contact details in a header, sidebar or text box often end up out of order.",
    });
  }
  if (!phone) {
    issues.push({ level: "warn", code: "no-phone", message: "No phone number found in the text." });
  }
  for (const name of REQUIRED_SECTIONS) {
    if (!sections.includes(name)) {
      issues.push({
        level: "warn",
        code: `no-section-${name.toLowerCase()}`,
        message: `No "${name}" heading found. Use a standard heading so the ATS can map the section.`,
      });
    }
  }
  if (garbled > 0) {
    issues.push({
      level: "error",
      code: "garbled",
      message: `${garbled} unreadable character(s). Fonts or icons in this PDF don't convert to text cleanly.`,
    });
  }

  return {
    words,
    email,
    phone,
    location: findLocation(header),
    link: findLink(text),
    sections,
    garbled,
    issues,
  };
}
