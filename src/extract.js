// Extract plain text from a PDF in the order a text parser reads it. This is
// roughly what an ATS stores before it tries to split the resume into fields.

// Items on the same baseline within this many PDF units belong to one line.
const SAME_LINE_TOLERANCE = 2;

async function loadPdfjs() {
  // The legacy build runs in Node and in older browsers alike.
  return import("pdfjs-dist/legacy/build/pdf.mjs");
}

/**
 * @param {Uint8Array | ArrayBuffer} data PDF file contents
 * @returns {Promise<{ text: string, pages: string[] }>}
 */
export async function extractText(data) {
  const { getDocument } = await loadPdfjs();
  const bytes = data instanceof Uint8Array ? new Uint8Array(data) : new Uint8Array(data);
  const loadingTask = getDocument({ data: bytes, isEvalSupported: false, verbosity: 0 });
  const pdf = await loadingTask.promise;

  try {
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(itemsToText(content.items));
      page.cleanup();
    }
    return { text: pages.join("\n\n").trim(), pages };
  } finally {
    await loadingTask.destroy();
  }
}

// Keep the content-stream order (that's what parsers see) but restore line
// breaks: pdfjs marks explicit ends of line with hasEOL, and a change of
// baseline also starts a new line.
function itemsToText(items) {
  const lines = [];
  let line = "";
  let lastY = null;

  for (const item of items) {
    if (!("str" in item)) continue;
    const y = item.transform[5];
    if (lastY !== null && Math.abs(y - lastY) > SAME_LINE_TOLERANCE && line.trim()) {
      lines.push(line);
      line = "";
    }
    if (item.str) {
      line += line && !line.endsWith(" ") && !item.str.startsWith(" ") ? " " + item.str : item.str;
      lastY = y;
    }
    if (item.hasEOL && line.trim()) {
      lines.push(line);
      line = "";
    }
  }
  if (line.trim()) lines.push(line);

  return lines
    .map((text) => text.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}
