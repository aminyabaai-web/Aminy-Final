import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve('/tmp/Aminy-Final-audit-main');
const failures = [];

if (process.env.VITE_USE_MOCK_DATA === 'true') {
  failures.push('VITE_USE_MOCK_DATA must be false for release builds.');
}

const mustContain = [
  {
    file: 'src/components/PaywallSimplified.tsx',
    includes: ['DataProvenanceBadge'],
    message: 'Paywall must declare data provenance when live metrics are unavailable.',
  },
  {
    file: 'src/components/ProviderMarketplace.tsx',
    includes: ['LaunchStateBadge', 'DataProvenanceBadge'],
    message: 'Marketplace must expose limited-launch and data provenance labels.',
  },
  {
    file: 'src/components/telehealth/TelehealthHome.tsx',
    includes: ['LaunchStateBadge'],
    message: 'Telehealth home must be marked as limited launch.',
  },
  {
    file: 'src/components/OnDemandTelehealth.tsx',
    includes: ['LaunchStateBadge'],
    message: 'On-demand telehealth must be marked as limited launch.',
  },
  {
    file: 'src/components/EnhancedAnalyticsDashboard.tsx',
    includes: ['DataProvenanceBadge'],
    message: 'Analytics dashboard must label internal/sample data.',
  },
  {
    file: 'src/components/ImpactMetricsDashboard.tsx',
    includes: ['DataProvenanceBadge'],
    message: 'Impact dashboard must label internal/sample data.',
  },
];

for (const rule of mustContain) {
  const absolute = path.join(repoRoot, rule.file);
  const content = fs.readFileSync(absolute, 'utf8');
  const missing = rule.includes.filter((snippet) => !content.includes(snippet));
  if (missing.length > 0) {
    failures.push(`${rule.message} Missing: ${missing.join(', ')} in ${rule.file}`);
  }
}

const forbiddenPatterns = [
  {
    file: 'src/components/ProviderMarketplace.tsx',
    snippet: 'setProviders(generateMockProviders())',
    message: 'Marketplace cannot fall back to mock providers in release builds.',
  },
  {
    file: 'src/components/PaywallSimplified.tsx',
    snippet: 'recentSignupName:',
    message: 'Paywall cannot ship synthetic signup labels in release builds.',
  },
];

for (const rule of forbiddenPatterns) {
  const absolute = path.join(repoRoot, rule.file);
  const content = fs.readFileSync(absolute, 'utf8');
  if (content.includes(rule.snippet)) {
    failures.push(`${rule.message} Found forbidden snippet in ${rule.file}`);
  }
}

if (failures.length > 0) {
  console.error('\nRelease guard failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Release guard passed.');
