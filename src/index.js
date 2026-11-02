import { analyze } from "./analyze.js";
import { extractText } from "./extract.js";

export { analyze, extractText };
export {
  countGarbled,
  findEmail,
  findLink,
  findLocation,
  findPhone,
  findSections,
} from "./analyze.js";

/**
 * Extract the text from a PDF resume and run all checks on it.
 * @param {Uint8Array | ArrayBuffer} data PDF file contents
 */
export async function checkResume(data) {
  const { text, pages } = await extractText(data);
  return { text, pages: pages.length, ...analyze(text) };
}
