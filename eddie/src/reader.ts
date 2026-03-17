import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INTEL_DIR = join(__dirname, '../../intel');

export function readDailyIntel(): string {
  const mdPath = join(INTEL_DIR, 'DAILY-INTEL.md');

  if (!existsSync(mdPath)) {
    throw new Error(`No intel found at ${mdPath}. Run Spock first.`);
  }

  return readFileSync(mdPath, 'utf-8');
}

export function readMemory(): string {
  const memPath = join(__dirname, '../memory/MEMORY.md');
  if (!existsSync(memPath)) return '';
  return readFileSync(memPath, 'utf-8');
}
