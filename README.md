# ats-resume-text

See the plain text an applicant tracking system (ATS) extracts from your PDF resume, and catch the layouts that scramble it.

Most ATS don't look at your resume. They run the PDF through a text parser and work with whatever comes out. If a two-column template, a table or a text box puts your email at the bottom or your skills between two jobs, that's what the recruiter's system stores.

This tool shows you that text, in the order a parser reads it, and flags common problems. It runs locally: your file never leaves your machine.

## Usage

```bash
npx ats-resume-text resume.pdf
```

```
------------------------------------------------------------
What the ATS sees (1 page(s), 113 words)
------------------------------------------------------------
Alex Morgan
Data Analyst
alex.morgan@example.com · +34 600 123 456 · Valencia, Spain
Summary
...
------------------------------------------------------------
Found
  Email:    alex.morgan@example.com
  Phone:    +34 600 123 456
  Location: Valencia, Spain
  Link:     -
  Sections: Experience, Education, Skills, Summary
------------------------------------------------------------
No problems found.
```

Options:

- `--text` prints only the extracted text
- `--json` prints the full result as JSON

The exit code is `2` when an error-level problem is found (no text, no email, unreadable characters), so you can use it in scripts and CI for resume repos.

## What it checks

| Check | Why it matters |
|---|---|
| Almost no text extracted | The PDF is probably a scanned image. An ATS can't read it. |
| No email, or email not near the top | Contact details in a page header, sidebar or text box often end up out of order or get lost. |
| No phone number | Recruiters filter out profiles they can't contact. |
| Missing Experience, Education or Skills heading | Parsers map sections by standard headings. "My journey" won't be mapped. |
| Unreadable characters | Some fonts and icon sets don't convert to text, so the ATS stores garbage. |

The checks are heuristics. A clean result means the text came out readable, not that every ATS will parse every field correctly.

## As a library

```js
import { readFile } from "node:fs/promises";
import { checkResume, extractText, analyze } from "ats-resume-text";

const result = await checkResume(await readFile("resume.pdf"));
console.log(result.text);    // extracted text with line breaks
console.log(result.issues);  // [{ level: "warn", code: "no-phone", message: "..." }]

// Or step by step
const { text, pages } = await extractText(pdfBytes);
const analysis = analyze(text);
```

`extractText` uses [pdf.js](https://github.com/mozilla/pdf.js) and works in Node 22.13+ and in the browser (pass the file's `ArrayBuffer`).

## How the extraction works

pdf.js returns text items in content-stream order, which is the order most parsers read. The tool keeps that order and rebuilds line breaks from end-of-line markers and baseline changes. It doesn't reorder text by position on the page, because an ATS doesn't either: if your layout reads out of order here, it will likely read out of order there.

We tested one resume in 7 layouts (one column, sidebar, table, text boxes and others) and published the results: [Can an ATS read columns, tables and text boxes?](https://hiretop.com/blog/can-ats-read-columns-tables-text-boxes/) The PDFs in `test/fixtures` come from that test and use a fictional candidate.

## Match against a job description

This package checks how your resume reads. To compare it with a specific job (missing keywords, which requirements your resume backs up), use the free web version: [Hiretop ATS Resume Checker](https://hiretop.com/ats-resume-checker). No signup.

## Contributing

Issues and pull requests are welcome, especially PDFs that extract badly (remove personal details first) and better heuristics for names, locations and dates.

```bash
npm install
npm test
```

## License

MIT, by [Hiretop](https://hiretop.com).
