export interface Issue {
  level: "error" | "warn";
  code: string;
  message: string;
}

export interface Analysis {
  words: number;
  email: string | null;
  phone: string | null;
  location: string | null;
  link: string | null;
  sections: string[];
  garbled: number;
  issues: Issue[];
}

export interface CheckResult extends Analysis {
  text: string;
  pages: number;
}

export function extractText(data: Uint8Array | ArrayBuffer): Promise<{ text: string; pages: string[] }>;
export function analyze(text: string): Analysis;
export function checkResume(data: Uint8Array | ArrayBuffer): Promise<CheckResult>;

export function findEmail(text: string): string | null;
export function findPhone(text: string): string | null;
export function findLocation(text: string): string | null;
export function findLink(text: string): string | null;
export function findSections(text: string): string[];
export function countGarbled(text: string): number;
