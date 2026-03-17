import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WATCHLIST_PATH = join(__dirname, '../../intel/watchlist.json');

export interface WatchTopic {
  name: string;
  queries: string[];
  primaryDomains?: string[];
}

export const watchlist: WatchTopic[] = existsSync(WATCHLIST_PATH)
  ? JSON.parse(readFileSync(WATCHLIST_PATH, 'utf-8'))
  : [];
