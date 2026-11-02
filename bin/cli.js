#!/usr/bin/env node
import { readFile } from "node:fs/promises";

import { checkResume } from "../src/index.js";

const args = process.argv.slice(2);
const json = args.includes("--json");
const textOnly = args.includes("--text");
const file = args.find((arg) => !arg.startsWith("--"));

if (!file || args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: ats-resume-text <resume.pdf> [--text] [--json]

Shows the plain text an ATS extracts from a PDF resume and flags common problems.
Runs locally: the file never leaves your machine.

  --text   print only the extracted text
  --json   print the full result as JSON`);
  process.exit(file ? 0 : 1);
}

let result;
try {
  result = await checkResume(await readFile(file));
} catch (error) {
  console.error(`Could not read ${file}: ${error.message}`);
  process.exit(1);
}

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else if (textOnly) {
  console.log(result.text);
} else {
  const rule = "-".repeat(60);
  console.log(`${rule}\nWhat the ATS sees (${result.pages} page(s), ${result.words} words)\n${rule}`);
  console.log(result.text);
  console.log(`${rule}\nFound`);
  console.log(`  Email:    ${result.email ?? "-"}`);
  console.log(`  Phone:    ${result.phone ?? "-"}`);
  console.log(`  Location: ${result.location ?? "-"}`);
  console.log(`  Link:     ${result.link ?? "-"}`);
  console.log(`  Sections: ${result.sections.join(", ") || "-"}`);
  console.log(rule);
  if (result.issues.length === 0) {
    console.log("No problems found.");
  } else {
    for (const issue of result.issues) {
      console.log(`${issue.level === "error" ? "✗" : "!"} ${issue.message}`);
    }
  }
  console.log(
    `\nTo match this resume against a job description, try the free web version:\nhttps://hiretop.com/ats-resume-checker`,
  );
}

process.exit(result.issues.some((issue) => issue.level === "error") ? 2 : 0);
