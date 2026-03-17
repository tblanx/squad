import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { DigestOutput, Brief } from './brief.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// resolves to squad/intel/ regardless of where npm run dev is called from
const INTEL_DIR = join(__dirname, '../../intel');
const DATA_DIR = join(INTEL_DIR, 'data');

function ensureDirs() {
  mkdirSync(DATA_DIR, { recursive: true });
}

function renderMarkdownBrief(brief: Brief, index: number): string {
  const lines: string[] = [];

  lines.push(`## ${index + 1}. ${brief.title}`);
  lines.push(`_Topic: ${brief.topic} · Confidence: ${brief.confidence.level} — ${brief.confidence.explanation}_`);
  lines.push('');

  lines.push('### Summary');
  brief.summary.forEach((b) => lines.push(`- ${b}`));
  lines.push('');

  lines.push('### Why it matters');
  brief.why_it_matters.forEach((b) => lines.push(`- ${b}`));
  lines.push('');

  if (brief.key_facts.length) {
    lines.push('### Key facts');
    brief.key_facts.forEach((b) => lines.push(`- ${b}`));
    lines.push('');
  }

  if (brief.evidence.length) {
    lines.push('### Evidence');
    brief.evidence.forEach((b) => lines.push(`- ${b}`));
    lines.push('');
  }

  lines.push('### Sources');
  if (brief.sources.primary.length) {
    lines.push('**Primary**');
    brief.sources.primary.forEach((s) =>
      lines.push(`- [${s.name}](${s.url})${s.establishes ? ` — ${s.establishes}` : ''}`)
    );
  }
  if (brief.sources.secondary.length) {
    lines.push('**Secondary**');
    brief.sources.secondary.forEach((s) =>
      lines.push(`- [${s.name}](${s.url})${s.context ? ` — ${s.context}` : ''}`)
    );
  }
  if (brief.sources.unverified.length) {
    lines.push('**Unverified**');
    brief.sources.unverified.forEach((s) =>
      lines.push(`- [${s.name}](${s.url})${s.suggests ? ` — ${s.suggests}` : ''} [UNVERIFIED]`)
    );
  }
  lines.push('');

  if (brief.open_questions.length) {
    lines.push('### Open questions');
    brief.open_questions.forEach((q) => lines.push(`- ${q}`));
    lines.push('');
  }

  if (brief.suggested_use?.eddie) {
    lines.push(`> **Eddie →** ${brief.suggested_use.eddie}`);
    lines.push('');
  }

  return lines.join('\n');
}

export function saveDigest(digest: DigestOutput): void {
  ensureDirs();

  // 1. Structured JSON — source of truth for downstream agents
  const jsonPath = join(DATA_DIR, `${digest.date}.json`);
  writeFileSync(jsonPath, JSON.stringify(digest, null, 2));
  console.log(`Spock: wrote ${jsonPath}`);

  // 2. Human-readable markdown — for review and agent handoff
  const mdLines: string[] = [
    `# Daily Intel — ${digest.date}`,
    '',
    `_${digest.briefs.length} brief${digest.briefs.length !== 1 ? 's' : ''} · ${digest.noise_filtered} items filtered as noise_`,
    '',
    '---',
    '',
    ...digest.briefs.map((b, i) => renderMarkdownBrief(b, i)),
  ];

  const mdPath = join(INTEL_DIR, 'DAILY-INTEL.md');
  writeFileSync(mdPath, mdLines.join('\n'));
  console.log(`Spock: wrote ${mdPath}`);
}
