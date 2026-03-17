import { Resend } from 'resend';
import type { DigestOutput, Brief } from './brief.js';

const resend = new Resend(process.env.RESEND_API_KEY);

function confidenceBadge(level: 'High' | 'Medium' | 'Low'): string {
  const colors: Record<string, string> = {
    High: '#2d6a4f',
    Medium: '#b5783a',
    Low: '#9b2335',
  };
  return `<span style="display:inline-block;padding:2px 8px;border-radius:3px;font-size:11px;font-weight:600;letter-spacing:0.05em;background:${colors[level]}20;color:${colors[level]};border:1px solid ${colors[level]}40">${level} confidence</span>`;
}

function renderBullets(items: string[]): string {
  if (!items.length) return '';
  return `<ul style="margin:8px 0 0 0;padding-left:18px;color:#444;">${items.map((b) => `<li style="margin-bottom:4px;font-size:14px;line-height:1.5">${b}</li>`).join('')}</ul>`;
}

function renderSources(brief: Brief): string {
  const sections: string[] = [];

  if (brief.sources.primary.length) {
    sections.push(
      `<div style="margin-top:4px"><span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#888">Primary</span><ul style="margin:4px 0 0 0;padding-left:18px">${brief.sources.primary.map((s) => `<li style="font-size:13px;color:#555;margin-bottom:2px"><a href="${s.url}" style="color:#333;text-decoration:underline">${s.name}</a>${s.establishes ? ` — ${s.establishes}` : ''}</li>`).join('')}</ul></div>`
    );
  }

  if (brief.sources.secondary.length) {
    sections.push(
      `<div style="margin-top:6px"><span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#888">Secondary</span><ul style="margin:4px 0 0 0;padding-left:18px">${brief.sources.secondary.map((s) => `<li style="font-size:13px;color:#555;margin-bottom:2px"><a href="${s.url}" style="color:#333;text-decoration:underline">${s.name}</a>${s.context ? ` — ${s.context}` : ''}</li>`).join('')}</ul></div>`
    );
  }

  if (brief.sources.unverified.length) {
    sections.push(
      `<div style="margin-top:6px"><span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#c0392b">Unverified</span><ul style="margin:4px 0 0 0;padding-left:18px">${brief.sources.unverified.map((s) => `<li style="font-size:13px;color:#555;margin-bottom:2px"><a href="${s.url}" style="color:#333;text-decoration:underline">${s.name}</a>${s.suggests ? ` — ${s.suggests}` : ''}</li>`).join('')}</ul></div>`
    );
  }

  return sections.join('');
}

function renderBrief(brief: Brief, index: number): string {
  return `
  <div style="margin-bottom:40px;padding-bottom:40px;border-bottom:1px solid #e5e5e5">
    <div style="margin-bottom:10px">
      <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#9b9b9b">${brief.topic}</span>
    </div>
    <h2 style="margin:0 0 10px 0;font-size:18px;font-weight:400;color:#111;line-height:1.3">${index + 1}. ${brief.title}</h2>
    <div style="margin-bottom:8px">${confidenceBadge(brief.confidence.level)} <span style="font-size:12px;color:#888;margin-left:8px">${brief.confidence.explanation}</span></div>

    <h4 style="margin:16px 0 4px 0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#555">Summary</h4>
    ${renderBullets(brief.summary)}

    <h4 style="margin:14px 0 4px 0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#555">Why it matters</h4>
    ${renderBullets(brief.why_it_matters)}

    ${brief.key_facts.length ? `<h4 style="margin:14px 0 4px 0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#555">Key facts</h4>${renderBullets(brief.key_facts)}` : ''}

    ${brief.evidence.length ? `<h4 style="margin:14px 0 4px 0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#555">Evidence</h4>${renderBullets(brief.evidence)}` : ''}

    <h4 style="margin:14px 0 4px 0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#555">Sources</h4>
    ${renderSources(brief)}

    ${brief.open_questions.length ? `<h4 style="margin:14px 0 4px 0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#555">Open questions</h4>${renderBullets(brief.open_questions)}` : ''}

    ${brief.suggested_use?.eddie ? `<div style="margin-top:14px;padding:10px 14px;background:#f5f5f5;border-left:3px solid #9b9b9b"><span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#888">For Eddie → </span><span style="font-size:13px;color:#555">${brief.suggested_use.eddie}</span></div>` : ''}
  </div>`;
}

export async function sendDigest(digest: DigestOutput): Promise<void> {
  const dateFormatted = new Date(digest.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });

  const briefCount = digest.briefs.length;
  const subject = `Spock — ${dateFormatted} · ${briefCount} brief${briefCount !== 1 ? 's' : ''}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:640px;margin:0 auto;background:#fff">

    <!-- Header -->
    <div style="padding:32px 40px 24px;border-bottom:2px solid #111">
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#9b9b9b;margin-bottom:6px">Daily Intel</div>
      <div style="font-size:24px;font-weight:300;color:#111">${dateFormatted}</div>
      <div style="margin-top:8px;font-size:13px;color:#888">${briefCount} brief${briefCount !== 1 ? 's' : ''} · ${digest.noise_filtered} items filtered as noise</div>
    </div>

    <!-- Briefs -->
    <div style="padding:32px 40px">
      ${digest.briefs.map((b, i) => renderBrief(b, i)).join('')}
    </div>

    <!-- Footer -->
    <div style="padding:24px 40px;border-top:1px solid #e5e5e5;background:#f9f9f9">
      <div style="font-size:11px;color:#aaa;text-align:center;letter-spacing:0.05em">Spock · Research Intelligence · blankspace</div>
    </div>

  </div>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: 'Spock <tony@goblankspace.com>',
    to: ['tony@goblankspace.com'],
    subject,
    html,
  });

  if (error) {
    throw new Error(`Resend failed: ${JSON.stringify(error)}`);
  }

  console.log(`Spock: digest sent — "${subject}"`);
}
