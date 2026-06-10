// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
//
// generate-resource-pages.mjs — build-time static SEO pages for the resource library.
//
// Runs as `postbuild` (after `vite build`). Bundles src/lib/resource-content.ts
// (single source of truth — content is NEVER duplicated here) to a temp ESM file,
// imports it, and emits:
//   build/resources/<slug>/index.html   one crawlable page per article
//   build/resources/index.html          category-grouped library index
//   build/sitemap-resources.xml         sitemap for all of the above
//
// FREE articles render in full. PREMIUM articles render the first ~25% of the
// body, then a "Continue reading free in the Aminy app" CTA — the acquisition gate.
//
// Bundler note: this repo is on Vite 8 (rolldown-vite) — esbuild is NOT in
// node_modules. rolldown is the bundler that ships with vite here, so we use it
// for the TS→ESM step. Node built-ins + rolldown only; no new dependencies.
//
// Netlify routing note (verified 2026-06-09): netlify.toml has the SPA rule
//   [[redirects]]  from = "/*"  to = "/index.html"  status = 200
// with NO `force = true`. Per Netlify docs, an unforced 200 rewrite only applies
// when no file exists at the requested path — so the static files emitted here at
// /resources/.../index.html are served as-is and the SPA rewrite never fires for
// them. No extra redirect rules are needed. If that rule is ever changed to
// `status = 200!` (forced), explicit `/resources/*` passthrough rules must be
// added ABOVE it or these pages will silently stop being served.

import { build } from 'rolldown';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'build');
const SITE = 'https://aminy.ai';
const OG_IMAGE = `${SITE}/pwa-512x512.png`;
const BUILD_DATE = new Date().toISOString().slice(0, 10);
const PREMIUM_PREVIEW_RATIO = 0.25;

// ── Load content from the single source of truth ─────────────────────────────

async function loadResources() {
  const tmp = await mkdtemp(join(tmpdir(), 'aminy-resgen-'));
  const bundle = join(tmp, 'resource-content.mjs');
  try {
    await build({
      input: join(ROOT, 'src/lib/resource-content.ts'),
      output: { file: bundle, format: 'esm' },
      logLevel: 'silent',
    });
    return await import(pathToFileURL(bundle).href);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

// ── Markdown-ish body → semantic HTML ─────────────────────────────────────────

function escapeHtml(s) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** Inline formatting: **bold** → <strong>, *italic* → <em>, \_ → _ */
function inline(s) {
  return escapeHtml(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replaceAll('\\_', '_');
}

/**
 * Parse the markdown-ish `body` into a flat list of HTML block elements.
 * Patterns used in resource-content.ts:
 *   **Heading**            (full line)        → h2
 *   *Sub-heading*          (full line)        → h3   (parentheticals stay <em>)
 *   • item / - item                           → ul
 *   1. item                                   → ol
 *   anything else                             → p
 */
function bodyToBlocks(body) {
  const blocks = [];
  let list = null; // { tag: 'ul'|'ol', items: [] }

  const flushList = () => {
    if (list) {
      blocks.push(`<${list.tag}>${list.items.map(i => `<li>${i}</li>`).join('')}</${list.tag}>`);
      list = null;
    }
  };
  const pushItem = (tag, text) => {
    if (!list || list.tag !== tag) { flushList(); list = { tag, items: [] }; }
    list.items.push(inline(text));
  };

  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line) { flushList(); continue; }

    let m;
    if ((m = line.match(/^\*\*(.+)\*\*$/))) {
      flushList();
      blocks.push(`<h2>${inline(m[1])}</h2>`);
    } else if ((m = line.match(/^\*([^*].*)\*$/)) && !line.startsWith('*(')) {
      flushList();
      blocks.push(`<h3>${inline(m[1])}</h3>`);
    } else if ((m = line.match(/^[•-]\s+(.*)$/))) {
      pushItem('ul', m[1]);
    } else if ((m = line.match(/^\d+\.\s+(.*)$/))) {
      pushItem('ol', m[1]);
    } else {
      flushList();
      blocks.push(`<p>${inline(line)}</p>`);
    }
  }
  flushList();
  return blocks;
}

// ── Shared page chrome ────────────────────────────────────────────────────────

const CSS = `
  :root { --ink: #0D1B2A; --green: #43AA8B; --paper: #F8F8F6; --muted: #577590; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--paper); color: var(--ink);
    font: 17px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased; }
  header.site { background: var(--ink); padding: 14px 20px; }
  header.site a { color: #fff; font-size: 20px; font-weight: 700; text-decoration: none; letter-spacing: 0.5px; }
  header.site a span { color: var(--green); }
  main { max-width: 680px; margin: 0 auto; padding: 28px 20px 48px; }
  h1 { font-size: 28px; line-height: 1.25; margin: 0 0 6px; }
  h2 { font-size: 21px; margin: 28px 0 10px; }
  h3 { font-size: 18px; margin: 22px 0 8px; }
  p { margin: 0 0 14px; }
  ul, ol { margin: 0 0 16px; padding-left: 24px; }
  li { margin-bottom: 6px; }
  a { color: var(--green); }
  .subtitle { color: var(--muted); font-size: 18px; margin: 0 0 10px; }
  .meta { color: var(--muted); font-size: 14px; margin-bottom: 24px; }
  .meta .badge { background: var(--green); color: #fff; border-radius: 10px; padding: 2px 9px;
    font-size: 12px; font-weight: 600; margin-left: 8px; vertical-align: 1px; }
  .gate { margin: 32px 0; padding: 26px 22px; border-radius: 14px; text-align: center;
    background: var(--ink); color: #fff; }
  .gate h2 { margin: 0 0 8px; font-size: 20px; }
  .gate p { color: #cfd8e0; font-size: 15px; margin: 0 0 18px; }
  .gate a.btn, footer.site a.btn { display: inline-block; background: var(--green); color: #fff;
    font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 999px; }
  .fade { position: relative; }
  .fade::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 90px;
    background: linear-gradient(rgba(248,248,246,0), var(--paper)); }
  .related { margin-top: 36px; border-top: 1px solid #dfe3e0; padding-top: 20px; }
  .related h2 { margin-top: 0; }
  .card { display: block; background: #fff; border: 1px solid #e3e6e2; border-radius: 12px;
    padding: 14px 16px; margin-bottom: 10px; text-decoration: none; color: var(--ink); }
  .card strong { display: block; }
  .card span { color: var(--muted); font-size: 14px; }
  .cat { margin-top: 30px; }
  footer.site { background: var(--ink); color: #cfd8e0; text-align: center; padding: 36px 20px 44px; }
  footer.site p { max-width: 480px; margin: 0 auto 18px; }
  footer.site .brand { color: #fff; font-weight: 700; }
`.replace(/\n\s+/g, '\n  ').trim();

function page({ title, description, canonical, ogType, jsonLd, bodyHtml }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <meta property="og:type" content="${ogType}">
  <meta property="og:site_name" content="Aminy">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${OG_IMAGE}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${OG_IMAGE}">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <style>
  ${CSS}
  </style>
</head>
<body>
  <header class="site"><a href="/">Aminy<span>.</span></a></header>
  <main>
${bodyHtml}
  </main>
  <footer class="site">
    <p><span class="brand">Aminy</span> — the AI care companion for autism families. Start free.</p>
    <a class="btn" href="${SITE}/">Start free</a>
  </footer>
</body>
</html>
`;
}

// ── Article pages ─────────────────────────────────────────────────────────────

function articleJsonLd(r, canonical) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: r.title,
    description: r.subtitle,
    url: canonical,
    mainEntityOfPage: canonical,
    image: OG_IMAGE,
    articleSection: r.category,
    keywords: r.tags.join(', '),
    timeRequired: `PT${r.readTimeMinutes}M`,
    isAccessibleForFree: !r.isPremium,
    datePublished: BUILD_DATE,
    dateModified: BUILD_DATE,
    author: { '@type': 'Organization', name: r.author || 'Aminy BCBA Team' },
    publisher: { '@type': 'Organization', name: 'Aminy', url: SITE, logo: { '@type': 'ImageObject', url: OG_IMAGE } },
    ...(r.isPremium && {
      hasPart: { '@type': 'WebPageElement', isAccessibleForFree: false, cssSelector: '.gate' },
    }),
  };
}

function relatedCards(r, all) {
  const others = [
    ...all.filter(o => o.id !== r.id && o.category === r.category),
    ...all.filter(o => o.id !== r.id && o.category !== r.category),
  ].slice(0, 4);
  if (!others.length) return '';
  const cards = others.map(o =>
    `      <a class="card" href="/resources/${o.id}/"><strong>${inline(o.title)}</strong><span>${inline(o.subtitle)}</span></a>`
  ).join('\n');
  return `    <section class="related">
      <h2>More from the resource library</h2>
${cards}
      <p><a href="/resources/">Browse all resources →</a></p>
    </section>`;
}

function articlePage(r, all, categories) {
  const canonical = `${SITE}/resources/${r.id}/`;
  const blocks = bodyToBlocks(r.body);
  const isGated = r.isPremium;
  const visible = isGated
    ? blocks.slice(0, Math.max(2, Math.ceil(blocks.length * PREMIUM_PREVIEW_RATIO)))
    : blocks;

  const catLabel = categories.find(c => c.id === r.category)?.label ?? r.category;
  const byline = r.author ? ` · ${escapeHtml(r.author)}${r.authorCredentials ? `, ${escapeHtml(r.authorCredentials)}` : ''}` : '';

  const gate = isGated ? `      <div class="gate">
        <h2>Continue reading free in the Aminy app</h2>
        <p>The full guide — plus AI-powered behavior tracking, BCBA answers, and personalized strategies for your child — is free to start in Aminy.</p>
        <a class="btn" href="${SITE}/">Continue reading free</a>
      </div>` : '';

  const questions = r.relatedQuestions?.length ? `    <section class="related">
      <h2>Questions parents ask</h2>
      <ul>${r.relatedQuestions.map(q => `<li>${inline(q)}</li>`).join('')}</ul>
    </section>` : '';

  const bodyHtml = `    <p class="meta"><a href="/resources/">Resource Library</a> · ${escapeHtml(catLabel)}</p>
    <article>
      <h1>${inline(r.title)}</h1>
      <p class="subtitle">${inline(r.subtitle)}</p>
      <p class="meta">${r.readTimeMinutes} min read${byline}${isGated ? '<span class="badge">Premium</span>' : ''}</p>
      <div${isGated ? ' class="fade"' : ''}>
${visible.map(b => `      ${b}`).join('\n')}
      </div>
${gate}
    </article>
${questions}
${relatedCards(r, all)}`;

  return page({
    title: `${r.title} | Aminy Resources`,
    description: r.subtitle,
    canonical,
    ogType: 'article',
    jsonLd: articleJsonLd(r, canonical),
    bodyHtml,
  });
}

// ── Index page ────────────────────────────────────────────────────────────────

function indexPage(resources, categories) {
  const canonical = `${SITE}/resources/`;
  const groups = categories
    .filter(c => c.id !== 'all')
    .map(c => ({ ...c, items: resources.filter(r => r.category === c.id) }))
    .filter(g => g.items.length > 0);

  const sections = groups.map(g => `    <section class="cat">
      <h2>${g.emoji} ${escapeHtml(g.label)}</h2>
${g.items.map(r =>
    `      <a class="card" href="/resources/${r.id}/"><strong>${inline(r.title)}${r.isPremium ? ' <span class="badge" style="background:#43AA8B;color:#fff;border-radius:10px;padding:2px 9px;font-size:12px;">Premium</span>' : ''}</strong><span>${inline(r.subtitle)} · ${r.readTimeMinutes} min</span></a>`
  ).join('\n')}
    </section>`).join('\n');

  const description = 'Free BCBA-written guides for autism and neurodivergent families: meltdowns, sleep, IEPs, transitions, feeding, sensory needs, AAC, and behavior basics.';

  return page({
    title: 'Autism Parenting Resource Library | Aminy',
    description,
    canonical,
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Autism Parenting Resource Library',
      description,
      url: canonical,
      publisher: { '@type': 'Organization', name: 'Aminy', url: SITE },
      hasPart: resources.map(r => ({
        '@type': 'Article',
        headline: r.title,
        url: `${SITE}/resources/${r.id}/`,
      })),
    },
    bodyHtml: `    <h1>Autism Parenting Resource Library</h1>
    <p class="subtitle">Practical, BCBA-written guides for neurodivergent families — free to read.</p>
${sections}`,
  });
}

// ── Sitemap ───────────────────────────────────────────────────────────────────

function sitemap(resources) {
  const urls = [`${SITE}/resources/`, ...resources.map(r => `${SITE}/resources/${r.id}/`)];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc><lastmod>${BUILD_DATE}</lastmod></url>`).join('\n')}
</urlset>
`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const { RESOURCES, RESOURCE_CATEGORIES } = await loadResources();

await mkdir(join(OUT_DIR, 'resources'), { recursive: true });
for (const r of RESOURCES) {
  const dir = join(OUT_DIR, 'resources', r.id);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'index.html'), articlePage(r, RESOURCES, RESOURCE_CATEGORIES));
}
await writeFile(join(OUT_DIR, 'resources', 'index.html'), indexPage(RESOURCES, RESOURCE_CATEGORIES));
await writeFile(join(OUT_DIR, 'sitemap-resources.xml'), sitemap(RESOURCES));

const premium = RESOURCES.filter(r => r.isPremium).length;
console.log(
  `[resource-pages] wrote ${RESOURCES.length} article pages (${premium} premium-gated) + index + sitemap-resources.xml to ${OUT_DIR}/resources/`
);
