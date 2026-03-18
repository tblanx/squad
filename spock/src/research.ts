import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { watchlist } from './watchlist.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CUSTOM_SOURCES_PATH = join(__dirname, '../../intel/custom-sources.json');

interface CustomSources {
  topics: { id: string; label: string }[];
  sources: { id: string; label: string; url: string }[];
}

function loadCustomSources(): CustomSources {
  if (!existsSync(CUSTOM_SOURCES_PATH)) return { topics: [], sources: [] };
  return JSON.parse(readFileSync(CUSTOM_SOURCES_PATH, 'utf-8'));
}

export interface RawResult {
  topic: string;
  title: string;
  url: string;
  content: string;
  published_date?: string;
  score: number;
}

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

interface TavilyResponse {
  results: TavilyResult[];
}

async function tavilySearch(
  query: string,
  includeDomains?: string[]
): Promise<TavilyResult[]> {
  const body: Record<string, unknown> = {
    api_key: process.env.TAVILY_API_KEY,
    query,
    search_depth: 'advanced',
    max_results: 5,
    days: 3,
  };

  if (includeDomains?.length) {
    body.include_domains = includeDomains;
  }

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.warn(`Tavily: "${query}" → ${res.status}`);
      return [];
    }

    const data = (await res.json()) as TavilyResponse;
    return data.results ?? [];
  } catch (err) {
    console.warn(`Tavily: "${query}" failed →`, err);
    return [];
  }
}

export async function fetchResearch(): Promise<RawResult[]> {
  const seen = new Set<string>();
  const results: RawResult[] = [];
  const custom = loadCustomSources();

  // build search list: base watchlist + custom topics + custom source domains
  const customDomains = custom.sources.map((s) => s.url);

  const allTopics = [
    ...watchlist,
    // custom topics become their own search queries
    ...custom.topics.map((t) => ({ name: t.label, queries: [t.label], primaryDomains: undefined })),
  ];

  for (const topic of allTopics) {
    const pinnedDomains = topic.primaryDomains?.length
      ? [...topic.primaryDomains, ...customDomains]
      : customDomains.length ? customDomains : undefined;

    for (const query of topic.queries) {
      // always run an open search (no domain restriction)
      const openHits = await tavilySearch(query);
      await new Promise((r) => setTimeout(r, 400));

      // if domains are pinned, also run a domain-restricted search to surface preferred sources
      const pinnedHits = pinnedDomains?.length
        ? await tavilySearch(query, pinnedDomains)
        : [];
      if (pinnedDomains?.length) await new Promise((r) => setTimeout(r, 400));

      // pinned hits first (higher priority), then open hits
      for (const hit of [...pinnedHits, ...openHits]) {
        if (seen.has(hit.url)) continue;
        seen.add(hit.url);

        results.push({
          topic: topic.name,
          title: hit.title,
          url: hit.url,
          content: hit.content.slice(0, 400),
          published_date: hit.published_date,
          score: hit.score,
        });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
