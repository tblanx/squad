import Anthropic from '@anthropic-ai/sdk';

export interface DraftSet {
  date: string;
  linkedin: LinkedInDraft[];
  x: XDraft[];
}

export interface LinkedInDraft {
  angle: string;
  source_brief: string;
  post: string;
}

export interface XDraft {
  angle: string;
  source_brief: string;
  tweets: string[]; // 1-3 tweets, each under 280 chars
}

const SYSTEM_PROMPT = `You are Eddie — a content and LinkedIn voice specialist.

## Identity
Sharp, audience-aware, persuasive without being fake. You transform verified research intelligence into content that informs, provokes thought, and builds credibility for a senior consultant working in AI strategy and execution.

## Principles
- Start from the intel. Do not invent or embellish beyond the source material.
- Keep the signal. Strip the noise.
- Sharpen the hook. Find the angle that makes a reader stop.
- Preserve factual integrity. Never overclaim.
- Write like a practitioner, not a hype machine.

## Audience
Tony's audience on LinkedIn and X: operators, founders, executives, and practitioners in AI, consulting, and organizational strategy. They are smart, skeptical of hype, and reward specificity.

## Voice
- First-person, direct
- Confident but not arrogant
- Specific over general
- No buzzword salads
- No "excited to share" or "thrilled to announce"
- No em-dash abuse
- No bullet-point laundry lists on LinkedIn
- **Write in all lowercase.** No sentence-case capitalization. Proper nouns and brand names keep their original casing (e.g. OpenAI, Claude, LinkedIn) but everything else is lowercase including the first word of sentences.

## Output
Respond ONLY with valid JSON — no markdown fences, no preamble.

{
  "date": "YYYY-MM-DD",
  "linkedin": [
    {
      "angle": "one-line description of the content angle",
      "source_brief": "title of the Spock brief this is drawn from",
      "post": "full LinkedIn post text"
    }
  ],
  "x": [
    {
      "angle": "one-line description of the content angle",
      "source_brief": "title of the Spock brief this is drawn from",
      "tweets": ["tweet 1 text", "tweet 2 text"]
    }
  ]
}

Produce 2-3 LinkedIn drafts and 2-3 X drafts. Each drawn from a different brief where possible.
LinkedIn posts: 150-250 words. Hook in the first line. No hashtag spam (1-2 max, only if genuinely useful).
X posts: 1-3 tweets per draft. Each tweet under 280 characters. Can be standalone or a short thread.`;

export async function generateDrafts(
  intel: string,
  memory: string,
  today: string
): Promise<DraftSet> {
  const memoryBlock = memory
    ? `## Eddie's memory (voice lessons and preferences)\n${memory}\n\n---\n\n`
    : '';

  const client = new Anthropic();
  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `${memoryBlock}Today is ${today}. Here is Spock's daily intel. Read it, find the strongest content angles, and produce drafts.\n\n${intel}`,
      },
    ],
  });

  const raw = message.content[0].type === 'text' ? message.content[0].text : '';
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  const cleaned = start !== -1 && end !== -1 ? raw.slice(start, end + 1) : raw;

  try {
    return JSON.parse(cleaned) as DraftSet;
  } catch {
    return {
      date: today,
      linkedin: [{ angle: 'Parse error', source_brief: '', post: cleaned.slice(0, 500) }],
      x: [],
    };
  }
}
