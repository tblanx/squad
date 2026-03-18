import Anthropic from '@anthropic-ai/sdk';
import type { RawResult } from './research.js';

export interface Source {
  name: string;
  url: string;
  establishes?: string;
  context?: string;
  suggests?: string;
}

export interface Brief {
  title: string;
  topic: string;
  summary: string[];
  why_it_matters: string[];
  key_facts: string[];
  evidence: string[];
  sources: {
    primary: Source[];
    secondary: Source[];
    unverified: Source[];
  };
  confidence: {
    level: 'High' | 'Medium' | 'Low';
    explanation: string;
  };
  open_questions: string[];
  suggested_use: {
    eddie?: string;
  };
}

export interface DigestOutput {
  date: string;
  briefs: Brief[];
  noise_filtered: number;
}

const SYSTEM_PROMPT = `You are Spock — a research intelligence agent. Thorough, disciplined, allergic to fluff. You are not here to impress. You are here to know.

## Principles
- Never make things up. Mark uncertain claims [UNVERIFIED].
- Signal over noise. Not everything trending matters.
- Sources or it didn't happen. Distinguish primary from commentary.
- Organize for use. Structured, skimmable, sorted by confidence.
- Seriousness over speed. Correct beats fast.

## Source Tiers
- Tier 1 (Primary): Official blogs, announcements, docs, changelogs, papers
- Tier 2 (Secondary): Reputable industry publications, strong technical analysis
- Tier 3 (Weak): Social posts, screenshots, unattributed claims — label [UNVERIFIED]

## What is worth surfacing
Surface an item only if at least one is true:
- It changes what operators should believe
- It changes what operators are building
- It creates a real content opportunity
- It reveals a repeated pain point worth solving

## What to ignore
Generic hype, low-effort rewrites, shallow listicles, unsourced benchmarks, drama without operational relevance.

## Output
Respond ONLY with valid JSON matching this exact schema. No markdown, no preamble.

{
  "date": "YYYY-MM-DD",
  "briefs": [
    {
      "title": "string",
      "topic": "string",
      "summary": ["string"],
      "why_it_matters": ["string"],
      "key_facts": ["string"],
      "evidence": ["string"],
      "sources": {
        "primary": [{ "name": "string", "url": "string", "establishes": "string" }],
        "secondary": [{ "name": "string", "url": "string", "context": "string" }],
        "unverified": [{ "name": "string", "url": "string", "suggests": "string" }]
      },
      "confidence": { "level": "High|Medium|Low", "explanation": "string" },
      "open_questions": ["string"],
      "suggested_use": { "eddie": "string" }
    }
  ],
  "noise_filtered": 0
}

Produce briefs for the top 3-5 most significant items only. If nothing meets the bar, return a single brief titled "No significant signal today" explaining why.`;

export async function generateBriefs(results: RawResult[]): Promise<DigestOutput> {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  const researchBlock = results
    .map(
      (r, i) =>
        `[${i + 1}] Topic: ${r.topic}
Title: ${r.title}
URL: ${r.url}
Published: ${r.published_date ?? 'unknown'}
Relevance score: ${r.score.toFixed(2)}
Content: ${r.content}`
    )
    .join('\n\n---\n\n');

  const client = new Anthropic();
  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 8096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Today is ${today}. Here are ${results.length} raw research results from the past 24 hours. Analyze, filter for signal, and produce briefs for the top 3-5 most significant items.\n\n${researchBlock}`,
      },
    ],
  });

  const raw = message.content[0].type === 'text' ? message.content[0].text : '';

  // extract JSON object regardless of surrounding markdown/fences
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  const cleaned = start !== -1 && end !== -1 ? raw.slice(start, end + 1) : raw;

  try {
    return JSON.parse(cleaned) as DigestOutput;
  } catch {
    // fallback if Claude returns malformed JSON
    return {
      date: today,
      briefs: [
        {
          title: 'Parse error — raw output below',
          topic: 'System',
          summary: [raw.slice(0, 500)],
          why_it_matters: [],
          key_facts: [],
          evidence: [],
          sources: { primary: [], secondary: [], unverified: [] },
          confidence: { level: 'Low', explanation: 'JSON parse failed' },
          open_questions: ['Check raw Claude output'],
          suggested_use: {},
        },
      ],
      noise_filtered: 0,
    };
  }
}
