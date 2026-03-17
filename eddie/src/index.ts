import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../../.env') });
import { readDailyIntel, readMemory } from './reader.js';
import { generateDrafts } from './content.js';
import { saveDrafts, saveDailyMemory } from './writer.js';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('Missing env var: ANTHROPIC_API_KEY');
}

async function run() {
  const today = new Date().toISOString().split('T')[0];
  console.log('Eddie: starting content run…');

  console.log('Eddie: reading Spock intel…');
  const intel = readDailyIntel();

  console.log('Eddie: loading memory…');
  const memory = readMemory();

  console.log('Eddie: generating drafts…');
  const drafts = await generateDrafts(intel, memory, today);
  console.log(`Eddie: ${drafts.linkedin.length} LinkedIn drafts, ${drafts.x.length} X drafts`);

  console.log('Eddie: saving drafts…');
  saveDrafts(drafts);

  // save a daily memory note summarising what was produced
  saveDailyMemory(
    today,
    [
      `# ${today}`,
      '',
      '## Drafts produced',
      ...drafts.linkedin.map((d) => `- LinkedIn: ${d.angle}`),
      ...drafts.x.map((d) => `- X: ${d.angle}`),
    ].join('\n')
  );

  console.log('Eddie: done.');
}

run().catch((err) => {
  console.error('Eddie: fatal error —', err);
  process.exit(1);
});
