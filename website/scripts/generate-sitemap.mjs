// Generates public/sitemap.xml for https://ronakbyali.com.
//
// Runs before `vite build` (see the "build" and "sitemap" scripts in package.json).
// It reads every product from the public Appwrite products table using only the
// public client identifiers (no API key, no secret), merges the product URLs with
// the static pages, and writes the XML. If anything goes wrong it prints a warning,
// keeps the existing public/sitemap.xml, and still exits with code 0 so a deploy
// never fails because of the sitemap.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_URL = 'https://ronakbyali.com';
const PAGE_SIZE = 100; // Appwrite returns at most 100 rows per request
const MAX_PAGES = 500; // safety stop: 50,000 products
const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 15000;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_FILE = resolve(ROOT, 'public', 'sitemap.xml');

// Same pages and priorities as the previous hand-written public/sitemap.xml.
// lastmod is left out on purpose: stamping every static page with the build date
// would claim that all of them change on every deploy.
const STATIC_PAGES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/products', changefreq: 'weekly', priority: '0.9' },
  { path: '/p/custom-studio', changefreq: 'monthly', priority: '0.8' },
  { path: '/p/faqs', changefreq: 'monthly', priority: '0.6' },
  { path: '/p/contact', changefreq: 'yearly', priority: '0.6' },
  { path: '/p/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/p/disclaimer', changefreq: 'yearly', priority: '0.3' },
];

const PRODUCT_CHANGEFREQ = 'weekly';
const PRODUCT_PRIORITY = '0.7';

// First URL segments that App.jsx already uses for non-product routes. A product
// slug equal to one of these would never reach the product page, so it is skipped.
const RESERVED_FIRST_SEGMENTS = new Set([
  'products',
  'contact',
  'privacy',
  'disclaimer',
  'faqs',
  'custom-studio',
  'p',
  'customize',
  'auth',
  'team',
  'welcome-back',
  'create-account',
]);

// ---------- Environment ----------

function parseEnvFile(text) {
  const values = {};
  for (const rawLine of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.lastIndexOf(quote) > 0) {
      value = value.slice(1, value.lastIndexOf(quote));
    } else {
      value = value.replace(/\s+#.*$/, '');
    }
    values[match[1]] = value;
  }
  return values;
}

// Priority: real environment (Vercel) > .env.local > .env, like Vite.
function loadEnvironment() {
  const fromFiles = {};
  for (const name of ['.env', '.env.local']) {
    const file = resolve(ROOT, name);
    if (!existsSync(file)) continue;
    try {
      Object.assign(fromFiles, parseEnvFile(readFileSync(file, 'utf8')));
    } catch (error) {
      warn(`could not read ${name}: ${error.message}`);
    }
  }
  return { ...fromFiles, ...process.env };
}

// Accepts RONAK_BY_ALI_<NAME> and the VITE_ prefixed spelling of the same name.
function readSetting(env, name) {
  for (const key of [`RONAK_BY_ALI_${name}`, `VITE_RONAK_BY_ALI_${name}`]) {
    const value = typeof env[key] === 'string' ? env[key].trim() : '';
    if (value) return value;
  }
  return '';
}

function loadConfig() {
  const env = loadEnvironment();
  const names = { endpoint: 'URL', projectId: 'PROJECT_ID', databaseId: 'DATABASE_ID', tableId: 'PRODUCTS_TABLE_ID' };
  const config = {};
  const missing = [];
  for (const [field, name] of Object.entries(names)) {
    config[field] = readSetting(env, name);
    if (!config[field]) missing.push(`RONAK_BY_ALI_${name}`);
  }
  if (missing.length) {
    throw new Error(`missing environment variables: ${missing.join(', ')}`);
  }
  let endpoint;
  try {
    endpoint = new URL(config.endpoint);
  } catch {
    throw new Error('RONAK_BY_ALI_URL is not a valid URL');
  }
  if (endpoint.protocol !== 'https:' && endpoint.protocol !== 'http:') {
    throw new Error('RONAK_BY_ALI_URL must start with https://');
  }
  config.endpoint = config.endpoint.replace(/\/+$/, '');
  return config;
}

// ---------- Appwrite ----------

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function requestRows(config, cursor) {
  const queries = [
    { method: 'select', values: ['$id', 'slug', '$updatedAt'] },
    { method: 'limit', values: [PAGE_SIZE] },
  ];
  if (cursor) queries.push({ method: 'cursorAfter', values: [cursor] });

  const url = new URL(
    `${config.endpoint}/tablesdb/${encodeURIComponent(config.databaseId)}/tables/${encodeURIComponent(config.tableId)}/rows`
  );
  for (const query of queries) url.searchParams.append('queries[]', JSON.stringify(query));

  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'X-Appwrite-Project': config.projectId,
          Origin: SITE_URL,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      let body = null;
      try {
        body = await response.json();
      } catch {
        // handled below
      }

      if (response.ok) {
        if (!body || !Array.isArray(body.rows)) {
          throw new Error('Appwrite answered, but the response has no "rows" list');
        }
        return body;
      }

      const detail = body?.message ? `: ${body.message}` : '';
      const error = new Error(`Appwrite returned HTTP ${response.status}${detail}`);
      // 4xx (except 429) will not fix itself on retry: wrong IDs, no read permission, etc.
      error.retryable = response.status >= 500 || response.status === 429;
      throw error;
    } catch (error) {
      lastError = error;
      const retryable = error.retryable !== false && !/no "rows" list/.test(error.message);
      if (!retryable || attempt === MAX_ATTEMPTS) break;
      await sleep(1000 * attempt);
    }
  }
  throw lastError;
}

async function fetchAllProducts(config) {
  const rows = [];
  let cursor = null;
  let total = null;

  for (let page = 0; page < MAX_PAGES; page++) {
    const body = await requestRows(config, cursor);
    if (total === null && Number.isFinite(body.total)) total = body.total;
    rows.push(...body.rows);

    if (body.rows.length < PAGE_SIZE) {
      if (total !== null && rows.length < total) {
        throw new Error(`incomplete product list (got ${rows.length} of ${total})`);
      }
      return rows;
    }
    cursor = body.rows[body.rows.length - 1].$id;
    if (!cursor) throw new Error('a product row has no $id, cannot continue paging');
  }
  throw new Error(`stopped after ${MAX_PAGES} pages of ${PAGE_SIZE} products`);
}

// ---------- Sitemap ----------

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toLastmod(value) {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value || ''));
  return match ? match[1] : '';
}

// The products table has no active / published / visible / archived column.
// `status` is only inStock / outOfStock, and the storefront serves a product page
// for both (ProductService.getProductBySlug has no status filter), so every row
// with a usable slug is public.
function buildProductEntries(rows) {
  const entries = [];
  const skipped = { noSlug: 0, reserved: 0, duplicate: 0 };
  const seen = new Set();

  for (const row of rows) {
    const slug = typeof row?.slug === 'string' ? row.slug.trim() : '';
    if (!slug) {
      skipped.noSlug++;
      continue;
    }
    if (slug.startsWith('@') || RESERVED_FIRST_SEGMENTS.has(slug.toLowerCase())) {
      skipped.reserved++;
      continue;
    }
    // Canonical product URL: the short form /:slug (PATHS.productShort).
    const path = `/${encodeURIComponent(slug)}`;
    if (seen.has(path)) {
      skipped.duplicate++;
      continue;
    }
    seen.add(path);
    entries.push({
      path,
      lastmod: toLastmod(row.$updatedAt),
      changefreq: PRODUCT_CHANGEFREQ,
      priority: PRODUCT_PRIORITY,
    });
  }

  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return { entries, skipped };
}

function buildXml(staticEntries, productEntries) {
  const seen = new Set();
  const blocks = [];
  for (const entry of [...staticEntries, ...productEntries]) {
    if (seen.has(entry.path)) continue;
    seen.add(entry.path);
    const lines = [`    <loc>${escapeXml(SITE_URL + entry.path)}</loc>`];
    if (entry.lastmod) lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
    lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    lines.push(`    <priority>${entry.priority}</priority>`);
    blocks.push(`  <url>\n${lines.join('\n')}\n  </url>`);
  }
  return {
    count: blocks.length,
    xml:
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      blocks.join('\n') +
      '\n</urlset>\n',
  };
}

function writeSitemap(xml) {
  mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
  const temporary = `${OUTPUT_FILE}.tmp`;
  writeFileSync(temporary, xml, 'utf8');
  renameSync(temporary, OUTPUT_FILE);
}

// ---------- Run ----------

function warn(message) {
  console.warn(`[sitemap] WARNING: ${message}`);
}

function keepExistingOrWriteStatic(reason) {
  warn(reason);
  if (existsSync(OUTPUT_FILE)) {
    warn('keeping the existing public/sitemap.xml unchanged.');
    return;
  }
  const { xml } = buildXml(STATIC_PAGES, []);
  writeSitemap(xml);
  warn('no sitemap existed, so a static-pages-only public/sitemap.xml was written.');
}

async function main() {
  let rows;
  try {
    const config = loadConfig();
    rows = await fetchAllProducts(config);
  } catch (error) {
    keepExistingOrWriteStatic(`could not load products from Appwrite (${error.message}).`);
    return;
  }

  const { entries, skipped } = buildProductEntries(rows);
  const { xml, count } = buildXml(STATIC_PAGES, entries);
  writeSitemap(xml);

  console.log(`Sitemap generated: ${count - entries.length} static pages + ${entries.length} products (${count} URLs) -> public/sitemap.xml`);
  const notes = [];
  if (skipped.noSlug) notes.push(`${skipped.noSlug} without a slug`);
  if (skipped.reserved) notes.push(`${skipped.reserved} with a slug that clashes with a site route`);
  if (skipped.duplicate) notes.push(`${skipped.duplicate} duplicate slug`);
  if (notes.length) warn(`skipped products: ${notes.join(', ')}.`);
}

main().catch((error) => {
  try {
    keepExistingOrWriteStatic(`unexpected error (${error.message}).`);
  } catch (inner) {
    warn(`unexpected error (${inner.message}); sitemap left as it was.`);
  }
});