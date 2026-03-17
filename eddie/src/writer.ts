import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { DraftSet, LinkedInDraft, XDraft } from './content.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = join(__dirname, '../../intel/drafts');
const MEMORY_DIR = join(__dirname, '../memory');

function renderLinkedIn(draft: LinkedInDraft, index: number): string {
  return [
    `### LinkedIn Draft ${index + 1} — ${draft.angle}`,
    `_Source: ${draft.source_brief}_`,
    '',
    draft.post,
    '',
    '---',
    '',
  ].join('\n');
}

function renderX(draft: XDraft, index: number): string {
  return [
    `### X Draft ${index + 1} — ${draft.angle}`,
    `_Source: ${draft.source_brief}_`,
    '',
    ...draft.tweets.map((t, i) => `**${i + 1}.** ${t}`),
    '',
    '---',
    '',
  ].join('\n');
}

export function saveDrafts(drafts: DraftSet): void {
  const dir = join(DRAFTS_DIR, drafts.date);
  mkdirSync(dir, { recursive: true });

  // LinkedIn drafts
  const linkedinLines = [
    `# LinkedIn Drafts — ${drafts.date}`,
    '',
    ...drafts.linkedin.map((d, i) => renderLinkedIn(d, i)),
  ];
  writeFileSync(join(dir, 'linkedin.md'), linkedinLines.join('\n'));
  console.log(`Eddie: wrote linkedin.md`);

  // X drafts
  const xLines = [
    `# X Drafts — ${drafts.date}`,
    '',
    ...drafts.x.map((d, i) => renderX(d, i)),
  ];
  writeFileSync(join(dir, 'x.md'), xLines.join('\n'));
  console.log(`Eddie: wrote x.md`);

  // structured JSON for the review UI
  writeFileSync(join(dir, 'drafts.json'), JSON.stringify(drafts, null, 2));
  console.log(`Eddie: wrote drafts.json`);
}

export function saveDailyMemory(date: string, notes: string): void {
  mkdirSync(MEMORY_DIR, { recursive: true });
  writeFileSync(join(MEMORY_DIR, `${date}.md`), notes);
}

export function updateMemory(lesson: string): void {
  mkdirSync(MEMORY_DIR, { recursive: true });
  const memPath = join(MEMORY_DIR, 'MEMORY.md');
  const existing = existsSync(memPath) ? readFileSync(memPath, 'utf-8') : '# Eddie Memory\n\n';
  writeFileSync(memPath, `${existing}\n${lesson}`);
}
