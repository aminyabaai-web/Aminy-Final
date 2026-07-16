#!/usr/bin/env node
// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.

/**
 * Copy linter — Phase 6 of DESIGN-EXCELLENCE-PLAN.md ("Lock It In").
 *
 * Greps user-facing source (src/components + src/lib) for banned internal/ops
 * jargon and placeholder-y copy that must never ship on a user surface:
 *
 *   - "shadow mode", "system of record", "payer matrix", "reconciliation accuracy"
 *     → internal/ops/compliance jargon (rubric rule 3)
 *   - "lorem ipsum", "A friend gets" → placeholder copy
 *   - "your client" (singular, standing alone) → name-substitution placeholder
 *     leaking into copy ("your clients" plural and "your client base" are
 *     legitimate provider voice and are NOT flagged)
 *
 * NOT statically linted here: `undefined` / `NaN`. In source they are keywords
 * and type names — every static match is a false positive. The rendered-text
 * scan in e2e/design-rubric.spec.ts catches real interpolation bugs
 * ("Hello undefined", "$NaN") where they actually occur: on screen.
 *
 * Comments are stripped before matching, so docs/annotations may use these
 * terms freely; only code that can reach a display string is linted.
 *
 * Exits 1 on any hit not in the BASELINE below. Run via `npm run lint:copy`.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import process from 'node:process';

const ROOT = new URL('..', import.meta.url).pathname;
const SCAN_DIRS = ['src/components', 'src/lib'];

/** Banned patterns. Each entry: [id, regex applied per comment-stripped line]. */
const BANNED = [
  ['shadow-mode', /\bshadow[- ]mode\b/i],
  ['system-of-record', /\bsystem of record\b/i],
  ['payer-matrix', /\bpayer matrix\b/i],
  ['reconciliation-accuracy', /\breconciliation accuracy\b/i],
  ['lorem-ipsum', /\blorem ipsum\b/i],
  ['a-friend-gets', /\bA friend gets\b/i],
  // Singular "your client" standing in for a name. Excludes the legitimate
  // provider-voice forms "your clients" and "your client base".
  ['your-client-placeholder', /\byour client\b(?!s\b| base\b)/i],
];

/**
 * BASELINE — pre-existing hits, owned by the components crew (Phases 1–3 of
 * DESIGN-EXCELLENCE-PLAN.md burn these down; e2e/scripts may not edit
 * src/components). Each entry allowlists ONE pattern in ONE file. Remove the
 * entry when the copy is fixed so the linter locks the fix in.
 *
 * The last two are INTENTIONAL fallbacks, not defects: both components
 * deliberately render a generic "your client" when no real patient name is
 * available (see BCBASessionBriefing.tsx nameIsPlaceholder guard). They stay
 * baselined permanently unless that design changes.
 */
const BASELINE = new Set([
  'src/components/PayerOutcomesDashboard.tsx::payer-matrix', // "Supported Payer Matrix" heading — payer-stakeholder surface, Phase 3 copy pass
  'src/components/ProviderPortal.tsx::payer-matrix', // Coverage Coach notes fallback string
  'src/lib/product-truth.ts::payer-matrix', // badgeLabel/payerLabel strings surfaced in coverage UI
  'src/lib/claim-ready-queue.ts::payer-matrix', // queue notes string
  'src/components/DifferentiationCallout.tsx::system-of-record', // investor-voice callout — Phase 3 decision
  'src/components/PricingPage.tsx::system-of-record', // same investor-voice sentence
  'src/lib/evv-cutover.ts::shadow-mode', // EVV cutover recommendation strings (ops surface) — Phase 3
  'src/components/provider/ProviderClinicalTemplates.tsx::your-client-placeholder', // intentional generic fallback when no patient name
  'src/components/BCBASessionBriefing.tsx::your-client-placeholder', // intentional fallback + the guard list that PREVENTS placeholder names
]);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === '__tests__' || name === 'test') continue;
      yield* walk(full);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.(ts|tsx)$/.test(name)) {
      yield full;
    }
  }
}

/**
 * Strip comments so doc-comments/annotations can use banned terms freely.
 * Heuristic (not a full parser, fine for a linter):
 *  - block comments replaced with spaces (line numbers preserved)
 *  - line comments: `//` at line start or preceded by whitespace → stripped.
 *    URLs ("https://...") survive because their `//` follows a `:`.
 */
function stripComments(source) {
  let out = source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  out = out
    .split('\n')
    .map((line) => line.replace(/(^|\s)\/\/.*$/, '$1'))
    .join('\n');
  return out;
}

const violations = [];
for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const rel = relative(ROOT, file);
    const lines = stripComments(readFileSync(file, 'utf8')).split('\n');
    lines.forEach((line, i) => {
      for (const [id, re] of BANNED) {
        if (re.test(line) && !BASELINE.has(`${rel}::${id}`)) {
          violations.push(`${rel}:${i + 1} [${id}] ${line.trim().slice(0, 120)}`);
        }
      }
    });
  }
}

if (violations.length > 0) {
  console.error(`lint:copy — ${violations.length} banned-copy hit(s):\n`);
  for (const v of violations) console.error(`  ${v}`);
  console.error(
    '\nBanned jargon/placeholder copy must not reach user surfaces ' +
      '(DESIGN-EXCELLENCE-PLAN.md rubric rule 3). Reword it — do not add to the ' +
      'baseline unless it is a deliberate, reviewed exception.',
  );
  process.exit(1);
}

console.log('lint:copy — clean (no banned copy outside the documented baseline).');
