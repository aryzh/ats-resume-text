import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { analyze, checkResume, countGarbled, findEmail, findLocation, findPhone } from "../src/index.js";

// Fixtures are one fictional resume (Alex Morgan) exported in different layouts.
const fixture = (name) => readFile(new URL(`./fixtures/${name}`, import.meta.url));

test("single-column resume extracts in order with no issues", async () => {
  const result = await checkResume(await fixture("1-single-column.pdf"));
  assert.equal(result.pages, 1);
  assert.match(result.text, /^Alex Morgan\nData Analyst\n/);
  assert.equal(result.email, "alex.morgan@example.com");
  assert.equal(result.phone, "+34 600 123 456");
  assert.equal(result.location, "Valencia, Spain");
  assert.deepEqual(result.issues, []);
});

test("line breaks are preserved", async () => {
  const { text } = await checkResume(await fixture("1-single-column.pdf"));
  assert.ok(text.split("\n").length > 10);
  assert.ok(text.includes("\nExperience\n"));
});

test("two-column layout puts the sidebar before the main column", async () => {
  const { text } = await checkResume(await fixture("2-two-column.pdf"));
  assert.ok(text.indexOf("Skills") < text.indexOf("Summary"));
});

test("every fixture yields the contact details", async () => {
  for (const name of ["2-two-column.pdf", "3-table-layout.pdf", "5-icons-for-labels.pdf", "6-skill-bars.pdf"]) {
    const result = await checkResume(await fixture(name));
    assert.equal(result.email, "alex.morgan@example.com", name);
  }
});

test("flags a missing email and sections", () => {
  const codes = analyze("Jane Doe\nSome text without any contact details.").issues.map((i) => i.code);
  assert.ok(codes.includes("no-text"));
  assert.ok(codes.includes("no-email"));
  assert.ok(codes.includes("no-section-experience"));
});

test("flags an email that isn't near the top", () => {
  const filler = "Experience Education Skills ".repeat(30);
  const { issues } = analyze(`Jane Doe\n${filler}\njane@example.com +1 415 555 0100`);
  assert.ok(issues.some((i) => i.code === "email-not-at-top"));
});

test("helpers", () => {
  assert.equal(findEmail("mail: a.b@c.io now"), "a.b@c.io");
  assert.equal(findPhone("call 2021 to 2023"), null);
  assert.equal(findPhone("call (415) 555-0100"), "(415) 555-0100");
  assert.equal(findLocation("Jane Doe · Austin, TX"), "Austin, TX");
  assert.equal(findLocation("Email address: jane@x.com"), null);
  assert.equal(countGarbled("ok �\u0001"), 2);
});
