import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../../.env') });
import { fetchResearch } from './research.js';
import { generateBriefs } from './brief.js';
import { saveDigest } from './storage.js';

const required = ['ANTHROPIC_API_KEY', 'TAVILY_API_KEY'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing env var: ${key}`);
}

async function run() {
  console.log('Spock: starting research run…');

  console.log('Spock: fetching sources…');
  const results = await fetchResearch();
  console.log(`Spock: ${results.length} unique results collected`);

  console.log('Spock: generating briefs…');
  const digest = await generateBriefs(results);
  console.log(`Spock: ${digest.briefs.length} briefs generated, ${digest.noise_filtered} filtered`);

  console.log('Spock: saving intel…');
  saveDigest(digest);

  console.log('Spock: done.');
}

run().catch((err) => {
  console.error('Spock: fatal error —', err);
  process.exit(1);
});
